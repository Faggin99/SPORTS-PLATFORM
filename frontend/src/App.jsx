import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ClubProvider } from './contexts/ClubContext';
import { LoginPage } from './pages/LoginPage';
import { TrainingPage } from './pages/TrainingPage';
import { TrainingStatsPage } from './pages/TrainingStatsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ClubConfigPage } from './pages/ClubConfigPage';
import { ActivitiesConfigPage } from './pages/ActivitiesConfigPage';
import { Layout } from './components/layout/Layout';
import PlantelPage from './modules/training-management/pages/PlantelPage';
import { TacticalBoardPage } from './modules/tactical-board';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Carregando...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/training" /> : <LoginPage />}
      />
      <Route
        path="/training"
        element={
          <ProtectedRoute>
            <Layout>
              <TrainingPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/training-stats"
        element={
          <ProtectedRoute>
            <Layout>
              <TrainingStatsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/plantel"
        element={
          <ProtectedRoute>
            <Layout>
              <PlantelPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Layout>
              <SettingsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/clubs"
        element={
          <ProtectedRoute>
            <Layout>
              <ClubConfigPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/activities"
        element={
          <ProtectedRoute>
            <Layout>
              <ActivitiesConfigPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tactical-board"
        element={
          <ProtectedRoute>
            <Layout>
              <TacticalBoardPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/training" />} />
    </Routes>
  );
}

function App() {
  return (
    <HashRouter>
      <ThemeProvider>
        <AuthProvider>
          <ClubProvider>
            <AppRoutes />
          </ClubProvider>
        </AuthProvider>
      </ThemeProvider>
    </HashRouter>
  );
}

export default App;
