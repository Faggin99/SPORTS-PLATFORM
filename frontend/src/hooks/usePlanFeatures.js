import { useSubscription } from './useSubscription';
import { useAuth } from '../contexts/AuthContext';
import { isPlanoEntrada, MAX_CONVIDADOS_ENTRADA } from '../config/planos';

// Retorna as features do plano ativo do usuário, com fallbacks.
// Admin (role), cortesia e vitalício são tratados como ilimitados.
// F1: não existe plano Free — conta sem assinatura paga fica em SÓ LEITURA
// (o servidor recusa escrita com 402 READ_ONLY).
export function usePlanFeatures() {
  const { sub, loading } = useSubscription();
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';
  const isLifetime = sub?.plan_id === 'lifetime' || !!sub?.features?.lifetime;
  const features = sub?.features || {};
  const readOnly = !isAdmin && !isLifetime && !!sub?.read_only;

  // Multi-user (categorias + comissão completa): Clube, admin, vitalício.
  const multi_user = isAdmin || isLifetime || !!features.multi_user;
  // Equipe (convidar pessoas): Clube e plano de entrada (com limite).
  const equipe = !readOnly && (isAdmin || isLifetime || !!features.equipe || !!features.multi_user || isPlanoEntrada(sub?.plan_id));
  const maxConvidados = (isAdmin || isLifetime) ? -1
    : (typeof features.max_convidados === 'number' ? features.max_convidados
      : (isPlanoEntrada(sub?.plan_id) ? MAX_CONVIDADOS_ENTRADA : (features.max_coaches ?? 0)));

  return {
    loading,
    isAdmin,
    isLifetime,
    isCortesia: !!sub?.is_cortesia,
    planId: sub?.plan_id || null,
    planName: sub?.plan_name || null,
    readOnly,
    // Compat: telas antigas perguntavam "isFree" — hoje equivale a só leitura.
    isFree: readOnly,
    // Assinatura anterior que venceu (o backend manda quando a conta está em só leitura).
    lapsed: sub?.lapsed || null,
    multi_user,
    equipe,
    maxConvidados,
    monthly_theme: isAdmin || isLifetime || !!features.monthly_theme,
    max_coaches: features.max_coaches,
    max_categories: features.max_categories,
    // Helper genérico
    has: (feature) => {
      if (feature === 'equipe') return equipe;
      return isAdmin || isLifetime || !!features[feature];
    },
  };
}
