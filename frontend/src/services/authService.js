import { supabase } from '../lib/supabase';

export const authService = {
  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message || 'Falha no login');
    }

    // Usar dados do auth.users (não precisa de tabela users separada)
    const user = data.user;

    // Retornar no formato esperado pelo AuthContext
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
        role: 'trainer', // Sempre trainer para este sistema
        tenant_id: user.id, // tenant_id é o próprio user.id
      },
      token: data.session.access_token,
      tenant: null,
    };
  },

  async logout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Erro ao fazer logout:', error);
    }

    localStorage.removeItem('user');
    return { data: { message: 'Logout realizado com sucesso' } };
  },

  async me() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
        role: 'trainer',
        tenant_id: user.id,
        avatar_url: user.user_metadata?.avatar_url || null,
      },
      tenant: null,
    };
  },
};
