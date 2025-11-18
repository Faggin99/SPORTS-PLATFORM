import api from './api';

const BASE_PATH = '/training-management/sessions';

export const sessionService = {
  async get(sessionId) {
    const response = await api.get(`${BASE_PATH}/${sessionId}`);
    return response.data;
  },

  async update(sessionId, blocks) {
    const response = await api.put(`${BASE_PATH}/${sessionId}`, { blocks });
    return response.data;
  },
};
