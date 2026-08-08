// Cron leve: acha subs marcadas com cancel_at_period_end cujo período já
// terminou e marca status='canceled'. Registra em billing_events pra auditoria.
//
// Roda 1x por hora via setInterval (setup em server.js). Também exposta como
// função pura pra permitir chamada manual (endpoint admin/testes).

const { query } = require('../config/database');

async function runBillingCleanup() {
  try {
    // UPDATE atômico + RETURNING pra log.
    // Só toca subs que:
    //   - estão marcadas pra cancelar no fim do período
    //   - têm period_end definido e no passado
    //   - ainda não estão em 'canceled' (idempotente)
    const r = await query(
      `UPDATE subscriptions
          SET status = 'canceled',
              updated_at = NOW()
        WHERE cancel_at_period_end = TRUE
          AND current_period_end IS NOT NULL
          AND current_period_end < NOW()
          AND status <> 'canceled'
        RETURNING id, user_id, plan_id, mp_preapproval_id, current_period_end`
    );

    if (r.rows.length > 0) {
      console.log(`[billing-cleanup] ${r.rows.length} sub(s) expiraram e foram marcadas como canceled`);
      for (const sub of r.rows) {
        try {
          await query(
            `INSERT INTO billing_events (subscription_id, user_id, type, mp_resource_id, status, raw)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              sub.id,
              sub.user_id,
              'subscription.expired',
              sub.mp_preapproval_id || null,
              'canceled',
              { plan_id: sub.plan_id, ended_at: sub.current_period_end, reason: 'cron_period_end' },
            ]
          );
        } catch (e) {
          console.error('[billing-cleanup] event log failed:', e?.message);
        }
      }
    }

    return { ok: true, expired: r.rows.length };
  } catch (err) {
    console.error('[billing-cleanup] error:', err?.message);
    return { ok: false, error: err.message };
  }
}

// Agenda a limpeza: 1 rodada 30s após boot (não bloqueia startup) e depois a cada hora.
// Retorna o handle do intervalo pra permitir clearInterval em testes.
function startBillingCleanupTimer(intervalMs = 60 * 60 * 1000) {
  let handle = null;
  setTimeout(() => {
    runBillingCleanup().catch(err => console.error('[billing-cleanup] boot run:', err?.message));
    handle = setInterval(() => {
      runBillingCleanup().catch(err => console.error('[billing-cleanup] tick:', err?.message));
    }, intervalMs);
    if (handle && typeof handle.unref === 'function') handle.unref();
  }, 30 * 1000);
}

module.exports = { runBillingCleanup, startBillingCleanupTimer };
