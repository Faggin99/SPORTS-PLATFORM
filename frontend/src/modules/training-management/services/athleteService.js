import api from './api';

const BASE_PATH = '/training-management/athletes';

export const athleteService = {
  async getAll(params = {}) {
    const response = await api.get(BASE_PATH, { params });
    return response.data;
  },

  async getById(id) {
    const response = await api.get(`${BASE_PATH}/${id}`);
    return response.data;
  },

  async create(data) {
    const response = await api.post(BASE_PATH, data);
    return response.data;
  },

  async update(id, data) {
    const response = await api.put(`${BASE_PATH}/${id}`, data);
    return response.data;
  },

  async delete(id) {
    const response = await api.delete(`${BASE_PATH}/${id}`);
    return response.data;
  },

  async batchUpdateGroups(athletes) {
    const response = await api.post(`${BASE_PATH}/batch-update-groups`, { athletes });
    return response.data;
  },
};
