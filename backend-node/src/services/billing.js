// Billing — integração com Mercado Pago (modo opcional).
// Se MP_ACCESS_TOKEN não estiver setado, todas as funções retornam erro 501.

const { query } = require('../config/database');

let mpClient = null;
let PreApproval = null;
let Payment = null;

function getMP() {
  if (mpClient) return mpClient;
  if (!process.env.MP_ACCESS_TOKEN) return null;

  const { MercadoPagoConfig, PreApproval: PA, Payment: PAY } = require('mercadopago');
  mpClient = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
  PreApproval = PA;
  Payment = PAY;
  return mpClient;
}

function isEnabled() {
  return !!process.env.MP_ACCESS_TOKEN;
}

async function getPlan(planId) {
  const r = await query('SELECT * FROM plans WHERE id = $1 AND is_active = true', [planId]);
  return r.rows[0] || null;
}

async function getActiveSubscription(userId) {
  // Admin: acesso ilimitado independente de assinatura
  const userRes = await query('SELECT role FROM users WHERE id = $1', [userId]);
  const role = userRes.rows[0]?.role;
  if (role === 'admin') {
    return {
      plan_id: 'admin',
      plan_name: 'Admin',
      status: 'active',
      is_admin: true,
      features: { max_clubs: -1, max_athletes: -1, multi_user: true, admin: true },
    };
  }

  const r = await query(
    `SELECT s.*, p.name AS plan_name, p.price_cents, p.features
     FROM subscriptions s
     JOIN plans p ON p.id = s.plan_id
     WHERE s.user_id = $1
       AND s.status IN ('trialing','active','past_due','paused')
     ORDER BY (s.plan_id = 'lifetime') DESC, s.created_at DESC LIMIT 1`,
    [userId]
  );
  const sub = r.rows[0];
  if (!sub) return null;

  // Calcula dias restantes do trial pra facilitar a UI
  if (sub.status === 'trialing' && sub.trial_ends_at) {
    const msLeft = new Date(sub.trial_ends_at).getTime() - Date.now();
    sub.trial_days_left = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
  }
  return sub;
}

// Subscription da workspace ativa. Considera admin-bypass se o owner da workspace é admin.
async function getSubscriptionForWorkspace(workspaceId) {
  if (!workspaceId) return null;

  // Quem é dono da workspace? Se admin, retorna features Admin.
  const wsRes = await query(
    `SELECT w.owner_id, u.role FROM workspaces w JOIN users u ON u.id = w.owner_id WHERE w.id = $1`,
    [workspaceId]
  );
  if (wsRes.rows.length === 0) return null;
  if (wsRes.rows[0].role === 'admin') {
    return {
      plan_id: 'admin',
      plan_name: 'Admin',
      status: 'active',
      is_admin: true,
      features: { max_clubs: -1, max_athletes: -1, multi_user: true, max_coaches: 999, admin: true },
    };
  }

  const r = await query(
    `SELECT s.*, p.name AS plan_name, p.price_cents, p.features
     FROM subscriptions s
     JOIN plans p ON p.id = s.plan_id
     WHERE s.workspace_id = $1
       AND s.status IN ('trialing','active','past_due','paused')
     ORDER BY (s.plan_id = 'lifetime') DESC, s.created_at DESC LIMIT 1`,
    [workspaceId]
  );
  const sub = r.rows[0];
  if (!sub) return null;

  if (sub.status === 'trialing' && sub.trial_ends_at) {
    const msLeft = new Date(sub.trial_ends_at).getTime() - Date.now();
    sub.trial_days_left = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
  }
  return sub;
}

async function startTrial(userId, planId = 'pro', days = 30) {
  const plan = await getPlan(planId);
  if (!plan) throw new Error('Plan not found');
  const now = new Date();
  const trialEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const r = await query(
    `INSERT INTO subscriptions (user_id, plan_id, status, trial_ends_at, current_period_start, current_period_end)
     VALUES ($1, $2, 'trialing', $3, $4, $3) RETURNING *`,
    [userId, planId, trialEnd, now]
  );
  return r.rows[0];
}

