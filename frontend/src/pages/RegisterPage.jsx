import { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Phone } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { authService } from '../services/authService';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';

export function RegisterPage() {
  const { colors } = useTheme();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', phone: '' });
  const [accept, setAccept] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [highlightAccept, setHighlightAccept] = useState(false);
  const acceptRef = useRef(null);

  function flashAcceptRequirement() {
    setHighlightAccept(true);
    acceptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Remove o destaque depois de alguns segundos
    setTimeout(() => setHighlightAccept(false), 2500);
  }

  function update(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) return setError('A senha deve ter ao menos 6 caracteres.');
    if (form.password !== form.confirm) return setError('As senhas não conferem.');
    if (!accept) return setError('Você precisa aceitar os Termos e a Política de Privacidade.');
    setLoading(true);
    try {
      const { token, user } = await authService.register({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        accept_terms: true,
      });
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user', JSON.stringify(user));
      navigate('/home');
      // força re-init do contexto de auth
      window.location.reload();
    } catch (err) {
      setError(err.message || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  }

  const containerStyle = {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '1.5rem', backgroundColor: colors.background,
  };
  const cardStyle = {
    width: '100%', maxWidth: 440,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: '0.75rem',
    padding: '2rem',
  };
  const errorStyle = {
    padding: '0.75rem', backgroundColor: `${colors.error || '#ef4444'}15`,
    color: colors.error || '#ef4444', borderRadius: '0.375rem',
    fontSize: '0.875rem', border: `1px solid ${colors.error || '#ef4444'}`,
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <img src="/pwa-192.svg" alt="TactiPlan" style={{ width: '64px', height: '64px', borderRadius: '12px' }} />
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: colors.text, textAlign: 'center', marginBottom: 4 }}>Criar conta</h1>
        <p style={{ fontSize: '0.875rem', color: colors.textSecondary, textAlign: 'center', marginBottom: '1.5rem' }}>
          Comece a planejar seus treinos em minutos.
        </p>

        {/* Aceite dos termos — obrigatório antes de qualquer fluxo de cadastro (Google ou email).
            Fica acima dos botões pra que o usuário nunca clique em "Google" sem consentir. */}
        <label
          ref={acceptRef}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
            padding: '0.625rem 0.75rem',
            fontSize: '0.8125rem',
            color: highlightAccept ? (colors.error || '#ef4444') : colors.textSecondary,
            cursor: 'pointer',
            marginBottom: '1rem',
            borderRadius: '0.5rem',
            border: `1px solid ${highlightAccept ? (colors.error || '#ef4444') : 'transparent'}`,
            backgroundColor: highlightAccept ? `${colors.error || '#ef4444'}10` : 'transparent',
            transition: 'background-color 0.2s, border-color 0.2s, color 0.2s',
          }}
        >
          <input
            type="checkbox"
            checked={accept}
            onChange={(e) => { setAccept(e.target.checked); if (e.target.checked) setHighlightAccept(false); }}
            style={{ marginTop: 3, flexShrink: 0 }}
            aria-required="true"
          />
          <span>
            Li e concordo com os{' '}
            <a href="https://tactiplan.faggin.com.br/termos.html" target="_blank" rel="noopener" style={{ color: colors.primary }}>Termos de Uso</a> e a{' '}
            <a href="https://tactiplan.faggin.com.br/privacidade.html" target="_blank" rel="noopener" style={{ color: colors.primary }}>Política de Privacidade</a>.
          </span>
        </label>

        {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <GoogleSignInButton
                label="signup_with"
                disabled={!accept}
                disabledMessage="Aceite os Termos e a Política de Privacidade acima antes de continuar com Google."
                onDisabledClick={flashAcceptRequirement}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem', color: colors.textSecondary, fontSize: '0.75rem' }}>
              <div style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
              <span>ou cadastre-se com email</span>
              <div style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {error && <div style={errorStyle}>{error}</div>}
          <Input type="text" label="Nome completo" value={form.name} onChange={(e) => update('name', e.target.value)} icon={<User size={18} />} fullWidth required />
          <Input type="email" label="E-mail" value={form.email} onChange={(e) => update('email', e.target.value)} icon={<Mail size={18} />} fullWidth required />
          <Input type="tel" label="Telefone (opcional)" value={form.phone} onChange={(e) => update('phone', e.target.value)} icon={<Phone size={18} />} fullWidth />
          <Input type="password" label="Senha" value={form.password} onChange={(e) => update('password', e.target.value)} icon={<Lock size={18} />} fullWidth required />
          <Input type="password" label="Confirmar senha" value={form.confirm} onChange={(e) => update('confirm', e.target.value)} icon={<Lock size={18} />} fullWidth required />

          <Button
            type="submit"
            fullWidth
            disabled={loading}
            onClick={(e) => {
              // Se o usuário tentar clicar em "Criar conta" sem aceitar, destaca o checkbox
              // (o handleSubmit já bloqueia com uma mensagem, mas isso guia o olho pro que falta).
              if (!accept) flashAcceptRequirement();
            }}
          >
            {loading ? 'Criando…' : 'Criar conta'}
          </Button>

          <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.8125rem' }}>
            <span style={{ color: colors.textSecondary }}>Já tem conta? </span>
            <Link to="/login" style={{ color: colors.primary, textDecoration: 'none' }}>Entrar</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
