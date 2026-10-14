import { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Moon, Sun, LogOut, HelpCircle, Settings, ChevronDown, Menu, X,
  Calendar, BarChart3, ClipboardList, Waypoints, Users, Building2, Target, Layers, BookOpen, User, CreditCard, LayoutGrid, UsersRound, Lock, Trophy, Home,
} from 'lucide-react';
import { usePlanFeatures } from '../../hooks/usePlanFeatures';
import { useCan } from '../../hooks/useCan';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { ClubSelector } from '../club/ClubSelector';
import { WorkspaceSwitcher } from '../workspace/WorkspaceSwitcher';
import { useClub } from '../../contexts/ClubContext';
import { SettingsSheet } from '../settings/SettingsSheet';
import { replayTour } from '../../hooks/useTour';

const TOUR_PAGES = [
  { key: 'training', label: 'Programação', route: '/training', icon: Calendar },
  { key: 'stats', label: 'Estatísticas', route: '/training-stats', icon: BarChart3 },
  { key: 'plantel', label: 'Plantel de Atletas', route: '/plantel', icon: Users },
  { key: 'tactical-board', label: 'Quadro Tático', route: '/tactical-board', icon: Waypoints },
];

// Itens da aba "Minha Equipe" — `gated` por feature de plano, `permission` exige scope.
const equipeItems = [
  { to: '/settings/clubs',       icon: Building2,  label: 'Clubes' },
  { to: '/settings/categories',  icon: LayoutGrid, label: 'Categorias',         gated: 'multi_user', permission: 'categories:manage' },
  { to: '/plantel',              icon: Users,      label: 'Plantel de Atletas', permission: 'athletes:view' },
  { to: '/settings/team',        icon: User,       label: 'Staff',              gated: 'multi_user', permission: 'members:manage' },
  { to: '/settings/competitions',icon: Trophy,     label: 'Campeonatos',        permission: 'training:edit' },
];

const cadastrosItems = [
  { to: '/settings/contents', icon: BookOpen, label: 'Conteúdos', permission: 'library:edit' },
  { to: '/settings/activities', icon: Target, label: 'Atividades', permission: 'library:edit' },
];

const mainNav = [
  { to: '/training', icon: Calendar, label: 'Programação' },
  { to: '/training-stats', icon: BarChart3, label: 'Estatísticas' },
  { kind: 'equipe', icon: UsersRound, label: 'Minha Equipe' },
  { kind: 'cadastros', icon: ClipboardList, label: 'Cadastros' },
  { to: '/tactical-board', icon: Waypoints, label: 'Quadro Tático', gated: 'quadro_tatico' },
];

