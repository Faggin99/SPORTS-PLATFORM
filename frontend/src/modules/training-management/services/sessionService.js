import { api } from '../../../services/api';

export const sessionService = {
  async get(sessionId) {
    return await api.get(`/sessions/${sessionId}`);
  },

  async update(sessionId, blocks) {
    // Activities are managed individually via the activities routes
    // This is kept for compatibility
    return await this.get(sessionId);
  },
};
