// Atualização OTA (over-the-air) do app nativo — self-hosted na própria VPS.
//
// Como funciona: o APK/AAB empacota um bundle base (funciona offline). No boot,
// o app consulta um manifesto no servidor (/ota/manifest-android.json). Se houver
// uma versão nova, baixa o zip do novo bundle e agenda pra aplicar no próximo
// restart/background (não interrompe a sessão atual). Assim dá pra publicar
// mudanças do frontend SEM reinstalar o app nem passar pela loja.
//
// Segurança/rollback: notifyAppReady() confirma no boot que o bundle carregou
// bem; se um bundle OTA aplicado quebrar (não chamar notifyAppReady dentro do
// appReadyTimeout), o plugin volta sozinho pro bundle anterior.
import { isNative, getPlatform } from './platform';

// Base absoluta do servidor (o app nativo não tem origin http). Deriva de
// VITE_API_URL removendo o /api final → https://app... ou https://staging.app...
function serverBase() {
  const api = import.meta.env.VITE_API_URL || '';
  return api.replace(/\/api\/?$/, '') || 'https://app.tactiplan.faggin.com.br';
}

export async function initOtaUpdates() {
  if (!isNative()) return;

  let CapacitorUpdater;
  try {
    ({ CapacitorUpdater } = await import('@capgo/capacitor-updater'));
  } catch {
    return; // plugin ausente (build web) — ignora
  }

  // 1) Confirma que o bundle atual está saudável (evita rollback automático).
  try { await CapacitorUpdater.notifyAppReady(); } catch { /* noop */ }

  // 2) Checa o manifesto e agenda atualização, se houver.
  try {
    const platform = getPlatform(); // 'android' | 'ios'
    const manifestUrl = `${serverBase()}/ota/manifest-${platform}.json`;
    const res = await fetch(manifestUrl, { cache: 'no-store' });
    if (!res.ok) return; // sem manifesto (404) = nada pra atualizar
    const manifest = await res.json();
    if (!manifest?.url || !manifest?.version) return;

    const cur = await CapacitorUpdater.current().catch(() => null);
    const currentVersion = cur?.bundle?.version;
    if (manifest.version === currentVersion) return; // já está na última

    // Já baixamos essa versão numa checagem anterior? (aguardando restart)
    if (localStorage.getItem('ota_pending_version') === manifest.version) return;

    const bundle = await CapacitorUpdater.download({
      url: manifest.url,
      version: manifest.version,
      // checksum omitido nesta versão — transporte é HTTPS. (Signed updates depois.)
    });
    if (bundle?.id) {
      // Aplica no próximo background/restart — não interrompe a sessão atual.
      await CapacitorUpdater.next({ id: bundle.id });
      localStorage.setItem('ota_pending_version', manifest.version);
    }
  } catch (err) {
    console.error('[OTA] falha ao checar/baixar atualização:', err?.message || err);
  }
}
