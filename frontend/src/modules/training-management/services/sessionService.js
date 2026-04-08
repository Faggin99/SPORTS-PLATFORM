import { supabase } from '../../../lib/supabase';

export const sessionService = {
  async get(sessionId) {
    // Buscar sessão com todos os dados relacionados
    const { data: session, error: sessionError } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      throw new Error(sessionError.message || 'Erro ao buscar sessão');
    }

    // Buscar blocos de atividades
    const { data: blocks, error: blocksError } = await supabase
      .from('training_activity_blocks')
      .select(`
        *,
        activities:training_activities(
          *,
          title:activity_titles(*),
          stages:training_activity_stages(*),
          contents:training_activity_contents(
            content:contents(*)
          ),
          files:training_activity_files(*)
        )
      `)
      .eq('session_id', sessionId)
      .order('order', { ascending: true });

    if (blocksError) {
      throw new Error(blocksError.message || 'Erro ao buscar blocos');
    }

    return {
      ...session,
      blocks: blocks || [],
    };
  },

  async update(sessionId, blocks) {
    // Esta função precisa atualizar sessão, blocos, atividades, etc
    // Por enquanto vou implementar uma versão simplificada

    // 1. Deletar blocos existentes (cascade irá deletar atividades)
    await supabase
      .from('training_activity_blocks')
      .delete()
      .eq('session_id', sessionId);

    // 2. Inserir novos blocos e atividades
    for (const block of blocks) {
      const { data: newBlock, error: blockError } = await supabase
        .from('training_activity_blocks')
        .insert([{
          session_id: sessionId,
          name: block.name,
          order: block.order,
        }])
        .select()
        .single();

      if (blockError) {
        throw new Error(blockError.message || 'Erro ao criar bloco');
      }

      // Inserir atividades do bloco
      if (block.activities && block.activities.length > 0) {
        const activitiesToInsert = block.activities.map((activity, index) => ({
          block_id: newBlock.id,
          title_id: activity.title_id,
          description: activity.description,
          groups: activity.groups || [],
          is_rest: activity.is_rest || false,
          duration_minutes: activity.duration_minutes,
          tenant_id: 1, // TODO: pegar do contexto
        }));

        const { error: activitiesError } = await supabase
          .from('training_activities')
          .insert(activitiesToInsert);

        if (activitiesError) {
          throw new Error(activitiesError.message || 'Erro ao criar atividades');
        }
      }
    }

    // Retornar sessão atualizada
    return await this.get(sessionId);
  },
};
