const express = require('express');
const { query, pool } = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

const BLOCK_NAMES = ['Aquecimento', 'Preparatório', 'Atividade 1', 'Atividade 2', 'Atividade 3', 'Complementos'];
const DAY_NAMES = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

function getWeekDates(weekIdentifier) {
  // Support both "2026-W15" and "2026-15" formats
  const parts = weekIdentifier.includes('-W')
    ? weekIdentifier.split('-W')
    : weekIdentifier.split('-');
  const [year, week] = parts.map(Number);

  // ISO 8601: week 1 contains January 4th
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7; // Monday = 1, Sunday = 7
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7);

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  return { startDate: monday, endDate: sunday };
}

async function getFullMicrocycle(microcycleId, tenantId) {
  const microcycleResult = await query(
    'SELECT * FROM training_microcycles WHERE id = $1 AND tenant_id = $2',
    [microcycleId, tenantId]
  );
  if (microcycleResult.rows.length === 0) return null;

  const microcycle = microcycleResult.rows[0];

  const sessionsResult = await query(
    `SELECT * FROM training_sessions WHERE microcycle_id = $1 ORDER BY date ASC`,
    [microcycleId]
  );

  const sessions = [];
  for (const session of sessionsResult.rows) {
    const blocksResult = await query(
      `SELECT * FROM training_activity_blocks WHERE session_id = $1 ORDER BY "order" ASC`,
      [session.id]
    );

    const blocks = [];
    for (const block of blocksResult.rows) {
      const activitiesResult = await query(
        `SELECT a.*, t.title as title_name, t.description as title_description
         FROM training_activities a
         LEFT JOIN activity_titles t ON a.title_id = t.id
         WHERE a.block_id = $1
         ORDER BY a.created_at ASC`,
        [block.id]
      );

      const activities = [];
      for (const activity of activitiesResult.rows) {
        const contentsResult = await query(
          `SELECT c.id, c.name, c.abbreviation, tac.content_id
           FROM training_activity_contents tac
           LEFT JOIN contents c ON tac.content_id = c.id
           WHERE tac.activity_id = $1`,
          [activity.id]
        );

        const stagesResult = await query(
          `SELECT * FROM training_activity_stages WHERE activity_id = $1 ORDER BY "order" ASC`,
          [activity.id]
        );

        activity.contents = contentsResult.rows;
        activity.stages = stagesResult.rows;
        // Frontend expects activity.title as object {title: "name"} not flat title_name
        if (activity.title_name) {
          activity.title = { title: activity.title_name, description: activity.title_description };
        }
        activities.push(activity);
      }

      // Frontend expects `activity` (singular) - each block has at most 1 activity
      block.activity = activities.length > 0 ? activities[0] : null;
      blocks.push(block);
    }

    session.blocks = blocks;
    sessions.push(session);
  }

  microcycle.sessions = sessions;
  return microcycle;
}

// GET /api/microcycles?week=YYYY-WW&club_id=X
router.get('/', async (req, res) => {
  try {
    const { week, club_id } = req.query;
    if (!week || !club_id) {
      return res.status(400).json({ error: 'week and club_id are required' });
    }

    const microcycleResult = await query(
      'SELECT * FROM training_microcycles WHERE tenant_id = $1 AND week_identifier = $2 AND club_id = $3',
      [req.user.id, week, club_id]
    );

    if (microcycleResult.rows.length === 0) {
      return res.json(null);
    }

    const microcycle = await getFullMicrocycle(microcycleResult.rows[0].id, req.user.id);
    res.json(microcycle);
  } catch (err) {
    console.error('Get microcycle error:', err);
    res.status(500).json({ error: 'Failed to get microcycle' });
  }
});

// POST /api/microcycles/ensure
router.post('/ensure', async (req, res) => {
  const client = await pool.connect();
  try {
    const { week, club_id } = req.body;
    if (!week || !club_id) {
      return res.status(400).json({ error: 'week and club_id are required' });
    }

    await client.query('BEGIN');

    // Check if microcycle exists
    let microcycleResult = await client.query(
      'SELECT * FROM training_microcycles WHERE tenant_id = $1 AND week_identifier = $2 AND club_id = $3',
      [req.user.id, week, club_id]
    );

    let microcycleId;
    if (microcycleResult.rows.length === 0) {
      const { startDate, endDate } = getWeekDates(week);
      const createResult = await client.query(
        `INSERT INTO training_microcycles (week_identifier, start_date, end_date, club_id, tenant_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [week, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0], club_id, req.user.id]
      );
      microcycleId = createResult.rows[0].id;
    } else {
      microcycleId = microcycleResult.rows[0].id;
    }

    // Ensure 7 sessions exist
    const existingSessions = await client.query(
      'SELECT * FROM training_sessions WHERE microcycle_id = $1',
      [microcycleId]
    );

    const existingDates = new Set(existingSessions.rows.map(s => s.date?.toISOString?.()?.split('T')[0] || s.date));
    const { startDate } = getWeekDates(week);

    for (let i = 0; i < 7; i++) {
      const sessionDate = new Date(startDate);
      sessionDate.setUTCDate(startDate.getUTCDate() + i);
      const dateStr = sessionDate.toISOString().split('T')[0];

      if (!existingDates.has(dateStr)) {
        await client.query(
          `INSERT INTO training_sessions (microcycle_id, date, day_name, day_of_week, tenant_id, club_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (tenant_id, date, club_id) DO NOTHING`,
          [microcycleId, dateStr, DAY_NAMES[i], i + 1, req.user.id, club_id]
        );
      }
    }

    // Get all sessions now
    const allSessions = await client.query(
      'SELECT * FROM training_sessions WHERE microcycle_id = $1 ORDER BY date ASC',
      [microcycleId]
    );

    // Ensure 6 blocks per session
    for (const session of allSessions.rows) {
      const existingBlocks = await client.query(
        'SELECT * FROM training_activity_blocks WHERE session_id = $1',
        [session.id]
      );

      const existingBlockOrders = existingBlocks.rows.map(b => b.order);

      for (let j = 0; j < 6; j++) {
        if (!existingBlockOrders.includes(j + 1)) {
          await client.query(
            `INSERT INTO training_activity_blocks (session_id, name, "order")
             VALUES ($1, $2, $3)`,
            [session.id, BLOCK_NAMES[j], j + 1]
          );
        }
      }
    }

    await client.query('COMMIT');

    // Return full structure
    const microcycle = await getFullMicrocycle(microcycleId, req.user.id);
    res.json(microcycle);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Ensure microcycle error:', err);
    res.status(500).json({ error: 'Failed to ensure microcycle' });
  } finally {
    client.release();
  }
});

module.exports = router;
