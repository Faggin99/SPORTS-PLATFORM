import { useLocation } from 'react-router-dom';
import { Header } from './Header';
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

  const bgWrapperStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 0,
    pointerEvents: 'none',
  };

  const containerStyle = {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    ...(fixedViewport ? { height: '100vh' } : {}),
    backgroundColor: 'transparent',
  };

  const contentStyle = {
    flex: 1,
    padding: isMobile ? '0.75rem' : '1.5rem',
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
      <div style={containerStyle}>
        <Header isMobile={isMobile} />
        <SubscriptionBanner />
        <main style={contentStyle}>
          {children}
        </main>
      </div>

      {showOnboarding && (
        <ClubOnboardingModal onCreateClub={createClub} />
      )}

      <WorkspaceSwapNotice />
    </>
  );
}
