const express = require('express');
const crypto = require('crypto');
const { query } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const billing = require('../services/billing');
const { sendPaymentApprovedEmail, sendPaymentFailedEmail } = require('../services/mailer');

const router = express.Router();

// Fire-and-forget: quando o webhook do MP entrega um evento de pagamento,
// notifica o user por e-mail conforme o resultado. Falha silenciosa — nunca
// pode derrubar a resposta 200 do webhook.
async function notifyPaymentEvent(payload) {
  try {
    const type = String(payload?.type || payload?.action || '');
    const resourceId = payload?.data?.id || payload?.id;
    if (!resourceId) return;
    // Só processa eventos de pagamento (payment.*, subscription_authorized_payment.*)
    if (!type.startsWith('payment') && !type.includes('subscription_authorized_payment')) return;
    if (!billing.isEnabled()) return;

    const payment = await billing.fetchPayment(resourceId);
    if (!payment) return;

    const rawStatus = String(payment.status || '').toLowerCase();
    const approved = rawStatus === 'approved';
    const rejected = ['rejected', 'cancelled', 'canceled', 'failed'].includes(rawStatus);
    if (!approved && !rejected) return;

    // Descobre user/plan: prioriza external_reference ("userId|planId") posto
    // por createCheckout; fallback via preapproval → subscription.
    let userId = null;
    let planId = null;
    const extRef = String(payment.external_reference || '');
    if (extRef.includes('|')) {
      [userId, planId] = extRef.split('|');
    } else {
      const preId = payment?.metadata?.preapproval_id
        || payment?.point_of_interaction?.transaction_data?.preapproval_id;
      if (preId) {
        const sr = await query(
          'SELECT id, user_id, plan_id FROM subscriptions WHERE mp_preapproval_id = $1 LIMIT 1',
          [preId]
        );
        if (sr.rows[0]) {
          userId = sr.rows[0].user_id;
          planId = sr.rows[0].plan_id;
        }
      }
    }
    if (!userId) return;

    const userRes = await query(
      'SELECT email, name FROM users WHERE id = $1 AND deleted_at IS NULL',
      [userId]
    );
    const user = userRes.rows[0];
    if (!user) return;

    let planName = planId || 'TactiPlan';
    if (planId) {
      const pr = await query('SELECT name FROM plans WHERE id = $1', [planId]);
      if (pr.rows[0]?.name) planName = pr.rows[0].name;
    }

    const subRes = await query(
      `SELECT id FROM subscriptions
       WHERE user_id = $1
       ORDER BY (status IN ('trialing','active','past_due','paused')) DESC, created_at DESC
       LIMIT 1`,
      [userId]
    );
    const subscriptionId = subRes.rows[0]?.id || null;

    const baseUrl = process.env.APP_BASE_URL || 'https://app.tactiplan.faggin.com.br';

    if (approved) {
      const amountBRL = Number(payment.transaction_amount || 0);
      await sendPaymentApprovedEmail({
        to: user.email,
        name: user.name,
        planName,
        amountBRL,
        appUrl: baseUrl,
      });
      await billing.logBillingEvent({
        subscriptionId,
        userId,
        type: 'payment.approved.email_sent',
        mpResourceId: String(resourceId),
        status: rawStatus,
        raw: { to: user.email, plan_id: planId, amount_brl: amountBRL },
      });
    } else {
      await sendPaymentFailedEmail({
        to: user.email,
        name: user.name,
        planName,
        billingUrl: `${baseUrl.replace(/\/$/, '')}/#/billing`,
      });
      await billing.logBillingEvent({
        subscriptionId,
        userId,
        type: 'payment.rejected.email_sent',
        mpResourceId: String(resourceId),
        status: rawStatus,
        raw: { to: user.email, plan_id: planId },
      });
    }
  } catch (err) {
    console.error('notifyPaymentEvent error:', err?.message);
  }
}

// Valida assinatura HMAC SHA-256 do webhook do Mercado Pago.
// Doc: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
function verifyMpSignature(req) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    // Em produção: recusa qualquer webhook sem secret configurado (evita spoofing).
    // Em dev: tolerante pra facilitar teste local.
    if (process.env.NODE_ENV === 'production') {
      return { ok: false, reason: 'no_secret_configured_in_production' };
    }
    return { ok: true, reason: 'no_secret_configured_dev' };
  }

  const sigHeader = req.get('x-signature') || '';
  const reqId = req.get('x-request-id') || '';
  // sigHeader = "ts=1700000000,v1=abcdef..."
  const parts = Object.fromEntries(
    sigHeader.split(',').map(s => s.split('=').map(x => x.trim()))
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return { ok: false, reason: 'missing_signature_fields' };

  const dataId = (req.query && req.query['data.id']) || (req.body?.data?.id) || '';
  const tpl = `id:${dataId};request-id:${reqId};ts:${ts};`;
  const expected = crypto.createHmac('sha256', secret).update(tpl).digest('hex');

  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(v1, 'hex');
  if (a.length !== b.length) return { ok: false, reason: 'length_mismatch' };
  return { ok: crypto.timingSafeEqual(a, b), reason: 'hmac' };
}