// Cria preapproval (assinatura recorrente) no Mercado Pago.
// Retorna { init_point } — URL pra redirecionar o usuário.
async function createCheckout({ userId, planId, payerEmail }) {
  if (!isEnabled()) {
    const err = new Error('Payment provider not configured');
    err.statusCode = 501;
    throw err;
  }
  const plan = await getPlan(planId);
  if (!plan) throw new Error('Plan not found');

  const mp = getMP();
  const pa = new PreApproval(mp);

  const baseUrl = process.env.APP_BASE_URL || 'https://app.tactiplan.faggin.com.br';
  const result = await pa.create({
    body: {
      reason: `${plan.name} — TactiPlan`,
      auto_recurring: {
        frequency: plan.interval === 'yearly' ? 12 : 1,
        frequency_type: 'months',
        transaction_amount: plan.price_cents / 100,
        currency_id: plan.currency || 'BRL',
      },
      back_url: `${baseUrl}/#/billing/callback`,
      payer_email: payerEmail,
      external_reference: `${userId}|${planId}`,
      status: 'pending',
    },
  });

  // grava subscription pendente
  await query(
    `INSERT INTO subscriptions (user_id, plan_id, status, mp_preapproval_id, mp_status)
     VALUES ($1, $2, 'trialing', $3, $4)
     ON CONFLICT DO NOTHING`,
    [userId, planId, result.id, result.status]
  );

  return { init_point: result.init_point, preapproval_id: result.id };
}

// Mapeia status do Mercado Pago para nosso schema interno
function mapMpStatus(mpStatus) {
  const m = String(mpStatus || '').toLowerCase();
  if (['authorized', 'active', 'approved'].includes(m)) return 'active';
  if (['pending', 'trialing'].includes(m)) return 'trialing';
  if (['paused'].includes(m)) return 'paused';
  if (['cancelled', 'canceled'].includes(m)) return 'canceled';
  if (['rejected', 'failed'].includes(m)) return 'past_due';
  if (['expired', 'finished'].includes(m)) return 'expired';
  return null;
}

async function fetchPreapproval(preapprovalId) {
  if (!isEnabled() || !preapprovalId) return null;
  const mp = getMP();
  const pa = new PreApproval(mp);
  try {
    return await pa.get({ id: preapprovalId });
  } catch (err) {
    console.error('fetchPreapproval error:', err?.message);
    return null;
  }
}

async function fetchPayment(paymentId) {
  if (!isEnabled() || !paymentId) return null;
  const mp = getMP();
  const pay = new Payment(mp);
  try {
    return await pay.get({ id: paymentId });
  } catch (err) {
    console.error('fetchPayment error:', err?.message);
    return null;
  }
}

async function syncSubscriptionFromPreapproval(preapprovalId) {
  const pa = await fetchPreapproval(preapprovalId);
  if (!pa) return null;

  const mappedStatus = mapMpStatus(pa.status);
  // external_reference vem no formato "userId|planId" do nosso createCheckout
  let userId = null;
  let planId = null;
  if (pa.external_reference && pa.external_reference.includes('|')) {
    [userId, planId] = pa.external_reference.split('|');
  }

  // Próxima data de cobrança
  const nextPaymentDate = pa.next_payment_date ? new Date(pa.next_payment_date) : null;

  // Atualiza por preapproval_id se já existir
  const existing = await query(
    'SELECT id, user_id, plan_id FROM subscriptions WHERE mp_preapproval_id = $1',
    [preapprovalId]
  );

  if (existing.rows.length > 0) {
    await query(
      `UPDATE subscriptions SET
         status = COALESCE($2, status),
         mp_status = $3,
         mp_payer_id = COALESCE($4, mp_payer_id),
         current_period_end = COALESCE($5, current_period_end),
         updated_at = now()
       WHERE mp_preapproval_id = $1`,
      [preapprovalId, mappedStatus, pa.status, pa.payer_id ? String(pa.payer_id) : null, nextPaymentDate]
    );
  } else if (userId && planId) {
    // Caso o checkout não tenha criado o registro local antes (raro)
    await query(
      `INSERT INTO subscriptions (user_id, plan_id, status, mp_preapproval_id, mp_status, mp_payer_id, current_period_end)
       VALUES ($1, $2, COALESCE($3, 'trialing'), $4, $5, $6, $7)
       ON CONFLICT DO NOTHING`,
      [userId, planId, mappedStatus, preapprovalId, pa.status, pa.payer_id ? String(pa.payer_id) : null, nextPaymentDate]
    );
  }

  return { preapprovalId, status: mappedStatus, mp_status: pa.status };
}

