// Frontend service para integração com APIs externas de dados de futebol.
// Atualmente: api-football (api-sports.io).
//
// Os endpoints respondem 503 quando a chave não está configurada no backend —
// o helper getStatus() permite ao frontend decidir se mostra ou esconde a UI.

import { api } from './api';

export const externalApiService = {
  // Lista provedores e se cada um está habilitado.
  async getStatus() {
    return await api.get('/external/status');
  },

  // Conveniência — saber se PELO MENOS api-football está pronto.
  async isApiFootballEnabled() {
    try {
      const s = await this.getStatus();
      return Boolean(s?.providers?.find((p) => p.id === 'api-football')?.enabled);
    } catch {
      return false;
    }
  },

  // Busca times por nome. Mínimo 3 chars.
  async searchTeams(searchTerm, country = 'Brazil') {
    const q = new URLSearchParams({ search: searchTerm, country }).toString();
    return await api.get(`/external/api-football/teams?${q}`);
  },

  // Lista ligas de um país, opcionalmente filtradas por temporada.
  async listLeagues({ country = 'Brazil', season } = {}) {
    const params = new URLSearchParams({ country });
    if (season) params.append('season', season);
    return await api.get(`/external/api-football/leagues?${params.toString()}`);
  },

  // Preview dos jogos do time naquela liga/temporada (sem persistir).
  async previewFixtures({ leagueId, season, teamId }) {
    const q = new URLSearchParams({ league_id: leagueId, season, team_id: teamId }).toString();
    return await api.get(`/external/api-football/preview?${q}`);
  },

  // Persiste os jogos selecionados como training_sessions vinculadas à competition.
  async importFixtures({ competitionId, teamId, leagueId, season, eventIds }) {
    return await api.post('/external/api-football/import', {
      competition_id: competitionId,
      team_id: teamId,
      league_id: leagueId,
      season,
      event_ids: eventIds,
    });
  },
};
