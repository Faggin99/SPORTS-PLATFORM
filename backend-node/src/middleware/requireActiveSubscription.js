const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { jwtSecret } = require('../config/auth');

// Paths que ficam liberados independente da assinatura
// (auth, billing, healthcheck, etc) — pra user expirado conseguir pagar
const ALWAYS_ALLOWED_PREFIXES = [
  '/api/auth/',
  '/api/admin/',        // área admin tem auth+permissão própria
  '/api/billing/',
  '/api/workspaces',    // lista/criação de workspace livre (paywall acontece DENTRO de cada workspace)
  '/api/health',
  '/api/invites/',
  '/uploads/',
];

function isAlwaysAllowed(path) {
  return ALWAYS_ALLOWED_PREFIXES.some((p) => path === p.replace(/\/$/, '') || path.startsWith(p));
}

function extractUserId(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, jwtSecret);
    return payload?.id || null;
  } catch (_) {
    return null;
  }
}

async function requireActiveSubscription(req, res, next) {
  try {
    if (!req.path.startsWith('/api')) return next();
    if (isAlwaysAllowed(req.path)) return next();

    const userId = extractUserId(req);
    if (!userId) return next();

    const userRes = await query('SELECT role FROM users WHERE id = $1', [userId]);
    const role = userRes.rows[0]?.role;
    if (role === 'admin') return next();

    // Workspace ativa vem do header X-Workspace-Id. Se não tiver, prioriza
    // subscription do user (fallback pra compat).
    const requestedWs = req.headers['x-workspace-id'] || null;

    let subRes;
    if (requestedWs) {
      // Antes de checar a sub da workspace, garante que o user tem acesso a ela.
      const accessRes = await query(
        `SELECT 1 FROM workspaces w
           WHERE w.id = $1
             AND (w.owner_id = $2 OR EXISTS (
               SELECT 1 FROM workspace_members m
                WHERE m.workspace_id = w.id AND m.user_id = $2 AND m.accepted_at IS NOT NULL
             ))`,
        [requestedWs, userId]
      );
      if (accessRes.rows.length === 0) {
        return res.status(403).json({ error: 'workspace_not_accessible' });
      }
      subRes = await query(
        `SELECT plan_id, status, trial_ends_at, current_period_end
           FROM subscriptions
          WHERE workspace_id = $1
            AND status IN ('trialing','active','past_due','paused')
          ORDER BY (plan_id = 'lifetime') DESC, created_at DESC LIMIT 1`,
        [requestedWs]
      );
    } else {
      subRes = await query(
        `SELECT plan_id, status, trial_ends_at, current_period_end
           FROM subscriptions
          WHERE user_id = $1
            AND status IN ('trialing','active','past_due','paused')
          ORDER BY (plan_id = 'lifetime') DESC, created_at DESC LIMIT 1`,
        [userId]
      );
    }
    const sub = subRes.rows[0];

    if (!sub) {
      return res.status(402).json({
        error: 'subscription_required',
        message: 'Você precisa de uma assinatura ativa para continuar usando.',
      });
    }

    if (sub.plan_id === 'lifetime') return next();

    const now = new Date();

    if (sub.status === 'trialing') {
      if (sub.trial_ends_at && new Date(sub.trial_ends_at) < now) {
        return res.status(402).json({
          error: 'trial_expired',
          message: 'Seu período de avaliação terminou. Assine para continuar.',
        });
      }
      return next();
    }

    if (sub.status === 'active') {
      if (sub.current_period_end && new Date(sub.current_period_end) < now) {
        return res.status(402).json({
          error: 'subscription_expired',
          message: 'Sua assinatura expirou. Renove o pagamento para continuar.',
        });
      }
      return next();
    }

    return res.status(402).json({
      error: 'payment_pending',
      message: 'Há um pagamento pendente. Atualize seu método de pagamento.',
    });
  } catch (err) {
    console.error('requireActiveSubscription error:', err);
    // fail-open pra não derrubar o app por bug nosso
    next();
  }
}

module.exports = requireActiveSubscription;
