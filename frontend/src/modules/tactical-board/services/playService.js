import { api } from '../../../services/api';

export const playService = {
  async getAll(clubId = null) {
    const query = clubId ? `?club_id=${clubId}` : '';
    return await api.get(`/plays${query}`);
  },

  async getById(id) {
    return await api.get(`/plays/${id}`);
  },

  async create(data) {
    return await api.post('/plays', data);
  },

  async update(id, data) {
    return await api.put(`/plays/${id}`, data);
  },

  async delete(id) {
    return await api.delete(`/plays/${id}`);
  },
};
