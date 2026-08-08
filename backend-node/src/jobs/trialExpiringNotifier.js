// Cron leve: procura trials que expiram em ~2–3 dias e ainda não foram
// notificados (ou o último aviso foi > 20h atrás — evita duplicata por relançar
// o servidor). Manda e-mail e marca `trial_notified_at`.
//
// A coluna `trial_notified_at` NÃO existe na migration original de subscriptions.
// Ao invés de criar migration nova, esse job garante a coluna no boot via
// ADD COLUMN IF NOT EXISTS — decisão consciente pra manter o job auto-contido.
//
// Roda 1x por hora via setInterval (setup em server.js). Também exposta como
// função pura pra permitir chamada manual (endpoint admin/testes).

const { query } = require('../config/database');
const { sendTrialExpiringEmail } = require('../services/mailer');

let columnEnsured = false;

async function ensureTrialNotifiedAtColumn() {
  if (columnEnsured) return;
  try {
    await query(
      `ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS trial_notified_at TIMESTAMPTZ`
    );
    columnEnsured = true;
  } catch (err) {
    console.error('[trial-expiring] ensure column failed:', err?.message);
  }
}

async function runTrialExpiringNotifier() {
  try {
    await ensureTrialNotifiedAtColumn();

    // Alvo: subs em trial que acabam entre 2 e 3 dias (independente do plano).
    // Envia EXATAMENTE UMA vez por trial: trial_notified_at IS NULL. A janela
    // de aviso tem 24h de largura (2–3 dias antes do fim) e o job roda de hora
    // em hora; a guarda antiga (< NOW()-20h) era menor que a janela, então o
    // mesmo trial caía duas vezes e o e-mail saía em duplicata. Como
    // trial_notified_at só é setado no envio e nunca zerado, IS NULL garante 1x.
    const target = await query(
      `SELECT s.id, s.user_id, s.plan_id, s.trial_ends_at,
              u.email, u.name
         FROM subscriptions s
         JOIN users u ON u.id = s.user_id
        WHERE s.status = 'trialing'
          AND s.trial_ends_at BETWEEN NOW() + INTERVAL '2 days'
                                  AND NOW() + INTERVAL '3 days'
          AND s.trial_notified_at IS NULL
          AND u.deleted_at IS NULL
          AND u.email IS NOT NULL`
    );

    if (target.rows.length === 0) return { ok: true, notified: 0 };

    const baseUrl = process.env.APP_BASE_URL || 'https://app.tactiplan.faggin.com.br';
    const billingUrl = `${baseUrl.replace(/\/$/, '')}/#/billing`;

    let notified = 0;
    let failed = 0;

    for (const sub of target.rows) {
      const msLeft = new Date(sub.trial_ends_at).getTime() - Date.now();
      const daysLeft = Math.max(1, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));

      try {
        await sendTrialExpiringEmail({
          to: sub.email,
          name: sub.name,
          daysLeft,
          appUrl: baseUrl,
          billingUrl,
        });

        // Marca ANTES de logar — se o log falhar, ainda evita reenvio.
        await query(
          `UPDATE subscriptions SET trial_notified_at = NOW(), updated_at = NOW() WHERE id = $1`,
          [sub.id]
        );

        // Auditoria em billing_events (falha silenciosa).
        try {
          await query(
            `INSERT INTO billing_events (subscription_id, user_id, type, status, raw)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              sub.id,
              sub.user_id,
              'trial.expiring.email_sent',
              'trialing',
              { to: sub.email, days_left: daysLeft, plan_id: sub.plan_id, trial_ends_at: sub.trial_ends_at },
            ]
          );
        } catch (e) {
          console.error('[trial-expiring] event log failed:', e?.message);
        }

        notified++;
      } catch (err) {
        failed++;
        console.error('[trial-expiring] send failed for', sub.email, ':', err?.message);
      }
    }

    if (notified > 0 || failed > 0) {
      console.log(`[trial-expiring] notificados=${notified} falhas=${failed}`);
    }
    return { ok: true, notified, failed };
  } catch (err) {
    console.error('[trial-expiring] error:', err?.message);
    return { ok: false, error: err.message };
  }
}

// Agenda o notificador: 1 rodada 60s após boot e depois a cada hora.
function startTrialExpiringNotifierTimer(intervalMs = 60 * 60 * 1000) {
  let handle = null;
  setTimeout(() => {
    runTrialExpiringNotifier().catch(err => console.error('[trial-expiring] boot run:', err?.message));
    handle = setInterval(() => {
      runTrialExpiringNotifier().catch(err => console.error('[trial-expiring] tick:', err?.message));
    }, intervalMs);
    if (handle && typeof handle.unref === 'function') handle.unref();
  }, 60 * 1000);
}

module.exports = { runTrialExpiringNotifier, startTrialExpiringNotifierTimer };
