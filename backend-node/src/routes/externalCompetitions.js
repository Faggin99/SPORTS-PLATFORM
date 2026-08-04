// Rotas pra integração com APIs externas de dados de futebol.
// Atualmente suporta apenas api-football (api-sports.io).
//
// Quando API_FOOTBALL_KEY não está setada:
//   - GET /status retorna { enabled: false }
//   - Demais endpoints retornam 503
//
// O frontend faz polling do /status pra decidir se mostra a UI de importação.

const express = require('express');
const { pool, query } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const apiFootball = require('../services/apiFootball/client');
const { mapFixtureToSession, mapFixtureEvents } = require('../services/apiFootball/mapper');

const router = express.Router();

router.use(authMiddleware);

// Wrapper pra padronizar erros do cliente em respostas HTTP.
function sendApiError(res, err) {
  console.error('[external] api-football error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Erro na integração externa',
    code: err.code || 'EXTERNAL_ERROR',
  });
}

// GET /api/external/status — frontend usa pra decidir se mostra UI de importação
router.get('/status', (req, res) => {
  res.json({
    providers: [
      {
        id: 'api-football',
        name: 'API-Football',
        enabled: apiFootball.isEnabled(),
        docs: 'https://www.api-football.com/coverage',
      },
    ],
  });
});

// GET /api/external/api-football/teams?search=Uberlandia — busca times por nome
router.get('/api-football/teams', async (req, res) => {
  if (!apiFootball.isEnabled()) {
    return res.status(503).json({ error: 'API Football não configurada', code: 'API_FOOTBALL_DISABLED' });
  }
  try {
    const { search, country } = req.query;
    if (!search || String(search).length < 3) {
      return res.status(400).json({ error: 'Mínimo 3 caracteres pra busca' });
    }
    const teams = await apiFootball.searchTeams(search, country || 'Brazil');
    // Normaliza pro frontend
    res.json(teams.map((t) => ({
      id: t.team?.id,
      name: t.team?.name,
      code: t.team?.code,
      country: t.team?.country,
      founded: t.team?.founded,
      logo: t.team?.logo,
      venue: t.venue?.name,
    })));
  } catch (err) {
    sendApiError(res, err);
  }
});

// GET /api/external/api-football/leagues?country=Brazil&season=2026
router.get('/api-football/leagues', async (req, res) => {
  if (!apiFootball.isEnabled()) {
    return res.status(503).json({ error: 'API Football não configurada', code: 'API_FOOTBALL_DISABLED' });
  }
  try {
    const { country, season } = req.query;
    const leagues = await apiFootball.listLeagues({ country: country || 'Brazil', season });
    res.json(leagues.map((l) => ({
      id: l.league?.id,
      name: l.league?.name,
      type: l.league?.type,
      logo: l.league?.logo,
      country: l.country?.name,
      seasons: (l.seasons || []).map((s) => ({
        year: s.year,
        start: s.start,
        end: s.end,
        current: s.current,
        coverage: s.coverage,
      })),
    })));
  } catch (err) {
    sendApiError(res, err);
  }
});

// GET /api/external/api-football/preview?league_id=80&season=2026&team_id=999
// Retorna jogos do time naquela liga/temporada SEM persistir nada.
router.get('/api-football/preview', async (req, res) => {
  if (!apiFootball.isEnabled()) {
    return res.status(503).json({ error: 'API Football não configurada', code: 'API_FOOTBALL_DISABLED' });
  }
  try {
    const { league_id, season, team_id } = req.query;
    if (!league_id || !season || !team_id) {
      return res.status(400).json({ error: 'league_id, season e team_id são obrigatórios' });
    }
    const fixtures = await apiFootball.getFixtures({
      leagueId: league_id, season, teamId: team_id,
    });
    const teamIdNum = Number(team_id);
    const sessions = fixtures.map((f) => mapFixtureToSession(f, teamIdNum)).filter(Boolean);

    // Detecta quais já foram importados nesse workspace pra UI marcar como
    // "já importado".
    const externalIds = sessions.map((s) => s.external_event_id);
    let already = new Set();
    if (externalIds.length > 0 && req.user.workspaceIds?.length) {
      const r = await query(
        `SELECT external_event_id FROM training_sessions
          WHERE workspace_id = ANY($1)
            AND external_provider = 'api-football'
            AND external_event_id = ANY($2)`,
        [req.user.workspaceIds, externalIds]
      );
      already = new Set(r.rows.map((row) => row.external_event_id));
    }

    res.json(sessions.map((s) => ({
      ...s,
      already_imported: already.has(s.external_event_id),
      // não devolve payload bruto na preview pra economizar bytes
      external_payload: undefined,
    })));
  } catch (err) {
    sendApiError(res, err);
  }
});

