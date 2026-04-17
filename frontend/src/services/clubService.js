import { api } from './api';

export const clubService = {
  async getAll() {
    return await api.get('/clubs');
  },

  getLogoUrl(logoPath) {
    if (!logoPath) return null;
    return `/uploads/club-logos/${logoPath}`;
  },

  async getById(clubId) {
    return await api.get(`/clubs/${clubId}`);
  },

  async create(clubData) {
    return await api.post('/clubs', clubData);
  },

  async update(clubId, clubData) {
    return await api.put(`/clubs/${clubId}`, {
      name: clubData.name,
      description: clubData.description,
    });
  },

  async uploadLogo(clubId, file) {
    const formData = new FormData();
    formData.append('logo', file);
    return await api.upload(`/clubs/${clubId}/logo`, formData);
  },

  async delete(clubId) {
    return await api.delete(`/clubs/${clubId}`);
  },
};
