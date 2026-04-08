import { useState, useEffect } from 'react';
import { X, Goal, Shield, AlertTriangle, Clock, Plus, Target } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../common/Button';

export function EventModal({ isOpen, onClose, onAdd, matchDuration = 90, editingEvent = null }) {
  const { colors } = useTheme();
  const [eventType, setEventType] = useState('goal_scored');
  const [team, setTeam] = useState('own');
  const [goalType, setGoalType] = useState('offensive_org');
  const [half, setHalf] = useState(1); // 1 ou 2
  const [minuteInHalf, setMinuteInHalf] = useState(1); // minuto dentro do tempo
  const [stoppageTime, setStoppageTime] = useState(0); // acréscimo

  // Calcula o minuto total baseado no tempo e acréscimo
  const calculateTotalMinute = () => {
    if (half === 1) {
      return stoppageTime > 0 ? 45 + stoppageTime : minuteInHalf;
    } else {
      return stoppageTime > 0 ? 90 + stoppageTime : 45 + minuteInHalf;
    }
  };

  // Converte minuto total para half/minuteInHalf/stoppageTime
  const parseMinute = (totalMin) => {
    if (totalMin <= 45) {
      return { half: 1, minuteInHalf: totalMin, stoppageTime: 0 };
    } else if (totalMin <= 52) { // 45+1 até 45+7 (acréscimo 1º tempo)
      return { half: 1, minuteInHalf: 45, stoppageTime: totalMin - 45 };
    } else if (totalMin <= 90) {
      return { half: 2, minuteInHalf: totalMin - 45, stoppageTime: 0 };
    } else { // 90+ (acréscimo 2º tempo)
      return { half: 2, minuteInHalf: 45, stoppageTime: totalMin - 90 };
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (editingEvent) {
        setEventType(editingEvent.event_type);
        setTeam(editingEvent.team);
        setGoalType(editingEvent.goal_type || 'offensive_org');
        const parsed = parseMinute(editingEvent.minute);
        setHalf(parsed.half);
        setMinuteInHalf(parsed.minuteInHalf);
        setStoppageTime(parsed.stoppageTime);
      } else {
        setEventType('goal_scored');
        setTeam('own');
        setGoalType('offensive_org');
        setHalf(1);
        setMinuteInHalf(1);
        setStoppageTime(0);
      }
    }
  }, [isOpen, editingEvent]);

  if (!isOpen) return null;

  const handleAdd = () => {
    const isGoal = eventType === 'goal_scored' || eventType === 'goal_conceded';
    onAdd({
      event_type: eventType,
      team: team,
      goal_type: isGoal ? goalType : null,
      minute: calculateTotalMinute(),
    });
  };

  // Formata o minuto para exibição (ex: "45+2'" ou "78'")
  const formatMinuteDisplay = () => {
    if (half === 1) {
      if (stoppageTime > 0) {
        return `45+${stoppageTime}'`;
      }
      return `${minuteInHalf}'`;
    } else {
      if (stoppageTime > 0) {
        return `90+${stoppageTime}'`;
      }
      return `${45 + minuteInHalf}'`;
    }
  };

  const eventTypes = [
    {
      value: 'goal_scored',
      label: 'Gol Feito',
      icon: Goal,
      color: '#22c55e',
      bgColor: '#22c55e20',
    },
    {
      value: 'goal_conceded',
      label: 'Gol Tomado',
      icon: Shield,
      color: '#ef4444',
      bgColor: '#ef444420',
    },
    {
      value: 'red_card',
      label: 'Expulsão',
      icon: AlertTriangle,
      color: '#dc2626',
      bgColor: '#dc262620',
    },
  ];

  const goalTypes = [
    { value: 'offensive_org', label: 'Org. Ofensiva', shortLabel: 'Org. Of.' },
    { value: 'offensive_transition', label: 'Transição Of.', shortLabel: 'Trans.' },
    { value: 'free_kick', label: 'Falta', shortLabel: 'Falta' },
    { value: 'corner', label: 'Escanteio', shortLabel: 'Escant.' },
    { value: 'penalty', label: 'Pênalti', shortLabel: 'Pênalti' },
  ];

  const teamOptions = [
    { value: 'own', label: 'Nosso Time' },
    { value: 'opponent', label: 'Adversário' },
  ];

  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
    padding: '1rem',
  };

  const modalStyle = {
    backgroundColor: colors.background,
    borderRadius: '0.75rem',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    border: `1px solid ${colors.border}`,
  };

  const headerStyle = {
    padding: '1rem 1.5rem',
    borderBottom: `1px solid ${colors.border}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const contentStyle = {
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  };

  const footerStyle = {
    padding: '1rem 1.5rem',
    borderTop: `1px solid ${colors.border}`,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.5rem',
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: colors.text,
  };

  const eventTypeStyle = (type, isSelected) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    border: `2px solid ${isSelected ? type.color : colors.border}`,
    backgroundColor: isSelected ? type.bgColor : colors.surface,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    flex: 1,
    justifyContent: 'center',
  });

  const goalTypeBtnStyle = (isSelected) => ({
    padding: '0.5rem 0.75rem',
    borderRadius: '0.375rem',
    border: `2px solid ${isSelected ? colors.primary : colors.border}`,
    backgroundColor: isSelected ? `${colors.primary}15` : colors.surface,
    color: isSelected ? colors.primary : colors.text,
    fontWeight: '500',
    fontSize: '0.8rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    flex: '1 1 auto',
    textAlign: 'center',
    minWidth: '70px',
  });

  const teamBtnStyle = (isSelected) => ({
    flex: 1,
    padding: '0.75rem',
    borderRadius: '0.5rem',
    border: `2px solid ${isSelected ? colors.primary : colors.border}`,
    backgroundColor: isSelected ? `${colors.primary}15` : colors.surface,
    color: isSelected ? colors.primary : colors.text,
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  });

  // Mostrar opção de time apenas para expulsão
  const showTeamOption = eventType === 'red_card';
  // Mostrar tipo de gol para gols feitos ou tomados
  const showGoalType = eventType === 'goal_scored' || eventType === 'goal_conceded';

  const getGoalTypeLabel = (value) => {
    const type = goalTypes.find(t => t.value === value);
    return type ? type.label : '';
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Plus size={22} style={{ color: colors.primary }} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: colors.text }}>
              {editingEvent ? 'Editar Evento' : 'Adicionar Evento'}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.25rem',
              color: colors.textSecondary,
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div style={contentStyle}>
          {/* Tipo de Evento */}
          <div>
            <label style={labelStyle}>Tipo de Evento</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {eventTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = eventType === type.value;
                return (
                  <div
                    key={type.value}
                    style={eventTypeStyle(type, isSelected)}
                    onClick={() => setEventType(type.value)}
                  >
                    <Icon size={18} color={isSelected ? type.color : colors.textSecondary} />
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      color: isSelected ? type.color : colors.text,
                    }}>
                      {type.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tipo de Gol (para gols feitos ou tomados) */}
          {showGoalType && (
            <div>
              <label style={labelStyle}>
                <Target size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
                Como foi o gol?
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {goalTypes.map((type) => (
                  <button
                    key={type.value}
                    style={goalTypeBtnStyle(goalType === type.value)}
                    onClick={() => setGoalType(type.value)}
                  >
                    {type.shortLabel}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Time (apenas para expulsão) */}
          {showTeamOption && (
            <div>
              <label style={labelStyle}>De qual time?</label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {teamOptions.map((option) => (
                  <button
                    key={option.value}
                    style={teamBtnStyle(team === option.value)}
                    onClick={() => setTeam(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tempo do Jogo */}
          <div>
            <label style={labelStyle}>
              <Clock size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Tempo do Jogo
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <button
                style={{
                  flex: 1,
                  padding: '0.6rem',
                  borderRadius: '0.375rem',
                  border: `2px solid ${half === 1 ? colors.primary : colors.border}`,
                  backgroundColor: half === 1 ? `${colors.primary}15` : colors.surface,
                  color: half === 1 ? colors.primary : colors.text,
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => {
                  setHalf(1);
                  setStoppageTime(0);
                  if (minuteInHalf > 45) setMinuteInHalf(45);
                }}
              >
                1º Tempo
              </button>
              <button
                style={{
                  flex: 1,
                  padding: '0.6rem',
                  borderRadius: '0.375rem',
                  border: `2px solid ${half === 2 ? colors.primary : colors.border}`,
                  backgroundColor: half === 2 ? `${colors.primary}15` : colors.surface,
                  color: half === 2 ? colors.primary : colors.text,
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => {
                  setHalf(2);
                  setStoppageTime(0);
                  if (minuteInHalf > 45) setMinuteInHalf(45);
                }}
              >
                2º Tempo
              </button>
            </div>

            {/* Minuto dentro do tempo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', color: colors.textSecondary, marginBottom: '0.35rem' }}>
                  Minuto ({half === 1 ? '0-45' : '46-90'})
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="range"
                    min="1"
                    max="45"
                    value={minuteInHalf}
                    onChange={(e) => {
                      setMinuteInHalf(parseInt(e.target.value));
                      setStoppageTime(0);
                    }}
                    style={{
                      flex: 1,
                      height: '6px',
                      borderRadius: '3px',
                      appearance: 'none',
                      background: `linear-gradient(to right, ${colors.primary} 0%, ${colors.primary} ${(minuteInHalf / 45) * 100}%, ${colors.border} ${(minuteInHalf / 45) * 100}%, ${colors.border} 100%)`,
                      cursor: 'pointer',
                    }}
                  />
                  <input
                    type="number"
                    min="1"
                    max="45"
                    value={minuteInHalf}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      setMinuteInHalf(Math.min(Math.max(val, 1), 45));
                      setStoppageTime(0);
                    }}
                    style={{
                      width: '45px',
                      padding: '0.35rem',
                      borderRadius: '0.25rem',
                      border: `1px solid ${colors.border}`,
                      backgroundColor: colors.surface,
                      textAlign: 'center',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      color: colors.text,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Acréscimo */}
              <div style={{ width: '90px' }}>
                <div style={{ fontSize: '0.75rem', color: colors.textSecondary, marginBottom: '0.35rem' }}>
                  Acréscimo
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.9rem', color: colors.text, fontWeight: '500' }}>+</span>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={stoppageTime}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setStoppageTime(Math.min(Math.max(val, 0), 15));
                      if (val > 0) {
                        setMinuteInHalf(45);
                      }
                    }}
                    style={{
                      width: '45px',
                      padding: '0.35rem',
                      borderRadius: '0.25rem',
                      border: `1px solid ${stoppageTime > 0 ? colors.primary : colors.border}`,
                      backgroundColor: stoppageTime > 0 ? `${colors.primary}10` : colors.surface,
                      textAlign: 'center',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      color: stoppageTime > 0 ? colors.primary : colors.text,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div style={{
            padding: '1rem',
            backgroundColor: colors.surface,
            borderRadius: '0.5rem',
            border: `1px dashed ${colors.border}`,
          }}>
            <div style={{ fontSize: '0.75rem', color: colors.textSecondary, marginBottom: '0.5rem' }}>
              Resumo do evento:
            </div>
            <div style={{ fontSize: '0.9rem', color: colors.text }}>
              {eventType === 'goal_scored' && `Gol marcado aos ${formatMinuteDisplay()} (${getGoalTypeLabel(goalType)})`}
              {eventType === 'goal_conceded' && `Gol sofrido aos ${formatMinuteDisplay()} (${getGoalTypeLabel(goalType)})`}
              {eventType === 'red_card' && `Expulsão (${team === 'own' ? 'nosso time' : 'adversário'}) aos ${formatMinuteDisplay()}`}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleAdd}>
            {editingEvent ? 'Salvar' : 'Adicionar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
