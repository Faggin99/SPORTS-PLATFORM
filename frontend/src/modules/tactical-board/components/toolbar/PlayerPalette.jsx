import { useState, useMemo } from 'react';
import { UserPlus, X, Users, Search } from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useIsMobile } from '../../../../hooks/useIsMobile';

export default function PlayerPalette({
  athletes = [],
  athleteIdsOnBoard = new Set(),
  onAddPlayer,
  nextGenericJersey,
  teamAColor = '#3b82f6',
  teamBColor = '#ef4444',
  isOpen,
  onClose,
}) {
  const { colors } = useTheme();
  const isMobile = useIsMobile();
  const [selectedTeam, setSelectedTeam] = useState('A');
  const [query, setQuery] = useState('');

  const filteredAthletes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return athletes;
    return athletes.filter((a) => {
      const name = (a.name || a.nome || '').toLowerCase();
      const num = String(a.jersey_number || a.number || '');
      return name.includes(q) || num === q;
    });
  }, [athletes, query]);

  const onBoardCount = useMemo(
    () => athletes.filter((a) => athleteIdsOnBoard.has(a.id)).length,
    [athletes, athleteIdsOnBoard]
  );

  if (!isOpen) return null;

  const handleAddAthlete = (athlete) => {
    if (athleteIdsOnBoard.has(athlete.id)) return;
    onAddPlayer({
      team: selectedTeam,
      jerseyNumber: athlete.jersey_number || athlete.number || nextGenericJersey?.(selectedTeam) || 2,
      name: athlete.name || athlete.nome,
      athleteId: athlete.id,
    });
  };

  const handleAddGeneric = () => {
    onAddPlayer({
      team: selectedTeam,
      jerseyNumber: nextGenericJersey?.(selectedTeam) || 2,
      name: '',
      athleteId: null,
    });
  };

  const teamColor = selectedTeam === 'A' ? teamAColor : teamBColor;

  return (
    <div style={{
      width: '230px',
      height: '100%',
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
          {onBoardCount > 0 && (
            <span style={{ fontSize: '0.68rem', fontWeight: 500, color: colors.textSecondary }}>
              · {onBoardCount} em campo
            </span>
          )}
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

      {/* Busca */}
      <div style={{ position: 'relative', margin: '0 0.5rem 0.5rem' }}>
        <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: colors.textSecondary }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome ou nº"
          autoFocus={!isMobile}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '0.4rem 0.5rem 0.4rem 1.7rem',
            borderRadius: '0.375rem',
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.background,
            color: colors.text,
            fontSize: '0.78rem',
            outline: 'none',
          }}
        />
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
        Jogador genérico
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
        ) : filteredAthletes.length === 0 ? (
          <p style={{ fontSize: '0.75rem', color: colors.textSecondary, textAlign: 'center', padding: '1rem 0' }}>
            Nenhum atleta encontrado pra "{query}".
          </p>
        ) : (
          filteredAthletes.map((athlete) => {
            const onBoard = athleteIdsOnBoard.has(athlete.id);
            return (
              <button
                key={athlete.id}
                onClick={() => handleAddAthlete(athlete)}
                disabled={onBoard}
                title={onBoard ? 'Já está em campo' : undefined}
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
                  cursor: onBoard ? 'default' : 'pointer',
                  textAlign: 'left',
                  opacity: onBoard ? 0.45 : 1,
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
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {athlete.name || athlete.nome}
                </span>
                {onBoard && (
                  <span style={{
                    fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase',
                    color: colors.textSecondary, letterSpacing: '0.04em', flexShrink: 0,
                  }}>
                    em campo
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
