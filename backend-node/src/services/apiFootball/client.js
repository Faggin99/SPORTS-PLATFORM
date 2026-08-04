// Cliente HTTP para api-football.com (api-sports.io v3).
//
// ATIVAÇÃO:
//   - Setar env var API_FOOTBALL_KEY com a chave do dashboard api-sports.io
//   - Reiniciar a API (pm2 reload)
//   - Os endpoints /api/external/* deixam de responder 503 e passam a chamar a API
//
// O cliente nunca chama a API se a chave estiver ausente — facilita rodar em
// staging sem queimar quota e mantém o resto do app funcional sem a feature.

const BASE_URL = 'https://v3.football.api-sports.io';
const TIMEOUT_MS = 10_000;

function getKey() {
  return process.env.API_FOOTBALL_KEY || null;
}

function isEnabled() {
  return Boolean(getKey());
}

// Single helper sobre fetch, com header de auth + timeout + parsing robusto.
async function callApi(path, params = {}) {
  const key = getKey();
  if (!key) {
    const err = new Error('API_FOOTBALL_KEY não configurada — feature desativada');
    err.code = 'API_FOOTBALL_DISABLED';
    err.status = 503;
    throw err;
  }
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
  ).toString();
  const url = `${BASE_URL}${path}${qs ? `?${qs}` : ''}`;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: { 'x-apisports-key': key, 'Accept': 'application/json' },
      signal: ctrl.signal,
    });
  } catch (err) {
    clearTimeout(t);
    const e = new Error(err.name === 'AbortError' ? 'API Football timeout' : `API Football erro de rede: ${err.message}`);
    e.code = 'API_FOOTBALL_NETWORK';
    e.status = 502;
    throw e;
  }
  clearTimeout(t);

  if (res.status === 429) {
    const e = new Error('API Football rate limit atingido — tente novamente em alguns minutos');
    e.code = 'API_FOOTBALL_RATE_LIMIT';
    e.status = 429;
    throw e;
  }
  if (!res.ok) {
    const e = new Error(`API Football HTTP ${res.status}`);
    e.code = 'API_FOOTBALL_HTTP';
    e.status = 502;
    throw e;
  }
  const body = await res.json().catch(() => null);
  // api-football devolve { errors: {...}, response: [...] }
  if (body?.errors && Object.keys(body.errors).length > 0 && !Array.isArray(body.errors)) {
    const msg = Object.values(body.errors).join('; ') || 'Erro desconhecido';
    const e = new Error(`API Football: ${msg}`);
    e.code = 'API_FOOTBALL_API_ERROR';
    e.status = 502;
    throw e;
  }
  return body?.response || [];
}

// — endpoints úteis pra TactiPlan —

// Busca times por nome. Use pra mapear "Uberlândia" → team_id.
function searchTeams(searchTerm, country = 'Brazil') {
  return callApi('/teams', { search: searchTerm, country });
}

// Lista as ligas de um país (Série A id=71, B=72, C=75, D=80, Copa do Brasil=73...)
function listLeagues({ country = 'Brazil', season } = {}) {
  return callApi('/leagues', { country, season });
}

// Jogos de uma liga+temporada+time. season é o ANO (ex.: 2026).
function getFixtures({ leagueId, season, teamId, from, to }) {
  return callApi('/fixtures', { league: leagueId, season, team: teamId, from, to });
}

// Eventos de um fixture específico (gols por minuto, cartões, substituições).
function getFixtureEvents(fixtureId) {
  return callApi('/fixtures/events', { fixture: fixtureId });
}

// Escalação (titulares + reservas) de um fixture específico.
function getFixtureLineups(fixtureId) {
  return callApi('/fixtures/lineups', { fixture: fixtureId });
}

// Classificação atual de uma liga+temporada.
function getStandings({ leagueId, season }) {
  return callApi('/standings', { league: leagueId, season });
}

module.exports = {
  isEnabled,
  searchTeams,
  listLeagues,
  getFixtures,
  getFixtureEvents,
  getFixtureLineups,
  getStandings,
};
