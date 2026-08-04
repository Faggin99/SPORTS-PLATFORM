const express = require('express');
const crypto = require('crypto');
const { query } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const billing = require('../services/billing');

const router = express.Router();

// Valida assinatura HMAC SHA-256 do webhook do Mercado Pago.
// Doc: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
function verifyMpSignature(req) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return { ok: true, reason: 'no_secret_configured' }; // tolerante em dev

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

// POST /api/billing/trial — inicia trial no plano free/pro
router.post('/trial', authMiddleware, async (req, res) => {
  try {
    const { plan_id = 'pro' } = req.body || {};
    const sub = await billing.startTrial(req.user.id, plan_id);
    res.status(201).json(sub);
  } catch (err) {
    console.error('Trial error:', err);
    res.status(500).json({ error: err.message || 'Failed to start trial' });
  }
});

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
    res.status(200).send('ok');
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(200).send('ok');
  }
});

module.exports = router;