async function handleWebhook(payload, headers = {}) {
  const type = payload?.type || payload?.action || 'unknown';
  const resourceId = payload?.data?.id || payload?.id || null;

  // Log do evento bruto pra auditoria
  await query(
    `INSERT INTO billing_events (type, mp_resource_id, raw) VALUES ($1, $2, $3)`,
    [String(type), resourceId ? String(resourceId) : null, payload]
  );

  if (!isEnabled() || !resourceId) return { ok: true, skipped: true };

  try {
    // Eventos de assinatura: type = 'subscription_preapproval' | 'preapproval'
    if (type.includes('preapproval')) {
      await syncSubscriptionFromPreapproval(resourceId);
    }
    // Eventos de pagamento dentro da assinatura
    else if (type.includes('subscription_authorized_payment') || type.startsWith('payment')) {
      const payment = await fetchPayment(resourceId);
      if (payment?.metadata?.preapproval_id || payment?.point_of_interaction?.transaction_data?.preapproval_id) {
        const preId = payment.metadata?.preapproval_id || payment.point_of_interaction?.transaction_data?.preapproval_id;
        await syncSubscriptionFromPreapproval(preId);
      } else if (payment?.external_reference?.includes('|')) {
        // Tenta achar a subscription pelo external_reference do payment
        const [userId] = payment.external_reference.split('|');
        if (userId) {
          // Marca a subscription ativa do user como active quando o pagamento for aprovado
          if (mapMpStatus(payment.status) === 'active') {
            await query(
              `UPDATE subscriptions SET status='active', mp_status=$2, updated_at=now()
               WHERE user_id=$1 AND status IN ('trialing','past_due','paused')`,
              [userId, payment.status]
            );
          }
        }
      }
    }
  } catch (err) {
    console.error('Webhook sync error:', err);
  }
  return { ok: true };
}

async function migrateToCanceled(userId) {
  // Não existe mais plano Free. Cancela tudo que estiver aberto.
  // Usuário fica sem subscription ativa e cai no paywall até reassinar.
  const r = await query(
    `SELECT id, mp_preapproval_id FROM subscriptions
     WHERE user_id = $1 AND status IN ('trialing','active','past_due','paused')
       AND plan_id <> 'lifetime'`,
    [userId]
  );
  for (const sub of r.rows) {
    if (isEnabled() && sub.mp_preapproval_id) {
      try {
        const mp = getMP();
        const pa = new PreApproval(mp);
        await pa.update({ id: sub.mp_preapproval_id, body: { status: 'cancelled' } });
      } catch (err) {
        console.error('MP cancel on migrateToCanceled:', err?.message);
      }
    }
    await query(
      `UPDATE subscriptions SET status='canceled', canceled_at=now(), updated_at=now() WHERE id=$1`,
      [sub.id]
    );
  }

  return { ok: true };
}

async function cancelSubscription(userId) {
  // Busca subscription ativa não-lifetime do user
  const r = await query(
    `SELECT id, mp_preapproval_id, plan_id FROM subscriptions
     WHERE user_id = $1 AND status IN ('trialing','active','past_due','paused') AND plan_id <> 'lifetime'
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  const sub = r.rows[0];
  if (!sub) {
    const err = new Error('Nenhuma assinatura ativa para cancelar');
    err.statusCode = 404;
    throw err;
  }

  // Tenta cancelar no MP (se houver preapproval e SDK habilitado)
  if (isEnabled() && sub.mp_preapproval_id) {
    try {
      const mp = getMP();
      const pa = new PreApproval(mp);
      await pa.update({ id: sub.mp_preapproval_id, body: { status: 'cancelled' } });
    } catch (err) {
      console.error('MP cancel error:', err?.message);
      // Continua e marca local mesmo assim — user não fica preso
    }
  }

  await query(
    `UPDATE subscriptions SET status='canceled', canceled_at=now(), updated_at=now() WHERE id=$1`,
    [sub.id]
  );
  return { ok: true };
}

module.exports = { isEnabled, getPlan, getActiveSubscription, getSubscriptionForWorkspace, startTrial, createCheckout, handleWebhook, cancelSubscription, migrateToCanceled };
