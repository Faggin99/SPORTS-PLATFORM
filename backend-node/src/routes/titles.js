const express = require('express');
const { query } = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// GET /api/titles
router.get('/', async (req, res) => {
  try {
    const { includeArchived } = req.query;
    let sql = 'SELECT * FROM activity_titles WHERE (workspace_id = ANY($1) OR workspace_id IS NULL)';
    const params = [req.user.workspaceIds || []];

    if (includeArchived !== 'true') {
      sql += ' AND (is_archived = false OR is_archived IS NULL)';
    }

    sql += ' ORDER BY title ASC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List titles error:', err);
    res.status(500).json({ error: 'Failed to list titles' });
  }
});

// GET /api/titles/with-content
router.get('/with-content', async (req, res) => {
  try {
    const { includeArchived } = req.query;
    let sql = `SELECT at.*, c.name as content_name
               FROM activity_titles at
               LEFT JOIN contents c ON at.content_id = c.id
               WHERE (at.workspace_id = ANY($1) OR at.workspace_id IS NULL)`;
    const params = [req.user.workspaceIds || []];

    if (includeArchived !== 'true') {
      sql += ' AND (at.is_archived = false OR at.is_archived IS NULL)';
    }

    sql += ' ORDER BY at.title ASC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List titles with content error:', err);
    res.status(500).json({ error: 'Failed to list titles' });
  }
});

// POST /api/titles
router.post('/', async (req, res) => {
  try {
    if (!req.user.can('library:edit')) return res.status(403).json({ error: 'Sem permissão' });
    const { title, content_id, description } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const wsId = req.user.workspaceId;
    if (!wsId) return res.status(400).json({ error: 'Nenhuma workspace ativa' });

    const result = await query(
      `INSERT INTO activity_titles (title, content_id, description, workspace_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title, content_id || null, description || null, wsId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create title error:', err);
    res.status(500).json({ error: 'Failed to create title' });
  }
});

// PUT /api/titles/:id
router.put('/:id', async (req, res) => {
  try {
    if (!req.user.can('library:edit')) return res.status(403).json({ error: 'Sem permissão' });
    const { title, content_id, description } = req.body;

    const result = await query(
      `UPDATE activity_titles SET title = $1, content_id = $2, description = $3, updated_at = NOW()
       WHERE id = $4 AND workspace_id = ANY($5)
       RETURNING *`,
      [title, content_id || null, description || null, req.params.id, req.user.workspaceIds || []]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Title not found or not owned by you' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update title error:', err);
    res.status(500).json({ error: 'Failed to update title' });
  }
});

// PUT /api/titles/:id/archive
router.put('/:id/archive', async (req, res) => {
  try {
    if (!req.user.can('library:edit')) return res.status(403).json({ error: 'Sem permissão' });
    const result = await query(
      `UPDATE activity_titles SET is_archived = true, updated_at = NOW()
       WHERE id = $1 AND workspace_id = ANY($2)
       RETURNING *`,
      [req.params.id, req.user.workspaceIds || []]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Title not found or not owned by you' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Archive title error:', err);
    res.status(500).json({ error: 'Failed to archive title' });
  }
});

// PUT /api/titles/:id/unarchive
router.put('/:id/unarchive', async (req, res) => {
  try {
    if (!req.user.can('library:edit')) return res.status(403).json({ error: 'Sem permissão' });
    const result = await query(
      `UPDATE activity_titles SET is_archived = false, updated_at = NOW()
       WHERE id = $1 AND workspace_id = ANY($2)
       RETURNING *`,
      [req.params.id, req.user.workspaceIds || []]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Title not found or not owned by you' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Unarchive title error:', err);
    res.status(500).json({ error: 'Failed to unarchive title' });
  }
});

// GET /api/titles/:id/usage-count
router.get('/:id/usage-count', async (req, res) => {
  try {
    const result = await query(
      'SELECT COUNT(*) as count FROM training_activities WHERE title_id = $1 AND workspace_id = ANY($2)',
      [req.params.id, req.user.workspaceIds || []]
    );

    res.json({ count: parseInt(result.rows[0].count, 10) });
  } catch (err) {
    console.error('Usage count error:', err);
    res.status(500).json({ error: 'Failed to get usage count' });
  }
});

module.exports = router;
