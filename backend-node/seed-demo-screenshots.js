// Seed "agressivo" pra screenshots de loja: conteúdos, títulos, microciclo da
// semana cheio de atividades, jogo agendado e um jogo passado com eventos.
// Alvo: clube Gambiarra FC da conta arthurfaggin@gmail.com (prod).
// Idempotente: limpa o que ele mesmo cria antes de recriar.
require('dotenv').config();
const { query } = require('./src/config/database');
const { randomUUID } = require('crypto');

const CLUB = '6b8cfbbd-f643-4de1-8267-8d573e3ebf4b';
const WS   = '249536bb-ee36-4699-85c7-7785677d158a';
const CAT  = '858d2002-a1cc-425e-a363-5895c1606656';

const BLOCKS = ['Aquecimento', 'Preparatório', 'Atividade 1', 'Atividade 2', 'Atividade 3', 'Complementos'];

async function main() {
  const athletes = (await query(
    `SELECT id, name, jersey_number, position, "group" FROM athletes WHERE club_id=$1 ORDER BY jersey_number`, [CLUB]
  )).rows;
  const byJersey = (n) => athletes.find(a => a.jersey_number === n);

  // ── limpeza (re-run) ──
  await query(`DELETE FROM match_events WHERE workspace_id=$1`, [WS]);
  await query(`DELETE FROM match_players WHERE workspace_id=$1`, [WS]);
  await query(`DELETE FROM training_activity_contents WHERE activity_id IN
     (SELECT a.id FROM training_activities a JOIN training_activity_blocks b ON b.id=a.block_id
      JOIN training_sessions s ON s.id=b.session_id JOIN training_microcycles m ON m.id=s.microcycle_id WHERE m.club_id=$1)`, [CLUB]);
  await query(`DELETE FROM training_microcycles WHERE club_id=$1`, [CLUB]); // cascata p/ sessions→blocks→activities
  await query(`DELETE FROM activity_titles WHERE workspace_id=$1`, [WS]);
  await query(`DELETE FROM competitions WHERE club_id=$1`, [CLUB]);

  // ── conteúdos (pilares) — GLOBAIS, reusar os existentes ──
  const allContents = (await query(`SELECT id, name FROM contents`)).rows;
  const fc = (name) => { const c = allContents.find(x => x.name === name); if (!c) throw new Error('conteúdo não encontrado: ' + name); return c.id; };
  const content = {
    OO:  fc('Organização Ofensiva'),
    OD:  fc('Organização Defensiva'),
    TO:  fc('Transição Ofensiva'),
    TD:  fc('Transição Defensiva'),
    FIN: fc('Bola Parada Ofensiva'),
    RES: fc('Aeróbio'),
  };

  // ── títulos de atividade ──
  const titleDefs = [
    ['Ativação e mobilidade', 'RES'],
    ['Coordenação e velocidade', 'RES'],
    ['Rondo 5v2', 'OO'],
    ['Saída de pressão', 'TO'],
    ['Ataque x Defesa 8v8', 'OO'],
    ['Circuito de finalização', 'FIN'],
    ['Pressão após perda', 'TD'],
    ['Jogo reduzido 4v4', 'TO'],
    ['Bola parada ofensiva', 'FIN'],
  ];
  const title = {};
  for (const [t, abbr] of titleDefs) {
    const id = randomUUID();
    await query(`INSERT INTO activity_titles (id, workspace_id, content_id, title, created_at, updated_at)
                 VALUES ($1,$2,$3,$4,now(),now())`, [id, WS, content[abbr], t]);
    title[t] = { id, content: content[abbr] };
  }

  // helper: cria sessão + 6 blocos, devolve mapa de blocos por nome
  async function makeSession(mcId, { dow, day, date, type, opponent, location }) {
    const sid = randomUUID();
    await query(`INSERT INTO training_sessions
        (id, microcycle_id, club_id, workspace_id, date, day_of_week, day_name, session_type, match_duration, opponent_name, match_location, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now(),now())`,
      [sid, mcId, CLUB, WS, date, dow, day, type, type === 'match' ? 90 : null, opponent || null, location || null]);
    const blocks = {};
    for (let i = 0; i < BLOCKS.length; i++) {
      const bid = randomUUID();
      await query(`INSERT INTO training_activity_blocks (id, session_id, "order", name, created_at, updated_at)
                   VALUES ($1,$2,$3,$4,now(),now())`, [bid, sid, i + 1, BLOCKS[i]]);
      blocks[BLOCKS[i]] = bid;
    }
    return { sid, blocks };
  }

  async function addActivity(blockId, titleName, duration, groups, desc) {
    const aid = randomUUID();
    await query(`INSERT INTO training_activities (id, block_id, title_id, workspace_id, groups, is_rest, duration_minutes, description, created_at, updated_at)
                 VALUES ($1,$2,$3,$4,$5,false,$6,$7,now(),now())`,
      [aid, blockId, title[titleName].id, WS, JSON.stringify(groups), duration, desc]);
    await query(`INSERT INTO training_activity_contents (activity_id, content_id) VALUES ($1,$2)`, [aid, title[titleName].content]);
  }

  const G = ['G1', 'G2', 'G3'];

  // ── microciclo da SEMANA ATUAL (2026-33) ──
  const mcId = randomUUID();
  await query(`INSERT INTO training_microcycles (id, workspace_id, club_id, category_id, start_date, end_date, week_identifier, created_at, updated_at)
               VALUES ($1,$2,$3,$4,'2026-08-10','2026-08-16','2026-33',now(),now())`, [mcId, WS, CLUB, CAT]);

  const week = [
    { dow: 1, day: 'Segunda', date: '2026-08-10', type: 'training', rich: true },
    { dow: 2, day: 'Terça',   date: '2026-08-11', type: 'training' },
    { dow: 3, day: 'Quarta',  date: '2026-08-12', type: 'training' },
    { dow: 4, day: 'Quinta',  date: '2026-08-13', type: 'match', opponent: 'Rival FC', location: 'Casa' },
    { dow: 5, day: 'Sexta',   date: '2026-08-14', type: 'training' },
    { dow: 6, day: 'Sábado',  date: '2026-08-15', type: 'training' },
    { dow: 7, day: 'Domingo', date: '2026-08-16', type: 'rest' },
  ];

  for (const s of week) {
    const { blocks } = await makeSession(mcId, s);
    if (s.type === 'rest') continue;
    if (s.type === 'match') {
      await addActivity(blocks['Aquecimento'], 'Ativação e mobilidade', 15, G, 'Ativação leve pré-jogo.');
      continue;
    }
    if (s.rich) {
      // Segunda — dia cheio (tela visível)
      await addActivity(blocks['Aquecimento'], 'Ativação e mobilidade', 12, G, 'Mobilidade articular + ativação neuromuscular.');
      await addActivity(blocks['Aquecimento'], 'Coordenação e velocidade', 10, G, 'Escadas de agilidade e arrancadas curtas.');
      await addActivity(blocks['Preparatório'], 'Rondo 5v2', 15, G, 'Manutenção de posse, 2 toques. Foco em apoio e cobertura.');
      await addActivity(blocks['Atividade 1'], 'Saída de pressão', 20, ['G1', 'G2'], 'Construção desde o goleiro sob pressão alta do adversário.');
      await addActivity(blocks['Atividade 2'], 'Ataque x Defesa 8v8', 25, ['G1', 'G2'], 'Meio-campo ofensivo vs bloco defensivo médio. Progressão e finalização.');
      await addActivity(blocks['Atividade 3'], 'Circuito de finalização', 15, G, 'Estações de finalização: 1º poste, 2º poste e cobertura.');
      await addActivity(blocks['Complementos'], 'Jogo reduzido 4v4', 12, G, 'Jogo livre em campo reduzido, 3 mini-gols.');
    } else {
      // Demais dias — moderado
      await addActivity(blocks['Aquecimento'], 'Ativação e mobilidade', 12, G, 'Aquecimento dinâmico.');
      await addActivity(blocks['Preparatório'], 'Rondo 5v2', 12, G, 'Rondo em losango.');
      await addActivity(blocks['Atividade 1'], s.dow % 2 ? 'Pressão após perda' : 'Saída de pressão', 20, ['G1', 'G2'], 'Trabalho tático posicional.');
      await addActivity(blocks['Atividade 2'], s.dow % 2 ? 'Bola parada ofensiva' : 'Ataque x Defesa 8v8', 20, G, 'Situação de jogo.');
    }
  }

  // ── competição + microciclo PASSADO (2026-32) com JOGO jogado ──
  const compId = randomUUID();
  await query(`INSERT INTO competitions (id, workspace_id, club_id, name, season, format, created_at, updated_at)
               VALUES ($1,$2,$3,'Campeonato Regional 2026','2026','league',now(),now())`, [compId, WS, CLUB]);

  const mcPast = randomUUID();
  await query(`INSERT INTO training_microcycles (id, workspace_id, club_id, category_id, start_date, end_date, week_identifier, created_at, updated_at)
               VALUES ($1,$2,$3,$4,'2026-08-03','2026-08-09','2026-32',now(),now())`, [mcPast, WS, CLUB, CAT]);

  // jogo passado (Sáb 09/08) — vitória 2x1 sobre União EC
  const game = await makeSession(mcPast, { dow: 6, day: 'Sábado', date: '2026-08-09', type: 'match', opponent: 'União EC', location: 'Casa' });
  await query(`UPDATE training_sessions SET competition_id=$1 WHERE id=$2`, [compId, game.sid]);

  // escalação: titulares 1..11, reservas 12/15/17/20
  const starters = [1,2,3,4,5,6,7,8,9,10,11];
  const subs = [12,15,17,20];
  for (const j of starters) {
    const a = byJersey(j); if (!a) continue;
    await query(`INSERT INTO match_players (id, session_id, athlete_id, workspace_id, jersey_number, minutes_played, status, created_at, updated_at)
                 VALUES ($1,$2,$3,$4,$5,$6,'starter',now(),now())`, [randomUUID(), game.sid, a.id, WS, j, 90]);
  }
  for (const j of subs) {
    const a = byJersey(j); if (!a) continue;
    await query(`INSERT INTO match_players (id, session_id, athlete_id, workspace_id, jersey_number, minutes_played, status, created_at, updated_at)
                 VALUES ($1,$2,$3,$4,$5,$6,'substitute',now(),now())`, [randomUUID(), game.sid, a.id, WS, j, 20]);
  }
  // eventos
  const ev = async (minute, type, jersey, assistJersey, notes) => {
    const p = jersey ? byJersey(jersey) : null;
    const sec = assistJersey ? byJersey(assistJersey) : null;
    await query(`INSERT INTO match_events (id, session_id, workspace_id, minute, event_type, team, player_id, secondary_player_id, notes, created_at, updated_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,now(),now())`,
      [randomUUID(), game.sid, WS, minute, type, type === 'goal_conceded' ? 'away' : 'home', p ? p.id : null, sec ? sec.id : null, notes || null]);
  };
  await ev(23, 'goal_scored', 9, 10, 'Contra-ataque rápido, assistência do camisa 10.');
  await ev(41, 'yellow', 5, null, 'Falta tática.');
  await ev(58, 'goal_scored', 11, 8, 'Jogada individual pela esquerda.');
  await ev(72, 'goal_conceded', null, null, 'Bola parada adversária.');
  await ev(80, 'yellow', 6, null, 'Reclamação.');

  // resumo
  const cnt = async (t, w) => (await query(`SELECT count(*)::int c FROM ${t} WHERE ${w}`)).rows[0].c;
  console.log('✓ seed pronto');
  console.log('  contents:', await cnt('contents', `workspace_id='${WS}'`));
  console.log('  activity_titles:', await cnt('activity_titles', `workspace_id='${WS}'`));
  console.log('  microcycles:', await cnt('training_microcycles', `club_id='${CLUB}'`));
  console.log('  sessions:', await cnt('training_sessions', `workspace_id='${WS}'`));
  console.log('  activities:', await cnt('training_activities', `workspace_id='${WS}'`));
  console.log('  match_players:', await cnt('match_players', `workspace_id='${WS}'`));
  console.log('  match_events:', await cnt('match_events', `workspace_id='${WS}'`));
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
