const express = require('express');
const { query } = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/competitions?clubId=...&includeArchived=true
router.get('/', async (req, res) => {
  try {
    const workspaceIds = req.user.workspaceIds || [];
    if (workspaceIds.length === 0) return res.json([]);
    const { clubId, includeArchived } = req.query;
    let sql = `SELECT c.*, cl.name AS club_name
                 FROM competitions c
                 LEFT JOIN clubs cl ON cl.id = c.club_id
                WHERE c.workspace_id = ANY($1)`;
    const params = [workspaceIds];
    let idx = 2;
    if (clubId) {
      sql += ` AND c.club_id = $${idx++}`;
      params.push(clubId);
    }
    if (includeArchived !== 'true') {
      sql += ` AND (c.is_archived = false OR c.is_archived IS NULL)`;
    }
    sql += ` ORDER BY (c.start_date IS NULL), c.start_date DESC, c.name ASC`;
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List competitions error:', err);
    res.status(500).json({ error: 'Failed to list competitions' });
  }
});

// POST /api/competitions
router.post('/', async (req, res) => {
  try {
    if (!req.user.can('training:edit')) return res.status(403).json({ error: 'Sem permissão' });
    const { club_id, name, season, format, start_date, end_date } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name é obrigatório' });

    let wsId = req.user.workspaceId;
    if (club_id) {
      const w = req.user.writableWorkspaceForClub(club_id);
      if (!w) return res.status(403).json({ error: 'Sem permissão de escrita no clube' });
      wsId = w;
    }
    if (!wsId) return res.status(400).json({ error: 'Nenhuma workspace ativa' });

    const result = await query(
      `INSERT INTO competitions (workspace_id, club_id, name, season, format, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [wsId, club_id || null, name.trim(), season?.trim() || null, format?.trim() || null,
       start_date || null, end_date || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create competition error:', err);
    res.status(500).json({ error: 'Failed to create competition' });
  }
});

// PUT /api/competitions/:id
router.put('/:id', async (req, res) => {
  try {
    if (!req.user.can('training:edit')) return res.status(403).json({ error: 'Sem permissão' });
    const { club_id, name, season, format, start_date, end_date, is_archived } = req.body;
    const result = await query(
      `UPDATE competitions
          SET club_id    = COALESCE($1, club_id),
              name       = COALESCE($2, name),
              season     = $3,
              format     = $4,
              start_date = $5,
              end_date   = $6,
              is_archived = COALESCE($7, is_archived),
              updated_at = NOW()
        WHERE id = $8 AND workspace_id = ANY($9)
        RETURNING *`,
      [club_id || null, name?.trim() || null,
       season !== undefined ? (season?.trim() || null) : null,
       format !== undefined ? (format?.trim() || null) : null,
       start_date || null, end_date || null,
       is_archived !== undefined ? is_archived : null,
       req.params.id, req.user.workspaceIds || []]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Campeonato não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update competition error:', err);
    res.status(500).json({ error: 'Failed to update competition' });
  }
});

// DELETE /api/competitions/:id
router.delete('/:id', async (req, res) => {
  try {
    if (!req.user.can('training:edit')) return res.status(403).json({ error: 'Sem permissão' });
    const result = await query(
      'DELETE FROM competitions WHERE id = $1 AND workspace_id = ANY($2) RETURNING id',
      [req.params.id, req.user.workspaceIds || []]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Campeonato não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete competition error:', err);
    res.status(500).json({ error: 'Failed to delete competition' });
  }
});

module.exports = router;
