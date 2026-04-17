const express = require('express');
const { query, pool } = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

async function createActivity(client, data, tenantId) {
  const { block_id, title_id, description, duration_minutes, groups, is_rest, selectedContents, selectedStages } = data;

  const activityResult = await client.query(
    `INSERT INTO training_activities (block_id, title_id, description, duration_minutes, groups, is_rest, tenant_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [block_id, title_id || null, description || null, duration_minutes || null, groups ? JSON.stringify(groups) : null, is_rest || false, tenantId]
  );

  const activity = activityResult.rows[0];

  if (selectedContents && selectedContents.length > 0) {
    for (const contentId of selectedContents) {
      await client.query(
        'INSERT INTO training_activity_contents (activity_id, content_id) VALUES ($1, $2)',
        [activity.id, contentId]
      );
    }
  }

  if (selectedStages && selectedStages.length > 0) {
    for (let i = 0; i < selectedStages.length; i++) {
      const stageId = selectedStages[i];
      const stageResult = await client.query('SELECT name FROM stages WHERE id = $1', [stageId]);
      const stageName = stageResult.rows.length > 0 ? stageResult.rows[0].name : stageId;
      await client.query(
        'INSERT INTO training_activity_stages (activity_id, stage_name, "order") VALUES ($1, $2, $3)',
        [activity.id, stageName, i + 1]
      );
    }
  }

  return activity;
}

async function updateActivity(client, activityId, data, tenantId) {
  const { title_id, description, duration_minutes, groups, is_rest, selectedContents, selectedStages } = data;

  const activityResult = await client.query(
    `UPDATE training_activities SET title_id = $1, description = $2, duration_minutes = $3,
     groups = $4, is_rest = $5, updated_at = NOW()
     WHERE id = $6 AND tenant_id = $7
     RETURNING *`,
    [title_id || null, description || null, duration_minutes || null, groups ? JSON.stringify(groups) : null, is_rest || false, activityId, tenantId]
  );

  if (activityResult.rows.length === 0) return null;

  // Replace contents
  await client.query('DELETE FROM training_activity_contents WHERE activity_id = $1', [activityId]);
  if (selectedContents && selectedContents.length > 0) {
    for (const contentId of selectedContents) {
      await client.query(
        'INSERT INTO training_activity_contents (activity_id, content_id) VALUES ($1, $2)',
        [activityId, contentId]
      );
    }
  }

  // Replace stages
  await client.query('DELETE FROM training_activity_stages WHERE activity_id = $1', [activityId]);
  if (selectedStages && selectedStages.length > 0) {
    for (let i = 0; i < selectedStages.length; i++) {
      const stageId = selectedStages[i];
      const stageResult = await client.query('SELECT name FROM stages WHERE id = $1', [stageId]);
      const stageName = stageResult.rows.length > 0 ? stageResult.rows[0].name : stageId;
      await client.query(
        'INSERT INTO training_activity_stages (activity_id, stage_name, "order") VALUES ($1, $2, $3)',
        [activityId, stageName, i + 1]
      );
    }
  }

  return activityResult.rows[0];
}

// POST /api/activities
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const activity = await createActivity(client, req.body, req.user.id);
    await client.query('COMMIT');
    res.status(201).json(activity);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create activity error:', err);
    res.status(500).json({ error: 'Failed to create activity' });
  } finally {
    client.release();
  }
});

// PUT /api/activities/:id
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const activity = await updateActivity(client, req.params.id, req.body, req.user.id);
    if (!activity) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Activity not found' });
    }
    await client.query('COMMIT');
    res.json(activity);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update activity error:', err);
    res.status(500).json({ error: 'Failed to update activity' });
  } finally {
    client.release();
  }
});

// DELETE /api/activities/block/:blockId
router.delete('/block/:blockId', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Find activities for the block
    const activitiesResult = await client.query(
      'SELECT id FROM training_activities WHERE block_id = $1 AND tenant_id = $2',
      [req.params.blockId, req.user.id]
    );

    for (const activity of activitiesResult.rows) {
      await client.query('DELETE FROM training_activity_contents WHERE activity_id = $1', [activity.id]);
      await client.query('DELETE FROM training_activity_stages WHERE activity_id = $1', [activity.id]);
    }

    await client.query(
      'DELETE FROM training_activities WHERE block_id = $1 AND tenant_id = $2',
      [req.params.blockId, req.user.id]
    );

    await client.query('COMMIT');
    res.json({ message: 'Activities deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Delete block activities error:', err);
    res.status(500).json({ error: 'Failed to delete activities' });
  } finally {
    client.release();
  }
});

// POST /api/activities/upsert
router.post('/upsert', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { block_id } = req.body;
    if (!block_id) {
      return res.status(400).json({ error: 'block_id is required' });
    }

    // Check if activity exists for this block
    const existing = await client.query(
      'SELECT id FROM training_activities WHERE block_id = $1 AND tenant_id = $2',
      [block_id, req.user.id]
    );

    let activity;
    if (existing.rows.length > 0) {
      activity = await updateActivity(client, existing.rows[0].id, req.body, req.user.id);
    } else {
      activity = await createActivity(client, req.body, req.user.id);
    }

    await client.query('COMMIT');
    res.json(activity);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Upsert activity error:', err);
    res.status(500).json({ error: 'Failed to upsert activity' });
  } finally {
    client.release();
  }
});

module.exports = router;
