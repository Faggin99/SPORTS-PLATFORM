import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, Crown, CreditCard, Infinity, ShieldCheck, XCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '../components/common/Button';
import { api } from '../services/api';

function formatPrice(cents, currency = 'BRL') {
  if (!cents) return 'Grátis';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(cents / 100);
}

function statusBadge(status, colors) {
  const map = {
    trialing:  { label: 'Em avaliação', color: '#f59e0b', bg: '#f59e0b15' },
    active:    { label: 'Ativa',         color: '#22c55e', bg: '#22c55e15' },
    past_due:  { label: 'Pagamento pendente', color: '#ef4444', bg: '#ef444415' },
    paused:    { label: 'Pausada',       color: '#94a3b8', bg: '#94a3b815' },
    canceled:  { label: 'Cancelada',     color: '#94a3b8', bg: '#94a3b815' },
    expired:   { label: 'Expirada',      color: '#ef4444', bg: '#ef444415' },
  };
  const s = map[status] || { label: status, color: colors.textSecondary, bg: 'transparent' };
  return (
    <span style={{ display: 'inline-flex', padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, color: s.color, backgroundColor: s.bg }}>
      {s.label}
    </span>
  );
}

export function BillingPage() {
  const { colors } = useTheme();
  const navigate = useNavigate();
  const [sub, setSub] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/billing/subscription').catch(() => null),
      api.get('/billing/plans').catch(() => []),
    ]).then(([s, p]) => { setSub(s); setPlans(p || []); setLoading(false); });
  }, []);

  async function startCheckout(planId) {
    // Se o usuário está testando o Clube e quer assinar Pro, alerta o que perde.
    const isTryingClube = sub?.plan_id === 'clube' || sub?.plan_id === 'clube_annual';
    const isPickingPro = planId === 'pro' || planId === 'pro_annual';
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
    setCheckoutLoading(planId);
    try {
      const data = await api.post('/billing/checkout', { plan_id: planId });
      if (data.init_point) window.location.href = data.init_point;
    } catch (err) {
      alert(err.message || 'Erro ao abrir checkout');
    } finally {
      setCheckoutLoading(null);
    }
  }

  async function cancelSubscription() {
    const confirm1 = window.confirm('Tem certeza que deseja cancelar sua assinatura?\n\nO acesso pago será encerrado e você perderá os recursos premium.');
    if (!confirm1) return;
    try {
      await api.post('/billing/cancel', {});
      alert('Assinatura cancelada.');
      const s = await api.get('/billing/subscription').catch(() => null);
      setSub(s);
    } catch (err) {
      alert(err.message || 'Erro ao cancelar');
    }
  }

  if (loading) {
    return <div style={{ padding: 32, color: colors.textSecondary }}>Carregando…</div>;
  }

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: 960, margin: '0 auto', width: '100%' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: colors.text, margin: 0 }}>Assinatura</h1>
      <p style={{ fontSize: '0.875rem', color: colors.textSecondary, marginTop: 4, marginBottom: 24 }}>
        Gerencie seu plano e pagamentos.
      </p>

      <CurrentSubscription sub={sub} colors={colors} onCancel={cancelSubscription} />

      {(() => {
        const paidPlans = plans.filter(p =>
          p.id !== 'lifetime'
          && p.id !== 'free'
          && p.price_cents > 0
        );
        if (paidPlans.length === 0) return null;
        const isTrialExpiringOrExpired = sub?.status === 'trialing';
        // Ordena: Pro mensal, Clube mensal, Pro anual, Clube anual
        const order = ['pro', 'clube', 'pro_annual', 'clube_annual'];
        const sorted = [...paidPlans].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
        return (
          <div style={{ marginTop: 32 }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: colors.text, margin: '0 0 12px' }}>
              {isTrialExpiringOrExpired ? 'Escolha como continuar' : 'Planos disponíveis'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              {sorted.map((p) => (
                <PlanItem
                  key={p.id}
                  plan={p}
                  colors={colors}
                  onSelect={() => startCheckout(p.id)}
                  loading={checkoutLoading === p.id}
                  highlight={p.id === 'clube_annual'}
                  isCurrent={p.id === sub?.plan_id && sub?.status === 'active'}
                />
              ))}
            </div>
          </div>
        );
      })()}

      <AdvancedActions colors={colors} />
    </div>
  );
}

