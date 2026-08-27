import { Capacitor } from '@capacitor/core';

// IAP via RevenueCat — SÓ no iOS nativo, e só quando a chave pública está
// configurada no build (Codemagic env REVENUECAT_IOS_KEY) e o binário tem o
// plugin. Binários antigos recebendo OTA novo caem no fallback sem crash.
const IOS_KEY = import.meta.env.VITE_REVENUECAT_IOS_KEY || '';
let configuredFor = null;

export function iapAvailable() {
  return Capacitor.getPlatform() === 'ios' && !!IOS_KEY && Capacitor.isPluginAvailable('Purchases');
}

export async function getPurchases() {
  const mod = await import('@revenuecat/purchases-capacitor');
  return mod.Purchases;
}

// appUserID = nosso users.id (UUID) — é o que o webhook usa pra achar a conta.
export async function configurePurchases(userId) {
  if (!iapAvailable()) throw new Error('IAP indisponível neste build');
  if (!userId) throw new Error('sessão sem user.id');
  if (configuredFor === userId) return true;
  const Purchases = await getPurchases();
  await Purchases.configure({ apiKey: IOS_KEY, appUserID: userId });
  configuredFor = userId;
  return true;
}
