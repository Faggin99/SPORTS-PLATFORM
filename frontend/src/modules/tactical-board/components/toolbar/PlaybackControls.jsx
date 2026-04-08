import { Play, Pause, SkipBack, FastForward } from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';

const SPEED_OPTIONS = [0.5, 1, 1.5, 2];

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
  const { colors } = useTheme();

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
    backgroundColor: colors.primary,
    color: 'white',
    borderColor: colors.primary,
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
        title={isPlaying ? 'Pausar' : 'Reproduzir'}
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
              border: `1px solid ${s === speed ? colors.primary : 'rgba(255,255,255,0.2)'}`,
              backgroundColor: s === speed ? colors.primary : 'rgba(255,255,255,0.08)',
              color: s === speed ? 'white' : 'rgba(255,255,255,0.7)',
              fontSize: '0.75rem',
              fontWeight: '500',
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
