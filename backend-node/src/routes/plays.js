const express = require('express');
const { query } = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// GET /api/plays
router.get('/', async (req, res) => {
  try {
    if (!req.user.can('tactical:view')) return res.status(403).json({ error: 'Sem permissão' });
    const { club_id } = req.query;
    const tenantIds = req.user.workspaceIds || [];
    let sql = 'SELECT * FROM tactical_plays WHERE workspace_id = ANY($1)';
    const params = [tenantIds];
    let paramIdx = 2;

    if (club_id) {
      sql += ` AND club_id = $${paramIdx++}`;
      params.push(club_id);
    }

    sql += ' ORDER BY updated_at DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List plays error:', err);
    res.status(500).json({ error: 'Failed to list plays' });
  }
});

// GET /api/plays/:id
router.get('/:id', async (req, res) => {
  try {
    if (!req.user.can('tactical:view')) return res.status(403).json({ error: 'Sem permissão' });
    const result = await query(
      'SELECT * FROM tactical_plays WHERE id = $1 AND workspace_id = ANY($2)',
      [req.params.id, req.user.workspaceIds || []]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Play not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get play error:', err);
    res.status(500).json({ error: 'Failed to get play' });
  }
});

// POST /api/plays
router.post('/', async (req, res) => {
  try {
    if (!req.user.can('tactical:edit')) return res.status(403).json({ error: 'Sem permissão pra editar quadro tático' });
    const { name, description, field_type, field_view, team_a_color, team_b_color, keyframes, animation_speed, club_id } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Play name is required' });
    }

    const wsId = club_id ? req.user.writableWorkspaceForClub(club_id) : req.user.workspaceId;
    if (!wsId) return res.status(403).json({ error: 'Sem permissão de escrita' });

    const result = await query(
      `INSERT INTO tactical_plays (name, description, field_type, field_view, team_a_color, team_b_color, keyframes, animation_speed, club_id, workspace_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [name, description || null, field_type || null, field_view || null, team_a_color || null, team_b_color || null, keyframes ? JSON.stringify(keyframes) : null, animation_speed || null, club_id || null, wsId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create play error:', err);
    res.status(500).json({ error: 'Failed to create play' });
  }
});

// PUT /api/plays/:id
router.put('/:id', async (req, res) => {
  try {
    if (!req.user.can('tactical:edit')) return res.status(403).json({ error: 'Sem permissão' });
    const { name, description, field_type, field_view, team_a_color, team_b_color, keyframes, animation_speed, club_id } = req.body;

    const result = await query(
      `UPDATE tactical_plays SET name = $1, description = $2, field_type = $3, field_view = $4,
       team_a_color = $5, team_b_color = $6, keyframes = $7, animation_speed = $8,
       club_id = $9, updated_at = NOW()
       WHERE id = $10 AND workspace_id = ANY($11)
       RETURNING *`,
      [name, description || null, field_type || null, field_view || null, team_a_color || null, team_b_color || null, keyframes ? JSON.stringify(keyframes) : null, animation_speed || null, club_id || null, req.params.id, req.user.workspaceIds || []]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Play not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update play error:', err);
    res.status(500).json({ error: 'Failed to update play' });
  }
});

// DELETE /api/plays/:id
router.delete('/:id', async (req, res) => {
  try {
    if (!req.user.can('tactical:edit')) return res.status(403).json({ error: 'Sem permissão' });
    const result = await query(
      'DELETE FROM tactical_plays WHERE id = $1 AND workspace_id = ANY($2) RETURNING id',
      [req.params.id, req.user.workspaceIds || []]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Play not found' });
    }
    res.json({ message: 'Play deleted successfully' });
  } catch (err) {
    console.error('Delete play error:', err);
    res.status(500).json({ error: 'Failed to delete play' });
  }
});

module.exports = router;
