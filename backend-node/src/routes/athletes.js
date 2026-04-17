const express = require('express');
const { query } = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// GET /api/athletes
router.get('/', async (req, res) => {
  try {
    const { club_id, group, status } = req.query;
    let sql = 'SELECT * FROM athletes WHERE tenant_id = $1';
    const params = [req.user.id];
    let paramIndex = 2;

    if (club_id) {
      sql += ` AND club_id = $${paramIndex++}`;
      params.push(club_id);
    }
    if (group) {
      sql += ` AND "group" = $${paramIndex++}`;
      params.push(group);
    }
    if (status) {
      sql += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    sql += ' ORDER BY name ASC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List athletes error:', err);
    res.status(500).json({ error: 'Failed to list athletes' });
  }
});

// GET /api/athletes/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM athletes WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Athlete not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get athlete error:', err);
    res.status(500).json({ error: 'Failed to get athlete' });
  }
});

// POST /api/athletes
router.post('/', async (req, res) => {
  try {
    const { name, position, jersey_number, status, observation, group, photo_url, club_id } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Athlete name is required' });
    }

    const result = await query(
      `INSERT INTO athletes (name, position, jersey_number, status, observation, "group", photo_url, club_id, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [name, position || null, jersey_number || null, status || 'active', observation || null, group || null, photo_url || null, club_id, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create athlete error:', err);
    res.status(500).json({ error: 'Failed to create athlete' });
  }
});

// PUT /api/athletes/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, position, jersey_number, status, observation, group, photo_url, club_id } = req.body;

    const result = await query(
      `UPDATE athletes SET name = $1, position = $2, jersey_number = $3, status = $4,
       observation = $5, "group" = $6, photo_url = $7, club_id = $8, updated_at = NOW()
       WHERE id = $9 AND tenant_id = $10
       RETURNING *`,
      [name, position || null, jersey_number || null, status || 'active', observation || null, group || null, photo_url || null, club_id, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Athlete not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update athlete error:', err);
    res.status(500).json({ error: 'Failed to update athlete' });
  }
});

// DELETE /api/athletes/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM athletes WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Athlete not found' });
    }
    res.json({ message: 'Athlete deleted successfully' });
  } catch (err) {
    console.error('Delete athlete error:', err);
    res.status(500).json({ error: 'Failed to delete athlete' });
  }
});

// PUT /api/athletes/batch-groups
router.put('/batch-groups', async (req, res) => {
  try {
    const { athletes } = req.body;
    if (!Array.isArray(athletes) || athletes.length === 0) {
      return res.status(400).json({ error: 'Athletes array is required' });
    }

    const results = [];
    for (const athlete of athletes) {
      const result = await query(
        `UPDATE athletes SET "group" = $1, updated_at = NOW()
         WHERE id = $2 AND tenant_id = $3
         RETURNING *`,
        [athlete.group, athlete.id, req.user.id]
      );
      if (result.rows.length > 0) {
        results.push(result.rows[0]);
      }
    }

    res.json(results);
  } catch (err) {
    console.error('Batch update groups error:', err);
    res.status(500).json({ error: 'Failed to batch update groups' });
  }
});

module.exports = router;