// GET /api/billing/plans — público, lista planos ativos
router.get('/plans', async (req, res) => {
  try {
    const r = await query('SELECT id, name, description, price_cents, currency, interval, features FROM plans WHERE is_active = true ORDER BY price_cents ASC');
    res.json(r.rows);
  } catch (err) {
    console.error('Plans error:', err);
    res.status(500).json({ error: 'Failed to load plans' });
  }
});

// GET /api/billing/subscription — assinatura ativa da workspace ativa (ou do user se admin/sem workspace)
router.get('/subscription', authMiddleware, async (req, res) => {
  try {
    let sub = null;
    if (req.user.workspaceId) {
      sub = await billing.getSubscriptionForWorkspace(req.user.workspaceId);
    }
    if (!sub) {
      sub = await billing.getActiveSubscription(req.user.id);
    }
    res.json(sub || null);
  } catch (err) {
    console.error('Subscription error:', err);
    res.status(500).json({ error: 'Failed to load subscription' });
  }
});

// POST /api/billing/checkout — inicia checkout no Mercado Pago pra workspace ativa
router.post('/checkout', authMiddleware, async (req, res) => {
  try {
    const { plan_id } = req.body || {};
    if (!plan_id) return res.status(400).json({ error: 'plan_id required' });
    if (!req.user.workspaceId) return res.status(400).json({ error: 'Nenhuma workspace ativa' });
    if (!req.user.can('billing:manage') || !req.user.isWorkspaceOwner(req.user.workspaceId)) {
      return res.status(403).json({ error: 'Apenas o dono pode gerenciar assinatura' });
    }
    const result = await billing.createCheckout({
      userId: req.user.id,
      workspaceId: req.user.workspaceId,
      planId: plan_id,
      payerEmail: req.user.email,
    });
    res.json(result);
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to create checkout' });
  }
});

// NOTA: a rota POST /api/billing/trial foi REMOVIDA (segurança).
// Era órfã (o frontend nunca chamava) e permitia a qualquer usuário logado
// se autoconceder trial de qualquer plano, infinitas vezes — bypass total de
// pagamento. O trial legítimo é criado uma única vez no cadastro
// (routes/auth.js, INSERT direto). startTrial() ainda existe no service pra
// esse uso interno, agora com guarda contra re-trial.

// POST /api/billing/cancel — cancela assinatura ativa da workspace ativa
router.post('/cancel', authMiddleware, async (req, res) => {
  try {
    if (!req.user.can('billing:manage')) return res.status(403).json({ error: 'Sem permissão' });
    await billing.cancelSubscription(req.user.id, req.user.workspaceId);
    res.json({ ok: true });
  } catch (err) {
    console.error('Cancel error:', err);
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to cancel' });
  }
});

router.post(['/cancel-all', '/migrate-to-free'], authMiddleware, async (req, res) => {
  try {
    await billing.migrateToCanceled(req.user.id, req.user.workspaceId);
    res.json({ ok: true });
  } catch (err) {
    console.error('Cancel all error:', err);
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to cancel' });
  }
});


// POST /api/billing/webhook — Mercado Pago notifications (sem auth)
router.post('/webhook', async (req, res) => {
  const check = verifyMpSignature(req);
  if (!check.ok) {
    console.warn('Webhook signature invalid:', check.reason, 'headers:', { sig: req.get('x-signature'), reqId: req.get('x-request-id') });
    // Não falamos 401 pra evitar leak de info. 200 + log de aviso.
    return res.status(200).send('ok');
  }
  try {
    await billing.handleWebhook(req.body, req.headers);
    // Fire-and-forget: notifica user do resultado do pagamento (approved/rejected).
    // Não bloqueia o 200 do webhook.
    setImmediate(() => {
      notifyPaymentEvent(req.body).catch(err => console.error('notifyPaymentEvent bg:', err?.message));
    });
    res.status(200).send('ok');
  } catch (err) {
    // Falha ao processar (não é spoofing — a assinatura já passou). Responde 500
    // pra o Mercado Pago RE-ENVIAR o evento. O evento bruto já foi persistido em
    // billing_events, e o cron de reconciliação (reconcilePendingSubscriptions)
    // é a segunda rede de segurança caso os retries também falhem.
    console.error('Webhook error:', err);
    res.status(500).send('error');
  }
});

module.exports = router;
