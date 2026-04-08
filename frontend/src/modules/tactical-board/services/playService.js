import { supabase, getCurrentTenantId } from '../../../lib/supabase';

export const playService = {
  async getAll(clubId = null) {
    const tenantId = await getCurrentTenantId();

    if (!tenantId) {
      throw new Error('Usuário não autenticado');
    }

    let query = supabase
      .from('tactical_plays')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false });

    if (clubId) {
      query = query.eq('club_id', clubId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message || 'Erro ao buscar jogadas');
    }

    return data;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('tactical_plays')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(error.message || 'Erro ao buscar jogada');
    }

    return data;
  },

  async create(data) {
    const tenantId = await getCurrentTenantId();

    if (!tenantId) {
      throw new Error('Usuário não autenticado');
    }

    const { data: play, error } = await supabase
      .from('tactical_plays')
      .insert([{ ...data, tenant_id: tenantId }])
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Erro ao criar jogada');
    }

    return play;
  },

  async update(id, data) {
    const { data: play, error } = await supabase
      .from('tactical_plays')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Erro ao atualizar jogada');
    }

    return play;
  },

  async delete(id) {
    const { error } = await supabase
      .from('tactical_plays')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message || 'Erro ao deletar jogada');
    }

    return { message: 'Jogada deletada com sucesso' };
  },
};
