import api from './api';

const BASE_PATH = '/training-management/microcycles';

export const microcycleService = {
  /**
   * Get or create microcycle for a week
   * @param {string} weekIdentifier - ISO week format "YYYY-WW"
   */
  async getOrCreate(weekIdentifier) {
    const response = await api.get(`${BASE_PATH}/${weekIdentifier}`);
    return response.data;
  },
};
