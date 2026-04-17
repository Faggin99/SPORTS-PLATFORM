const express = require('express');
const { query } = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

function getDateRange(period, startDate, endDate) {
  const now = new Date();
  let start, end;

  if (period === 'custom' && startDate && endDate) {
    start = startDate;
    end = endDate;
  } else if (period === 'week') {
    const d = new Date(now);
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() - day + 1);
    start = d.toISOString().split('T')[0];
    end = now.toISOString().split('T')[0];
  } else if (period === 'month') {
    const d = new Date(now);
    d.setUTCMonth(d.getUTCMonth() - 1);
    start = d.toISOString().split('T')[0];
    end = now.toISOString().split('T')[0];
  } else if (period === '3months') {
    const d = new Date(now);
    d.setUTCMonth(d.getUTCMonth() - 3);
    start = d.toISOString().split('T')[0];
    end = now.toISOString().split('T')[0];
  } else {
    // Default: last month
    const d = new Date(now);
    d.setUTCMonth(d.getUTCMonth() - 1);
    start = d.toISOString().split('T')[0];
    end = now.toISOString().split('T')[0];
  }

  return { start, end };
}

// GET /api/stats/training
router.get('/training', async (req, res) => {
  try {
    const { period, start_date, end_date, clubId } = req.query;
    const { start, end } = getDateRange(period, start_date, end_date);

    // Get sessions with activities in date range
    let sessionSql = `
      SELECT s.id, s.date, s.day_name, s.session_type,
             m.club_id
      FROM training_sessions s
      JOIN training_microcycles m ON s.microcycle_id = m.id
      WHERE s.tenant_id = $1 AND s.date >= $2 AND s.date <= $3
    `;
    const sessionParams = [req.user.id, start, end];
    let paramIdx = 4;

    if (clubId) {
      sessionSql += ` AND m.club_id = $${paramIdx++}`;
      sessionParams.push(clubId);
    }

    const sessionsResult = await query(sessionSql, sessionParams);
    const sessionIds = sessionsResult.rows.map(s => s.id);

    if (sessionIds.length === 0) {
      return res.json({
        totalSessions: 0,
        totalMinutes: 0,
        avgMinutesPerSession: 0,
        contentDistribution: [],
        durationByDay: [],
        topTitles: [],
        groupDistribution: []
      });
    }

    // Get activities for these sessions
    const activitiesResult = await query(
      `SELECT a.*, b.session_id, t.title as title_name
       FROM training_activities a
       JOIN training_activity_blocks b ON a.block_id = b.id
       LEFT JOIN activity_titles t ON a.title_id = t.id
       WHERE b.session_id = ANY($1) AND a.tenant_id = $2`,
      [sessionIds, req.user.id]
    );

    const totalMinutes = activitiesResult.rows.reduce((sum, a) => sum + (a.duration_minutes || 0), 0);

    // Sessions that have at least one activity
    const sessionsWithActivities = new Set(activitiesResult.rows.map(a => a.session_id));
    const totalSessions = sessionsWithActivities.size;

    // Content distribution (sum of duration_minutes per content)
    const colorMap = {
      'Bola Parada Ofensiva': '#8b5cf6',
      'Bola Parada Defensiva': '#ec4899',
      'Transição Ofensiva': '#10b981',
      'Transição Defensiva': '#f59e0b',
      'Organização Ofensiva': '#3b82f6',
      'Organização Defensiva': '#ef4444',
      'Físico': '#06b6d4',
      'Técnico': '#14b8a6',
      'Tático': '#a855f7',
      'Recreativo': '#84cc16',
      'Todos': '#6366f1',
    };
    const activityIds = activitiesResult.rows.map(a => a.id);
    let contentDistribution = [];
    // Complementary stats - transversal training (Fisico, Tecnico) with activity details
    const complementaryStats = {
      fisico: { minutes: 0, activities: [] },
      tecnico: { minutes: 0, activities: [] },
      totalMinutes: 0,
    };
    if (activityIds.length > 0) {
      const contentsResult = await query(
        `SELECT c.name, c.abbreviation, tac.activity_id
         FROM training_activity_contents tac
         JOIN contents c ON tac.content_id = c.id
         WHERE tac.activity_id = ANY($1)`,
        [activityIds]
      );
      // Map activity data
      const activityInfo = {};
      for (const a of activitiesResult.rows) {
        const session = sessionsResult.rows.find(s => s.id === a.session_id);
        activityInfo[a.id] = {
          id: a.id,
          duration: a.duration_minutes || 0,
          title: a.title_name || null,
          description: a.description || null,
          date: session?.date || null,
          day_name: session?.day_name || null,
        };
      }
      // Accumulate duration per content (excluding FIS and TEC from tactical pie)
      const contentData = {};
      const fisActivityIds = new Set();
      const tecActivityIds = new Set();
      for (const r of contentsResult.rows) {
        const info = activityInfo[r.activity_id];
        if (!info) continue;
        if (r.abbreviation === 'FIS') {
          if (!fisActivityIds.has(r.activity_id)) {
            complementaryStats.fisico.minutes += info.duration;
            complementaryStats.fisico.activities.push(info);
            fisActivityIds.add(r.activity_id);
          }
          continue;
        }
        if (r.abbreviation === 'TEC') {
          if (!tecActivityIds.has(r.activity_id)) {
            complementaryStats.tecnico.minutes += info.duration;
            complementaryStats.tecnico.activities.push(info);
            tecActivityIds.add(r.activity_id);
          }
          continue;
        }
        if (!contentData[r.name]) {
          contentData[r.name] = { name: r.name, abbr: r.abbreviation || r.name.slice(0, 6), value: 0, color: colorMap[r.name] || '#6b7280' };
        }
        contentData[r.name].value += info.duration;
      }
      contentDistribution = Object.values(contentData).sort((a, b) => b.value - a.value);
      complementaryStats.totalMinutes = complementaryStats.fisico.minutes + complementaryStats.tecnico.minutes;
      // Sort activities by date descending
      complementaryStats.fisico.activities.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      complementaryStats.tecnico.activities.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    }

    // Duration by day
    const durationByDayMap = {};
    for (const activity of activitiesResult.rows) {
      const session = sessionsResult.rows.find(s => s.id === activity.session_id);
      if (session) {
        const day = session.day_name;
        durationByDayMap[day] = (durationByDayMap[day] || 0) + (activity.duration_minutes || 0);
      }
    }
    const durationByDay = Object.entries(durationByDayMap).map(([day, minutes]) => ({ day, minutes }));

    // Top titles
    const titleCounts = {};
    for (const activity of activitiesResult.rows) {
      if (activity.title_name) {
        titleCounts[activity.title_name] = (titleCounts[activity.title_name] || 0) + 1;
      }
    }
    const topTitles = Object.entries(titleCounts)
      .map(([title, count]) => ({ title, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Group distribution (sum minutes per group)
    const groupMinutes = {};
    for (const activity of activitiesResult.rows) {
      if (activity.groups) {
        const groups = typeof activity.groups === 'string' ? JSON.parse(activity.groups) : activity.groups;
        if (Array.isArray(groups)) {
          const duration = activity.duration_minutes || 0;
          for (const g of groups) {
            groupMinutes[g] = (groupMinutes[g] || 0) + duration;
          }
        }
      }
    }
    const groupDistribution = Object.entries(groupMinutes)
      .map(([group, minutes]) => ({ group, minutes }))
      .sort((a, b) => b.minutes - a.minutes);

    res.json({
      totalSessions,
      totalMinutes,
      avgMinutesPerSession: totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0,
      contentDistribution,
      durationByDay,
      topTitles,
      groupDistribution,
      complementaryStats,
    });
  } catch (err) {
    console.error('Training stats error:', err);
    res.status(500).json({ error: 'Failed to get training stats' });
  }
});

// GET /api/stats/games
router.get('/games', async (req, res) => {
  try {
    const { start_date, end_date, clubId } = req.query;
    const { start, end } = getDateRange('custom', start_date, end_date);

    let sessionSql = `
      SELECT s.id, s.date, s.opponent_name, s.session_type, s.match_duration,
             m.club_id
      FROM training_sessions s
      JOIN training_microcycles m ON s.microcycle_id = m.id
      WHERE s.tenant_id = $1 AND s.date >= $2 AND s.date <= $3
        AND s.session_type = 'match'
    `;
    const sessionParams = [req.user.id, start, end];
    let paramIdx = 4;

    if (clubId) {
      sessionSql += ` AND m.club_id = $${paramIdx++}`;
      sessionParams.push(clubId);
    }

    sessionSql += ' ORDER BY s.date ASC';

    const sessionsResult = await query(sessionSql, sessionParams);
    const sessionIds = sessionsResult.rows.map(s => s.id);

    if (sessionIds.length === 0) {
      return res.json({
        totalMatches: 0,
        totalGoalsScored: 0,
        totalGoalsConceded: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsScoredByType: [],
        goalsConcededByType: [],
        goalsScoredByMinute: [],
        goalsConcededByMinute: [],
        redCards: 0,
        matchesHistory: [],
        topScorers: [],
        avgGoalsScored: 0,
        avgGoalsConceded: 0
      });
    }

    // Get all events for these sessions
    const eventsResult = await query(
      `SELECT me.*, a.name as athlete_name, a.jersey_number
       FROM match_events me
       LEFT JOIN athletes a ON me.player_id = a.id
       WHERE me.session_id = ANY($1) AND me.tenant_id = $2`,
      [sessionIds, req.user.id]
    );

    const events = eventsResult.rows;
    const totalMatches = sessionsResult.rows.length;

    // Goals scored and conceded (using event_type from frontend: goal_scored, goal_conceded)
    const goalsScored = events.filter(e => e.event_type === 'goal_scored');
    const goalsConceded = events.filter(e => e.event_type === 'goal_conceded');
    const totalGoalsScored = goalsScored.length;
    const totalGoalsConceded = goalsConceded.length;

    // Goals by type - with labels and colors
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

    function buildTypeArray(goals) {
      const byType = {};
      for (const g of goals) {
        const type = g.goal_type || 'unknown';
        byType[type] = (byType[type] || 0) + 1;
      }
      return Object.entries(byType)
        .map(([type, count]) => ({
          type,
          name: goalTypeLabels[type] || type,
          value: count,
          color: goalTypeColors[type] || '#6b7280',
        }))
        .sort((a, b) => b.value - a.value);
    }

    const goalsScoredByType = buildTypeArray(goalsScored);
    const goalsConcededByType = buildTypeArray(goalsConceded);

    // Goals by minute intervals
    const minuteRanges = [
      { key: '0-14', label: '0-14\'', min: 0, max: 14, color: '#22c55e' },
      { key: '15-29', label: '15-29\'', min: 15, max: 29, color: '#3b82f6' },
      { key: '30-45+', label: '30-45+\'', min: 30, max: 52, color: '#f59e0b' },
      { key: '46-59', label: '46-59\'', min: 46, max: 59, color: '#8b5cf6' },
      { key: '60-74', label: '60-74\'', min: 60, max: 74, color: '#ec4899' },
      { key: '75-90+', label: '75-90+\'', min: 75, max: 120, color: '#ef4444' },
    ];

    function getMinuteRange(minute) {
      for (const range of minuteRanges) {
        if (minute >= range.min && minute <= range.max) return range;
      }
      return minuteRanges[minuteRanges.length - 1];
    }

    function buildMinuteArray(goals) {
      const byRange = {};
      minuteRanges.forEach(r => { byRange[r.key] = 0; });
      for (const g of goals) {
        if (g.minute != null) {
          const range = getMinuteRange(g.minute);
          byRange[range.key] += 1;
        }
      }
      return minuteRanges.map(range => ({
        key: range.key,
        name: range.label,
        value: byRange[range.key] || 0,
        color: range.color,
      }));
    }

    const goalsScoredByMinute = buildMinuteArray(goalsScored);
    const goalsConcededByMinute = buildMinuteArray(goalsConceded);

    // Red cards
    const redCards = events.filter(e => e.event_type === 'red_card' && e.team === 'own').length;

    // Match history with results
    const matchesHistory = [];
    let wins = 0, draws = 0, losses = 0;

    for (const session of sessionsResult.rows) {
      const sessionEvents = events.filter(e => e.session_id === session.id);
      const scored = sessionEvents.filter(e => e.event_type === 'goal_scored').length;
      const conceded = sessionEvents.filter(e => e.event_type === 'goal_conceded').length;

      let result;
      if (scored > conceded) { result = 'win'; wins++; }
      else if (scored < conceded) { result = 'loss'; losses++; }
      else { result = 'draw'; draws++; }

      matchesHistory.push({
        session_id: session.id,
        date: session.date,
        opponent: session.opponent_name,
        goals_scored: scored,
        goals_conceded: conceded,
        result
      });
    }

    // Top scorers
    const scorerCounts = {};
    for (const g of goalsScored) {
      if (g.athlete_name) {
        if (!scorerCounts[g.athlete_id]) {
          scorerCounts[g.athlete_id] = { name: g.athlete_name, jersey_number: g.jersey_number, goals: 0 };
        }
        scorerCounts[g.athlete_id].goals++;
      }
    }
    const topScorers = Object.values(scorerCounts).sort((a, b) => b.goals - a.goals).slice(0, 10);

    res.json({
      totalMatches,
      totalGoalsScored,
      totalGoalsConceded,
      wins,
      draws,
      losses,
      goalsScoredByType,
      goalsConcededByType,
      goalsScoredByMinute,
      goalsConcededByMinute,
      redCards,
      matchesHistory,
      topScorers,
      avgGoalsScored: totalMatches > 0 ? Math.round((totalGoalsScored / totalMatches) * 100) / 100 : 0,
      avgGoalsConceded: totalMatches > 0 ? Math.round((totalGoalsConceded / totalMatches) * 100) / 100 : 0
    });
  } catch (err) {
    console.error('Game stats error:', err);
    res.status(500).json({ error: 'Failed to get game stats' });
  }
});

module.exports = router;
