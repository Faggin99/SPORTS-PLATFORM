import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, CreditCard } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '../components/common/Button';
import { api } from '../services/api';

// Tela de retorno do checkout do Mercado Pago (back_url = /#/billing/callback).
// A confirmação do pagamento chega por webhook, que pode levar alguns segundos —
// então aqui a gente faz polling curto em /billing/subscription até a assinatura
// virar ativa, sem travar o usuário: se demorar, mostra "em processamento".
export function BillingCallbackPage() {
  const { colors } = useTheme();
  const navigate = useNavigate();
  const [state, setState] = useState('checking'); // checking | active | pending
  const [planName, setPlanName] = useState('');
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    const started = Date.now();
    const TIMEOUT_MS = 20000;
    const INTERVAL_MS = 2500;

    async function poll() {
      if (cancelled.current) return;
      try {
        const sub = await api.get('/billing/subscription').catch(() => null);
        if (sub && sub.status === 'active') {
          setState('active');
          setPlanName(sub.plan_name || '');
          return;
        }
      } catch { /* ignora e tenta de novo */ }

      if (Date.now() - started >= TIMEOUT_MS) {
        setState('pending');
        return;
      }
      setTimeout(poll, INTERVAL_MS);
    }
    poll();
    return () => { cancelled.current = true; };
  }, []);

  const wrap = {
    minHeight: 'calc(100vh - 64px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '2rem 1.5rem',
  };
  const card = {
    maxWidth: 420, width: '100%', textAlign: 'center',
    backgroundColor: colors.surface, border: `1px solid ${colors.border}`,
    borderRadius: '0.9rem', padding: '2rem 1.75rem',
    boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
  };
  const iconWrap = (bg, fg) => ({
    width: 60, height: 60, borderRadius: '50%',
    backgroundColor: bg, color: fg,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 1.1rem',
  });

  return (
    <div style={wrap}>
      <div style={card}>
        {state === 'checking' && (
          <>
            <div style={iconWrap(`${colors.primary}1A`, colors.primary)}>
              <CreditCard size={28} />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: colors.text }}>
              Confirmando seu pagamento…
            </h2>
            <p style={{ margin: '0.6rem 0 0', color: colors.textSecondary, fontSize: '0.9rem' }}>
              Isso costuma levar só alguns segundos. Não feche esta tela.
            </p>
          </>
        )}

        {state === 'active' && (
          <>
            <div style={iconWrap('rgba(16,185,129,0.14)', '#10b981')}>
              <CheckCircle2 size={30} />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: colors.text }}>
              Assinatura ativada!
            </h2>
            <p style={{ margin: '0.6rem 0 1.4rem', color: colors.textSecondary, fontSize: '0.9rem' }}>
              {planName ? `Seu plano ${planName} já está ativo.` : 'Seu plano já está ativo.'} Bom trabalho, treinador.
            </p>
            <Button onClick={() => navigate('/home')} style={{ width: '100%' }}>
              Ir para o início
            </Button>
          </>
        )}

        {state === 'pending' && (
          <>
            <div style={iconWrap('rgba(245,158,11,0.14)', '#f59e0b')}>
              <Clock size={28} />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: colors.text }}>
              Pagamento em processamento
            </h2>
            <p style={{ margin: '0.6rem 0 1.4rem', color: colors.textSecondary, fontSize: '0.9rem' }}>
              O Mercado Pago está confirmando seu pagamento. Assim que aprovar, seu
              plano é liberado automaticamente — pode levar alguns minutos. Você
              pode continuar usando normalmente.
            </p>
            <Button onClick={() => navigate('/billing')} style={{ width: '100%' }}>
              Ver minha assinatura
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default BillingCallbackPage;
