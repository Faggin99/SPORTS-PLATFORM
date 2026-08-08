import { api } from './api';

export const homeService = {
  async getDashboard(clubId = null) {
    const qs = clubId ? `?clubId=${encodeURIComponent(clubId)}` : '';
    return await api.get(`/home/dashboard${qs}`);
  },
  async dismissAnnouncement(id) {
    return await api.post(`/announcements/${id}/dismiss`, {});
  },
};
