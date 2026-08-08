import { useRef, useEffect } from 'react';
import { Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { notify } from '../../../../lib/notify';

// Identidade fixa da barra inferior: navy #0f172a + lime #c8ff00 (assinatura
// TactiPlan), independente do tema claro/escuro — a barra vive sobre o canvas
// escuro do campo.
const LIME = '#c8ff00';
const NAVY = '#0f172a';

export default function FrameControls({
  currentFrameIndex,
  totalFrames,
  onAddFrame,
  onDeleteFrame,
  onGoToFrame,
  onGoToPrevFrame,
  onGoToNextFrame,
}) {
  const activeChipRef = useRef(null);

  // Mantém o frame ativo visível na strip quando há muitos frames
  useEffect(() => {
    activeChipRef.current?.scrollIntoView?.({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
  }, [currentFrameIndex]);

  const handleDeleteFrame = async () => {
    const ok = await notify.confirm(`Excluir o frame ${currentFrameIndex + 1}?`, { confirmText: 'Excluir', cancelText: 'Cancelar' });
    if (ok) onDeleteFrame();
  };

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
    border: `1px solid ${isActive ? LIME : 'rgba(255,255,255,0.2)'}`,
    backgroundColor: isActive ? LIME : 'rgba(255,255,255,0.1)',
    color: isActive ? NAVY : 'white',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: isActive ? '700' : '400',
    transition: 'all 0.15s',
    flexShrink: 0,
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
            ref={i === currentFrameIndex ? activeChipRef : null}
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
        style={{ ...buttonStyle, borderColor: LIME, color: LIME }}
        onClick={onAddFrame}
        title="Novo frame (duplica o atual)"
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
        onClick={handleDeleteFrame}
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
        Frame {currentFrameIndex + 1} de {totalFrames}
      </span>
    </div>
  );
}
