import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, X as XIcon, ArrowLeft } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/common/Button';
import { api } from '../services/api';
import { isNative } from '../lib/platform';

function formatPrice(cents, currency = 'BRL') {
  if (!cents) return 'Grátis';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(cents / 100);
}

export function PricingPage() {
  const { colors } = useTheme();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [currentSub, setCurrentSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      api.get('/billing/plans').catch(() => []),
      isAuthenticated ? api.get('/billing/subscription').catch(() => null) : Promise.resolve(null),
    ]).then(([p, s]) => {
      if (!mounted) return;
      setPlans(p || []);
      setCurrentSub(s);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [isAuthenticated]);

  async function handleSelect(plan) {
    // App nativo: não vendemos assinatura dentro do app (Apple 3.1.1 / Google).
    // Manda pra tela de Assinatura, que mostra como assinar no site.
    if (isNative()) {
      navigate('/billing');
      return;
    }
    // Não logado: vai pro cadastro
    if (!isAuthenticated) {
      navigate('/register');
      return;
    }
    // Alerta usuário em trial Clube tentando assinar Pro
    const isTryingClube = currentSub?.plan_id === 'clube' || currentSub?.plan_id === 'clube_annual';
    const isPickingPro = plan.id === 'pro' || plan.id === 'pro_annual';
    if (isTryingClube && isPickingPro) {
      const ok = window.confirm(
        'Atenção: você está testando o plano Clube.\n\n' +
        'Ao assinar o Pro, você perderá:\n' +
        '• Convites para outros treinadores (multi-coach)\n' +
        '• Múltiplas categorias por clube (sub-15, sub-17…)\n' +
        '• Permissões por papel (treinador / auxiliar)\n\n' +
        'Recomendado: assine o Clube pra manter tudo que você testou.\n\n' +
        'Tem certeza que quer assinar o Pro mesmo assim?'
      );
      if (!ok) return;
    }
    setCheckoutLoading(plan.id);
    try {
      const data = await api.post('/billing/checkout', { plan_id: plan.id });
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        alert('Falha ao iniciar checkout. Tente novamente.');
      }
    } catch (err) {
      alert(err.message || 'Erro ao criar checkout');
    } finally {
      setCheckoutLoading(null);
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.background, padding: '3rem 1.5rem' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Link to="/login" style={{ fontSize: '0.875rem', color: colors.textSecondary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <ArrowLeft size={14} /> Voltar
        </Link>

        <div style={{ textAlign: 'center', marginTop: 24, marginBottom: 40 }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: colors.text, margin: 0 }}>Escolha seu plano</h1>
          <p style={{ fontSize: '1rem', color: colors.textSecondary, marginTop: 8 }}>
            15 dias grátis pra experimentar tudo. Cancele quando quiser.
          </p>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: colors.textSecondary }}>Carregando…</p>
        ) : (() => {
          const order = ['pro', 'clube', 'pro_annual', 'clube_annual'];
          const visible = plans
            .filter((p) => p.id !== 'lifetime' && p.price_cents > 0)
            .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
              {visible.map((p) => (
                <PlanCard
                  key={p.id}
                  plan={p}
                  highlight={p.id === 'clube_annual'}
                  colors={colors}
                  onSelect={() => handleSelect(p)}
                  loading={checkoutLoading === p.id}
                />
              ))}
            </div>
          );
        })()}

        <p style={{ textAlign: 'center', color: colors.textSecondary, fontSize: '0.8125rem', marginTop: 40 }}>
          Pagamento processado via Mercado Pago. Cancele quando quiser.
        </p>
      </div>
    </div>
  );
}

