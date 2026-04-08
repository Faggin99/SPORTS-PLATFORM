import { supabase, getCurrentTenantId } from '../../../lib/supabase';

export const athleteService = {
  async getAll(params = {}) {
    const tenantId = await getCurrentTenantId();

    if (!tenantId) {
      throw new Error('Usuário não autenticado');
    }

    let query = supabase
      .from('athletes')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true });

    // Filtros opcionais
    if (params.group) {
      query = query.eq('group', params.group);
    }

    if (params.status) {
      query = query.eq('status', params.status);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message || 'Erro ao buscar atletas');
    }

    return data;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('athletes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(error.message || 'Erro ao buscar atleta');
    }

    return data;
  },

  async create(data) {
    const tenantId = await getCurrentTenantId();

    if (!tenantId) {
      throw new Error('Usuário não autenticado');
    }

    const { data: athlete, error } = await supabase
      .from('athletes')
      .insert([{ ...data, tenant_id: tenantId }])
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Erro ao criar atleta');
    }

    return athlete;
  },

  async update(id, data) {
    const { data: athlete, error } = await supabase
      .from('athletes')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Erro ao atualizar atleta');
    }

    return athlete;
  },

  async delete(id) {
    const { error } = await supabase
      .from('athletes')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message || 'Erro ao deletar atleta');
    }

    return { message: 'Atleta deletado com sucesso' };
  },

  async batchUpdateGroups(athletes) {
    const updates = athletes.map(athlete =>
      supabase
        .from('athletes')
        .update({ group: athlete.group })
        .eq('id', athlete.id)
    );

    const results = await Promise.all(updates);

    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      throw new Error('Erro ao atualizar grupos de atletas');
    }

    return { message: 'Grupos atualizados com sucesso' };
  },
};
