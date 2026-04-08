import { Download, Save, FolderOpen, RotateCcw } from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';

export default function ExportControls({
  onSave,
  onLoad,
  onExportVideo,
  onReset,
  isExporting = false,
  totalFrames = 1,
}) {
  const { colors } = useTheme();

  const buttonStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    padding: '0.5rem 0.75rem',
    borderRadius: '0.375rem',
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: '0.8rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.5rem 1rem',
      backgroundColor: colors.surface,
      borderTop: `1px solid ${colors.border}`,
    }}>
      <button style={buttonStyle} onClick={onSave} title="Salvar jogada">
        <Save size={16} />
        Salvar
      </button>

      <button style={buttonStyle} onClick={onLoad} title="Carregar jogada">
        <FolderOpen size={16} />
        Carregar
      </button>

      <div style={{ flex: 1 }} />

      <button
        style={{
          ...buttonStyle,
          borderColor: '#ef4444',
          color: '#ef4444',
        }}
        onClick={onReset}
        title="Limpar quadro"
      >
        <RotateCcw size={16} />
        Limpar
      </button>

      <button
        style={{
          ...buttonStyle,
          backgroundColor: totalFrames > 1 && !isExporting ? colors.primary : colors.surface,
          color: totalFrames > 1 && !isExporting ? 'white' : colors.textSecondary,
          borderColor: totalFrames > 1 && !isExporting ? colors.primary : colors.border,
          opacity: totalFrames > 1 && !isExporting ? 1 : 0.5,
        }}
        onClick={onExportVideo}
        disabled={totalFrames <= 1 || isExporting}
        title="Exportar vídeo"
      >
        <Download size={16} />
        {isExporting ? 'Exportando...' : 'Exportar Vídeo'}
      </button>
    </div>
  );
}
