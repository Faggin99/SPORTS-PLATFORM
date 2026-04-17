import { api } from '../../../services/api';

export const activityService = {
  async create(activityData) {
    return await api.post('/activities', activityData);
  },

  async update(activityId, activityData) {
    return await api.put(`/activities/${activityId}`, activityData);
  },

  async delete(activityId) {
    return await api.delete(`/activities/${activityId}`);
  },
};
