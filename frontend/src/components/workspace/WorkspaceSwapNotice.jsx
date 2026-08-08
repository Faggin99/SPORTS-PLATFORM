import { useEffect, useState } from 'react';
import { ArrowRightLeft, X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const REASON_MSGS = {
  trial_expired:        'Seu período de avaliação terminou',
  subscription_expired: 'Sua assinatura expirou',
  payment_pending:      'Pagamento pendente',
  subscription_required:'Sem assinatura ativa',
};

// Lê sessionStorage no mount e mostra toast por ~8s.
// Usado quando o api.js auto-troca de workspace expirada → workspace utilizável.
export function WorkspaceSwapNotice() {
  const { colors } = useTheme();
  const [data, setData] = useState(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem('workspace_swap_notice');
    if (!raw) return;
    sessionStorage.removeItem('workspace_swap_notice');
    try {
      const parsed = JSON.parse(raw);
      setData(parsed);
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (!data) return;
    const t = setTimeout(() => setClosing(true), 7000);
    const t2 = setTimeout(() => setData(null), 8000);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [data]);

  if (!data) return null;

  const reasonLabel = REASON_MSGS[data.reason] || 'Conta indisponível';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.25rem',
        right: '1.25rem',
        zIndex: 9999,
        maxWidth: 420,
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderLeft: `4px solid ${colors.primary}`,
        borderRadius: '0.5rem',
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        padding: '0.875rem 1rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        opacity: closing ? 0 : 1,
        transform: closing ? 'translateY(8px)' : 'translateY(0)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 999,
        backgroundColor: `${colors.primary}20`, color: colors.primary,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <ArrowRightLeft size={16} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: colors.text }}>
          {reasonLabel} em <strong>{data.fromName}</strong>
        </div>
        <div style={{ fontSize: '0.78rem', color: colors.textSecondary, marginTop: 2 }}>
          Abrimos automaticamente <strong style={{ color: colors.text }}>{data.toName}</strong>, onde você tem acesso ativo.
        </div>
      </div>
      <button
        onClick={() => setClosing(true)}
        aria-label="Fechar"
        style={{
          background: 'transparent', border: 'none', color: colors.textSecondary,
          cursor: 'pointer', padding: 4, display: 'flex', flexShrink: 0,
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
