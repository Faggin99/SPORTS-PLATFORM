import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useTheme } from '../../contexts/ThemeContext';

export function Layout({ children }) {
  const { colors } = useTheme();

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
  };

  const contentStyle = {
    flex: 1,
    overflowY: 'auto',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
  };

  return (
    <div style={containerStyle}>
      <Header />
      <div style={mainContainerStyle}>
        <Sidebar />
        <main style={contentStyle}>
          {children}
        </main>
      </div>
    </div>
  );
}
