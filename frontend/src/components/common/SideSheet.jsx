import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useIsMobile } from '../../hooks/useIsMobile';

export function SideSheet({ isOpen, onClose, title, children, width = 520, footer }) {
  const { colors } = useTheme();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  const backdropStyle = {
    position: 'fixed', inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(2px)',
    zIndex: 1000,
    opacity: isOpen ? 1 : 0,
    pointerEvents: isOpen ? 'auto' : 'none',
    transition: 'opacity 0.2s ease',
  };

  const sheetStyle = {
    position: 'fixed', top: 0, right: 0, bottom: 0,
    width: isMobile ? '100vw' : `min(${width}px, 100vw)`,
    backgroundColor: colors.background,
    borderLeft: `1px solid ${colors.border}`,
    boxShadow: '-12px 0 30px rgba(0,0,0,0.25)',
    zIndex: 1001,
    transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
    transition: 'transform 0.25s ease',
    display: 'flex',
    flexDirection: 'column',
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 1.25rem',
    borderBottom: `1px solid ${colors.border}`,
    flexShrink: 0,
  };

  const titleStyle = {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: colors.text,
    margin: 0,
  };

  const closeBtnStyle = {
    width: '2rem', height: '2rem',
    border: 'none', background: 'transparent',
    color: colors.textSecondary,
    cursor: 'pointer',
    borderRadius: '0.375rem',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  };

  const bodyStyle = {
    flex: 1,
    overflowY: 'auto',
    padding: '1rem 1.25rem',
  };

  const footerStyle = {
    padding: '0.75rem 1.25rem',
    borderTop: `1px solid ${colors.border}`,
    flexShrink: 0,
  };

  return (
    <>
      <div style={backdropStyle} onClick={onClose} />
      <aside style={sheetStyle} role="dialog" aria-modal="true" aria-label={title}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>{title}</h2>
          <button type="button" onClick={onClose} style={closeBtnStyle} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>
        <div style={bodyStyle}>{children}</div>
        {footer && <div style={footerStyle}>{footer}</div>}
      </aside>
    </>
  );
}
