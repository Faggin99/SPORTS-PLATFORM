import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { isNative } from '../lib/platform';
import { SITE_PLANOS_URL } from '../config/planos';

// F1: os planos e preços ficam no SITE (tactiplan.faggin.com.br/#planos).
// Logado na web → tela de Assinatura (onde escolhe o plano e paga);
// visitante → página de planos do site; app nativo → Assinatura (texto neutro).
export function PricingPage() {
  const { colors } = useTheme();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isNative() || isAuthenticated) navigate('/billing', { replace: true });
    else window.location.replace(SITE_PLANOS_URL);
  }, [isAuthenticated, navigate]);

  return <div style={{ padding: 32, color: colors.textSecondary, backgroundColor: colors.background, minHeight: '100vh' }}>Abrindo os planos…</div>;
}
