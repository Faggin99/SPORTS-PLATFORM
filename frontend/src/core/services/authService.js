import api from './api';

const authService = {
  /**
   * Login do usuário
   */
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  /**
   * Registro de novo usuário
   */
  async register(data) {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  /**
   * Logout do usuário
   */
  async logout() {
    const response = await api.post('/auth/logout');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    return response.data;
  },

  /**
   * Recuperação de senha
   */
  async forgotPassword(email) {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  /**
   * Reset de senha
   */
  async resetPassword(data) {
    const response = await api.post('/auth/reset-password', data);
    return response.data;
  },

  /**
   * Busca dados do usuário autenticado
   */
  async me() {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export default authService;
