// Cron de reconciliação de pagamentos — segunda rede de segurança do webhook.
//
// Problema que resolve: se um webhook do Mercado Pago se perde (queda, timeout,
// bug), um checkout pago pode ficar preso em 'pending' (usuário pagou mas não
// tem acesso), ou um preapproval divergir do nosso estado. Este job varre as
// subs 'pending' recentes e consulta o MP pra sincronizar; e expira as pendências
// muito antigas (checkout abandonado) pra não acumular lixo.
//
// Roda 1x a cada 15min via setInterval (setup em server.js).

const { query } = require('../config/database');
const billing = require('../services/billing');

// Janela: só reconcilia pendências entre 3min (dá tempo do fluxo normal) e 48h.
const MIN_AGE_MIN = 3;
const EXPIRE_AFTER_HOURS = 48;

async function runPendingReconcile() {
  if (!billing.isEnabled()) return { ok: true, skipped: 'mp_disabled' };
  try {
    // 1) Expira checkouts abandonados (pending há mais de 48h)
    const expired = await query(
      `UPDATE subscriptions
          SET status = 'expired', updated_at = NOW()
        WHERE status = 'pending'
          AND created_at < NOW() - INTERVAL '${EXPIRE_AFTER_HOURS} hours'
        RETURNING id`
    );
    if (expired.rows.length > 0) {
      console.log(`[reconcile] ${expired.rows.length} checkout(s) pendente(s) expirado(s) por inatividade`);
    }

    // 2) Reconcilia pendências na janela [3min, 48h] consultando o MP
    const pend = await query(
      `SELECT id, mp_preapproval_id
         FROM subscriptions
        WHERE status = 'pending'
          AND mp_preapproval_id IS NOT NULL
          AND created_at < NOW() - INTERVAL '${MIN_AGE_MIN} minutes'
          AND created_at > NOW() - INTERVAL '${EXPIRE_AFTER_HOURS} hours'
        ORDER BY created_at ASC
        LIMIT 50`
    );

    let reconciled = 0;
    for (const sub of pend.rows) {
      try {
        const result = await billing.syncSubscriptionFromPreapproval(sub.mp_preapproval_id);
        if (result && result.status && result.status !== 'pending') {
          reconciled++;
          console.log(`[reconcile] sub ${sub.id} sincronizada: ${result.status}`);
        }
      } catch (e) {
        console.error(`[reconcile] falha ao sincronizar ${sub.mp_preapproval_id}:`, e?.message);
      }
    }

    return { ok: true, expired: expired.rows.length, checked: pend.rows.length, reconciled };
  } catch (err) {
    console.error('[reconcile] error:', err?.message);
    return { ok: false, error: err.message };
  }
}

function startPendingReconcileTimer(intervalMs = 15 * 60 * 1000) {
  let handle = null;
  setTimeout(() => {
    runPendingReconcile().catch(err => console.error('[reconcile] boot run:', err?.message));
    handle = setInterval(() => {
      runPendingReconcile().catch(err => console.error('[reconcile] tick:', err?.message));
    }, intervalMs);
    if (handle && typeof handle.unref === 'function') handle.unref();
  }, 45 * 1000);
}

module.exports = { runPendingReconcile, startPendingReconcileTimer };
