import { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useTheme } from '../../contexts/ThemeContext';
import { useClub } from '../../contexts/ClubContext';
import { ClubOnboardingModal } from '../club/ClubOnboardingModal';
import { useIsMobile } from '../../hooks/useIsMobile';

export function Layout({ children }) {
  const { colors } = useTheme();
  const { clubs, loading, createClub } = useClub();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: colors.background,
  };

  const mainContainerStyle = {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  };

  const contentStyle = {
    flex: 1,
    overflowY: 'auto',
    padding: isMobile ? '0.75rem' : '1.5rem',
    display: 'flex',
    flexDirection: 'column',
  };

  // Show onboarding modal if user has no clubs
  const showOnboarding = !loading && clubs.length === 0;

  return (
    <div style={containerStyle}>
      <Header
        isMobile={isMobile}
        onMenuToggle={() => setSidebarOpen((prev) => !prev)}
      />
      <div style={mainContainerStyle}>
        <Sidebar
          isMobile={isMobile}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main style={contentStyle}>
          {children}
        </main>
      </div>

      {showOnboarding && (
        <ClubOnboardingModal onCreateClub={createClub} />
      )}
    </div>
  );
}
