const express = require('express');
const { query } = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

const VALID_SEVERITY = ['info', 'warning', 'important', 'success'];

// GET /api/announcements — ativos pro usuário logado (não dismissed, dentro do período)
router.get('/announcements', async (req, res) => {
  try {
    const result = await query(
      `SELECT a.*
         FROM announcements a
        WHERE (a.active_from IS NULL OR a.active_from <= NOW())
          AND (a.active_until IS NULL OR a.active_until > NOW())
          AND (a.target_role = 'all' OR a.target_role = $2)
          AND NOT EXISTS (
            SELECT 1 FROM announcement_dismissals d
             WHERE d.user_id = $1 AND d.announcement_id = a.id
          )
        ORDER BY
          CASE a.severity WHEN 'important' THEN 1 WHEN 'warning' THEN 2 WHEN 'success' THEN 3 ELSE 4 END,
          a.active_from DESC`,
      [req.user.id, req.user.role || 'all']
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('List announcements error:', err);
    res.status(500).json({ error: 'Failed to list announcements' });
  }
});

// POST /api/announcements/:id/dismiss — usuário marca como lido
router.post('/announcements/:id/dismiss', async (req, res) => {
  try {
    await query(
      `INSERT INTO announcement_dismissals (user_id, announcement_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, announcement_id) DO NOTHING`,
      [req.user.id, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Dismiss announcement error:', err);
    res.status(500).json({ error: 'Failed to dismiss' });
  }
});

// ── Admin-only CRUD (gate por role='admin') ──
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  next();
}

// GET /api/announcements/admin — lista TODOS (ativos e expirados), só admin
router.get('/announcements/admin', requireAdmin, async (req, res) => {
  try {
    const result = await query(
      `SELECT a.*, u.name AS created_by_name
         FROM announcements a
         LEFT JOIN users u ON u.id = a.created_by
        ORDER BY a.created_at DESC`
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('Admin list announcements error:', err);
    res.status(500).json({ error: 'Failed' });
  }
});

router.post('/announcements', requireAdmin, async (req, res) => {
  try {
    const { title, body, severity, active_from, active_until, target_role, link_url } = req.body;
    if (!title?.trim() || !body?.trim()) return res.status(400).json({ error: 'title e body são obrigatórios' });
    if (severity && !VALID_SEVERITY.includes(severity)) return res.status(400).json({ error: 'severity inválida' });

    const result = await query(
      `INSERT INTO announcements (title, body, severity, active_from, active_until, target_role, link_url, created_by)
       VALUES ($1, $2, $3, COALESCE($4, NOW()), $5, COALESCE($6, 'all'), $7, $8)
       RETURNING *`,
      [
        title.trim(), body.trim(),
        severity || 'info',
        active_from || null, active_until || null,
        target_role || null,
        link_url?.trim() || null,
        req.user.id,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create announcement error:', err);
    res.status(500).json({ error: 'Failed to create' });
  }
});

router.put('/announcements/:id', requireAdmin, async (req, res) => {
  try {
    const { title, body, severity, active_from, active_until, target_role, link_url } = req.body;
    if (severity && !VALID_SEVERITY.includes(severity)) return res.status(400).json({ error: 'severity inválida' });

    const result = await query(
      `UPDATE announcements
          SET title        = COALESCE($1, title),
              body         = COALESCE($2, body),
              severity     = COALESCE($3, severity),
              active_from  = COALESCE($4, active_from),
              active_until = $5,
              target_role  = COALESCE($6, target_role),
              link_url     = $7,
              updated_at   = NOW()
        WHERE id = $8
        RETURNING *`,
      [
        title?.trim() || null, body?.trim() || null, severity || null,
        active_from || null,
        active_until !== undefined ? active_until : null,
        target_role || null,
        link_url !== undefined ? (link_url?.trim() || null) : null,
        req.params.id,
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Anúncio não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update announcement error:', err);
    res.status(500).json({ error: 'Failed to update' });
  }
});

router.delete('/announcements/:id', requireAdmin, async (req, res) => {
  try {
    const result = await query('DELETE FROM announcements WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Anúncio não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete announcement error:', err);
    res.status(500).json({ error: 'Failed to delete' });
  }
});

module.exports = router;
