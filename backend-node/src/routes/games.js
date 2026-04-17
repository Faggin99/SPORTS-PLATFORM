const express = require('express');
const { query, pool } = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// GET /api/games/:sessionId
router.get('/:sessionId', async (req, res) => {
  try {
    const sessionResult = await query(
      'SELECT * FROM training_sessions WHERE id = $1 AND tenant_id = $2',
      [req.params.sessionId, req.user.id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionResult.rows[0];

    const playersResult = await query(
      `SELECT mp.*,
              json_build_object('id', a.id, 'name', a.name, 'jersey_number', a.jersey_number, 'position', a.position, 'photo_url', a.photo_url) as athlete
       FROM match_players mp
       LEFT JOIN athletes a ON mp.athlete_id = a.id
       WHERE mp.session_id = $1 AND mp.tenant_id = $2
       ORDER BY mp.status ASC`,
      [req.params.sessionId, req.user.id]
    );

    const eventsResult = await query(
      `SELECT me.*,
              json_build_object('id', a.id, 'name', a.name, 'jersey_number', a.jersey_number) as player
       FROM match_events me
       LEFT JOIN athletes a ON me.player_id = a.id
       WHERE me.session_id = $1 AND me.tenant_id = $2
       ORDER BY me.minute ASC`,
      [req.params.sessionId, req.user.id]
    );

    res.json({
      players: playersResult.rows,
      events: eventsResult.rows
    });
  } catch (err) {
    console.error('Get game error:', err);
    res.status(500).json({ error: 'Failed to get game data' });
  }
});

// POST /api/games/:sessionId
router.post('/:sessionId', async (req, res) => {
  const client = await pool.connect();
  try {
    const { opponent_name, match_duration, players, events } = req.body;

    // Verify session ownership
    const sessionCheck = await client.query(
      'SELECT id FROM training_sessions WHERE id = $1 AND tenant_id = $2',
      [req.params.sessionId, req.user.id]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    await client.query('BEGIN');

    // Update session
    await client.query(
      `UPDATE training_sessions SET opponent_name = $1, match_duration = $2, updated_at = NOW()
       WHERE id = $3 AND tenant_id = $4`,
      [opponent_name || null, match_duration || null, req.params.sessionId, req.user.id]
    );

    // Replace match_players
    await client.query('DELETE FROM match_players WHERE session_id = $1 AND tenant_id = $2', [req.params.sessionId, req.user.id]);
    if (players && players.length > 0) {
      for (const player of players) {
        await client.query(
          `INSERT INTO match_players (session_id, athlete_id, status, minutes_played, tenant_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [req.params.sessionId, player.athlete_id, player.status || 'starter', player.minutes_played || 0, req.user.id]
        );
      }
    }

    // Replace match_events
    await client.query('DELETE FROM match_events WHERE session_id = $1 AND tenant_id = $2', [req.params.sessionId, req.user.id]);
    if (events && events.length > 0) {
      for (const event of events) {
        await client.query(
          `INSERT INTO match_events (session_id, event_type, team, goal_type, minute, player_id, notes, tenant_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [req.params.sessionId, event.event_type, event.team || null, event.goal_type || null, event.minute || null, event.player_id || null, event.notes || null, req.user.id]
        );
      }
    }

    await client.query('COMMIT');

    res.json({ message: 'Game data saved successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Save game error:', err);
    res.status(500).json({ error: 'Failed to save game data' });
  } finally {
    client.release();
  }
});

module.exports = router;
