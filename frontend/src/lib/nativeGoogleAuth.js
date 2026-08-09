// Login com Google no app nativo (Capacitor). No navegador, o botão usa o
// Google Identity Services (GIS); dentro do webview do app o GIS é bloqueado,
// então usamos o plugin nativo @capgo/capacitor-social-login, que abre a tela
// nativa do Google e devolve um idToken.
//
// O idToken tem audience = webClientId (VITE_GOOGLE_CLIENT_ID), o MESMO client
// que o backend valida em /api/auth/google — então nenhum ajuste no backend é
// necessário.
import { isNative } from './platform';

let initialized = false;

const WEB_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

async function ensureInit() {
  if (initialized) return;
  const { SocialLogin } = await import('@capgo/capacitor-social-login');
  await SocialLogin.initialize({
    google: {
      // webClientId é usado nos DOIS (Android e iOS) pra gerar o idToken com
      // a audience que o backend espera.
      webClientId: WEB_CLIENT_ID,
    },
  });
  initialized = true;
}

// Retorna o idToken do Google (string) ou lança erro.
export async function nativeGoogleSignIn() {
  if (!isNative()) throw new Error('nativeGoogleSignIn só roda no app nativo');
  const { SocialLogin } = await import('@capgo/capacitor-social-login');
  await ensureInit();
  const res = await SocialLogin.login({
    provider: 'google',
    options: {
      // Precisa do idToken pra mandar pro backend. Sem scopes extras.
      forceRefreshToken: false,
    },
  });
  // Formato do retorno varia por versão do plugin; cobre os caminhos comuns.
  const idToken =
    res?.result?.idToken ||
    res?.idToken ||
    res?.result?.accessToken?.token || // fallback improvável
    null;
  if (!idToken) {
    throw new Error('Google não retornou idToken');
  }
  return idToken;
}
