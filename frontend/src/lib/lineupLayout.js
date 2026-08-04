// Cálculo da formação no campo a partir de uma lista de jogadores titulares.
// Reusado pelo LineupField (tela) e pelo PDF de Convocação.
// Coordenadas em %: y=0 é a meta adversária (topo), y=100 é a NOSSA meta (base).

export const FOOTBALL_LAYOUT = {
  // Futebol 11
  GR:  { x: 50, y: 92 },
  DD:  { x: 80, y: 76 }, DC: { x: 50, y: 78 }, DE: { x: 20, y: 76 },
  MD:  { x: 78, y: 56 }, MC: { x: 50, y: 56 }, ME: { x: 22, y: 56 }, MOF: { x: 50, y: 40 },
  ED:  { x: 80, y: 28 }, EE: { x: 20, y: 28 }, PL: { x: 50, y: 16 }, SA: { x: 38, y: 20 },
  // Futebol 7
  Z: { x: 50, y: 80 }, LD: { x: 80, y: 66 }, LE: { x: 20, y: 66 },
  M: { x: 50, y: 50 }, A: { x: 50, y: 22 },
};

export const FUTSAL_LAYOUT = {
  GOL: { x: 50, y: 92 }, FIX: { x: 50, y: 72 },
  'ALA-D': { x: 80, y: 50 }, 'ALA-E': { x: 20, y: 50 }, PIV: { x: 50, y: 22 },
};

export const DEFAULT_FORMATION = {
  futsal: [
    { x: 50, y: 92 }, { x: 50, y: 72 },
    { x: 22, y: 50 }, { x: 78, y: 50 }, { x: 50, y: 22 },
  ],
  football_7: [
    { x: 50, y: 92 },
    { x: 32, y: 75 }, { x: 68, y: 75 },
    { x: 22, y: 52 }, { x: 50, y: 52 }, { x: 78, y: 52 },
    { x: 50, y: 22 },
  ],
  football_11: [
    { x: 50, y: 92 },
    { x: 22, y: 76 }, { x: 40, y: 78 }, { x: 60, y: 78 }, { x: 78, y: 76 },
    { x: 22, y: 52 }, { x: 40, y: 54 }, { x: 60, y: 54 }, { x: 78, y: 52 },
    { x: 38, y: 22 }, { x: 62, y: 22 },
  ],
};

export function pickLayout(modality) {
  return modality === 'futsal' ? FUTSAL_LAYOUT : FOOTBALL_LAYOUT;
}

// Distribui jogadores soltos em fileiras na nossa metade defensiva.
export function gridFallback(count) {
  if (count <= 0) return [];
  const out = [];
  const cols = Math.min(count, count <= 4 ? 2 : 3);
  const rows = Math.ceil(count / cols);
  for (let i = 0; i < count; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    out.push({
      x: ((c + 1) / (cols + 1)) * 100,
      y: 60 + (r / Math.max(1, rows - 1 || 1)) * 30,
    });
  }
  return out;
}

// Calcula a lista [{ p, coords }] respeitando as regras de fallback.
export function computeLineup({ players, modality }) {
  const layout = pickLayout(modality);
  const positioned = [];
  const unpositioned = [];
  players.forEach((p) => {
    const code = p.athlete?.position || p.position;
    const coords = code && layout[code];
    if (coords) positioned.push({ p, coords });
    else unpositioned.push(p);
  });

  if (positioned.length === 0) {
    const defaults = DEFAULT_FORMATION[modality] || DEFAULT_FORMATION.football_11;
    return players.map((p, i) => ({ p, coords: defaults[i] || defaults[defaults.length - 1] }));
  }
  if (unpositioned.length > 0) {
    const grid = gridFallback(unpositioned.length);
    unpositioned.forEach((p, i) => positioned.push({ p, coords: grid[i] }));
  }
  return positioned;
}

// Lê a camisa do jogador respeitando override por jogo.
export function readJersey(p) {
  const match = (p.jersey_number !== '' && p.jersey_number != null) ? p.jersey_number : null;
  return match ?? p.athlete?.jersey_number ?? null;
}

// Calcula minutos jogados de um atleta a partir dos eventos de substituição
// (apenas team='own'). Modelo: titulares entram em 0, reservas entram quando
// são chamados (event.secondary_player_id == athlete_id), todo mundo sai
// quando sua linha é substituída (event.player_id == athlete_id) ou no final
// da partida. Lida com 1ª substituição/retorno; não modela re-entradas
// múltiplas (raro em futebol 7/11, e futsal não usa esse cálculo).
export function computeMinutesPlayed(player, events, matchDuration) {
  if (!matchDuration) return 0;
  const athleteId = player.athlete_id;
  const subs = (events || [])
    .filter((e) => e.event_type === 'substitution' && e.team === 'own')
    .sort((a, b) => a.minute - b.minute);

  let entry = player.status === 'starter' ? 0 : null;
  let exit = null;

  for (const e of subs) {
    // Player saindo
    if (e.player_id === athleteId && exit === null) exit = e.minute;
    // Player entrando
    if (e.secondary_player_id === athleteId && entry === null) entry = e.minute;
  }

  if (entry === null) return 0; // nunca entrou
  const end = exit ?? matchDuration;
  return Math.max(0, Math.min(matchDuration, end) - entry);
}
