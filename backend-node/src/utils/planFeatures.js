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

// Retorna o objeto de features do plano ativo (pra limites numéricos como
// max_categories). Admin/lifetime → { __unlimited: true }. Sem plano → null.
async function getPlanFeatures(user) {
  if (!user) return null;
  if (user.role === 'admin' || isAdmin?.(user.email) || isLifetime?.(user.email)) {
    return { __unlimited: true };
  }
  let sub = null;
  if (user.workspaceId) sub = await billing.getSubscriptionForWorkspace(user.workspaceId);
  if (!sub) sub = await billing.getActiveSubscription(user.id);
  if (!sub) return null;
  if (sub.is_admin) return { __unlimited: true };
  const plan = await billing.getPlan(sub.plan_id);
  const features = { ...(plan?.features || {}) };
  // Add-on de categoria: soma extra_category_slots ao limite do plano.
  // (Clubes são tratados à parte em clubs.js/canCreateClub via extra_club_slots.)
  const extraCats = Number(sub.extra_category_slots || 0);
  if (typeof features.max_categories === 'number' && features.max_categories !== -1) {
    features.max_categories += extraCats;
  }
  return features;
}

module.exports = { hasFeature, getPlanFeatures };
