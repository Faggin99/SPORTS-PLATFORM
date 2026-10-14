// Sign in with Apple no app nativo iOS (Capacitor). Usa o mesmo plugin do
// Google (@capgo/capacitor-social-login); no iOS o fluxo é 100% nativo
// (ASAuthorization) e não precisa de client id — só da capability
// "Sign in with Apple" no App ID/provisioning.
//
// O identityToken devolvido tem audience = bundle id (com.faggin.tactiplan),
// que é o que o backend valida em /api/auth/apple.
import { isNative, getPlatform } from './platform';

export function appleSignInAvailable() {
  // Fase 1: só iOS nativo. (Web/Android exigem Services ID — fase 2.)
  return isNative() && getPlatform() === 'ios';
}

// Retorna { identityToken, name } ou lança erro.
export async function nativeAppleSignIn() {
  if (!appleSignInAvailable()) throw new Error('Sign in with Apple só no app iOS');
  const { SocialLogin } = await import('@capgo/capacitor-social-login');
  const res = await SocialLogin.login({
    provider: 'apple',
    options: { scopes: ['name', 'email'] },
  });
  const identityToken = res?.result?.idToken || null;
  if (!identityToken) throw new Error('Apple não retornou identityToken');
  // Nome só vem no PRIMEIRO login — manda pro backend usar na criação da conta.
  const p = res?.result?.profile || {};
  const name = [p.givenName, p.familyName].filter(Boolean).join(' ') || null;
  return { identityToken, name };
}
