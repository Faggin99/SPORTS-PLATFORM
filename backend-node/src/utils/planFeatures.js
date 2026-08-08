const billing = require('../services/billing');
const { isAdmin, isLifetime } = require('../config/specialUsers');

// Verifica se a workspace ativa do usuário tem a feature do plano (ex: 'multi_user').
// Admins (role ou email) e lifetime passam sempre, independente de workspace.
async function hasFeature(user, feature) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (isAdmin?.(user.email) || isLifetime?.(user.email)) return true;
  // Tenta primeiro pela workspace ativa (modelo novo). Cai pro user.id se workspace ausente.
  let sub = null;
  if (user.workspaceId) {
    sub = await billing.getSubscriptionForWorkspace(user.workspaceId);
  }
  if (!sub) {
    sub = await billing.getActiveSubscription(user.id);
  }
  if (!sub) return false;
  const plan = await billing.getPlan(sub.plan_id);
  return !!(plan?.features?.[feature]);
}

module.exports = { hasFeature };
