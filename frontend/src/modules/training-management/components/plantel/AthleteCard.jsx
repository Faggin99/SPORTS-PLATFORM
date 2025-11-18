import React, { useState } from 'react';
import { GripVertical } from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';

/**
 * Card displaying athlete information with drag & drop
 * @param {Object} props
 * @param {Object} props.athlete - Athlete data
 * @param {Function} props.onDragStart - Callback when drag starts
 */
export default function AthleteCard({ athlete, onDragStart }) {
  const { colors } = useTheme();
  const [showTooltip, setShowTooltip] = useState(false);

  const handleDragStart = (e) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify(athlete));
    if (onDragStart) {
      onDragStart(athlete);
    }
  };

  const cardStyle = {
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: '0.25rem',
    padding: '0.35rem 0.5rem',
    marginBottom: '0.35rem',
    cursor: 'move',
    transition: 'all 0.15s',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    position: 'relative',
  };

  const gripStyle = {
    color: colors.textMuted,
    flexShrink: 0,
  };

  const contentStyle = {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  };

  const nameStyle = {
    fontSize: '0.75rem',
    fontWeight: '500',
    color: colors.text,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
    minWidth: 0,
  };

  const positionBadgeStyle = {
    padding: '0.1rem 0.35rem',
    borderRadius: '0.2rem',
    backgroundColor: colors.background,
    color: colors.textMuted,
    fontSize: '0.65rem',
    flexShrink: 0,
  };

  const tooltipStyle = {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginBottom: '0.35rem',
    backgroundColor: colors.background,
    color: colors.text,
    padding: '0.4rem 0.65rem',
    borderRadius: '0.25rem',
    fontSize: '0.75rem',
    whiteSpace: 'nowrap',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    border: `1px solid ${colors.border}`,
    zIndex: 1000,
    pointerEvents: 'none',
  };

  const truncateName = (name) => {
    const maxLength = 15;
    return name.length > maxLength ? name.substring(0, maxLength) + '...' : name;
  };

  const shouldShowTooltip = athlete.name && athlete.name.length > 15;

  return (
    <div
      style={cardStyle}
      draggable
      onDragStart={handleDragStart}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 2px 8px ${colors.border}`;
        e.currentTarget.style.transform = 'translateY(-2px)';
        if (shouldShowTooltip) {
          setShowTooltip(true);
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
        setShowTooltip(false);
      }}
    >
      <div style={gripStyle}>
        <GripVertical size={20} strokeWidth={1.5} />
      </div>
      <div style={contentStyle}>
        <div style={nameStyle}>{truncateName(athlete.name)}</div>
        {athlete.position && (
          <span style={positionBadgeStyle}>{athlete.position}</span>
        )}
      </div>
      {showTooltip && shouldShowTooltip && (
        <div style={tooltipStyle}>{athlete.name}</div>
      )}
    </div>
  );
}
