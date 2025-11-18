import { api } from './api';

export const authService = {
  async login(email, password) {
    return await api.post('/auth/login', { email, password });
  },

  async logout() {
    return await api.post('/auth/logout');
  },

  async me() {
    return await api.get('/auth/me');
  },
};
