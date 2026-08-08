import { useRef, useState, useEffect } from 'react';
import { ChevronDown, Building2, Crown, Check } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useClub } from '../../contexts/ClubContext';

// Render do logo/avatar do clube (preferido) ou ícone genérico de workspace.
function WorkspaceIcon({ size = 14, color, logoUrl }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        style={{ width: size + 2, height: size + 2, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }
  return <Building2 size={size} color={color} />;
}

export function WorkspaceSwitcher({ compact = false }) {
  const { colors } = useTheme();
  const { workspaces, activeWorkspace, setActiveId } = useWorkspace();
  const { clubs, getLogoUrl } = useClub();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!activeWorkspace && workspaces.length === 0) return null;
  // Caso comum: usuário tem uma única conta. Não há o que trocar — não polui o
  // header com dropdown ofertando "Criar nova conta" (= nova assinatura) que
  //99% das pessoas não querem e confunde com criar novo clube.
  if (workspaces.length <= 1) return null;

  // No modelo "1 workspace = 1 clube", o switcher mostra o nome do CLUBE (mais identitário).
  // Se a workspace tiver múltiplos clubes (caso antigo), volta pra mostrar nome da workspace.
  const singleClub = clubs?.length === 1 ? clubs[0] : null;
  const label = singleClub?.name || activeWorkspace?.name || 'Escolher conta';
  const activeLogo = singleClub?.logo_path ? getLogoUrl?.(singleClub.logo_path) : null;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          padding: compact ? '0.4rem 0.6rem' : '0.45rem 0.75rem',
          backgroundColor: 'transparent',
          border: `1px solid ${colors.border}`,
          color: colors.text,
          borderRadius: '0.5rem',
          fontSize: compact ? '0.8rem' : '0.85rem',
          fontWeight: 500,
          cursor: 'pointer',
          maxWidth: compact ? 140 : 200,
        }}
      >
        <WorkspaceIcon size={14} color={colors.primary} logoUrl={activeLogo} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0,
          minWidth: 240,
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: '0.5rem',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          zIndex: 999,
          overflow: 'hidden',
        }}>
          <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: colors.textSecondary, fontWeight: 600 }}>
            Suas contas
          </div>
          {workspaces.map((w) => {
            const isActive = w.id === activeWorkspace?.id;
            return (
              <button
                key={w.id}
                onClick={() => { setActiveId(w.id); setOpen(false); }}
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.55rem 0.75rem',
                  backgroundColor: isActive ? `${colors.primary}10` : 'transparent',
                  color: colors.text,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  textAlign: 'left',
                }}
              >
                <Building2 size={14} color={isActive ? colors.primary : colors.textSecondary} />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontWeight: isActive ? 600 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.name}</div>
                  <div style={{ fontSize: '0.7rem', color: colors.textSecondary, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    {w.is_owner ? <><Crown size={10} /> Proprietário</> : `Membro · ${w.role}`}
                  </div>
                </div>
                {isActive && <Check size={14} color={colors.primary} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
