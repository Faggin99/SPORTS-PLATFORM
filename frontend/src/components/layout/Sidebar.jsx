import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Calendar, Users, BarChart3, Settings, ChevronDown, User, Building2, Target, Waypoints } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export function Sidebar({ isMobile = false, isOpen = false, onClose }) {
  const { colors } = useTheme();
  const [hoveredLink, setHoveredLink] = useState(null);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navLinks = [
    {
      to: '/training',
      icon: Calendar,
      label: 'Programacao de Treinos',
    },
    {
      to: '/training-stats',
      icon: BarChart3,
      label: 'Estatisticas de Treino',
    },
    {
      to: '/plantel',
      icon: Users,
      label: 'Plantel de Atletas',
    },
    {
      to: '/tactical-board',
      icon: Waypoints,
      label: 'Quadro Tatico',
    },
  ];

  const settingsSubLinks = [
    {
      to: '/settings',
      icon: User,
      label: 'Usuario',
    },
    {
      to: '/settings/clubs',
      icon: Building2,
      label: 'Clubes',
    },
    {
      to: '/settings/activities',
      icon: Target,
      label: 'Atividades',
    },
  ];

  const isSettingsActive = location.pathname.startsWith('/settings');

  // --- Mobile drawer mode ---
  if (isMobile) {
    const backdropStyle = {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 200,
      opacity: isOpen ? 1 : 0,
      pointerEvents: isOpen ? 'auto' : 'none',
      transition: 'opacity 0.3s ease',
    };

    const drawerStyle = {
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      width: '280px',
      backgroundColor: colors.surface,
      borderRight: `1px solid ${colors.border}`,
      zIndex: 201,
      transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
      transition: 'transform 0.3s ease',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
    };

    const drawerHeaderStyle = {
      padding: '1rem 1.25rem',
      borderBottom: `1px solid ${colors.border}`,
      fontSize: '1.1rem',
      fontWeight: '700',
      color: colors.primary,
    };

    const mobileNavLinkStyle = (isActive) => ({
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.875rem 1.25rem',
      color: isActive ? colors.primary : colors.text,
      textDecoration: 'none',
      fontSize: '0.9rem',
      fontWeight: '500',
      backgroundColor: isActive ? `${colors.primary}10` : 'transparent',
      borderLeft: `3px solid ${isActive ? colors.primary : 'transparent'}`,
      transition: 'background-color 0.2s',
    });

    const handleNavClick = () => {
      if (onClose) onClose();
    };

    return (
      <>
        {/* Backdrop */}
        <div style={backdropStyle} onClick={onClose} />

        {/* Drawer */}
        <aside style={drawerStyle}>
          <div style={drawerHeaderStyle}>Menu</div>
          <nav style={{ flex: 1, paddingTop: '0.5rem' }}>
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                style={({ isActive }) => mobileNavLinkStyle(isActive)}
                onClick={handleNavClick}
              >
                <link.icon size={22} strokeWidth={1.5} />
                {link.label}
              </NavLink>
            ))}

            {/* Settings section */}
            <button
              style={{
                ...mobileNavLinkStyle(isSettingsActive),
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
                background: isSettingsActive ? `${colors.primary}10` : 'transparent',
              }}
              onClick={() => setSettingsExpanded((prev) => !prev)}
            >
              <Settings size={22} strokeWidth={1.5} />
              <span style={{ flex: 1 }}>Configuracoes</span>
              <ChevronDown
                size={18}
                style={{
                  transform: settingsExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                }}
              />
            </button>

            {settingsExpanded && (
              <div style={{ paddingLeft: '1rem' }}>
                {settingsSubLinks.map((subLink) => (
                  <NavLink
                    key={subLink.to}
                    to={subLink.to}
                    end={subLink.to === '/settings'}
                    style={({ isActive }) => ({
                      ...mobileNavLinkStyle(isActive),
                      paddingLeft: '1.5rem',
                      fontSize: '0.85rem',
                    })}
                    onClick={handleNavClick}
                  >
                    <subLink.icon size={18} strokeWidth={1.5} />
                    {subLink.label}
                  </NavLink>
                ))}
              </div>
            )}
          </nav>
        </aside>
      </>
    );
  }

  // --- Desktop sidebar mode ---
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

  const settingsButtonStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.75rem',
    color: isSettingsActive ? colors.primary : colors.text,
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: '500',
    backgroundColor: isSettingsActive ? `${colors.primary}10` : 'transparent',
    borderLeft: `3px solid ${isSettingsActive ? colors.primary : 'transparent'}`,
    transition: 'background-color 0.2s, border-color 0.2s',
    position: 'relative',
    width: '100%',
    boxSizing: 'border-box',
    cursor: 'pointer',
    border: 'none',
  };

  const submenuStyle = {
    position: 'absolute',
    left: 'calc(100% - 0.5rem)',
    top: 0,
    zIndex: 1000,
    minWidth: '200px',
    paddingLeft: '0.5rem',
  };

  const submenuContainerStyle = {
    backgroundColor: colors.background,
    border: `1px solid ${colors.border}`,
    borderRadius: '0.375rem',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    overflow: 'hidden',
  };

  const submenuItemStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    color: isActive ? colors.primary : colors.text,
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: '500',
    backgroundColor: isActive ? `${colors.primary}10` : 'transparent',
    borderLeft: `3px solid ${isActive ? colors.primary : 'transparent'}`,
    transition: 'background-color 0.2s',
  });

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

        {/* Settings with submenu */}
        <div style={{ position: 'relative' }}>
          <button
            style={settingsButtonStyle}
            onMouseEnter={() => {
              setHoveredLink('settings');
              setSettingsExpanded(true);
            }}
            onMouseLeave={() => {
              setHoveredLink(null);
              setSettingsExpanded(false);
            }}
          >
            <span style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              flexShrink: 0
            }}>
              <Settings size={48} strokeWidth={1.5} />
            </span>

            {(hoveredLink === 'settings' || settingsExpanded) && (
              <div
                style={submenuStyle}
                onMouseEnter={() => setSettingsExpanded(true)}
                onMouseLeave={() => setSettingsExpanded(false)}
              >
                <div style={submenuContainerStyle}>
                  {settingsSubLinks.map((subLink) => (
                    <NavLink
                      key={subLink.to}
                      to={subLink.to}
                      end={subLink.to === '/settings'}
                      style={({ isActive }) => submenuItemStyle(isActive)}
                      onMouseEnter={(e) => {
                        if (!location.pathname.startsWith(subLink.to)) {
                          e.currentTarget.style.backgroundColor = colors.surfaceHover;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!location.pathname.startsWith(subLink.to)) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <subLink.icon size={18} />
                      {subLink.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            )}
          </button>
        </div>
      </nav>
    </aside>
  );
}
