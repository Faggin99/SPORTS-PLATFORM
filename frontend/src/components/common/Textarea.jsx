import { useTheme } from '../../contexts/ThemeContext';

export function Textarea({ label, fullWidth = false, rows = 3, ...props }) {
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

  const textareaStyle = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    border: `1px solid ${colors.border}`,
    borderRadius: '0.375rem',
    backgroundColor: colors.background,
    color: colors.text,
    outline: 'none',
    transition: 'border-color 0.2s',
    resize: 'vertical',
    fontFamily: 'inherit',
  };

  return (
    <div style={containerStyle}>
      {label && <label style={labelStyle}>{label}</label>}
      <textarea
        rows={rows}
        style={textareaStyle}
        onFocus={(e) => {
          e.target.style.borderColor = colors.primary;
        }}
        onBlur={(e) => {
          e.target.style.borderColor = colors.border;
        }}
        {...props}
      />
    </div>
  );
}
