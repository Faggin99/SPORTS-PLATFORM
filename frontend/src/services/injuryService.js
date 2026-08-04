import { api } from './api';

export const injuryService = {
  async listByAthlete(athleteId) {
    const data = await api.get(`/athletes/${athleteId}/injuries`);
    return data?.data || [];
  },
  async listActive() {
    const data = await api.get('/injuries/active');
    return data?.data || [];
  },
  async create(athleteId, payload) {
    return await api.post(`/athletes/${athleteId}/injuries`, payload);
  },
  async update(id, payload) {
    return await api.put(`/injuries/${id}`, payload);
  },
  async resolve(id, date = null) {
    return await api.put(`/injuries/${id}`, { resolved_at: date || new Date().toISOString().split('T')[0] });
  },
  async remove(id) {
    return await api.delete(`/injuries/${id}`);
  },
};