function useOnOutsideClick(ref, handler) {
  useEffect(() => {
    function onDown(e) {
      if (ref.current && !ref.current.contains(e.target)) handler();
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [ref, handler]);
}

function IconBtn({ baseStyle, hoverBg, hoverColor, children, ...rest }) {
  const [hover, setHover] = useState(false);
  const style = hover
    ? {
        ...baseStyle,
        // Mantém a cor base (vermelho do logout) ou aplica hoverColor explícito
        color: baseStyle.color === '#ef4444' ? '#ef4444' : (hoverColor || baseStyle.color),
        backgroundColor: hoverBg || baseStyle.backgroundColor,
      }
    : baseStyle;
  return (
    <button
      type="button"
      {...rest}
      style={style}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {children}
    </button>
  );
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0][0].toUpperCase();
}

export function Header({ isMobile = false }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { clubs } = useClub();
  const location = useLocation();
  const navigate = useNavigate();
  // Modelo workspace: 1 conta = 1 clube na maioria dos casos. Só mostra o ClubSelector
  // se houver mais de um clube (ex: contas antigas migradas com múltiplos clubes).
  const showClubSelector = (clubs?.length || 0) > 1;

  const [cadastrosOpen, setCadastrosOpen] = useState(false);
  const [equipeOpen, setEquipeOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsSheetOpen, setSettingsSheetOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('perfil');

  const cadastrosRef = useRef(null);
  const equipeRef = useRef(null);
  const userMenuRef = useRef(null);
  const helpRef = useRef(null);

  useOnOutsideClick(cadastrosRef, () => setCadastrosOpen(false));
  useOnOutsideClick(equipeRef, () => setEquipeOpen(false));
  useOnOutsideClick(userMenuRef, () => setUserMenuOpen(false));
  useOnOutsideClick(helpRef, () => setHelpOpen(false));

  const planFeatures = usePlanFeatures();
  const { can } = useCan();

  // Filtra itens dos dropdowns conforme permissões do membro
  const visibleEquipeItems = equipeItems.filter(it => !it.permission || can(it.permission));
  const visibleCadastrosItems = cadastrosItems.filter(it => !it.permission || can(it.permission));

  // Close menus on route change
  useEffect(() => {
    setCadastrosOpen(false);
    setEquipeOpen(false);
    setUserMenuOpen(false);
    setHelpOpen(false);
    setMobileOpen(false);
  }, [location.pathname]);

  function handleTourClick(page) {
    setHelpOpen(false);
    if (location.pathname !== page.route) {
      navigate(page.route);
      // Pequeno delay pra a página montar antes de disparar o replay
      setTimeout(() => replayTour(page.key), 400);
    } else {
      replayTour(page.key);
    }
  }

  const isCadastrosActive = cadastrosItems.some(i => location.pathname.startsWith(i.to));
  const isEquipeActive = equipeItems.some(i => location.pathname.startsWith(i.to));

  // ---------- Styles ----------
  const headerStyle = {
    backgroundColor: colors.surface,
    borderBottom: `1px solid ${colors.border}`,
    padding: isMobile ? '0 0.75rem' : '0 1.25rem',
    height: isMobile ? '3.5rem' : '4rem',
    display: 'flex',
    alignItems: 'center',
    gap: isMobile ? '0.5rem' : '1rem',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  };

  const brandStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
    flexShrink: 0,
  };

  const logoBadgeStyle = {
    width: '2rem',
    height: '2rem',
    borderRadius: '0.5rem',
    display: 'block',
    flexShrink: 0,
  };

  const brandTextStyle = {
    fontSize: '1.05rem',
    fontWeight: 700,
    color: colors.text,
    letterSpacing: '-0.01em',
  };

  const navWrapStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    marginLeft: '0.75rem',
    minWidth: 0,
  };

  const navItemStyle = (active) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.875rem',
    borderRadius: '0.5rem',
    border: 'none',
    backgroundColor: active ? `${colors.primary}1F` : 'transparent',
    color: active ? colors.primary : colors.textSecondary,
    fontSize: '0.875rem',
    fontWeight: active ? 600 : 500,
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.15s, color 0.15s',
    whiteSpace: 'nowrap',
    outline: 'none',
  });

  const rightSectionStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    flexShrink: 0,
    marginLeft: 'auto',
  };

  const iconBtnSize = '2.5rem';
  const iconBtnStyle = {
    width: iconBtnSize,
    height: iconBtnSize,
    borderRadius: '0.375rem',
    border: 'none',
    background: 'transparent',
    color: colors.textSecondary,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background-color 0.15s, color 0.15s',
  };
  const hoverBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';

  const avatarBtnStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    padding: '0.25rem 0.5rem 0.25rem 0.25rem',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: colors.text,
    borderRadius: '999px',
  };

  const avatarCircleStyle = {
    width: '2rem',
    height: '2rem',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    color: '#fff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 700,
  };

  const dropdownPanelStyle = {
    position: 'absolute',
    top: 'calc(100% + 0.375rem)',
    backgroundColor: colors.background,
    border: `1px solid ${colors.border}`,
    borderRadius: '0.5rem',
    boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
    minWidth: '14rem',
    overflow: 'hidden',
    zIndex: 200,
  };

  const dropdownItemStyle = (active = false) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
    padding: '0.625rem 0.875rem',
    color: active ? colors.primary : colors.text,
    textDecoration: 'none',
    fontSize: '0.875rem',
    cursor: 'pointer',
    background: active ? `${colors.primary}15` : 'transparent',
    border: 'none',
    width: '100%',
    textAlign: 'left',
  });

  const dropdownDangerItemStyle = {
    ...dropdownItemStyle(false),
    color: '#ef4444',
  };

  // ---------- Mobile drawer ----------
  if (isMobile) {
    const mobileBackdropStyle = {
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 200,
      opacity: mobileOpen ? 1 : 0,
      pointerEvents: mobileOpen ? 'auto' : 'none',
      transition: 'opacity 0.25s',
    };
    const mobileDrawerStyle = {
      position: 'fixed', top: 0, left: 0, bottom: 0, width: '280px',
      backgroundColor: colors.surface,
      borderRight: `1px solid ${colors.border}`,
      zIndex: 201,
      transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
      transition: 'transform 0.25s',
      display: 'flex', flexDirection: 'column', overflowY: 'auto',
    };
    const mobileLinkStyle = (active) => ({
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      padding: '0.875rem 1rem',
      color: active ? colors.primary : colors.text,
      textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500,
      backgroundColor: active ? `${colors.primary}10` : 'transparent',
      borderLeft: `3px solid ${active ? colors.primary : 'transparent'}`,
    });

    return (
      <>
        <header style={headerStyle}>
          <button style={iconBtnStyle} onClick={() => setMobileOpen(true)} aria-label="Abrir menu">
            <Menu size={22} />
          </button>
          <Link to="/home" style={{ ...brandStyle, flex: 1, textDecoration: 'none' }}>
            <img src="/pwa-192.svg" alt="TactiPlan" style={logoBadgeStyle} />
            <span style={brandTextStyle}>TactiPlan</span>
          </Link>
          <button style={iconBtnStyle} onClick={toggleTheme} aria-label="Tema">
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <div style={avatarCircleStyle}>{getInitials(user?.name)}</div>
        </header>

        <div style={mobileBackdropStyle} onClick={() => setMobileOpen(false)} />
        <aside style={mobileDrawerStyle}>
          <div style={{ padding: '1rem', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={brandStyle}>
              <img src="/pwa-192.svg" alt="TactiPlan" style={logoBadgeStyle} />
              <span style={brandTextStyle}>TactiPlan</span>
            </div>
            <button style={iconBtnStyle} onClick={() => setMobileOpen(false)} aria-label="Fechar"><X size={20} /></button>
          </div>
          <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <WorkspaceSwitcher compact />
            {showClubSelector && <ClubSelector />}
          </div>
          <nav style={{ flex: 1 }}>
            {/* Início — sem isso, no mobile não havia como voltar pro dashboard */}
            <NavLink to="/home" style={({ isActive }) => mobileLinkStyle(isActive)}>
              <Home size={20} strokeWidth={1.5} />
              Início
            </NavLink>
            {mainNav.map((item) => {
              if (item.kind === 'equipe' || item.kind === 'cadastros') {
                const items = item.kind === 'equipe' ? visibleEquipeItems : visibleCadastrosItems;
                return (
                  <div key={item.kind}>
                    <div style={{ padding: '0.75rem 1rem 0.25rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.textSecondary }}>
                      {item.label}
                    </div>
                    {items.map((sub) => {
                      const locked = sub.gated && !planFeatures.has(sub.gated);
                      return (
                        <NavLink key={sub.to} to={sub.to} style={({ isActive }) => ({ ...mobileLinkStyle(isActive), opacity: locked ? 0.75 : 1 })}>
                          <sub.icon size={18} strokeWidth={1.5} />
                          <span style={{ flex: 1 }}>{sub.label}</span>
                          {locked && <Lock size={12} color="#f59e0b" />}
                        </NavLink>
                      );
                    })}
                  </div>
                );
              }
              const lockedMain = item.gated && !planFeatures.has(item.gated);
              return (
                <NavLink key={item.to} to={item.to} style={({ isActive }) => ({ ...mobileLinkStyle(isActive), opacity: lockedMain ? 0.8 : 1 })}>
                  <item.icon size={20} strokeWidth={1.5} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {lockedMain && <Lock size={12} color="#f59e0b" />}
                </NavLink>
              );
            })}
            <div style={{ borderTop: `1px solid ${colors.border}`, marginTop: '0.5rem' }}>
              {/* Assinatura — antes inalcançável no mobile */}
              <NavLink to="/billing" style={({ isActive }) => mobileLinkStyle(isActive)}>
                <CreditCard size={20} strokeWidth={1.5} />
                Assinatura
              </NavLink>
              <button
                onClick={() => { setSettingsTab('perfil'); setSettingsSheetOpen(true); setMobileOpen(false); }}
                style={{ ...mobileLinkStyle(false), background: 'transparent', border: 'none', width: '100%', cursor: 'pointer' }}
              >
                <Settings size={20} strokeWidth={1.5} />
                Configurações
              </button>
              <button onClick={logout} style={{ ...mobileLinkStyle(false), background: 'transparent', border: 'none', width: '100%', cursor: 'pointer', color: '#ef4444' }}>
                <LogOut size={20} strokeWidth={1.5} />
                Sair
              </button>
            </div>
          </nav>
        </aside>

        <SettingsSheet
          isOpen={settingsSheetOpen}
          onClose={() => setSettingsSheetOpen(false)}
          initialTab={settingsTab}
        />
      </>
    );
  }

  // ---------- Desktop header ----------
  return (
    <header style={headerStyle}>
      {/* Brand */}
      <Link to="/home" style={{ ...brandStyle, textDecoration: 'none' }}>
        <img src="/pwa-192.svg" alt="TactiPlan" style={logoBadgeStyle} />
        <span style={brandTextStyle}>TactiPlan</span>
      </Link>

      {/* Workspace switcher (Slack-style) — substitui o ClubSelector no caso comum (1 conta = 1 clube) */}
      <div style={{ flexShrink: 0 }}>
        <WorkspaceSwitcher />
      </div>

      {/* Club selector — só aparece se o usuário tem mais de um clube na workspace (raro/legado) */}
      {showClubSelector && (
        <div style={{ flexShrink: 0 }}>
          <ClubSelector />
        </div>
      )}

      {/* Main nav */}
      <nav style={navWrapStyle}>
        {mainNav.map((item) => {
          if (item.kind === 'equipe' || item.kind === 'cadastros') {
            const isEquipe = item.kind === 'equipe';
            const items = isEquipe ? visibleEquipeItems : visibleCadastrosItems;
            const open = isEquipe ? equipeOpen : cadastrosOpen;
            const setOpen = isEquipe ? setEquipeOpen : setCadastrosOpen;
            const otherSetOpen = isEquipe ? setCadastrosOpen : setEquipeOpen;
            const refEl = isEquipe ? equipeRef : cadastrosRef;
            const isActive = isEquipe ? isEquipeActive : isCadastrosActive;
            return (
              <div key={item.kind} ref={refEl} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => { setOpen((v) => !v); otherSetOpen(false); }}
                  style={navItemStyle(isActive)}
                >
                  <item.icon size={18} strokeWidth={1.75} />
                  {item.label}
                  <ChevronDown size={16} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                </button>
                {open && (
                  <div style={{ ...dropdownPanelStyle, left: 0 }}>
                    {items.map((sub) => {
                      const active = location.pathname.startsWith(sub.to);
                      const locked = sub.gated && !planFeatures.has(sub.gated);
                      return (
                        <button
                          key={sub.to}
                          onClick={() => { navigate(sub.to); setOpen(false); }}
                          style={{ ...dropdownItemStyle(active), opacity: locked ? 0.75 : 1 }}
                          title={locked ? 'Disponível no plano Clube' : undefined}
                        >
                          <sub.icon size={16} strokeWidth={1.75} />
                          <span style={{ flex: 1, textAlign: 'left' }}>{sub.label}</span>
                          {locked && <Lock size={12} color="#f59e0b" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }
          const active = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
          const locked = item.gated && !planFeatures.has(item.gated);
          return (
            <NavLink key={item.to} to={item.to} style={() => ({ ...navItemStyle(active), opacity: locked ? 0.8 : 1 })}>
              <item.icon size={18} strokeWidth={1.75} />
              {item.label}
              {locked && <Lock size={12} color="#f59e0b" />}
            </NavLink>
          );
        })}
      </nav>

      {/* Right section */}
      <div style={rightSectionStyle}>
        <div ref={helpRef} style={{ position: 'relative' }}>
          <IconBtn
            baseStyle={iconBtnStyle}
            hoverBg={hoverBg}
            onClick={() => setHelpOpen((v) => !v)}
            aria-label="Tutorial"
            title="Tutorial"
          >
            <HelpCircle size={22} strokeWidth={2} />
          </IconBtn>
          {helpOpen && (
            <div style={{ ...dropdownPanelStyle, right: 0, minWidth: '15rem' }}>
              <div style={{ padding: '0.625rem 0.875rem', borderBottom: `1px solid ${colors.border}`, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.textSecondary }}>
                Tutorial guiado
              </div>
              {TOUR_PAGES.map((p) => (
                <button key={p.key} onClick={() => handleTourClick(p)} style={dropdownItemStyle(false)}>
                  <p.icon size={16} strokeWidth={1.75} />
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <IconBtn baseStyle={iconBtnStyle} hoverBg={hoverBg} onClick={toggleTheme} aria-label="Alternar tema" title="Alternar tema">
          {isDark ? <Sun size={22} strokeWidth={2} /> : <Moon size={22} strokeWidth={2} />}
        </IconBtn>
        <IconBtn
          onClick={() => { setSettingsTab('perfil'); setSettingsSheetOpen(true); }}
          baseStyle={iconBtnStyle}
          hoverBg={hoverBg}
          aria-label="Configurações"
          title="Configurações"
        >
          <Settings size={22} strokeWidth={2} />
        </IconBtn>

        <div ref={userMenuRef} style={{ position: 'relative' }}>
          <button type="button" onClick={() => setUserMenuOpen((v) => !v)} style={avatarBtnStyle}>
            <div style={avatarCircleStyle}>{getInitials(user?.name)}</div>
            <ChevronDown size={16} style={{ transform: userMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', color: colors.textSecondary }} />
          </button>
          {userMenuOpen && (
            <div style={{ ...dropdownPanelStyle, right: 0 }}>
              <div style={{ padding: '0.75rem 0.875rem', borderBottom: `1px solid ${colors.border}` }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: colors.text }}>{user?.name || 'Usuário'}</div>
                <div style={{ fontSize: '0.75rem', color: colors.textSecondary, marginTop: '0.125rem' }}>{user?.email}</div>
              </div>
              <button onClick={() => { setSettingsTab('perfil'); setSettingsSheetOpen(true); setUserMenuOpen(false); }} style={dropdownItemStyle(false)}>
                <User size={16} strokeWidth={1.75} />
                Meu perfil
              </button>
              <button onClick={() => { navigate('/billing'); setUserMenuOpen(false); }} style={dropdownItemStyle(false)}>
                <CreditCard size={16} strokeWidth={1.75} />
                Assinatura
              </button>
              <button onClick={() => { logout(); setUserMenuOpen(false); }} style={dropdownDangerItemStyle}>
                <LogOut size={16} strokeWidth={1.75} />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>

      <SettingsSheet
        isOpen={settingsSheetOpen}
        onClose={() => setSettingsSheetOpen(false)}
        initialTab={settingsTab}
      />
    </header>
  );
}
