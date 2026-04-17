import { api } from './api';

export const themeService = {
  async getTheme(month, clubId) {
    try {
      return await api.get(`/themes?month=${month}&club_id=${clubId}`);
    } catch (error) {
      // Return null if no theme found (404)
      if (error.message?.includes('404')) return null;
      throw error;
    }
  },

  async saveTheme(data) {
    return await api.put('/themes', data);
  },

  async deleteTheme(id) {
    return await api.delete(`/themes/${id}`);
  },

  async getAdherence(month, clubId) {
    return await api.get(`/themes/adherence?month=${month}&club_id=${clubId}`);
  },
};
