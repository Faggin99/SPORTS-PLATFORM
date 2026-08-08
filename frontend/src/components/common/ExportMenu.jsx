import { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Dropdown unificado para exportação. Aceita callbacks pra PDF e Excel.
 *
 * Props:
 *  - onExportPDF(): callback ao clicar PDF
 *  - onExportExcel(): callback ao clicar Excel
 *  - disabled, size, variant: aspectos do botão
 *  - label: texto do botão (default "Exportar")
 *  - icon: ícone do botão (default Download)
 */
export function ExportMenu({
  onExportPDF, onExportExcel,
  disabled = false, size = 'md',
  label = 'Exportar', icon,
  variant = 'primary',
}) {
  const { colors, isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const padding = size === 'sm' ? '0.35rem 0.65rem' : '0.45rem 0.8rem';
  const fontSize = size === 'sm' ? '0.75rem' : '0.8rem';

  const btnStyle = variant === 'primary' ? {
    backgroundColor: colors.primary, color: '#fff',
    border: 'none',
  } : variant === 'floating' ? {
    // Pra usar sobre overlays/headers escuros: fundo branco semi-transparente
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    color: '#1f2937',
    border: '1px solid #dddddd',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  } : {
    backgroundColor: 'transparent', color: colors.text,
    border: `1px solid ${colors.border}`,
  };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(v => !v)}
        disabled={disabled}
        style={{
          ...btnStyle,
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          padding, borderRadius: '0.375rem',
          fontSize, fontWeight: 600,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {icon || <Download size={15} />}
        <span>{label}</span>
        <ChevronDown size={13} style={{ opacity: 0.85, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 0.3rem)',
          right: 0,
          backgroundColor: colors.background,
          border: `1px solid ${colors.border}`,
          borderRadius: '0.4rem',
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          minWidth: '12rem',
          overflow: 'hidden',
          zIndex: 1000,
        }}>
          {onExportPDF && (
            <MenuItem
              icon={<FileText size={15} />}
              label="Exportar PDF"
              onClick={() => { setOpen(false); onExportPDF(); }}
              colors={colors} isDark={isDark}
            />
          )}
          {onExportExcel && (
            <MenuItem
              icon={<FileSpreadsheet size={15} />}
              label="Exportar Excel"
              onClick={() => { setOpen(false); onExportExcel(); }}
              colors={colors} isDark={isDark}
              divider={Boolean(onExportPDF)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick, colors, isDark, divider }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%',
        display: 'flex', alignItems: 'center', gap: '0.6rem',
        padding: '0.55rem 0.85rem',
        border: 'none',
        borderTop: divider ? `1px solid ${colors.border}` : 'none',
        backgroundColor: hover ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)') : 'transparent',
        color: colors.text,
        fontSize: '0.825rem',
        fontWeight: 500,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <span style={{ color: colors.textSecondary, display: 'flex' }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
