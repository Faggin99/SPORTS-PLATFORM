import { Play, Pause, SkipBack } from 'lucide-react';

const SPEED_OPTIONS = [0.5, 1, 1.5, 2];

// Identidade fixa da barra inferior: play em lime #c8ff00 com ícone navy
// (assinatura TactiPlan), sobre a barra navy — não segue o tema claro/escuro.
const LIME = '#c8ff00';
const NAVY = '#0f172a';

export default function PlaybackControls({
  isPlaying,
  speed,
  currentFrameIndex,
  totalFrames,
  onPlay,
  onPause,
  onRewind,
  onSpeedChange,
}) {
  const buttonStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.15s',
  };

  const playButtonStyle = {
    ...buttonStyle,
    width: 44,
    height: 44,
    backgroundColor: LIME,
    color: NAVY,
    borderColor: LIME,
  };

  const canPlay = totalFrames > 1;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.75rem',
      padding: '0.5rem',
    }}>
      {/* Rewind */}
      <button
        style={buttonStyle}
        onClick={onRewind}
        title="Voltar ao início"
      >
        <SkipBack size={16} />
      </button>

      {/* Play/Pause */}
      <button
        style={{ ...playButtonStyle, opacity: canPlay ? 1 : 0.5 }}
        onClick={isPlaying ? onPause : onPlay}
        disabled={!canPlay}
        title={canPlay ? (isPlaying ? 'Pausar' : 'Reproduzir') : 'Crie um 2º frame para animar (botão +)'}
      >
        {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: 2 }} />}
      </button>

      {/* Speed */}
      <div style={{ display: 'flex', gap: '0.25rem' }}>
        {SPEED_OPTIONS.map((s) => (
          <button
            key={s}
            style={{
              padding: '0.25rem 0.5rem',
              borderRadius: '0.25rem',
              border: `1px solid ${s === speed ? LIME : 'rgba(255,255,255,0.2)'}`,
              backgroundColor: s === speed ? 'rgba(200,255,0,0.15)' : 'rgba(255,255,255,0.08)',
              color: s === speed ? LIME : 'rgba(255,255,255,0.7)',
              fontSize: '0.75rem',
              fontWeight: s === speed ? '700' : '500',
              cursor: 'pointer',
            }}
            onClick={() => onSpeedChange(s)}
            title={`Velocidade ${s}x`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}
