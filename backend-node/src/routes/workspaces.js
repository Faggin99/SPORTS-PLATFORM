const express = require('express');
const { query } = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/workspaces — lista workspaces acessíveis (próprias + onde sou member)
// Inclui status da subscription de cada uma pra permitir auto-swap em paywall.
router.get('/', async (req, res) => {
  const accessible = req.user.accessibleWorkspaces || [];
  if (accessible.length === 0) return res.json({ data: [], active: null });

  // Busca a sub ativa de cada workspace acessível em uma só query
  const ids = accessible.map(w => w.workspace_id);
  const subsRes = await query(
    `SELECT DISTINCT ON (workspace_id) workspace_id, plan_id, status, trial_ends_at, current_period_end
       FROM subscriptions
      WHERE workspace_id = ANY($1)
        AND status IN ('trialing','active','past_due','paused')
      ORDER BY workspace_id, (plan_id = 'lifetime') DESC, created_at DESC`,
    [ids]
  );
  const subByWs = Object.fromEntries(subsRes.rows.map(r => [r.workspace_id, r]));
  const now = Date.now();

  res.json({
    data: accessible.map(w => {
      const sub = subByWs[w.workspace_id] || null;
      let usable = false;
      if (!sub) usable = false;
      else if (sub.plan_id === 'lifetime') usable = true;
      else if (sub.status === 'trialing') {
        usable = !sub.trial_ends_at || new Date(sub.trial_ends_at).getTime() >= now;
      } else if (sub.status === 'active') {
        usable = !sub.current_period_end || new Date(sub.current_period_end).getTime() >= now;
      } else {
        usable = false;
      }
      return {
        id: w.workspace_id,
        name: w.name,
        owner_id: w.owner_id,
        role: w.role,
        is_owner: w.is_owner,
        category_ids: w.category_ids || null,
        permissions: w.permissions || null,
        subscription_status: sub?.status || 'none',
        plan_id: sub?.plan_id || null,
        usable, // workspace tem subscription utilizável (trial/active válido ou lifetime)
      };
    }),
    active: req.user.workspaceId || null,
  });
});

// POST /api/workspaces — cria nova workspace (segunda assinatura/conta)
router.post('/', async (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name?.trim()) return res.status(400).json({ error: 'name é obrigatório' });

    const wsRes = await query(
      `INSERT INTO workspaces (name, owner_id) VALUES ($1, $2) RETURNING *`,
      [name.trim(), req.user.id]
    );
    const workspace = wsRes.rows[0];

    // Trial Pro de 30d pra nova workspace (mesma política do cadastro).
    const trialEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await query(
      `INSERT INTO subscriptions (user_id, workspace_id, plan_id, status, trial_ends_at, current_period_start, current_period_end)
       VALUES ($1, $2, 'pro', 'trialing', $3, now(), $3)`,
      [req.user.id, workspace.id, trialEnd]
    );

    authMiddleware.invalidateAccessibleCache?.(req.user.id);

    res.status(201).json(workspace);
  } catch (err) {
    console.error('Create workspace error:', err);
    res.status(500).json({ error: 'Failed to create workspace' });
  }
});

// PUT /api/workspaces/:id — renomear (só owner)
router.put('/:id', async (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name?.trim()) return res.status(400).json({ error: 'name é obrigatório' });
    if (!req.user.isWorkspaceOwner(req.params.id)) {
      return res.status(403).json({ error: 'Apenas o dono pode renomear' });
    }
    const r = await query(
      `UPDATE workspaces SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [name.trim(), req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Workspace não encontrada' });
    res.json(r.rows[0]);
  } catch (err) {
    console.error('Update workspace error:', err);
    res.status(500).json({ error: 'Failed to update workspace' });
  }
});

module.exports = router;
