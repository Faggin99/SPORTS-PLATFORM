const billing = require('../services/billing');
const { isAdmin, isLifetime } = require('../config/specialUsers');

function isUnlimitedUser(user) {
  return user.role === 'admin' || isAdmin?.(user.email) || isLifetime?.(user.email);
}

// Sub EFETIVA do usuário na workspace ativa (cai no Free se não houver
// assinatura válida). Sempre vem com `features`.
async function resolveSub(user) {
  return billing.getEffectiveSubscription({ userId: user.id, workspaceId: user.workspaceId || null });
}

// Verifica se a workspace ativa do usuário tem a feature do plano (ex: 'multi_user').
// Admins (role ou email) e lifetime passam sempre, independente de workspace.
async function hasFeature(user, feature) {
  if (!user) return false;
  if (isUnlimitedUser(user)) return true;
  const sub = await resolveSub(user);
  if (!sub) return false;
  if (sub.is_admin || sub.plan_id === 'lifetime') return true;
  return !!(sub.features?.[feature]);
}

// Retorna o objeto de features do plano efetivo (pra limites numéricos como
// max_categories / max_athletes). Admin/lifetime → { __unlimited: true }.
async function getPlanFeatures(user) {
  if (!user) return null;
  if (isUnlimitedUser(user)) return { __unlimited: true };
  const sub = await resolveSub(user);
  if (!sub) return null;
  if (sub.is_admin || sub.plan_id === 'lifetime') return { __unlimited: true };
  const features = { ...(sub.features || {}) };
  // Add-on de categoria: soma extra_category_slots ao limite do plano.
  // (Clubes são tratados à parte em clubs.js/canCreateClub via extra_club_slots.)
  const extraCats = Number(sub.extra_category_slots || 0);
  if (typeof features.max_categories === 'number' && features.max_categories !== -1) {
    features.max_categories += extraCats;
  }
  return features;
}

module.exports = { hasFeature, getPlanFeatures };
