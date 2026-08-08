import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { colors } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/home');
    } catch (err) {
      setError(err.message || 'Falha ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const containerStyle = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: '1rem',
  };

  const cardStyle = {
    backgroundColor: colors.surface,
    padding: '2rem',
    borderRadius: '0.5rem',
    width: '100%',
    maxWidth: '400px',
    border: `1px solid ${colors.border}`,
  };

  const titleStyle = {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: '0.5rem',
  };

  const subtitleStyle = {
    fontSize: '0.875rem',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: '2rem',
  };

  const formStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  };

  const errorStyle = {
    padding: '0.75rem',
    backgroundColor: `${colors.error}15`,
    color: colors.error,
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    border: `1px solid ${colors.error}`,
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <img src="/pwa-192.svg" alt="TactiPlan" style={{ width: '80px', height: '80px', borderRadius: '16px' }} />
        </div>
        <h1 style={titleStyle}>TactiPlan</h1>
        <p style={subtitleStyle}>Faça login para continuar</p>

        {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
              <GoogleSignInButton />
            </div>
            {/* Consentimento explícito: entrar com Google pode CRIAR conta nova,
                então o aceite dos termos precisa estar visível aqui também
                (na tela de login não há checkbox, diferente do cadastro). */}
            <p style={{ textAlign: 'center', fontSize: '0.7rem', color: colors.textSecondary, margin: '0 0 1rem', lineHeight: 1.5 }}>
              Ao continuar com o Google, você concorda com os{' '}
              <a href="https://tactiplan.faggin.com.br/termos.html" target="_blank" rel="noopener" style={{ color: colors.primary }}>Termos de Uso</a> e a{' '}
              <a href="https://tactiplan.faggin.com.br/privacidade.html" target="_blank" rel="noopener" style={{ color: colors.primary }}>Política de Privacidade</a>.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem', color: colors.textSecondary, fontSize: '0.75rem' }}>
              <div style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
              <span>ou</span>
              <div style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} style={formStyle}>
          {error && <div style={errorStyle}>{error}</div>}

          <Input
            type="email"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail size={18} />}
            fullWidth
            required
          />

          <Input
            type="password"
            label="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock size={18} />}
            fullWidth
            required
          />

          <Button
            type="submit"
            fullWidth
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
            <Link to="/forgot-password" style={{ fontSize: '0.8125rem', color: colors.textSecondary, textDecoration: 'none' }}>
              Esqueci minha senha
            </Link>
            <Link to="/register" style={{ fontSize: '0.8125rem', color: colors.primary, textDecoration: 'none', fontWeight: 600 }}>
              Criar conta
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
