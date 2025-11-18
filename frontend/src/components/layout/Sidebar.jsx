import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Calendar, Users, BarChart3, Settings } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export function Sidebar() {
  const { colors } = useTheme();
  const [hoveredLink, setHoveredLink] = useState(null);

  const sidebarStyle = {
    width: '5.5rem',
    backgroundColor: colors.surface,
    borderRight: `1px solid ${colors.border}`,
    padding: '1.5rem 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    position: 'relative',
  };

  const navLinkStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.75rem',
    color: isActive ? colors.primary : colors.text,
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: '500',
    backgroundColor: isActive ? `${colors.primary}10` : 'transparent',
    borderLeft: `3px solid ${isActive ? colors.primary : 'transparent'}`,
    transition: 'background-color 0.2s, border-color 0.2s',
    position: 'relative',
    width: '100%',
    boxSizing: 'border-box',
  });

  const tooltipStyle = {
    position: 'absolute',
    left: '100%',
    marginLeft: '0.5rem',
    backgroundColor: colors.background,
    color: colors.text,
    padding: '0.5rem 0.75rem',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    border: `1px solid ${colors.border}`,
    zIndex: 1000,
    pointerEvents: 'none',
  };

  const navLinks = [
    {
      to: '/training',
      icon: Calendar,
      label: 'Programação de Treinos',
    },
    {
      to: '/training-stats',
      icon: BarChart3,
      label: 'Estatísticas de Treino',
    },
    {
      to: '/plantel',
      icon: Users,
      label: 'Plantel de Atletas',
    },
    {
      to: '/settings',
      icon: Settings,
      label: 'Configurações',
    },
  ];

  return (
    <aside style={sidebarStyle}>
      <nav>
        {navLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            style={({ isActive }) => navLinkStyle(isActive)}
            onMouseEnter={() => setHoveredLink(link.to)}
            onMouseLeave={() => setHoveredLink(null)}
          >
            <span style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              flexShrink: 0
            }}>
              <link.icon size={48} strokeWidth={1.5} />
            </span>
            {hoveredLink === link.to && (
              <div style={tooltipStyle}>
                {link.label}
              </div>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
