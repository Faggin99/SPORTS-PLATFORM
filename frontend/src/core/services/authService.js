import { supabase, getCurrentUserProfile } from '../../lib/supabase';

const authService = {
  /**
   * Login do usuário
   */
  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message || 'Falha no login');
    }

    // Buscar perfil completo do usuário
    const profile = await getCurrentUserProfile();

    if (!profile) {
      throw new Error('Perfil de usuário não encontrado');
    }

    // Armazenar informações do usuário
    localStorage.setItem('user', JSON.stringify({
      id: data.user.id,
      email: data.user.email,
      name: profile.name,
      role: profile.role,
      tenant_id: profile.tenant_id,
    }));

    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        name: profile.name,
        role: profile.role,
        tenant_id: profile.tenant_id,
      },
      token: data.session.access_token,
    };
  },

  /**
   * Registro de novo usuário
   */
  async register(data) {
    const { email, password, name, tenant_id } = data;

    // Criar usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      throw new Error(authError.message || 'Falha no registro');
    }

    // Criar perfil na tabela users
    const { error: profileError } = await supabase
      .from('users')
      .insert([
        {
          id: authData.user.id,
          email,
          name,
          tenant_id: tenant_id || 1, // Default tenant
          role: 'trainer',
        },
      ]);

    if (profileError) {
      throw new Error(profileError.message || 'Falha ao criar perfil');
    }

    return {
      user: authData.user,
      message: 'Usuário criado com sucesso',
    };
  },

  /**
   * Logout do usuário
   */
  async logout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Erro ao fazer logout:', error);
    }

    localStorage.removeItem('user');
    return { message: 'Logout realizado com sucesso' };
  },

  /**
   * Recuperação de senha
   */
  async forgotPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      throw new Error(error.message || 'Falha ao enviar email de recuperação');
    }

    return {
      message: 'Email de recuperação enviado com sucesso',
    };
  },

  /**
   * Reset de senha
   */
  async resetPassword(data) {
    const { password } = data;

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      throw new Error(error.message || 'Falha ao resetar senha');
    }

    return {
      message: 'Senha resetada com sucesso',
    };
  },

  /**
   * Busca dados do usuário autenticado
   */
  async me() {
    const profile = await getCurrentUserProfile();

    if (!profile) {
      throw new Error('Usuário não autenticado');
    }

    const { data: { user } } = await supabase.auth.getUser();

    return {
      id: user.id,
      email: user.email,
      name: profile.name,
      role: profile.role,
      tenant_id: profile.tenant_id,
      avatar_url: profile.avatar_url,
    };
  },

  /**
   * Verifica se o usuário está autenticado
   */
  async isAuthenticated() {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  },

  /**
   * Obtém a sessão atual
   */
  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },
};

export default authService;
