import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { authService } from '../services/authService';

export function ResetPasswordPage() {
  const { colors } = useTheme();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) setError('Link inválido ou expirado.');
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 6) return setError('A senha deve ter ao menos 6 caracteres.');
    if (password !== confirm) return setError('As senhas não conferem.');
    setLoading(true);
    try {
      await authService.resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message || 'Não foi possível redefinir a senha.');
    } finally {
      setLoading(false);
    }
  }

  const cardStyle = {
    width: '100%', maxWidth: 440,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: '0.75rem', padding: '2rem',
  };
  const wrapperStyle = {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '1.5rem', backgroundColor: colors.background,
  };

  return (
    <div style={wrapperStyle}>
      <div style={cardStyle}>
        {!done ? (
          <>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: colors.text, margin: 0 }}>Redefinir senha</h1>
            <p style={{ fontSize: '0.875rem', color: colors.textSecondary, marginTop: 8, marginBottom: 24, lineHeight: 1.5 }}>
              Crie uma nova senha (mín. 6 caracteres).
            </p>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
              <Input
                type="password"
                placeholder="Nova senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock size={18} />}
                required
                disabled={!token}
              />
              <Input
                type="password"
                placeholder="Confirme a nova senha"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                icon={<Lock size={18} />}
                required
                disabled={!token}
              />
              {error && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.8125rem', color: '#ef4444' }}>
                  <AlertCircle size={16} /> {error}
                </div>
              )}
              <Button type="submit" disabled={loading || !token}>{loading ? 'Salvando…' : 'Redefinir senha'}</Button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle2 size={48} color="#22c55e" style={{ margin: '0 auto 12px' }} />
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: colors.text, margin: 0 }}>Senha redefinida</h1>
            <p style={{ fontSize: '0.875rem', color: colors.textSecondary, marginTop: 8 }}>
              Redirecionando para o login…
            </p>
          </div>
        )}
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <Link to="/login" style={{ fontSize: '0.875rem', color: colors.textSecondary, textDecoration: 'none' }}>Ir para login</Link>
        </div>
      </div>
    </div>
  );
}
