import { useState } from 'react';
import { UserPlus, X, Users } from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';

export default function PlayerPalette({
  athletes = [],
  onAddPlayer,
  teamAColor = '#3b82f6',
  teamBColor = '#ef4444',
  isOpen,
  onClose,
}) {
  const { colors } = useTheme();
  const [selectedTeam, setSelectedTeam] = useState('A');
  const [nextNumber, setNextNumber] = useState(1);

  if (!isOpen) return null;

  const handleAddAthlete = (athlete) => {
    onAddPlayer({
      team: selectedTeam,
      jerseyNumber: athlete.jersey_number || athlete.number || nextNumber,
      name: athlete.name || athlete.nome,
      athleteId: athlete.id,
    });
  };

  const handleAddGeneric = () => {
    onAddPlayer({
      team: selectedTeam,
      jerseyNumber: nextNumber,
      name: '',
      athleteId: null,
    });
    setNextNumber((n) => n + 1);
  };

  const teamColor = selectedTeam === 'A' ? teamAColor : teamBColor;

  return (
    <div style={{
      width: '220px',
      backgroundColor: colors.surface,
      borderLeft: `1px solid ${colors.border}`,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.75rem',
        borderBottom: `1px solid ${colors.border}`,
      }}>
        <span style={{ fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <Users size={16} /> Jogadores
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: colors.text, cursor: 'pointer' }}>
          <X size={16} />
        </button>
      </div>

      {/* Team selector */}
      <div style={{ display: 'flex', gap: '0.25rem', padding: '0.5rem' }}>
        {['A', 'B'].map((team) => (
          <button
            key={team}
            onClick={() => setSelectedTeam(team)}
            style={{
              flex: 1,
              padding: '0.375rem',
              borderRadius: '0.25rem',
              border: `2px solid ${selectedTeam === team ? (team === 'A' ? teamAColor : teamBColor) : colors.border}`,
              backgroundColor: selectedTeam === team ? `${team === 'A' ? teamAColor : teamBColor}20` : 'transparent',
              color: colors.text,
              fontSize: '0.8rem',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.25rem',
            }}
          >
            <span style={{
              width: 10, height: 10, borderRadius: '50%',
              backgroundColor: team === 'A' ? teamAColor : teamBColor,
            }} />
            Time {team}
          </button>
        ))}
      </div>

      {/* Generic player button */}
      <button
        onClick={handleAddGeneric}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          margin: '0 0.5rem',
          padding: '0.5rem',
          borderRadius: '0.375rem',
          border: `1px dashed ${colors.border}`,
          backgroundColor: 'transparent',
          color: colors.text,
          fontSize: '0.8rem',
          cursor: 'pointer',
        }}
      >
        <UserPlus size={14} color={teamColor} />
        Jogador genérico #{nextNumber}
      </button>

      {/* Athletes list */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '0.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
      }}>
        {athletes.length === 0 ? (
          <p style={{ fontSize: '0.75rem', color: colors.textSecondary, textAlign: 'center', padding: '1rem 0' }}>
            Nenhum atleta no plantel.
          </p>
        ) : (
          athletes.map((athlete) => (
            <button
              key={athlete.id}
              onClick={() => handleAddAthlete(athlete)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.375rem 0.5rem',
                borderRadius: '0.25rem',
                border: `1px solid ${colors.border}`,
                backgroundColor: 'transparent',
                color: colors.text,
                fontSize: '0.8rem',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
                borderRadius: '50%',
                backgroundColor: teamColor,
                color: 'white',
                fontSize: '0.7rem',
                fontWeight: '600',
                flexShrink: 0,
              }}>
                {athlete.jersey_number || athlete.number || '?'}
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {athlete.name || athlete.nome}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
