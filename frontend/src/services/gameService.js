import { api } from './api';

export const gameService = {
  async getMatchData(sessionId) {
    return await api.get(`/games/${sessionId}`);
  },

  async saveMatchPlayers(sessionId, players) {
    return await api.post(`/games/${sessionId}`, { players });
  },

  async saveMatchEvents(sessionId, events) {
    return await api.post(`/games/${sessionId}`, { events });
  },

  async updateMatchInfo(sessionId, data) {
    return await api.put(`/sessions/${sessionId}/type`, {
      session_type: 'match',
      opponent_name: data.opponent_name,
      match_duration: data.match_duration,
    });
  },

  async saveAllMatchData(sessionId, data) {
    return await api.post(`/games/${sessionId}`, {
      opponent_name: data.opponent_name,
      match_duration: data.match_duration,
      players: data.players,
      events: data.events,
    });
  },
};
