import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';

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
      navigate('/training');
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
        <h1 style={titleStyle}>TactiPlan</h1>
        <p style={subtitleStyle}>Faça login para continuar</p>

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
        </form>
      </div>
    </div>
  );
}
