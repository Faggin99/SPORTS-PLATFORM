const express = require('express');
const { query } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { hasFeature, getPlanFeatures } = require('../utils/planFeatures');

const router = express.Router();
router.use(authMiddleware);

// GET /api/categories?clubId=...
router.get('/categories', async (req, res) => {
  try {
    const { clubId } = req.query;
    const workspaceIds = req.user.workspaceIds || [];
    if (workspaceIds.length === 0) return res.json({ data: [] });
    const params = [workspaceIds];
    let sql = `SELECT c.*, cl.name AS club_name,
                      (SELECT COUNT(*) FROM athletes a WHERE a.category_id = c.id) AS athletes_count
                 FROM categories c
                 JOIN clubs cl ON cl.id = c.club_id
                WHERE c.workspace_id = ANY($1)`;
    if (clubId) {
      params.push(clubId);
      sql += ` AND c.club_id = $${params.length}`;
    }
    sql += ` ORDER BY cl.name ASC, c.display_order ASC, c.name ASC`;
    const result = await query(sql, params);
    res.json({ data: result.rows });
  } catch (err) {
    console.error('List categories error:', err);
    res.status(500).json({ error: 'Failed to list categories' });
  }
});

// POST /api/categories
router.post('/categories', async (req, res) => {
  try {
    if (!req.user.can('categories:manage')) return res.status(403).json({ error: 'Sem permissão pra gerenciar categorias' });
    const { club_id, name, age_group, display_order, notes } = req.body;
    if (!club_id || !name?.trim()) {
      return res.status(400).json({ error: 'club_id e name são obrigatórios' });
    }
    const wsId = req.user.writableWorkspaceForClub(club_id);
    if (!wsId) {
      return res.status(403).json({ error: 'Sem permissão de escrita nesse clube' });
    }

    // Gate por plano: Pro permite só 1 categoria por clube; Clube libera até
    // max_categories (5, declarado nas features do plano); admin/lifetime = ilimitado.
    const feats = await getPlanFeatures(req.user);
    if (feats && !feats.__unlimited) {
      const existing = await query(
        'SELECT COUNT(*)::int AS n FROM categories WHERE workspace_id = $1 AND club_id = $2',
        [wsId, club_id]
      );
      const count = existing.rows[0].n;
      const canUseMulti = feats.multi_user === true;

      if (!canUseMulti && count >= 1) {
        return res.status(402).json({
          error: 'Múltiplas categorias por clube requerem o plano Clube. Faça upgrade pra liberar.',
          code: 'PLAN_REQUIRED',
          required_feature: 'multi_user',
        });
      }

      const maxCat = feats.max_categories != null ? Number(feats.max_categories) : null;
      if (canUseMulti && Number.isFinite(maxCat) && count >= maxCat) {
        return res.status(402).json({
          error: `Seu plano permite até ${maxCat} categorias por clube.`,
          code: 'LIMIT_REACHED',
          required_feature: 'max_categories',
        });
      }
    }

    const result = await query(
      `INSERT INTO categories (workspace_id, club_id, name, age_group, display_order, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [wsId, club_id, name.trim(), age_group?.trim() || null, Number.isFinite(+display_order) ? +display_order : 0, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Já existe uma categoria com esse nome neste clube' });
    console.error('Create category error:', err);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// PUT /api/categories/:id
router.put('/categories/:id', async (req, res) => {
  try {
    if (!req.user.can('categories:manage')) return res.status(403).json({ error: 'Sem permissão' });
    const { name, age_group, display_order, notes } = req.body;
    const result = await query(
      `UPDATE categories
          SET name          = COALESCE($1, name),
              age_group     = COALESCE($2, age_group),
              display_order = COALESCE($3, display_order),
              notes         = COALESCE($4, notes),
              updated_at    = NOW()
        WHERE id = $5 AND workspace_id = ANY($6)
        RETURNING *`,
      [
        name?.trim() || null,
        age_group !== undefined ? (age_group?.trim() || null) : null,
        Number.isFinite(+display_order) ? +display_order : null,
        notes ?? null,
        req.params.id, req.user.workspaceIds || [],
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Categoria não encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Já existe uma categoria com esse nome neste clube' });
    console.error('Update category error:', err);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// DELETE /api/categories/:id
router.delete('/categories/:id', async (req, res) => {
  try {
    if (!req.user.can('categories:manage')) return res.status(403).json({ error: 'Sem permissão' });
    const result = await query(
      'DELETE FROM categories WHERE id = $1 AND workspace_id = ANY($2) RETURNING id',
      [req.params.id, req.user.workspaceIds || []]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Categoria não encontrada' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete category error:', err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

module.exports = router;
