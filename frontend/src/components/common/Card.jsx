import { useTheme } from '../../contexts/ThemeContext';

export function Card({ children, title, actions, className = '', style = {} }) {
  const { colors } = useTheme();

  const cardStyle = {
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: '0.5rem',
    overflow: 'hidden',
    ...style,
  };

  const headerStyle = {
    padding: '1rem 1.5rem',
    borderBottom: `1px solid ${colors.border}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const titleStyle = {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: colors.text,
    margin: 0,
  };

  const contentStyle = {
    padding: '1.5rem',
  };

  return (
    <div style={cardStyle} className={className}>
      {(title || actions) && (
        <div style={headerStyle}>
          {title && <h3 style={titleStyle}>{title}</h3>}
          {actions && <div style={{ display: 'flex', gap: '0.5rem' }}>{actions}</div>}
        </div>
      )}
      <div style={contentStyle}>
        {children}
      </div>
    </div>
  );
}
