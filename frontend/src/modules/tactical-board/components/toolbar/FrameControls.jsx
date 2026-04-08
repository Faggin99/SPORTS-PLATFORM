import { Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';

export default function FrameControls({
  currentFrameIndex,
  totalFrames,
  onAddFrame,
  onDeleteFrame,
  onGoToFrame,
  onGoToPrevFrame,
  onGoToNextFrame,
}) {
  const { colors } = useTheme();

  const buttonStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: '0.375rem',
    border: '1px solid rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: 'white',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  };

  const frameButtonStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
    height: 32,
    borderRadius: '0.375rem',
    border: `1px solid ${isActive ? colors.primary : 'rgba(255,255,255,0.2)'}`,
    backgroundColor: isActive ? colors.primary : 'rgba(255,255,255,0.1)',
    color: 'white',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: isActive ? '600' : '400',
    transition: 'all 0.15s',
  });

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.5rem 1rem',
      backgroundColor: 'transparent',
    }}>
      {/* Navigation */}
      <button
        style={{ ...buttonStyle, opacity: currentFrameIndex > 0 ? 1 : 0.4 }}
        onClick={onGoToPrevFrame}
        disabled={currentFrameIndex === 0}
        title="Frame anterior"
      >
        <ChevronLeft size={16} />
      </button>

      {/* Frame strip */}
      <div style={{
        display: 'flex',
        gap: '0.25rem',
        overflow: 'auto',
        flex: 1,
        padding: '0.25rem 0',
      }}>
        {Array.from({ length: totalFrames }, (_, i) => (
          <button
            key={i}
            style={frameButtonStyle(i === currentFrameIndex)}
            onClick={() => onGoToFrame(i)}
            title={`Frame ${i + 1}`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <button
        style={{ ...buttonStyle, opacity: currentFrameIndex < totalFrames - 1 ? 1 : 0.4 }}
        onClick={onGoToNextFrame}
        disabled={currentFrameIndex >= totalFrames - 1}
        title="Próximo frame"
      >
        <ChevronRight size={16} />
      </button>

      <div style={{ width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' }} />

      {/* Add frame */}
      <button
        style={{ ...buttonStyle, borderColor: colors.primary, color: colors.primary }}
        onClick={onAddFrame}
        title="Adicionar frame"
      >
        <Plus size={16} />
      </button>

      {/* Delete frame */}
      <button
        style={{
          ...buttonStyle,
          borderColor: '#ef4444',
          color: '#ef4444',
          opacity: totalFrames > 1 ? 1 : 0.4,
        }}
        onClick={onDeleteFrame}
        disabled={totalFrames <= 1}
        title="Remover frame atual"
      >
        <Trash2 size={16} />
      </button>

      {/* Frame counter */}
      <span style={{
        fontSize: '0.8rem',
        color: 'rgba(255,255,255,0.7)',
        whiteSpace: 'nowrap',
      }}>
        {currentFrameIndex + 1} / {totalFrames}
      </span>
    </div>
  );
}
