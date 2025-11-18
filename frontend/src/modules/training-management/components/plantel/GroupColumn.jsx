import React, { useState } from 'react';
import { Users } from 'lucide-react';
import AthleteCard from './AthleteCard';
import { useTheme } from '../../../../contexts/ThemeContext';

/**
 * Column displaying athletes in a specific group with drop zone
 * @param {Object} props
 * @param {string} props.groupNumber - Group number (1-4 or null for no group)
 * @param {string} props.groupName - Name of the group
 * @param {Array} props.athletes - Athletes in this group
 * @param {Function} props.onAthleteMove - Callback when athlete is moved to this group
 */
export default function GroupColumn({ groupNumber, groupName, athletes, onAthleteMove }) {
  const { colors } = useTheme();
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    try {
      const athleteData = JSON.parse(e.dataTransfer.getData('application/json'));
      if (onAthleteMove) {
        onAthleteMove(athleteData, groupNumber);
      }
    } catch (error) {
      console.error('Error dropping athlete:', error);
    }
  };

  const columnStyle = {
    flex: 1,
    backgroundColor: colors.surface,
    border: `1px solid ${isDragOver ? colors.primary : colors.border}`,
    borderRadius: '0.375rem',
    padding: '0.65rem',
    transition: 'all 0.2s',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
  };

  const headerStyle = {
    marginBottom: '0.5rem',
    paddingBottom: '0.4rem',
    borderBottom: `1px solid ${colors.border}`,
  };

  const titleStyle = {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: colors.text,
    marginBottom: '0.15rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  };

  const countStyle = {
    fontSize: '0.7rem',
    color: colors.textMuted,
  };

  const athletesListStyle = {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
  };

  const emptyStateStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem 0.5rem',
    color: colors.textMuted,
    fontSize: '0.75rem',
    textAlign: 'center',
    minHeight: '120px',
  };

  const getGroupColor = (number) => {
    const colors = {
      '1': '#3b82f6',
      '2': '#22c55e',
      '3': '#f59e0b',
      '4': '#ef4444',
    };
    return colors[number] || '#6b7280';
  };

  return (
    <div
      style={columnStyle}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div style={headerStyle}>
        <div style={titleStyle}>
          <Users size={15} color={getGroupColor(groupNumber)} />
          <span>{groupName}</span>
        </div>
        <div style={countStyle}>
          {athletes.length} {athletes.length === 1 ? 'atleta' : 'atletas'}
        </div>
      </div>

      <div style={athletesListStyle}>
        {athletes.length === 0 ? (
          <div style={emptyStateStyle}>
            <Users size={24} style={{ marginBottom: '0.3rem', opacity: 0.3 }} />
            <span>Arraste aqui</span>
          </div>
        ) : (
          athletes.map((athlete) => (
            <AthleteCard key={athlete.id} athlete={athlete} />
          ))
        )}
      </div>
    </div>
  );
}