// POST /api/external/api-football/import
// Body: { competition_id, team_id, league_id, season, event_ids: [string] }
// Persiste como training_sessions vinculadas à competition_id.
router.post('/api-football/import', async (req, res) => {
  if (!apiFootball.isEnabled()) {
    return res.status(503).json({ error: 'API Football não configurada', code: 'API_FOOTBALL_DISABLED' });
  }
  const client = await pool.connect();
  try {
    if (!req.user.can('training:edit')) {
      return res.status(403).json({ error: 'Sem permissão pra criar treinos/jogos' });
    }
    const { competition_id, team_id, league_id, season, event_ids } = req.body;
    if (!competition_id || !team_id || !league_id || !season || !Array.isArray(event_ids) || event_ids.length === 0) {
      return res.status(400).json({ error: 'competition_id, team_id, league_id, season e event_ids são obrigatórios' });
    }

    // Confere que a competição existe + permissão de escrita na workspace
    const compRes = await client.query(
      `SELECT c.id, c.workspace_id, c.club_id
         FROM competitions c
        WHERE c.id = $1 AND c.workspace_id = ANY($2)`,
      [competition_id, req.user.workspaceIds || []]
    );
    if (compRes.rows.length === 0) return res.status(404).json({ error: 'Competição não encontrada' });
    const comp = compRes.rows[0];
    if (!req.user.canWriteWorkspace(comp.workspace_id)) {
      return res.status(403).json({ error: 'Sem permissão de escrita nessa workspace' });
    }

    // Busca a liga/temporada/time inteira e filtra os event_ids selecionados.
    // 1 call à API serve pra N jogos — economiza quota.
    const fixtures = await apiFootball.getFixtures({ leagueId: league_id, season, teamId: team_id });
    const teamIdNum = Number(team_id);
    const wanted = new Set(event_ids.map(String));
    const candidatos = fixtures
      .map((f) => mapFixtureToSession(f, teamIdNum))
      .filter((s) => s && wanted.has(s.external_event_id));

    await client.query('BEGIN');
    let created = 0, updated = 0, skipped = 0;

    for (const s of candidatos) {
      // dedup por (workspace, provider, event_id)
      const existing = await client.query(
        `SELECT id, external_locked_at FROM training_sessions
          WHERE workspace_id = $1 AND external_provider = $2 AND external_event_id = $3`,
        [comp.workspace_id, s.external_provider, s.external_event_id]
      );
      if (existing.rows.length > 0) {
        // Se coach já editou manualmente, não pisar.
        if (existing.rows[0].external_locked_at) { skipped++; continue; }
        await client.query(
          `UPDATE training_sessions SET
             date = $1, opponent_name = $2, match_round = $3, match_location = $4,
             external_payload = $5, external_synced_at = NOW(), competition_id = $6
           WHERE id = $7`,
          [s.date, s.opponent_name, s.match_round, s.match_location,
           s.external_payload, competition_id, existing.rows[0].id]
        );
        updated++;
      } else {
        // Como training_sessions é tipicamente dentro de um microcycle, e a
        // importação cria jogos avulsos (sem microcycle), criamos um microcycle
        // "externo" implícito ou linkamos a NULL — depende do schema atual.
        // Pra não quebrar invariantes, INSERT só com colunas seguras.
        await client.query(
          `INSERT INTO training_sessions
             (workspace_id, club_id, date, session_type, opponent_name,
              match_round, match_location, competition_id,
              external_event_id, external_provider, external_payload, external_synced_at)
           VALUES ($1, $2, $3, 'match', $4, $5, $6, $7, $8, $9, $10, NOW())`,
          [comp.workspace_id, comp.club_id, s.date, s.opponent_name,
           s.match_round, s.match_location, competition_id,
           s.external_event_id, s.external_provider, s.external_payload]
        );
        created++;
      }
    }

    await client.query('COMMIT');
    res.json({ created, updated, skipped, total_processed: candidatos.length });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code && err.code.startsWith('API_FOOTBALL_')) return sendApiError(res, err);
    console.error('[external] import error:', err);
    res.status(500).json({ error: 'Falha ao importar jogos: ' + (err.message || '') });
  } finally {
    client.release();
  }
});

module.exports = router;
