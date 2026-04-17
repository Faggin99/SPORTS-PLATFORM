import { api } from './api';

export const authService = {
  async login(email, password) {
    const data = await api.post('/auth/login', { email, password });
    return {
      user: data.user,
      token: data.token,
      tenant: null,
    };
  },

  async logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    return { data: { message: 'Logout realizado com sucesso' } };
  },

  async me() {
    const data = await api.get('/auth/me');
    return {
      user: {
        id: data.id,
        email: data.email,
        name: data.name || data.email?.split('@')[0] || 'Usuário',
        role: data.role || 'trainer',
        tenant_id: data.id,
        avatar_url: data.profile_photo ? `/uploads/profile-photos/${data.profile_photo}` : null,
        profile_photo: data.profile_photo,
        phone: data.phone,
        bio: data.bio,
      },
      tenant: null,
    };
  },
};
