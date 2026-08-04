// Converte payloads da api-football pro formato interno do TactiPlan
// (training_sessions / match_events). Isolar o mapping aqui significa que se
// um dia trocarmos o provedor (TheSportsDB, api-futebol.com.br), só esse
// arquivo muda.

// fixture: shape esperado de /fixtures
// ourTeamId: ID do CLUBE como cadastrado na api-football (usamos pra saber
//   se foi jogo em casa ou fora, e qual o lado adversário)
function mapFixtureToSession(fixture, ourTeamId) {
  if (!fixture?.fixture?.id || !fixture?.teams) return null;

  const ourSide = fixture.teams.home?.id === ourTeamId ? 'home' :
                  fixture.teams.away?.id === ourTeamId ? 'away' : null;
  if (!ourSide) return null;

  const opponent = ourSide === 'home' ? fixture.teams.away : fixture.teams.home;
  const ourGoals = ourSide === 'home' ? fixture.goals?.home : fixture.goals?.away;
  const oppGoals = ourSide === 'home' ? fixture.goals?.away : fixture.goals?.home;

  // status.short: NS=not started, 1H/HT/2H/ET/P=live, FT=finalizado, PST=adiado, CANC
  const status = fixture.fixture?.status?.short || 'NS';
  const finished = ['FT', 'AET', 'PEN'].includes(status);

  // Data ISO → 'YYYY-MM-DD' (training_sessions.date é DATE)
  const date = fixture.fixture?.date ? String(fixture.fixture.date).split('T')[0] : null;

  // Rodada vem em fixture.league.round (ex: "Regular Season - 5"). Extrai o número.
  const roundRaw = fixture.league?.round || '';
  const roundMatch = roundRaw.match(/(\d+)/);
  const matchRound = roundMatch ? roundMatch[1] : null;

  return {
    external_event_id: String(fixture.fixture.id),
    external_provider: 'api-football',
    date,
    session_type: 'match',
    opponent_name: opponent?.name || null,
    match_round: matchRound,
    match_location: ourSide, // 'home' | 'away'
    venue_name: fixture.fixture?.venue?.name || null,
    // Placar — só preencher se o jogo terminou
    goals_scored: finished ? (ourGoals ?? null) : null,
    goals_conceded: finished ? (oppGoals ?? null) : null,
    finished,
    status,
    // Mantemos o payload bruto pra reprocessar sem chamar a API de novo
    external_payload: fixture,
  };
}

// Eventos da api-football → match_events do TactiPlan.
// Apenas tipos que já suportamos: Goal, Card, subst.
function mapFixtureEvents(events, ourTeamId, matchDuration = 90) {
  if (!Array.isArray(events)) return [];

  return events.map((ev) => {
    const isOurs = ev.team?.id === ourTeamId;
    const minute = Number.isFinite(ev.time?.elapsed) ? ev.time.elapsed : null;
    if (minute == null) return null;
    const clamped = Math.max(0, Math.min(matchDuration, minute + (ev.time?.extra || 0)));

    if (ev.type === 'Goal') {
      // detail: "Normal Goal" | "Penalty" | "Own Goal" | "Missed Penalty"
      const isPenalty = ev.detail === 'Penalty';
      const isOwnGoal = ev.detail === 'Own Goal';
      // Own goal inverte: gol contra do adversário conta como nosso, e vice-versa
      const ourGoal = isOwnGoal ? !isOurs : isOurs;
      return {
        event_type: ourGoal ? 'goal_scored' : 'goal_conceded',
        team: ourGoal ? 'own' : 'opponent',
        goal_type: isPenalty ? 'penalty' : (ourGoal ? 'offensive_org' : null),
        minute: clamped,
        external_player_name: ev.player?.name || null,
        external_assist_name: ev.assist?.name || null,
      };
    }
    if (ev.type === 'Card') {
      const isRed = ev.detail === 'Red Card' || ev.detail === 'Second Yellow card';
      return {
        event_type: isRed ? 'red_card' : 'yellow_card',
        team: isOurs ? 'own' : 'opponent',
        minute: clamped,
        external_player_name: ev.player?.name || null,
      };
    }
    return null;
  }).filter(Boolean);
}

module.exports = {
  mapFixtureToSession,
  mapFixtureEvents,
};
