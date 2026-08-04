import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ClubProvider } from './contexts/ClubContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { RegisterPage } from './pages/RegisterPage';
import { PricingPage } from './pages/PricingPage';
import { BillingPage } from './pages/BillingPage';
import { PWAUpdatePrompt } from './components/common/PWAUpdatePrompt';
import { TrainingPage } from './pages/TrainingPage';
import { TrainingStatsPage } from './pages/TrainingStatsPage';
import { ActivitiesConfigPage } from './pages/ActivitiesConfigPage';
import { SubcontentsConfigPage } from './pages/SubcontentsConfigPage';
import { ContentsConfigPage } from './pages/ContentsConfigPage';
import { CategoriesConfigPage } from './pages/CategoriesConfigPage';
import { CompetitionsConfigPage } from './pages/CompetitionsConfigPage';
import { ClubsConfigPage } from './pages/ClubsConfigPage';
import { TeamConfigPage } from './pages/TeamConfigPage';
import { AcceptInvitePage } from './pages/AcceptInvitePage';
import { SelectWorkspacePage } from './pages/SelectWorkspacePage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { SetPasswordPage } from './pages/SetPasswordPage';
import { HomePage } from './pages/HomePage';
import { Layout } from './components/layout/Layout';
import PlantelPage from './modules/training-management/pages/PlantelPage';
import { TacticalBoardPage } from './modules/tactical-board';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) return <div>Carregando...</div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  // Bloqueio: contas sem senha definida (criadas via Google) precisam definir antes
  if (user?.requires_password) return <Navigate to="/set-password" replace />;
  return children;
}

// Identifica se estamos no subdomínio admin (admin.* ou staging.admin.*)
function isAdminHost() {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return /^(staging\.)?admin\./.test(h);
}

function AdminRoutes() {
  return (
    <Routes>
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<AdminDashboardPage />} />
      {/* Qualquer outra rota no host admin redireciona pro login admin */}
      <Route path="*" element={<Navigate to="/admin/login" replace />} />
    </Routes>
  );
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/home" /> : <LoginPage />}
      />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/home" /> : <RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/set-password" element={isAuthenticated ? <SetPasswordPage /> : <Navigate to="/login" />} />
      {/* Termos e Privacidade ficam na LP (https://tactiplan.faggin.com.br/{termos,privacidade}.html) */}
      <Route path="/pricing" element={<PricingPage />} />
      <Route
        path="/select-workspace"
        element={
          <ProtectedRoute>
            <SelectWorkspacePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/billing"
        element={
          <ProtectedRoute>
            <Layout>
              <BillingPage />
            </Layout>
          </ProtectedRoute>
        }
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
      <Route path="/settings" element={<Navigate to="/training" replace />} />
      <Route
        path="/settings/clubs"
        element={
          <ProtectedRoute>
            <Layout>
              <ClubsConfigPage />
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
        path="/settings/subconteudos"
        element={
          <ProtectedRoute>
            <Layout>
              <SubcontentsConfigPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/contents"
        element={
          <ProtectedRoute>
            <Layout>
              <ContentsConfigPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/categories"
        element={
          <ProtectedRoute>
            <Layout>
              <CategoriesConfigPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/competitions"
        element={
          <ProtectedRoute>
            <Layout>
              <CompetitionsConfigPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/team"
        element={
          <ProtectedRoute>
            <Layout>
              <TeamConfigPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="/accept-invite/:token" element={<AcceptInvitePage />} />
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
      {/* /admin/* fora do host admin → manda pra raiz da app */}
      <Route path="/admin/*" element={<Navigate to="/home" replace />} />
      <Route path="/" element={<Navigate to="/home" />} />
    </Routes>
  );
}

function App() {
  const adminHost = isAdminHost();
  return (
    <HashRouter>
      <ThemeProvider>
        {adminHost ? (
          <AdminRoutes />
        ) : (
          <AuthProvider>
            <WorkspaceProvider>
              <ClubProvider>
                <AppRoutes />
                <PWAUpdatePrompt />
              </ClubProvider>
            </WorkspaceProvider>
          </AuthProvider>
        )}
      </ThemeProvider>
    </HashRouter>
  );
}

export default App;
