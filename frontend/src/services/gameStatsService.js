import { supabase, getCurrentTenantId } from '../lib/supabase';

export const gameStatsService = {
  async getStats(params = {}) {
    const tenantId = await getCurrentTenantId();

    if (!tenantId) {
      throw new Error('Usuário não autenticado');
    }

    const { start_date, end_date, clubId } = params;

    // Buscar todas as sessões de jogo no período
    let sessionsQuery = supabase
      .from('training_sessions')
      .select('id, date, opponent_name, match_duration, session_type')
      .eq('session_type', 'match')
      .order('date', { ascending: true });

    if (start_date) {
      sessionsQuery = sessionsQuery.gte('date', start_date);
    }
    if (end_date) {
      sessionsQuery = sessionsQuery.lte('date', end_date);
    }

    const { data: sessions, error: sessionsError } = await sessionsQuery;

    if (sessionsError) {
      console.error('Erro ao buscar sessões:', sessionsError);
      throw new Error(sessionsError.message);
    }

    if (!sessions || sessions.length === 0) {
      return {
        totalMatches: 0,
        totalGoalsScored: 0,
        totalGoalsConceded: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsScoredByType: [],
        goalsConcededByType: [],
        redCards: 0,
        matchesHistory: [],
        topScorers: [],
        avgGoalsScored: 0,
        avgGoalsConceded: 0,
      };
    }

    const sessionIds = sessions.map(s => s.id);

    // Buscar eventos dos jogos
    const { data: events, error: eventsError } = await supabase
      .from('match_events')
      .select(`
        id,
        session_id,
        event_type,
        team,
        goal_type,
        minute,
        player_id,
        player:athletes(id, name, jersey_number)
      `)
      .in('session_id', sessionIds)
      .eq('tenant_id', tenantId);

    if (eventsError) {
      console.error('Erro ao buscar eventos:', eventsError);
    }

    const allEvents = events || [];

    // Processar estatísticas
    const goalsScored = allEvents.filter(e => e.event_type === 'goal_scored');
    const goalsConceded = allEvents.filter(e => e.event_type === 'goal_conceded');
    const redCards = allEvents.filter(e => e.event_type === 'red_card' && e.team === 'own');

    // Gols por tipo (feitos)
    const goalsScoredByType = {};
    goalsScored.forEach(g => {
      const type = g.goal_type || 'unknown';
      goalsScoredByType[type] = (goalsScoredByType[type] || 0) + 1;
    });

    // Gols por tipo (tomados)
    const goalsConcededByType = {};
    goalsConceded.forEach(g => {
      const type = g.goal_type || 'unknown';
      goalsConcededByType[type] = (goalsConcededByType[type] || 0) + 1;
    });

    // Histórico de jogos com resultados
    const matchesHistory = sessions.map(session => {
      const sessionGoalsScored = goalsScored.filter(g => g.session_id === session.id).length;
      const sessionGoalsConceded = goalsConceded.filter(g => g.session_id === session.id).length;

      let result = 'draw';
      if (sessionGoalsScored > sessionGoalsConceded) result = 'win';
      else if (sessionGoalsScored < sessionGoalsConceded) result = 'loss';

      return {
        id: session.id,
        date: session.date,
        opponent: session.opponent_name || 'Desconhecido',
        goalsScored: sessionGoalsScored,
        goalsConceded: sessionGoalsConceded,
        result,
      };
    });

    // Contagem de resultados
    const wins = matchesHistory.filter(m => m.result === 'win').length;
    const draws = matchesHistory.filter(m => m.result === 'draw').length;
    const losses = matchesHistory.filter(m => m.result === 'loss').length;

    // Converter para array para gráficos
    const goalTypeLabels = {
      'offensive_org': 'Org. Ofensiva',
      'offensive_transition': 'Transição Of.',
      'free_kick': 'Falta',
      'corner': 'Escanteio',
      'penalty': 'Pênalti',
      'unknown': 'Não definido',
    };

    const goalTypeColors = {
      'offensive_org': '#22c55e',
      'offensive_transition': '#3b82f6',
      'free_kick': '#f59e0b',
      'corner': '#8b5cf6',
      'penalty': '#ef4444',
      'unknown': '#6b7280',
    };

    const goalsScoredByTypeArray = Object.entries(goalsScoredByType).map(([type, count]) => ({
      name: goalTypeLabels[type] || type,
      value: count,
      color: goalTypeColors[type] || '#6b7280',
      type,
    })).sort((a, b) => b.value - a.value);

    const goalsConcededByTypeArray = Object.entries(goalsConcededByType).map(([type, count]) => ({
      name: goalTypeLabels[type] || type,
      value: count,
      color: goalTypeColors[type] || '#6b7280',
      type,
    })).sort((a, b) => b.value - a.value);

    // Gols por faixa de minuto
    const minuteRanges = [
      { key: '0-14', label: '0-14\'', min: 0, max: 14, color: '#22c55e' },
      { key: '15-29', label: '15-29\'', min: 15, max: 29, color: '#3b82f6' },
      { key: '30-45+', label: '30-45+\'', min: 30, max: 52, color: '#f59e0b' }, // até 45+7
      { key: '46-59', label: '46-59\'', min: 46, max: 59, color: '#8b5cf6' },
      { key: '60-74', label: '60-74\'', min: 60, max: 74, color: '#ec4899' },
      { key: '75-90+', label: '75-90+\'', min: 75, max: 120, color: '#ef4444' }, // até 90+30
    ];

    const getMinuteRange = (minute) => {
      for (const range of minuteRanges) {
        if (minute >= range.min && minute <= range.max) {
          return range.key;
        }
      }
      return '75-90+'; // fallback para minutos além do esperado
    };

    // Gols feitos por minuto
    const goalsScoredByMinute = {};
    minuteRanges.forEach(r => { goalsScoredByMinute[r.key] = 0; });
    goalsScored.forEach(g => {
      const range = getMinuteRange(g.minute || 0);
      goalsScoredByMinute[range] = (goalsScoredByMinute[range] || 0) + 1;
    });

    // Gols tomados por minuto
    const goalsConcededByMinute = {};
    minuteRanges.forEach(r => { goalsConcededByMinute[r.key] = 0; });
    goalsConceded.forEach(g => {
      const range = getMinuteRange(g.minute || 0);
      goalsConcededByMinute[range] = (goalsConcededByMinute[range] || 0) + 1;
    });

    const goalsScoredByMinuteArray = minuteRanges.map(range => ({
      name: range.label,
      value: goalsScoredByMinute[range.key] || 0,
      color: range.color,
      key: range.key,
    }));

    const goalsConcededByMinuteArray = minuteRanges.map(range => ({
      name: range.label,
      value: goalsConcededByMinute[range.key] || 0,
      color: range.color,
      key: range.key,
    }));

    return {
      totalMatches: sessions.length,
      totalGoalsScored: goalsScored.length,
      totalGoalsConceded: goalsConceded.length,
      wins,
      draws,
      losses,
      goalsScoredByType: goalsScoredByTypeArray,
      goalsConcededByType: goalsConcededByTypeArray,
      goalsScoredByMinute: goalsScoredByMinuteArray,
      goalsConcededByMinute: goalsConcededByMinuteArray,
      redCards: redCards.length,
      matchesHistory,
      avgGoalsScored: sessions.length > 0 ? (goalsScored.length / sessions.length).toFixed(1) : 0,
      avgGoalsConceded: sessions.length > 0 ? (goalsConceded.length / sessions.length).toFixed(1) : 0,
    };
  },
};
