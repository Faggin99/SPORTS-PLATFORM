import { Capacitor } from '@capacitor/core';
// Import ESTÁTICO (não dinâmico): o import() sob demanda travava no WKWebView.
// O módulo é JS puro e inofensivo em plataformas sem o nativo — todas as
// chamadas reais ficam atrás de iapAvailable().
import { Purchases } from '@revenuecat/purchases-capacitor';

const IOS_KEY = import.meta.env.VITE_REVENUECAT_IOS_KEY || '';
let configuredFor = null;

export function iapAvailable() {
  return Capacitor.getPlatform() === 'ios' && !!IOS_KEY && Capacitor.isPluginAvailable('Purchases');
}

export async function getPurchases() {
  return Purchases;
}

// appUserID = nosso users.id (UUID) — é o que o webhook usa pra achar a conta.
export async function configurePurchases(userId) {
  if (!iapAvailable()) throw new Error('IAP indisponível neste build');
  if (!userId) throw new Error('sessão sem user.id');
  if (configuredFor === userId) return true;
  await Purchases.configure({ apiKey: IOS_KEY, appUserID: userId });
  configuredFor = userId;
  return true;
}
