import { Moon, Sun, LogOut, User, Menu } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../common/Button';

export function Header({ isMobile = false, onMenuToggle }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, tenant, logout } = useAuth();

  const headerStyle = {
    backgroundColor: colors.surface,
    borderBottom: `1px solid ${colors.border}`,
    padding: isMobile ? '0 0.75rem' : '0 1.5rem',
    height: isMobile ? '3.5rem' : '4rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  };

  const leftSectionStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: isMobile ? '0.5rem' : '0.75rem',
  };

  const hamburgerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0.375rem',
    borderRadius: '0.375rem',
    color: colors.text,
  };

  const logoStyle = {
    fontSize: isMobile ? '1rem' : '1.25rem',
    fontWeight: '700',
    color: colors.primary,
    margin: 0,
  };

  const userInfoStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: isMobile ? '0.5rem' : '1rem',
  };

  const tenantNameStyle = {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: colors.text,
  };

  const userNameStyle = {
    fontSize: '0.75rem',
    color: colors.textSecondary,
  };

  const actionsStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  };

  const initialsCircleStyle = {
    width: '2rem',
    height: '2rem',
    borderRadius: '50%',
    backgroundColor: colors.primary,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: '600',
    flexShrink: 0,
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  return (
    <header style={headerStyle}>
      <div style={leftSectionStyle}>
        {isMobile && (
          <button style={hamburgerStyle} onClick={onMenuToggle}>
            <Menu size={24} strokeWidth={2} />
          </button>
        )}
        <h1 style={logoStyle}>TactiPlan</h1>
      </div>

      <div style={userInfoStyle}>
        {!isMobile && (
          <div style={{ textAlign: 'right' }}>
            <div style={tenantNameStyle}>{tenant?.name}</div>
            <div style={userNameStyle}>{user?.name}</div>
          </div>
        )}

        {isMobile && (
          <div style={initialsCircleStyle}>
            {getInitials(user?.name)}
          </div>
        )}

        <div style={actionsStyle}>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            icon={isDark ? <Sun size={22} strokeWidth={1.5} /> : <Moon size={22} strokeWidth={1.5} />}
          />

          {!isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              icon={<LogOut size={22} strokeWidth={1.5} />}
            >
              Sair
            </Button>
          )}

          {isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              icon={<LogOut size={20} strokeWidth={1.5} />}
            />
          )}
        </div>
      </div>
    </header>
  );
}
