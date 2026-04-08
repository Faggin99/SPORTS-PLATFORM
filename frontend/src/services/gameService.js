import { supabase, getCurrentTenantId } from '../lib/supabase';

export const gameService = {
  // Buscar dados completos de um jogo
  async getMatchData(sessionId) {
    const tenantId = await getCurrentTenantId();

    if (!tenantId) {
      throw new Error('Usuário não autenticado');
    }

    // Buscar jogadores convocados
    const { data: players, error: playersError } = await supabase
      .from('match_players')
      .select(`
        *,
        athlete:athletes(id, name, jersey_number, position, photo_url)
      `)
      .eq('session_id', sessionId)
      .eq('tenant_id', tenantId)
      .order('status', { ascending: true });

    if (playersError) {
      console.error('Erro ao buscar jogadores:', playersError);
      throw new Error(playersError.message || 'Erro ao buscar jogadores do jogo');
    }

    // Buscar eventos do jogo
    const { data: events, error: eventsError } = await supabase
      .from('match_events')
      .select(`
        id,
        session_id,
        tenant_id,
        event_type,
        team,
        goal_type,
        minute,
        player_id,
        notes,
        created_at,
        player:athletes(id, name, jersey_number)
      `)
      .eq('session_id', sessionId)
      .eq('tenant_id', tenantId)
      .order('minute', { ascending: true });

    if (eventsError) {
      console.error('Erro ao buscar eventos:', eventsError);
      throw new Error(eventsError.message || 'Erro ao buscar eventos do jogo');
    }

    return {
      players: players || [],
      events: events || [],
    };
  },

  // Salvar jogadores convocados
  async saveMatchPlayers(sessionId, players) {
    const tenantId = await getCurrentTenantId();

    if (!tenantId) {
      throw new Error('Usuário não autenticado');
    }

    // Deletar jogadores existentes
    await supabase
      .from('match_players')
      .delete()
      .eq('session_id', sessionId)
      .eq('tenant_id', tenantId);

    // Inserir novos jogadores
    if (players && players.length > 0) {
      const playersToInsert = players.map(p => ({
        session_id: sessionId,
        athlete_id: p.athlete_id,
        tenant_id: tenantId,
        status: p.status || 'starter',
        minutes_played: p.minutes_played || 0,
      }));

      const { error } = await supabase
        .from('match_players')
        .insert(playersToInsert);

      if (error) {
        console.error('Erro ao salvar jogadores:', error);
        throw new Error(error.message || 'Erro ao salvar jogadores');
      }
    }

    return { success: true };
  },

  // Salvar eventos do jogo
  async saveMatchEvents(sessionId, events) {
    const tenantId = await getCurrentTenantId();

    if (!tenantId) {
      throw new Error('Usuário não autenticado');
    }

    // Deletar eventos existentes
    await supabase
      .from('match_events')
      .delete()
      .eq('session_id', sessionId)
      .eq('tenant_id', tenantId);

    // Inserir novos eventos
    if (events && events.length > 0) {
      const eventsToInsert = events.map(e => ({
        session_id: sessionId,
        tenant_id: tenantId,
        event_type: e.event_type,
        team: e.team,
        goal_type: e.goal_type || null,
        minute: e.minute,
        player_id: e.player_id || null,
        notes: e.notes || null,
      }));

      const { error } = await supabase
        .from('match_events')
        .insert(eventsToInsert);

      if (error) {
        console.error('Erro ao salvar eventos:', error);
        throw new Error(error.message || 'Erro ao salvar eventos');
      }
    }

    return { success: true };
  },

  // Atualizar dados da sessão (adversário e duração)
  async updateMatchInfo(sessionId, data) {
    const { error } = await supabase
      .from('training_sessions')
      .update({
        opponent_name: data.opponent_name,
        match_duration: data.match_duration,
      })
      .eq('id', sessionId);

    if (error) {
      console.error('Erro ao atualizar sessão:', error);
      throw new Error(error.message || 'Erro ao atualizar informações do jogo');
    }

    return { success: true };
  },

  // Salvar todos os dados do jogo de uma vez
  async saveAllMatchData(sessionId, data) {
    try {
      // Atualizar info básica
      await this.updateMatchInfo(sessionId, {
        opponent_name: data.opponent_name,
        match_duration: data.match_duration,
      });

      // Salvar jogadores
      await this.saveMatchPlayers(sessionId, data.players);

      // Salvar eventos
      await this.saveMatchEvents(sessionId, data.events);

      return { success: true };
    } catch (error) {
      console.error('Erro ao salvar dados do jogo:', error);
      throw error;
    }
  },
};
