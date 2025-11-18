import api from './api';

const BASE_PATH = '/training-management/activities';

export const activityService = {
  async create(activityData) {
    const response = await api.post(BASE_PATH, activityData);
    return response.data;
  },

  async update(activityId, activityData) {
    const response = await api.put(`${BASE_PATH}/${activityId}`, activityData);
    return response.data;
  },

  async delete(activityId) {
    await api.delete(`${BASE_PATH}/${activityId}`);
  },
};
