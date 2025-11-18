import { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Tooltip Component
 *
 * A beautiful custom tooltip that appears on hover.
 *
 * Props:
 * - content: string or JSX - The tooltip content to display
 * - children: ReactNode - The element that triggers the tooltip
 * - position: 'top' | 'bottom' | 'left' | 'right' - Position of tooltip (default: 'top')
 * - delay: number - Delay before showing tooltip in ms (default: 200)
 * - maxWidth: number - Maximum width of tooltip in pixels (default: 300)
 */
export function Tooltip({
  content,
  children,
  position = 'top',
  delay = 200,
  maxWidth = 300
}) {
  const { colors } = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState(null);

  const handleMouseEnter = () => {
    const id = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    setTimeoutId(id);
  };

  const handleMouseLeave = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    setIsVisible(false);
  };

  // Don't render tooltip if no content
  if (!content) {
    return children;
  }

  const getPositionStyles = () => {
    const baseStyles = {
      position: 'absolute',
      zIndex: 10000,
      pointerEvents: 'none',
    };

    switch (position) {
      case 'top':
        return {
          ...baseStyles,
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%) translateY(-8px)',
          marginBottom: '4px',
        };
      case 'bottom':
        return {
          ...baseStyles,
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%) translateY(8px)',
          marginTop: '4px',
        };
      case 'left':
        return {
          ...baseStyles,
          right: '100%',
          top: '50%',
          transform: 'translateY(-50%) translateX(-8px)',
          marginRight: '4px',
        };
      case 'right':
        return {
          ...baseStyles,
          left: '100%',
          top: '50%',
          transform: 'translateY(-50%) translateX(8px)',
          marginLeft: '4px',
        };
      default:
        return baseStyles;
    }
  };

  const getArrowStyles = () => {
    const arrowBase = {
      position: 'absolute',
      width: 0,
      height: 0,
      borderStyle: 'solid',
    };

    const arrowColor = colors.surface || '#1f2937';

    switch (position) {
      case 'top':
        return {
          ...arrowBase,
          bottom: '-6px',
          left: '50%',
          transform: 'translateX(-50%)',
          borderWidth: '6px 6px 0 6px',
          borderColor: `${arrowColor} transparent transparent transparent`,
        };
      case 'bottom':
        return {
          ...arrowBase,
          top: '-6px',
          left: '50%',
          transform: 'translateX(-50%)',
          borderWidth: '0 6px 6px 6px',
          borderColor: `transparent transparent ${arrowColor} transparent`,
        };
      case 'left':
        return {
          ...arrowBase,
          right: '-6px',
          top: '50%',
          transform: 'translateY(-50%)',
          borderWidth: '6px 0 6px 6px',
          borderColor: `transparent transparent transparent ${arrowColor}`,
        };
      case 'right':
        return {
          ...arrowBase,
          left: '-6px',
          top: '50%',
          transform: 'translateY(-50%)',
          borderWidth: '6px 6px 6px 0',
          borderColor: `transparent ${arrowColor} transparent transparent`,
        };
      default:
        return arrowBase;
    }
  };

  const tooltipStyle = {
    ...getPositionStyles(),
    backgroundColor: colors.surface || '#1f2937',
    color: colors.text || '#ffffff',
    padding: '0.35rem 0.5rem',
    borderRadius: '0.25rem',
    fontSize: '0.75rem',
    fontWeight: '400',
    maxWidth: `${maxWidth}px`,
    wordWrap: 'break-word',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    border: `1px solid ${colors.border || '#374151'}`,
    opacity: isVisible ? 0.95 : 0,
    visibility: isVisible ? 'visible' : 'hidden',
    transition: 'opacity 0.15s ease-in-out, visibility 0.15s ease-in-out',
    whiteSpace: 'normal',
    lineHeight: '1.3',
  };

  return (
    <div
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      <div style={tooltipStyle}>
        <div style={getArrowStyles()} />
        {content}
      </div>
    </div>
  );
}
