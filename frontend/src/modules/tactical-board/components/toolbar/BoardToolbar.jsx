import { Undo2, Redo2, UserPlus, Circle, Triangle, RectangleHorizontal, Flag, Trash2 } from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { FIELD_TYPES } from '../../utils/fieldDimensions';

export default function BoardToolbar({
  fieldType,
  onFieldTypeChange,
  onAddPlayer,
  onAddBall,
  onAddMarker,
  onRemoveSelected,
  selectedElementId,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
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

  const activeButtonStyle = {
    ...buttonStyle,
    backgroundColor: colors.primary,
    color: 'white',
    borderColor: colors.primary,
  };

  const disabledButtonStyle = {
    ...buttonStyle,
    opacity: 0.4,
    cursor: 'not-allowed',
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.5rem 1rem',
      backgroundColor: colors.surface,
      borderBottom: `1px solid ${colors.border}`,
      flexWrap: 'wrap',
    }}>
      {/* Field type selector */}
      <div style={{ display: 'flex', gap: '0.25rem', marginRight: '0.5rem' }}>
        <button
          style={fieldType === FIELD_TYPES.FOOTBALL_11 ? activeButtonStyle : buttonStyle}
          onClick={() => onFieldTypeChange(FIELD_TYPES.FOOTBALL_11)}
        >
          Futebol 11
        </button>
        <button
          style={fieldType === FIELD_TYPES.FUTSAL ? activeButtonStyle : buttonStyle}
          onClick={() => onFieldTypeChange(FIELD_TYPES.FUTSAL)}
        >
          Futsal
        </button>
      </div>

      <div style={{ width: 1, height: 28, backgroundColor: colors.border }} />

      {/* Add elements */}
      <button style={buttonStyle} onClick={() => onAddPlayer('A')} title="Adicionar jogador Time A">
        <UserPlus size={16} />
        <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#3b82f6', display: 'inline-block' }} />
      </button>

      <button style={buttonStyle} onClick={() => onAddPlayer('B')} title="Adicionar jogador Time B">
        <UserPlus size={16} />
        <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block' }} />
      </button>

      <button style={buttonStyle} onClick={onAddBall} title="Adicionar bola">
        <Circle size={16} />
        Bola
      </button>

      <div style={{ width: 1, height: 28, backgroundColor: colors.border }} />

      {/* Markers */}
      <button style={buttonStyle} onClick={() => onAddMarker('cone')} title="Adicionar cone">
        <Triangle size={16} color="#f97316" />
      </button>

      <button style={buttonStyle} onClick={() => onAddMarker('barrier')} title="Adicionar barreira">
        <RectangleHorizontal size={16} color="#a855f7" />
      </button>

      <button style={buttonStyle} onClick={() => onAddMarker('flag')} title="Adicionar bandeira">
        <Flag size={16} color="#ef4444" />
      </button>

      <div style={{ flex: 1 }} />

      {/* Undo / Redo */}
      <button
        style={canUndo ? buttonStyle : disabledButtonStyle}
        onClick={onUndo}
        disabled={!canUndo}
        title="Desfazer"
      >
        <Undo2 size={16} />
      </button>

      <button
        style={canRedo ? buttonStyle : disabledButtonStyle}
        onClick={onRedo}
        disabled={!canRedo}
        title="Refazer"
      >
        <Redo2 size={16} />
      </button>

      {/* Delete selected */}
      {selectedElementId && (
        <button
          style={{ ...buttonStyle, borderColor: '#ef4444', color: '#ef4444' }}
          onClick={onRemoveSelected}
          title="Remover elemento selecionado"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}
