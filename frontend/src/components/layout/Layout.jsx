import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AppSidebar, AppTopBar, AppMobileBar } from './AppShell';
import { useTheme } from '../../contexts/ThemeContext';
import { useClub } from '../../contexts/ClubContext';
import { ClubOnboardingModal } from '../club/ClubOnboardingModal';
import { useIsMobile } from '../../hooks/useIsMobile';
import { SubscriptionBanner } from './SubscriptionBanner';
import { StadiumBackground } from './StadiumBackground';
import { WorkspaceSwapNotice } from '../workspace/WorkspaceSwapNotice';

// Rotas onde o conteúdo precisa caber na viewport (calendário, canvas tático).
// Nelas o scroll é interno; nas demais, é o scroll natural da página.
const FIXED_VIEWPORT_ROUTES = ['/training', '/tactical-board'];

export function Layout({ children }) {
  const { colors, isDark } = useTheme();
  const { clubs, selectedClub, loading, loadError, createClub } = useClub();
  const isMobile = useIsMobile();
  const location = useLocation();

  const fixedViewport = FIXED_VIEWPORT_ROUTES.some(p => location.pathname.startsWith(p));
  // Menu lateral (padrão do Gestsport): gaveta no celular; no computador recolhe em trilho de
  // ícones, preferência guardada no aparelho.
  const [drawer, setDrawer] = useState(false);
  const [recolhida, setRecolhida] = useState(() => { try { return localStorage.getItem('sidebar_recolhida') === '1'; } catch { return false; } });
  const alternarBarra = () => setRecolhida((v) => { try { localStorage.setItem('sidebar_recolhida', v ? '0' : '1'); } catch { /* sem storage */ } return !v; });

  const bgWrapperStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 0,
    pointerEvents: 'none',
  };

  const shellStyle = {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    minHeight: '100vh',
    overflowX: 'clip',
    maxWidth: '100%',
  };

  const containerStyle = {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    ...(fixedViewport ? { height: '100vh' } : {}),
    // Rotas de viewport fixo (ex: Programação) usam fundo OPACO pra o conteúdo
    // preencher a tela toda — sem o gramado do StadiumBackground aparecendo na
    // metade de baixo quando o conteúdo é curto (efeito de "tela dividida").
    backgroundColor: fixedViewport ? colors.background : 'transparent',
  };

  const contentStyle = {
    flex: 1,
    padding: isMobile ? '0.75rem' : (fixedViewport ? '0 1.5rem 1.25rem' : '0.25rem 1.5rem 1.5rem'),
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    ...(fixedViewport ? { minHeight: 0, overflowY: 'auto' } : {}),
  };

  const showOnboarding = !loading
    && !loadError
    && clubs.length === 0
    && location.pathname !== '/billing';

  return (
    <>
      <div style={bgWrapperStyle}>
        <StadiumBackground isDark={isDark} variant="soft" modality={selectedClub?.modality || 'football_11'} />
      </div>
      <div style={shellStyle}>
        <AppSidebar isMobile={isMobile} open={drawer} onClose={() => setDrawer(false)} collapsed={!isMobile && recolhida} />
        <div style={containerStyle}>
          {isMobile ? <AppMobileBar onOpenMenu={() => setDrawer(true)} /> : <AppTopBar collapsed={recolhida} onToggle={alternarBarra} />}
          <SubscriptionBanner />
          <main style={contentStyle}>
            {children}
          </main>
        </div>
      </div>

      {showOnboarding && (
        <ClubOnboardingModal onCreateClub={createClub} />
      )}

      <WorkspaceSwapNotice />
    </>
  );
}
