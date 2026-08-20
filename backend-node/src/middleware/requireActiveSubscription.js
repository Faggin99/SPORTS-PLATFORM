const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { jwtSecret } = require('../config/auth');
const billing = require('../services/billing');

// Com o plano FREE permanente ninguém fica trancado pra fora: quem não tem
// assinatura válida usa o app com as features do Free. Este middleware:
//   (1) valida o acesso à workspace pedida (X-Workspace-Id);
//   (2) bloqueia rotas PREMIUM quando o plano efetivo não tem a feature
//       (402 + code PLAN_REQUIRED). Limites numéricos (atletas, clubes,
//       categorias) são checados nas próprias rotas de criação.
const ALWAYS_ALLOWED_PREFIXES = [
  '/api/auth/',
  '/api/admin/',        // área admin tem auth+permissão própria
  '/api/billing/',
  '/api/workspaces',
  '/api/health',
  '/api/invites/',
  '/uploads/',
];

// Rotas exclusivas dos planos pagos → feature exigida no plano.
// Mensagens NEUTRAS (sem "assine"/URL): o app nativo exibe esse texto e a
// Apple só aceita o Free se não houver chamada pra compra fora do app.
const PREMIUM_ROUTES = [
  { prefix: '/api/plays', feature: 'quadro_tatico', message: 'O Quadro Tático não está incluído no seu plano atual.' },
];

function isAlwaysAllowed(path) {
  return ALWAYS_ALLOWED_PREFIXES.some((p) => path === p.replace(/\/$/, '') || path.startsWith(p));
}

function matchPremium(path) {
  return PREMIUM_ROUTES.find((r) => path === r.prefix || path.startsWith(r.prefix + '/'));
}

function extractUserId(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(authHeader.slice(7), jwtSecret)?.id || null;
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
    if (userRes.rows[0]?.role === 'admin') return next();

    // Acesso à workspace ativa (header X-Workspace-Id).
    const requestedWs = req.headers['x-workspace-id'] || null;
    if (requestedWs) {
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
    }

    const premium = matchPremium(req.path);
    if (!premium) return next(); // rota comum: Free passa

    const sub = await billing.getEffectiveSubscription({ userId, workspaceId: requestedWs });
    req.effectiveSubscription = sub;
    if (sub?.is_admin || sub?.plan_id === 'lifetime' || sub?.features?.[premium.feature]) return next();

    return res.status(402).json({
      error: premium.message,
      code: 'PLAN_REQUIRED',
      required_feature: premium.feature,
      plan_id: sub?.plan_id || 'free',
    });
  } catch (err) {
    console.error('requireActiveSubscription error:', err);
    next(); // fail-open pra não derrubar o app por bug nosso
  }
}

module.exports = requireActiveSubscription;
