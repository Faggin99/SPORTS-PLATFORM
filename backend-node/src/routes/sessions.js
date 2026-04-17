const express = require('express');
const { query } = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// GET /api/sessions/:id
router.get('/:id', async (req, res) => {
  try {
    const sessionResult = await query(
      'SELECT * FROM training_sessions WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.user.id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionResult.rows[0];

    const blocksResult = await query(
      'SELECT * FROM training_activity_blocks WHERE session_id = $1 ORDER BY "order" ASC',
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
          'SELECT * FROM training_activity_stages WHERE activity_id = $1 ORDER BY "order" ASC',
          [activity.id]
        );

        activity.contents = contentsResult.rows;
        activity.stages = stagesResult.rows;
        if (activity.title_name) {
          activity.title = { title: activity.title_name, description: activity.title_description };
        }
        activities.push(activity);
      }

      block.activity = activities.length > 0 ? activities[0] : null;
      blocks.push(block);
    }

    session.blocks = blocks;
    res.json(session);
  } catch (err) {
    console.error('Get session error:', err);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

// PUT /api/sessions/:id/type
router.put('/:id/type', async (req, res) => {
  try {
    const { session_type, opponent_name } = req.body;

    const result = await query(
      `UPDATE training_sessions SET session_type = $1, opponent_name = $2, updated_at = NOW()
       WHERE id = $3 AND tenant_id = $4
       RETURNING *`,
      [session_type || null, opponent_name || null, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update session type error:', err);
    res.status(500).json({ error: 'Failed to update session type' });
  }
});

module.exports = router;
