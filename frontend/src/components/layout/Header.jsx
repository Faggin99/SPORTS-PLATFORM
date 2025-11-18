import { Moon, Sun, LogOut, User } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../common/Button';

export function Header() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, tenant, logout } = useAuth();

  const headerStyle = {
    backgroundColor: colors.surface,
    borderBottom: `1px solid ${colors.border}`,
    padding: '0 1.5rem',
    height: '4rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  };

  const logoStyle = {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: colors.primary,
    margin: 0,
  };

  const userInfoStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
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

  return (
    <header style={headerStyle}>
      <h1 style={logoStyle}>Training Manager</h1>

      <div style={userInfoStyle}>
        <div style={{ textAlign: 'right' }}>
          <div style={tenantNameStyle}>{tenant?.name}</div>
          <div style={userNameStyle}>{user?.name}</div>
        </div>

        <div style={actionsStyle}>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            icon={isDark ? <Sun size={22} strokeWidth={1.5} /> : <Moon size={22} strokeWidth={1.5} />}
          />

          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            icon={<LogOut size={22} strokeWidth={1.5} />}
          >
            Sair
          </Button>
        </div>
      </div>
    </header>
  );
}