function PlanCard({ plan, highlight, colors, onSelect, loading }) {
  const features = plan.features || {};
  const isYearly = plan.interval === 'yearly';
  const monthlyEquiv = isYearly ? Math.round(plan.price_cents / 12) : plan.price_cents;

  // Features comuns aos dois planos (entram com check verde sempre)
  const baseFeatures = [
    'Atletas ilimitados',
    'Quadro tático com animação',
    'Programação semanal completa',
    'Estatísticas e relatórios',
    'Exportação em PDF',
  ];
  // Features exclusivas do Clube — Pro mostra com X vermelho pra deixar gap visível
  const isClube = !!features.multi_user;
  const clubsLabel = isClube ? 'Vários clubes' : '1 clube';
  const coachesLabel = isClube && features.max_coaches > 0
    ? `Até ${features.max_coaches} treinadores no mesmo clube`
    : 'Múltiplos treinadores no mesmo clube';
  const categoriesLabel = isClube && features.max_categories > 0
    ? `Até ${features.max_categories} categorias (sub-15, sub-17…)`
    : 'Categorias por clube (sub-15, sub-17…)';
  // No Pro mostramos "1 clube" como feature normal (não cortada) e o resto cortado.
  const clubeOnlyFeatures = [
    coachesLabel,
    categoriesLabel,
    'Convites por e-mail pra comissão técnica',
    'Permissões por papel (treinador / auxiliar)',
  ];

  return (
    <div
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${highlight ? colors.primary : colors.border}`,
        borderRadius: '0.75rem',
        padding: '1.75rem 1.5rem',
        position: 'relative',
        boxShadow: highlight ? `0 0 0 4px ${colors.primary}1A` : 'none',
      }}
    >
      {highlight && (
        <span style={{
          position: 'absolute', top: -12, right: 16,
          background: colors.primary, color: '#fff',
          fontSize: '0.7rem', fontWeight: 700, padding: '4px 10px', borderRadius: 999,
        }}>MAIS POPULAR</span>
      )}
      <h3 style={{ margin: 0, color: colors.text, fontSize: '1.25rem', fontWeight: 700 }}>{plan.name}</h3>
      {plan.description && <p style={{ color: colors.textSecondary, fontSize: '0.875rem', margin: '6px 0 16px' }}>{plan.description}</p>}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: '2rem', fontWeight: 800, color: colors.text }}>{formatPrice(monthlyEquiv, plan.currency)}</span>
        <span style={{ color: colors.textSecondary, fontSize: '0.875rem' }}>/mês</span>
      </div>
      {isYearly ? (
        <div style={{ fontSize: '0.75rem', color: '#22c55e', marginBottom: 18 }}>
          Cobrado anualmente: {formatPrice(plan.price_cents, plan.currency)}
        </div>
      ) : (
        <div style={{ fontSize: '0.75rem', color: colors.textSecondary, marginBottom: 18 }}>
          Sem fidelidade · cancele quando quiser
        </div>
      )}
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0', display: 'grid', gap: 8 }}>
        <li style={{ display: 'flex', alignItems: 'center', gap: 8, color: colors.text, fontSize: '0.875rem', fontWeight: 600 }}>
          <Check size={16} color={colors.primary} /> {clubsLabel}
        </li>
        {baseFeatures.map((f, i) => (
          <li key={`b-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, color: colors.text, fontSize: '0.875rem' }}>
            <Check size={16} color={colors.primary} /> {f}
          </li>
        ))}
        {clubeOnlyFeatures.map((f, i) => (
          <li key={`c-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem',
            color: isClube ? colors.text : colors.textSecondary,
            textDecoration: isClube ? 'none' : 'line-through',
            opacity: isClube ? 1 : 0.7,
          }}>
            {isClube
              ? <Check size={16} color={colors.primary} />
              : <XIcon size={16} color="#ef4444" />}
            {f}
          </li>
        ))}
      </ul>
      <Button fullWidth variant={highlight ? 'primary' : 'secondary'} onClick={onSelect} disabled={loading}>
        {loading ? 'Abrindo checkout…' : 'Assinar agora'}
      </Button>
    </div>
  );
}
