import { api } from '../../../services/api';

export const athleteService = {
  async getAll(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.club_id) queryParams.append('club_id', params.club_id);
    if (params.group) queryParams.append('group', params.group);
    if (params.status) queryParams.append('status', params.status);
    const query = queryParams.toString();
    return await api.get(`/athletes${query ? '?' + query : ''}`);
  },

  async getById(id) {
    return await api.get(`/athletes/${id}`);
  },

  async create(data) {
    return await api.post('/athletes', data);
  },

  async update(id, data) {
    return await api.put(`/athletes/${id}`, data);
  },

  async delete(id) {
    return await api.delete(`/athletes/${id}`);
  },

  async batchUpdateGroups(athletes) {
    return await api.put('/athletes/batch-groups', { athletes });
  },
};
