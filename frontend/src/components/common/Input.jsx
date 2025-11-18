import { useTheme } from '../../contexts/ThemeContext';

export function Input({
  label,
  error,
  fullWidth = false,
  icon,
  ...props
}) {
  const { colors } = useTheme();

  const containerStyle = {
    width: fullWidth ? '100%' : 'auto',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: colors.text,
    marginBottom: '0.375rem',
  };

  const inputWrapperStyle = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  };

  const inputStyle = {
    width: '100%',
    padding: icon ? '0.5rem 0.75rem 0.5rem 2.5rem' : '0.5rem 0.75rem',
    fontSize: '0.875rem',
    border: `1px solid ${error ? colors.error : colors.border}`,
    borderRadius: '0.375rem',
    backgroundColor: colors.background,
    color: colors.text,
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  const iconStyle = {
    position: 'absolute',
    left: '0.75rem',
    color: colors.textMuted,
    display: 'flex',
    alignItems: 'center',
  };

  const errorStyle = {
    fontSize: '0.75rem',
    color: colors.error,
    marginTop: '0.25rem',
  };

  return (
    <div style={containerStyle}>
      {label && <label style={labelStyle}>{label}</label>}
      <div style={inputWrapperStyle}>
        {icon && <span style={iconStyle}>{icon}</span>}
        <input
          style={inputStyle}
          onFocus={(e) => {
            e.target.style.borderColor = colors.primary;
          }}
          onBlur={(e) => {
            e.target.style.borderColor = error ? colors.error : colors.border;
          }}
          {...props}
        />
      </div>
      {error && <div style={errorStyle}>{error}</div>}
    </div>
  );
}
