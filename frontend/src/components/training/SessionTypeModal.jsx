import { useState, useEffect } from 'react';
import { Dribbble, Moon, Trophy } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useTheme } from '../../contexts/ThemeContext';

export function SessionTypeModal({ isOpen, onClose, session, onSave }) {
  const { colors } = useTheme();
  const [sessionType, setSessionType] = useState('training');
  const [opponentName, setOpponentName] = useState('');

  useEffect(() => {
    if (session) {
      setSessionType(session.session_type || 'training');
      setOpponentName(session.opponent_name || '');
    }
  }, [session]);

  const handleSave = () => {
    onSave({
      session_type: sessionType,
      opponent_name: sessionType === 'match' ? opponentName : null,
    });
  };

  const typeOptions = [
    { value: 'training', label: 'Treino Normal', Icon: Dribbble },
    { value: 'rest', label: 'Descanso', Icon: Moon },
    { value: 'match', label: 'Jogo', Icon: Trophy },
  ];

  const optionStyle = (isSelected) => ({
    padding: '1.5rem',
    border: `2px solid ${isSelected ? colors.primary : colors.border}`,
    borderRadius: '0.5rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backgroundColor: isSelected ? `${colors.primary}10` : colors.surface,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
  });

  const labelStyle = {
    fontSize: '1rem',
    fontWeight: '500',
    color: colors.text,
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '0.375rem',
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: '1rem',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Tipo de Sessão - ${session?.day_name || ''}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Tipo de Sessão */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '500', color: colors.text }}>
            Selecione o tipo de sessão:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {typeOptions.map((option) => (
              <div
                key={option.value}
                style={optionStyle(sessionType === option.value)}
                onClick={() => setSessionType(option.value)}
                onMouseEnter={(e) => {
                  if (sessionType !== option.value) {
                    e.currentTarget.style.borderColor = colors.primary;
                    e.currentTarget.style.backgroundColor = `${colors.primary}05`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (sessionType !== option.value) {
                    e.currentTarget.style.borderColor = colors.border;
                    e.currentTarget.style.backgroundColor = colors.surface;
                  }
                }}
              >
                <option.Icon size={48} strokeWidth={1.5} />
                <div style={labelStyle}>{option.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Campo de Adversário (apenas para Jogo) */}
        {sessionType === 'match' && (
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: colors.text }}>
              Adversário:
            </label>
            <input
              type="text"
              value={opponentName}
              onChange={(e) => setOpponentName(e.target.value)}
              placeholder="Digite o nome do adversário..."
              style={inputStyle}
              autoFocus
            />
          </div>
        )}

        {/* Descrição do tipo selecionado */}
        <div style={{
          padding: '1rem',
          backgroundColor: `${colors.primary}10`,
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          color: colors.textSecondary,
        }}>
          {sessionType === 'training' && 'Treino normal com 6 subdivisões de atividades.'}
          {sessionType === 'rest' && 'Dia de descanso - sem atividades programadas.'}
          {sessionType === 'match' && 'Dia de jogo - informação do adversário + 1 bloco "Não relacionados".'}
        </div>
      </div>
    </Modal>
  );
}