// Bloco "Avançado" no rodapé da página de Assinatura — abriga ações raras que
// não devem viver no header. Hoje: iniciar uma nova ASSINATURA separada
// (workspace nova com billing próprio). Diferente de criar outro clube.
function AdvancedActions({ colors }) {
  const navigate = useNavigate();
  return (
    <details style={{
      marginTop: 48,
      padding: '0.85rem 1rem',
      backgroundColor: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: 10,
    }}>
      <summary style={{
        fontSize: '0.85rem', fontWeight: 600, color: colors.textSecondary,
        cursor: 'pointer', listStyle: 'none', userSelect: 'none',
      }}>
        Opções avançadas
      </summary>
      <div style={{ marginTop: '0.85rem', fontSize: '0.82rem', color: colors.textSecondary, lineHeight: 1.5 }}>
        <p style={{ margin: '0 0 0.6rem' }}>
          <strong style={{ color: colors.text }}>Adicionar outro clube?</strong> Vá em <em>Minha Equipe → Clubes</em>.
          O plano Clube já vem com 3 clubes inclusos na mesma assinatura.
        </p>
        <p style={{ margin: '0 0 0.85rem' }}>
          Se você precisa de uma <strong style={{ color: colors.text }}>assinatura totalmente separada</strong> (caso raro:
          consultor com clientes diferentes, billings independentes), pode criar uma nova conta abaixo.
          Isso resulta em <strong>cobrança extra</strong> e dados isolados.
        </p>
        <button
          onClick={() => navigate('/select-workspace')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '0.45rem 0.85rem',
            background: 'transparent',
            border: `1px solid ${colors.border}`,
            color: colors.text,
            borderRadius: 6,
            fontSize: '0.8rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Iniciar nova assinatura separada
        </button>
      </div>
    </details>
  );
}

function CurrentSubscription({ sub, colors, onCancel }) {
  if (!sub) {
    return (
      <div style={{ padding: 20, backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <AlertTriangle size={20} color="#f59e0b" />
          <strong style={{ color: colors.text }}>Sem assinatura ativa</strong>
        </div>
        <p style={{ fontSize: '0.875rem', color: colors.textSecondary, margin: 0 }}>
          Escolha um plano abaixo para começar a usar todos os recursos.
        </p>
      </div>
    );
  }

  if (sub.is_admin || sub.plan_id === 'admin') {
    return (
      <Card colors={colors} icon={<ShieldCheck size={20} color="#a855f7" />} title="Conta Admin" subtitle="Acesso ilimitado a toda a plataforma." />
    );
  }

  if (sub.plan_id === 'lifetime') {
    return (
      <Card colors={colors} icon={<Infinity size={20} color="#22c55e" />} title="Plano Vitalício" subtitle="Acesso completo sem cobrança." />
    );
  }

  const isTrial = sub.status === 'trialing';
  const trialDays = sub.trial_days_left ?? null;
  const periodEnd = sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('pt-BR') : null;

  return (
    <div style={{ padding: 20, backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Crown size={20} color="#2563eb" />
            <strong style={{ color: colors.text, fontSize: '1.05rem' }}>{sub.plan_name || sub.plan_id}</strong>
            {statusBadge(sub.status, colors)}
          </div>
          {sub.price_cents != null && (
            <div style={{ color: colors.textSecondary, fontSize: '0.875rem' }}>
              {formatPrice(sub.price_cents)}/mês
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {isTrial && trialDays !== null && trialDays > 0 && (
          <InfoItem label="Dias restantes do trial" value={`${trialDays} ${trialDays === 1 ? 'dia' : 'dias'}`} colors={colors} highlight={trialDays <= 3 ? '#f59e0b' : undefined} />
        )}
        {periodEnd && (
          <InfoItem
            label={isTrial ? (trialDays === 0 ? 'Trial expirou em' : 'Trial expira em') : 'Próxima cobrança'}
            value={periodEnd}
            colors={colors}
            highlight={isTrial && trialDays === 0 ? '#ef4444' : undefined}
          />
        )}
      </div>

      {isTrial && trialDays === 0 && (
        <div style={{ marginTop: 16, padding: 14, backgroundColor: '#ef444415', borderRadius: 8, border: '1px solid #ef444440', fontSize: '0.875rem', color: colors.text }}>
          <strong style={{ color: '#ef4444' }}>Seu período de avaliação terminou.</strong>{' '}
          Escolha um dos planos abaixo para continuar usando o TactiPlan com todos os recursos.
        </div>
      )}

      {isTrial && trialDays > 0 && (
        <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f59e0b15', borderRadius: 8, border: '1px solid #f59e0b40', fontSize: '0.8125rem', color: colors.text }}>
          <strong>Você está testando o plano Clube</strong> — após {trialDays} dia{trialDays === 1 ? '' : 's'} é necessário escolher um plano (Pro ou Clube) pra continuar.
        </div>
      )}

      {/* Cancelar (só pra planos pagos não-vitalício/admin) */}
      {sub.plan_id !== 'lifetime' && !sub.is_admin && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '0.5rem 0.875rem',
              background: 'transparent',
              border: `1px solid #ef444440`,
              color: '#ef4444',
              borderRadius: 6,
              fontSize: '0.8125rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#ef444415'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <XCircle size={14} />
            Cancelar assinatura
          </button>
        </div>
      )}
    </div>
  );
}

function Card({ colors, icon, title, subtitle }) {
  return (
    <div style={{ padding: 20, backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        {icon}
        <strong style={{ color: colors.text, fontSize: '1.05rem' }}>{title}</strong>
      </div>
      <div style={{ color: colors.textSecondary, fontSize: '0.875rem' }}>{subtitle}</div>
    </div>
  );
}

function InfoItem({ label, value, colors, highlight }) {
  return (
    <div>
      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.5, color: colors.textSecondary }}>{label}</div>
      <div style={{ fontSize: '1rem', fontWeight: 600, color: highlight || colors.text, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function PlanItem({ plan, colors, onSelect, loading, highlight, isCurrent }) {
  const isYearly = plan.interval === 'yearly';
  const monthlyEquiv = isYearly ? plan.price_cents / 12 : plan.price_cents;
  return (
    <div style={{
      padding: 16,
      backgroundColor: colors.surface,
      border: `1px solid ${highlight ? colors.primary : colors.border}`,
      borderRadius: 12,
      position: 'relative',
      boxShadow: highlight ? `0 0 0 4px ${colors.primary}1A` : 'none',
    }}>
      {highlight && !isCurrent && (
        <span style={{
          position: 'absolute', top: -10, right: 12,
          background: colors.primary, color: '#fff',
          fontSize: '0.65rem', fontWeight: 700, padding: '3px 8px', borderRadius: 999,
          letterSpacing: '0.04em',
        }}>RECOMENDADO</span>
      )}
      {isCurrent && (
        <span style={{
          position: 'absolute', top: -10, right: 12,
          background: '#22c55e', color: '#fff',
          fontSize: '0.65rem', fontWeight: 700, padding: '3px 8px', borderRadius: 999,
          letterSpacing: '0.04em',
        }}>PLANO ATUAL</span>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <strong style={{ color: colors.text, fontSize: '1rem' }}>{plan.name}</strong>
        <span style={{ color: colors.text, fontWeight: 700 }}>
          {formatPrice(monthlyEquiv)}
          <span style={{ fontWeight: 400, color: colors.textSecondary, fontSize: 13 }}>/mês</span>
        </span>
      </div>
      {isYearly ? (
        <div style={{ fontSize: '0.75rem', color: '#22c55e', marginTop: 2 }}>
          Cobrado anualmente: {formatPrice(plan.price_cents)} · economize ~50%
        </div>
      ) : (
        <div style={{ fontSize: '0.75rem', color: colors.textSecondary, marginTop: 2 }}>
          Sem fidelidade · cancele quando quiser
        </div>
      )}
      <div style={{ height: 12 }} />
      <Button size="sm" fullWidth onClick={onSelect} disabled={loading || isCurrent} icon={<CreditCard size={14} />}>
        {isCurrent ? 'Você está aqui' : (loading ? 'Abrindo…' : 'Assinar')}
      </Button>
    </div>
  );
}
