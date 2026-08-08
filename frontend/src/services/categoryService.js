import { api } from './api';

export const categoryService = {
  async listByClub(clubId) {
    const qs = clubId ? `?clubId=${encodeURIComponent(clubId)}` : '';
    const data = await api.get(`/categories${qs}`);
    return data?.data || [];
  },
  async create(payload) {
    return await api.post('/categories', payload);
  },
  async update(id, payload) {
    return await api.put(`/categories/${id}`, payload);
  },
  async remove(id) {
    return await api.delete(`/categories/${id}`);
  },
};
