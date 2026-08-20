import { useSubscription } from './useSubscription';
import { useAuth } from '../contexts/AuthContext';

// Retorna as features do plano ativo do usuário, com fallbacks.
// Admin (role) e lifetime são tratados como Clube (multi_user=true) pra UX consistente no admin.
export function usePlanFeatures() {
  const { sub, loading } = useSubscription();
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';
  const isLifetime = sub?.plan_id === 'lifetime' || sub?.features?.lifetime;
  const features = sub?.features || {};

  // Multi-user: admin/lifetime sempre; senão, depende do plano.
  const multi_user = isAdmin || isLifetime || !!features.multi_user;

  return {
    loading,
    isAdmin,
    isLifetime,
    planId: sub?.plan_id || null,
    planName: sub?.plan_name || null,
    // Plano Free (linha real ou fallback de trial/assinatura que acabou).
    isFree: !isAdmin && !isLifetime && (sub?.plan_id === 'free' || !!sub?.is_free),
    // Assinatura anterior que caducou (o backend manda quando cai no Free).
    lapsed: sub?.lapsed || null,
    multi_user,
    monthly_theme: isAdmin || isLifetime || !!features.monthly_theme,
    max_coaches: features.max_coaches,
    max_categories: features.max_categories,
    // Helper genérico
    has: (feature) => isAdmin || isLifetime || !!features[feature],
  };
}
