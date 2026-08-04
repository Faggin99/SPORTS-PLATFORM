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
 */
export function GoogleSignInButton({ onSuccess: onSuccessProp }) {
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
            text: 'continue_with',
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
  }, [clientId, isDark]);

  if (!clientId) return null;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div ref={containerRef} style={{ width: '100%', display: 'flex', justifyContent: 'center', minHeight: 44 }} />
      {loading && <div style={{ fontSize: '0.75rem', color: '#888' }}>Autenticando…</div>}
      {error && <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>{error}</div>}
    </div>
  );
}
