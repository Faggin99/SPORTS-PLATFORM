// Abstrações leves pra rodar bem em web + iOS + Android (via Capacitor).
// Se @capacitor/core não estiver instalado (build web-only), tudo cai em
// fallbacks web sem quebrar. Todo lugar do app que quer chamar API nativa
// deve importar daqui.

let CapacitorMod = null;
let BrowserMod = null;
let AppMod = null;
let StatusBarMod = null;

// Carrega Capacitor de forma tolerante — se não instalado, ignora
try {
  CapacitorMod = require('@capacitor/core');
} catch (_) { /* rodando web sem Capacitor */ }

try { BrowserMod = require('@capacitor/browser'); } catch (_) {}
try { AppMod = require('@capacitor/app'); } catch (_) {}
try { StatusBarMod = require('@capacitor/status-bar'); } catch (_) {}

/** true se rodando dentro do wrapper nativo (iOS ou Android). */
export function isNative() {
  return Boolean(CapacitorMod?.Capacitor?.isNativePlatform?.());
}

/** 'ios' | 'android' | 'web' */
export function getPlatform() {
  return CapacitorMod?.Capacitor?.getPlatform?.() || 'web';
}

/**
 * Abre uma URL externa. Em nativo usa o browser in-app do Capacitor (rápido
 * e mantém sessão SFAuth em iOS pra OAuth); em web usa window.location OU
 * window.open dependendo se é mesmo host.
 */
export async function openExternalUrl(url, { sameTab = false } = {}) {
  if (isNative() && BrowserMod?.Browser) {
    await BrowserMod.Browser.open({ url });
    return;
  }
  if (sameTab) {
    window.location.href = url;
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/** Registra listener pra evento de back button (Android). No-op em web. */
export function onNativeBackButton(handler) {
  if (!isNative() || !AppMod?.App) return () => {};
  const listener = AppMod.App.addListener('backButton', handler);
  return () => { listener.then((l) => l.remove?.()); };
}

/**
 * Ajusta a status bar (cor de fundo, ícones claros/escuros) em iOS/Android.
 * Chamar quando o tema (light/dark) muda.
 */
export async function setStatusBarTheme(isDark) {
  if (!isNative() || !StatusBarMod?.StatusBar) return;
  try {
    await StatusBarMod.StatusBar.setStyle({
      style: isDark ? StatusBarMod.Style.Dark : StatusBarMod.Style.Light,
    });
    await StatusBarMod.StatusBar.setBackgroundColor({
      color: isDark ? '#0f172a' : '#ffffff',
    });
  } catch (_) { /* Android only pra setBackgroundColor */ }
}
