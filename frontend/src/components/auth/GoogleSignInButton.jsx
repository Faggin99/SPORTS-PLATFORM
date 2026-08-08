import { useEffect, useRef, useState } from 'react';
import { authService } from '../../services/authService';
import { useTheme } from '../../contexts/ThemeContext';

const GIS_SRC = 'https://accounts.google.com/gsi/client';
let gisLoadingPromise = null;

function loadGoogleIdentity() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gisLoadingPromise) return gisLoadingPromise;
  gisLoadingPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', reject);
      return;
    }
    const s = document.createElement('script');
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return gisLoadingPromise;
}

/**
 * Botão "Entrar com Google" usando Google Identity Services oficial.
 * Renderiza o botão do Google diretamente (mais confiável que customizar via popup).
 * O tema (filled_black/outline) acompanha o tema da aplicação.
 *
 * Props:
 *  - onSuccess({ token, user })
 *  - label: 'signin_with' | 'signup_with' | 'continue_with' (default) — texto do botão do Google
 *  - disabled: bool — cobre o botão com um overlay bloqueante (o iframe do Google não aceita
 *      atributo `disabled` nativo, então usamos uma camada por cima que intercepta os cliques).
 *  - disabledMessage: string — mensagem exibida ao tentar clicar com o botão desabilitado
 *  - onDisabledClick: função opcional — chamada ao clicar quando `disabled` (ex.: destacar checkbox)
 */
export function GoogleSignInButton({
  onSuccess: onSuccessProp,
  label = 'continue_with',
  disabled = false,
  disabledMessage = 'Aceite os Termos de Uso e a Política de Privacidade para continuar.',
  onDisabledClick,
}) {
  const { isDark } = useTheme();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  async function handleCredential(response) {
    console.log('[GoogleSignIn] credential response received', { hasCredential: !!response?.credential });
    if (!response?.credential) {
      setError('Resposta do Google sem credencial.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { token, user } = await authService.googleLogin(response.credential);
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user', JSON.stringify(user));
      onSuccessProp?.({ token, user });
      window.location.href = '/#/home';
      window.location.reload();
    } catch (err) {
      console.error('[GoogleSignIn] backend error', err);
      setError(err?.message || 'Erro ao autenticar com Google');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!clientId) return;
    let mounted = true;
    loadGoogleIdentity()
      .then(() => {
        if (!mounted || !containerRef.current) return;
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredential,
            ux_mode: 'popup',
            auto_select: false,
            cancel_on_tap_outside: true,
          });
          // Limpa container e renderiza botão oficial
          containerRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(containerRef.current, {
            type: 'standard',
            theme: isDark ? 'filled_black' : 'outline',
            size: 'large',
            text: label,
            shape: 'rectangular',
            locale: 'pt-BR',
            width: containerRef.current.offsetWidth || 320,
          });
        } catch (e) {
          console.error('[GoogleSignIn] init error', e);
          setError('Falha ao iniciar Google. Tente recarregar a página.');
        }
      })
      .catch((e) => {
        console.error('[GoogleSignIn] load error', e);
        setError('Falha ao carregar Google. Verifique sua conexão.');
      });
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, isDark, label]);

  if (!clientId) return null;

  function handleOverlayClick(e) {
    // Intercepta o clique antes de chegar no iframe do Google.
    e.preventDefault();
    e.stopPropagation();
    onDisabledClick?.();
    if (disabledMessage) setError(disabledMessage);
  }

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
        <div
          ref={containerRef}
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            minHeight: 44,
            opacity: disabled ? 0.5 : 1,
            filter: disabled ? 'grayscale(0.3)' : 'none',
            transition: 'opacity 0.15s',
          }}
          aria-disabled={disabled || undefined}
        />
        {disabled && (
          <div
            role="button"
            tabIndex={0}
            aria-label={disabledMessage}
            onClick={handleOverlayClick}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleOverlayClick(e); }}
            style={{
              position: 'absolute',
              inset: 0,
              cursor: 'not-allowed',
              background: 'transparent',
            }}
          />
        )}
      </div>
      {loading && <div style={{ fontSize: '0.75rem', color: '#888' }}>Autenticando…</div>}
      {error && <div style={{ fontSize: '0.75rem', color: '#ef4444', textAlign: 'center' }}>{error}</div>}
    </div>
  );
}
