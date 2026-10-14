// Preços dos add-ons recorrentes (em centavos, valor MENSAL).
// Somam à mensalidade base do plano. Nos planos ANUAIS o add-on também recebe
// "2 meses grátis" (paga 10 meses), igual ao desconto do plano.
const ADDON_PRICES = {
  extra_club: 2000,      // +1 clube      = R$20/mês
  extra_category: 500,   // +1 categoria  = R$5/mês
};

// Máximos defensivos (evita valor absurdo por bug/abuso).
const ADDON_MAX = {
  extra_club: 20,
  extra_category: 50,
};

// Valor recorrente total (centavos) da assinatura = base do plano + add-ons.
// Mensal: base + add-ons no valor mensal.
// Anual:  base + add-ons * 10 (2 meses grátis, coerente com o plano anual).
function computeRecurringAmountCents(plan, extraClubs = 0, extraCategories = 0) {
  const ec = Math.max(0, Number(extraClubs) || 0);
  const ecat = Math.max(0, Number(extraCategories) || 0);
  const addonMonthly = ec * ADDON_PRICES.extra_club + ecat * ADDON_PRICES.extra_category;
  const base = plan?.price_cents || 0;
  if (plan?.interval === 'yearly') {
    return base + addonMonthly * 10;
  }
  return base + addonMonthly;
}

module.exports = { ADDON_PRICES, ADDON_MAX, computeRecurringAmountCents };
