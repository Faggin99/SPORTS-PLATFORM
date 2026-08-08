import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { authService } from '../services/authService';

export function ForgotPasswordPage() {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.forgotPassword(email.trim().toLowerCase());
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Erro ao solicitar redefinição');
    } finally {
      setLoading(false);
    }
  }

  const cardStyle = {
    width: '100%', maxWidth: 440,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: '0.75rem',
    padding: '2rem',
  };
  const wrapperStyle = {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '1.5rem', backgroundColor: colors.background,
  };

  return (
    <div style={wrapperStyle}>
      <div style={cardStyle}>
        {!submitted ? (
          <>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: colors.text, margin: 0 }}>Esqueci minha senha</h1>
            <p style={{ fontSize: '0.875rem', color: colors.textSecondary, marginTop: 8, marginBottom: 24, lineHeight: 1.5 }}>
              Informe seu e-mail. Vamos enviar um link válido por 1 hora para redefinir sua senha.
            </p>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail size={18} />}
                required
              />
              {error && (
                <div style={{ fontSize: '0.8125rem', color: '#ef4444' }}>{error}</div>
              )}
              <Button type="submit" disabled={loading}>{loading ? 'Enviando…' : 'Enviar link'}</Button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle2 size={48} color="#22c55e" style={{ margin: '0 auto 12px' }} />
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: colors.text, margin: 0 }}>Solicitação recebida</h1>
            <p style={{ fontSize: '0.875rem', color: colors.textSecondary, marginTop: 8, lineHeight: 1.5 }}>
              Se este e-mail estiver cadastrado, você receberá em instantes um link para redefinir sua senha.
              Verifique sua caixa de entrada e a pasta de spam.
            </p>
          </div>
        )}
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <Link to="/login" style={{ fontSize: '0.875rem', color: colors.textSecondary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <ArrowLeft size={14} /> Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  );
}
