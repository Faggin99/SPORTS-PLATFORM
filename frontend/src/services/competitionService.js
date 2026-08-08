import { api } from './api';

export const competitionService = {
  async list({ clubId, includeArchived } = {}) {
    const params = new URLSearchParams();
    if (clubId) params.append('clubId', clubId);
    if (includeArchived) params.append('includeArchived', 'true');
    const qs = params.toString();
    return await api.get(`/competitions${qs ? `?${qs}` : ''}`);
  },
  async create(payload) {
    return await api.post('/competitions', payload);
  },
  async update(id, payload) {
    return await api.put(`/competitions/${id}`, payload);
  },
  async remove(id) {
    return await api.delete(`/competitions/${id}`);
  },
};
