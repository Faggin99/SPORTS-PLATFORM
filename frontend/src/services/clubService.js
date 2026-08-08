import { api } from './api';

export const clubService = {
  async getAll() {
    return await api.get('/clubs');
  },

  getLogoUrl(logoPath) {
    if (!logoPath) return null;
    if (logoPath.startsWith('http://') || logoPath.startsWith('https://')) return logoPath;
    if (logoPath.startsWith('/')) return logoPath;
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
      modality: clubData.modality,
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
