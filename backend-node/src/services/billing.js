// Billing — integração com Mercado Pago (modo opcional).
// Se MP_ACCESS_TOKEN não estiver setado, checkout/cancel remoto respondem 501,
// mas o ciclo de vida local (trial, status, cancel_at_period_end) continua rodando.

const { query } = require('../config/database');
const { ADDON_PRICES, ADDON_MAX, computeRecurringAmountCents } = require('../config/addons');
const { isLifetime } = require('../config/specialUsers');

let mpClient = null;
let PreApproval = null;
let PreApprovalPlan = null;
let Payment = null;

function getMP() {
  if (mpClient) return mpClient;
  if (!process.env.MP_ACCESS_TOKEN) return null;

  const { MercadoPagoConfig, PreApproval: PA, PreApprovalPlan: PAP, Payment: PAY } = require('mercadopago');
  mpClient = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
  PreApproval = PA;
  PreApprovalPlan = PAP;
  Payment = PAY;
  return mpClient;
}

function isEnabled() {
  return !!process.env.MP_ACCESS_TOKEN;
}

// -----------------------------------------------------------------------------
// Helpers internos
// -----------------------------------------------------------------------------

// Registra um evento em billing_events. Falha silenciosa — auditoria nunca
// deve derrubar o fluxo principal.
async function logBillingEvent({ subscriptionId, userId, type, mpResourceId = null, status = null, raw = null }) {
  try {
    await query(
      `INSERT INTO billing_events (subscription_id, user_id, type, mp_resource_id, status, raw)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [subscriptionId || null, userId || null, String(type), mpResourceId, status, raw]
    );
  } catch (err) {
    console.error('logBillingEvent error:', err?.message);
  }
}

// Cancela a recorrência no Mercado Pago. Retorna true se OK, false em qualquer erro.
// Nunca lança — o cancelamento local acontece de qualquer jeito.
async function cancelOnMP(preapprovalId) {
  if (!isEnabled() || !preapprovalId) return false;
  try {
    const mp = getMP();
    const pa = new PreApproval(mp);
    await pa.update({ id: preapprovalId, body: { status: 'cancelled' } });
    return true;
  } catch (err) {
    console.error('cancelOnMP error:', err?.message);
    return false;
  }
}

// Cancela IMEDIATAMENTE (status='canceled') todas as subs ativas de um user.
// Usado no upgrade/checkout novo — o unique index parcial
// `uq_subscriptions_active_per_user` bloqueia 2 subs ativas do mesmo user, então
// precisamos fechar as antigas antes de inserir a nova.
// Não é o mesmo fluxo do cancelSubscription do usuário (que preserva o período).
async function _hardCancelActiveSubsForUser(userId, reason = 'upgrade', exceptSubId = null) {
  const r = await query(
    `SELECT id, mp_preapproval_id, plan_id, status, current_period_end
       FROM subscriptions
      WHERE user_id = $1
        AND status IN ('trialing','active','past_due','paused')
        AND plan_id <> 'lifetime'
        AND ($2::uuid IS NULL OR id <> $2)`,
    [userId, exceptSubId]
  );
  let closed = 0;
  for (const sub of r.rows) {
    const mpOk = await cancelOnMP(sub.mp_preapproval_id);
    await query(
      `UPDATE subscriptions
          SET status = 'canceled',
              cancel_at_period_end = TRUE,
              canceled_at = COALESCE(canceled_at, NOW()),
              updated_at = NOW()
        WHERE id = $1`,
      [sub.id]
    );
    await logBillingEvent({
      subscriptionId: sub.id,
      userId,
      type: 'subscription.canceled',
      mpResourceId: sub.mp_preapproval_id,
      status: 'canceled',
      raw: {
        reason,
        previous_status: sub.status,
        mp_cancel_ok: mpOk,
        plan_id: sub.plan_id,
      },
    });
    closed++;
  }
  return closed;
}

// -----------------------------------------------------------------------------
// Helper público: uma sub é considerada "ativa" para efeitos de acesso quando
// - status é trialing/active/past_due; OU
// - está em cancel_at_period_end e ainda dentro do período pago
//   (defensivo — permite deixar `status` intacto durante a graça).
// -----------------------------------------------------------------------------
function isSubscriptionActive(sub) {
  if (!sub) return false;
  const activeStatuses = ['trialing', 'active', 'past_due'];
  if (activeStatuses.includes(sub.status)) return true;
  if (sub.cancel_at_period_end === true && sub.current_period_end) {
    return new Date(sub.current_period_end) > new Date();
  }
  return false;
}

// -----------------------------------------------------------------------------
// Lookups
// -----------------------------------------------------------------------------

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
    `SELECT s.*, p.name AS plan_name, p.price_cents, p.features, p.interval
     FROM subscriptions s
     JOIN plans p ON p.id = s.plan_id
     WHERE s.user_id = $1
       AND (s.status IN ('trialing','active','past_due','paused')
            OR (s.cancel_at_period_end = TRUE AND s.current_period_end > NOW()))
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
    `SELECT s.*, p.name AS plan_name, p.price_cents, p.features, p.interval
     FROM subscriptions s
     JOIN plans p ON p.id = s.plan_id
     WHERE s.workspace_id = $1
       AND (s.status IN ('trialing','active','past_due','paused')
            OR (s.cancel_at_period_end = TRUE AND s.current_period_end > NOW()))
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

// -----------------------------------------------------------------------------
// Ciclo de vida
// -----------------------------------------------------------------------------

async function startTrial(userId, planId = 'pro', days = 30) {
  const plan = await getPlan(planId);
  if (!plan) throw new Error('Plan not found');
  // Guarda contra re-trial: um usuário só pode ter UM trial na vida. Sem isso,
  // qualquer chamada repetida reabriria acesso grátis indefinidamente. A
  // checagem cobre qualquer assinatura já existente (trial ou paga).
  const prior = await query(
    'SELECT 1 FROM subscriptions WHERE user_id = $1 LIMIT 1',
    [userId]
  );
  if (prior.rows.length > 0) {
    const err = new Error('Usuário já possui (ou já teve) uma assinatura — trial não pode ser reiniciado.');
    err.statusCode = 409;
    throw err;
  }
  // Trial também conta como sub ativa — precisa fechar as antigas pro unique
  // index não rejeitar.
  await _hardCancelActiveSubsForUser(userId, 'start_trial');
  const now = new Date();
  const trialEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const r = await query(
    `INSERT INTO subscriptions (user_id, plan_id, status, trial_ends_at, current_period_start, current_period_end)
     VALUES ($1, $2, 'trialing', $3, $4, $3) RETURNING *`,
    [userId, planId, trialEnd, now]
  );
  const sub = r.rows[0];
  await logBillingEvent({
    subscriptionId: sub.id,
    userId,
    type: 'subscription.trial_started',
    status: 'trialing',
    raw: { plan_id: planId, trial_days: days },
  });
  return sub;
}

// Cria preapproval (assinatura recorrente) no Mercado Pago.
// Retorna { init_point } — URL pra redirecionar o usuário.
async function createCheckout({ userId, planId, payerEmail, workspaceId = null }) {
  if (!isEnabled()) {
    const err = new Error('Payment provider not configured');
    err.statusCode = 501;
    throw err;
  }
  const plan = await getPlan(planId);
  if (!plan) throw new Error('Plan not found');

  // IMPORTANTE: NÃO cancelamos a assinatura anterior aqui. O checkout pode ser
  // abandonado; cancelar antes de confirmar o pagamento deixaria o usuário sem
  // o plano que já pagava. A troca de plano só se efetiva quando o webhook
  // confirma o preapproval como autorizado (syncSubscriptionFromPreapproval).
  //
  // Limpa apenas checkouts PENDENTES antigos deste user (não-pagos, fora do
  // índice de ativos) pra não acumular lixo — nunca toca em sub ativa/paga.
  await query(
    `UPDATE subscriptions
        SET status = 'expired', updated_at = NOW()
      WHERE user_id = $1 AND status = 'pending'`,
    [userId]
  );

  const mp = getMP();
  const paPlan = new PreApprovalPlan(mp);

  // Fluxo baseado em PLANO (preapproval_plan): a conta MP recusa preapproval
  // direto (500), mas plano funciona e gera init_point (checkout por redirect).
  // Criamos um plano por checkout com o valor BASE do plano (add-ons são
  // comprados depois, via setAddons, que ajusta o valor). external_reference
  // = "userId|planId" pra vincular; guardamos o id do plano na sub pendente e,
  // quando a assinatura (preapproval) resultante chega no webhook, linkamos.
  const baseUrl = process.env.APP_BASE_URL || 'https://app.tactiplan.faggin.com.br';
  const result = await paPlan.create({
    body: {
      reason: `${plan.name} — TactiPlan`,
      external_reference: `${userId}|${planId}`,
      auto_recurring: {
        frequency: plan.interval === 'yearly' ? 12 : 1,
        frequency_type: 'months',
        transaction_amount: plan.price_cents / 100,
        currency_id: plan.currency || 'BRL',
      },
      back_url: `${baseUrl}/#/billing/callback`,
    },
  });

  // Sub nasce 'pending' guardando o id do PLANO (o preapproval real vem depois).
  const ins = await query(
    `INSERT INTO subscriptions (user_id, workspace_id, plan_id, status, mp_preapproval_plan_id, mp_status)
     VALUES ($1, $2, $3, 'pending', $4, $5)
     RETURNING id`,
    [userId, workspaceId, planId, result.id, result.status]
  );

  await logBillingEvent({
    subscriptionId: ins.rows[0]?.id || null,
    userId,
    type: 'subscription.checkout_started',
    mpResourceId: result.id,
    status: result.status,
    raw: { plan_id: planId, workspace_id: workspaceId, preapproval_plan_id: result.id },
  });

  return { init_point: result.init_point, preapproval_plan_id: result.id };
}

// Mapeia status do Mercado Pago para nosso schema interno
function mapMpStatus(mpStatus) {
  const m = String(mpStatus || '').toLowerCase();
  if (['authorized', 'active', 'approved'].includes(m)) return 'active';
  if (m === 'trialing') return 'trialing';
  // 'pending' fica 'pending' (NÃO ativo) — preapproval criado mas não pago
  // ainda não libera acesso; só vira 'active' quando o pagamento confirma.
  if (m === 'pending') return 'pending';
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

async function syncSubscriptionFromPreapproval(preapprovalId, paOverride = null) {
  // paOverride: usado em testes pra injetar o preapproval sem chamar o MP.
  // Em produção nunca é passado (busca o preapproval real no MP).
  const pa = paOverride || await fetchPreapproval(preapprovalId);
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
  // A assinatura (preapproval) criada pelo comprador vem LINKADA ao nosso plano.
  const planRef = pa.preapproval_plan_id || null;

  // Acha a sub local: (1) já linkada por preapproval_id; senão (2) a pendente
  // pelo id do PLANO que criamos no checkout; senão (3) por external_reference.
  let existing = await query(
    'SELECT id, user_id, plan_id, status, cancel_at_period_end, current_period_end FROM subscriptions WHERE mp_preapproval_id = $1',
    [preapprovalId]
  );
  if (existing.rows.length === 0 && planRef) {
    existing = await query(
      `SELECT id, user_id, plan_id, status, cancel_at_period_end, current_period_end
         FROM subscriptions WHERE mp_preapproval_plan_id = $1
        ORDER BY created_at DESC LIMIT 1`,
      [planRef]
    );
  }

  if (existing.rows.length > 0) {
    const local = existing.rows[0];

    if (mappedStatus === 'active') {
      // PAGAMENTO CONFIRMADO. Vincula o preapproval real, ativa a sub e cancela
      // as OUTRAS ativas do user (troca de plano só se efetiva aqui). Checkout
      // abandonado nunca chega neste ponto.
      await _hardCancelActiveSubsForUser(local.user_id, 'plan_switch_confirmed', local.id);
      await query(
        `UPDATE subscriptions SET
           status = 'active',
           mp_preapproval_id = $2,
           mp_status = $3,
           mp_payer_id = COALESCE($4, mp_payer_id),
           current_period_end = COALESCE($5, current_period_end),
           cancel_at_period_end = FALSE,
           updated_at = now()
         WHERE id = $1`,
        [local.id, preapprovalId, pa.status, pa.payer_id ? String(pa.payer_id) : null, nextPaymentDate]
      );
    } else {
      // Não rebaixa uma sub em período de graça (cancelou mas período ainda
      // válido) pra 'canceled' — o cron faz a transição final no fim do período.
      const inGrace = local.cancel_at_period_end === true
        && local.current_period_end && new Date(local.current_period_end) > new Date();
      const nextStatus = (mappedStatus === 'canceled' && inGrace) ? local.status : mappedStatus;
      await query(
        `UPDATE subscriptions SET
           status = COALESCE($2, status),
           mp_preapproval_id = COALESCE(mp_preapproval_id, $3),
           mp_status = $4,
           mp_payer_id = COALESCE($5, mp_payer_id),
           current_period_end = COALESCE($6, current_period_end),
           updated_at = now()
         WHERE id = $1`,
        [local.id, nextStatus, preapprovalId, pa.status, pa.payer_id ? String(pa.payer_id) : null, nextPaymentDate]
      );
    }
  } else if (userId && planId) {
    // Checkout não criou o registro local antes (raro). Se já está autorizado,
    // fecha as ativas e insere como active; senão insere pending.
    if (mappedStatus === 'active') {
      await _hardCancelActiveSubsForUser(userId, 'sync_from_preapproval');
    }
    await query(
      `INSERT INTO subscriptions (user_id, plan_id, status, mp_preapproval_id, mp_status, mp_payer_id, current_period_end)
       VALUES ($1, $2, COALESCE($3, 'pending'), $4, $5, $6, $7)`,
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
        // Fallback sem preapproval_id: identifica a sub pelo external_reference
        // (userId|planId) e promove a pendente pra ativa quando o pagamento
        // aprovar, cancelando as demais ativas do user.
        const [userId, planId] = payment.external_reference.split('|');
        if (userId && mapMpStatus(payment.status) === 'active') {
          const pend = await query(
            `SELECT id FROM subscriptions
              WHERE user_id = $1 AND plan_id = $2
                AND status IN ('pending','trialing','past_due','paused')
              ORDER BY created_at DESC LIMIT 1`,
            [userId, planId]
          );
          if (pend.rows[0]) {
            await _hardCancelActiveSubsForUser(userId, 'payment_confirmed', pend.rows[0].id);
            await query(
              `UPDATE subscriptions
                  SET status='active', mp_status=$2, cancel_at_period_end=FALSE, updated_at=now()
                WHERE id=$1`,
              [pend.rows[0].id, payment.status]
            );
          }
        }
      }
    }
  } catch (err) {
    // Propaga pro caller (rota do webhook) responder != 2xx e o MP re-enviar.
    // O evento bruto já foi gravado em billing_events antes deste try, então
    // nada se perde mesmo que o retry demore.
    console.error('Webhook sync error:', err);
    throw err;
  }
  return { ok: true };
}

// migrateToCanceled: cancelamento imediato (usado por /cancel-all e /migrate-to-free).
// Fecha tudo já — não respeita período. Uso administrativo / limpeza.
async function migrateToCanceled(userId) {
  const closed = await _hardCancelActiveSubsForUser(userId, 'migrate_to_canceled');
  return { ok: true, closed };
}

// -----------------------------------------------------------------------------
// Cancelamento respeitoso ao CDC.
//
// Não muda o `status` na hora — só marca `cancel_at_period_end = TRUE` e
// `canceled_at = NOW()`. O acesso permanece via isSubscriptionActive() até
// `current_period_end`. O cron (jobs/cleanupExpiredSubscriptions) faz a
// transição final pra 'canceled' quando o período acabar.
//
// A recorrência no Mercado Pago é cancelada imediatamente pra não gerar
// cobrança nova — mas isso é ortogonal ao acesso do user.
//
// Assinatura: aceita (userIdOrSubId, userIdIfSubIdGiven) para dar suporte tanto
// ao caller atual (userId, workspaceId) quanto a chamadas mais específicas.
// Comportamento antigo (userId, workspaceId) continua funcionando.
// -----------------------------------------------------------------------------
async function cancelSubscription(userId, workspaceId = null) {
  if (!userId) {
    const err = new Error('userId required');
    err.statusCode = 400;
    throw err;
  }

  // Busca a sub relevante: prioriza a da workspace (se fornecida), senão a mais
  // recente do user. Ignora lifetime.
  let sub = null;
  if (workspaceId) {
    const r = await query(
      `SELECT id, user_id, workspace_id, mp_preapproval_id, plan_id, status,
              cancel_at_period_end, current_period_end
         FROM subscriptions
        WHERE workspace_id = $1
          AND status IN ('trialing','active','past_due','paused')
          AND plan_id <> 'lifetime'
        ORDER BY created_at DESC LIMIT 1`,
      [workspaceId]
    );
    sub = r.rows[0];
  }
  if (!sub) {
    const r = await query(
      `SELECT id, user_id, workspace_id, mp_preapproval_id, plan_id, status,
              cancel_at_period_end, current_period_end
         FROM subscriptions
        WHERE user_id = $1
          AND status IN ('trialing','active','past_due','paused')
          AND plan_id <> 'lifetime'
        ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    sub = r.rows[0];
  }

  if (!sub) {
    const err = new Error('Nenhuma assinatura ativa para cancelar');
    err.statusCode = 404;
    throw err;
  }

  // Não rechama MP se já estava marcada
  const mpOk = sub.cancel_at_period_end ? null : await cancelOnMP(sub.mp_preapproval_id);

  await query(
    `UPDATE subscriptions
        SET cancel_at_period_end = TRUE,
            canceled_at = COALESCE(canceled_at, NOW()),
            updated_at = NOW()
      WHERE id = $1`,
    [sub.id]
  );

  await logBillingEvent({
    subscriptionId: sub.id,
    userId: sub.user_id || userId,
    type: 'subscription.cancel_at_period_end',
    mpResourceId: sub.mp_preapproval_id,
    status: sub.status,
    raw: {
      plan_id: sub.plan_id,
      mp_cancel_ok: mpOk,
      ends_at: sub.current_period_end,
    },
  });

  return {
    ok: true,
    sub_id: sub.id,
    ends_at: sub.current_period_end,
    mp_cancel_ok: mpOk,
  };
}

// Atualiza o valor recorrente do preapproval no Mercado Pago (base + add-ons).
// A mudança de valor no MP vale a partir do PRÓXIMO ciclo (não é proporcional).
// Retorna true se OK; nunca lança (o estado local é atualizado de qualquer jeito).
async function updatePreapprovalAmount(preapprovalId, amountCents) {
  if (!isEnabled() || !preapprovalId) return false;
  try {
    const mp = getMP();
    const pa = new PreApproval(mp);
    await pa.update({ id: preapprovalId, body: { auto_recurring: { transaction_amount: amountCents / 100 } } });
    return true;
  } catch (err) {
    console.error('updatePreapprovalAmount error:', err?.message);
    return false;
  }
}

// Atualiza o valor do PLANO (preapproval_plan). Como criamos um plano por
// assinante, atualizar o plano é a forma canônica de mudar o valor recorrente
// da assinatura linkada. Fazemos os dois (plano + preapproval) por robustez.
async function updatePlanAmount(planId, amountCents) {
  if (!isEnabled() || !planId) return false;
  try {
    const mp = getMP();
    const pap = new PreApprovalPlan(mp);
    await pap.update({ id: planId, body: { auto_recurring: { transaction_amount: amountCents / 100 } } });
    return true;
  } catch (err) {
    console.error('updatePlanAmount error:', err?.message);
    return false;
  }
}

// Define os add-ons (clubes/categorias extras) da assinatura ATIVA e ajusta o
// valor recorrente no MP. Só funciona em assinatura paga (status='active').
// Fase 1: planos MENSAIS. Anual (cobrança proporcional imediata) fica pra Fase 2.
async function setAddons(userId, workspaceId, { extraClubs, extraCategories }) {
  const selectSql = (whereCol) => `
    SELECT s.*, p.interval, p.price_cents AS plan_price, p.features
      FROM subscriptions s JOIN plans p ON p.id = s.plan_id
     WHERE s.${whereCol} = $1 AND s.status = 'active' AND s.plan_id <> 'lifetime'
     ORDER BY s.created_at DESC LIMIT 1`;
  let sub = null;
  if (workspaceId) sub = (await query(selectSql('workspace_id'), [workspaceId])).rows[0] || null;
  if (!sub) sub = (await query(selectSql('user_id'), [userId])).rows[0] || null;
  if (!sub) {
    const err = new Error('Você precisa de uma assinatura ativa para adicionar clubes ou categorias.');
    err.statusCode = 402; throw err;
  }

  const features = sub.features || {};
  if (sub.plan_id === 'free') {
    const err = new Error('Add-ons estão disponíveis nos planos Pro e Clube.');
    err.statusCode = 402; throw err;
  }
  const isClube = features.multi_user === true;

  let ec = Math.max(0, Math.min(ADDON_MAX.extra_club, Math.round(Number(extraClubs) || 0)));
  let ecat = Math.max(0, Math.min(ADDON_MAX.extra_category, Math.round(Number(extraCategories) || 0)));

  // Categoria extra só no Clube (no Pro, pra ter categorias, sobe pro Clube).
  if (ecat > 0 && !isClube) {
    const err = new Error('Categorias extras estão disponíveis no plano Clube. Faça upgrade primeiro.');
    err.statusCode = 402; throw err;
  }

  // Fase 1: add-ons no plano ANUAL ainda não (precisa da cobrança proporcional).
  const currentEc = sub.extra_club_slots || 0;
  const currentEcat = sub.extra_category_slots || 0;
  if (sub.interval === 'yearly' && (ec > currentEc || ecat > currentEcat)) {
    const err = new Error('Add-ons no plano anual chegam em breve. Por enquanto, disponíveis no plano mensal.');
    err.statusCode = 501; throw err;
  }

  // Não deixa reduzir abaixo do que já está EM USO (senão cobraria menos do que usa).
  const wsId = sub.workspace_id;
  if (wsId) {
    const clubsUsed = (await query('SELECT COUNT(*)::int n FROM clubs WHERE workspace_id = $1', [wsId])).rows[0].n;
    const planClubs = features.max_clubs === -1 ? Infinity : (features.max_clubs || 1);
    if (Number.isFinite(planClubs)) ec = Math.max(ec, Math.max(0, clubsUsed - planClubs));

    const catUsed = (await query(
      `SELECT COALESCE(MAX(c),0)::int AS maxc FROM (
         SELECT COUNT(*)::int c FROM categories WHERE workspace_id = $1 GROUP BY club_id
       ) t`, [wsId])).rows[0].maxc;
    const planCats = features.max_categories || 1;
    ecat = Math.max(ecat, Math.max(0, catUsed - planCats));
  }

  const amountCents = computeRecurringAmountCents(
    { price_cents: sub.plan_price, interval: sub.interval }, ec, ecat
  );
  // Atualiza o plano E o preapproval (robustez — a assinatura é linkada ao plano).
  const planUpdated = await updatePlanAmount(sub.mp_preapproval_plan_id, amountCents);
  const paUpdated = await updatePreapprovalAmount(sub.mp_preapproval_id, amountCents);
  const mpUpdated = planUpdated || paUpdated;

  await query(
    `UPDATE subscriptions SET extra_club_slots = $2, extra_category_slots = $3, updated_at = NOW() WHERE id = $1`,
    [sub.id, ec, ecat]
  );
  await logBillingEvent({
    subscriptionId: sub.id, userId, type: 'subscription.addons_updated',
    mpResourceId: sub.mp_preapproval_id, status: sub.status,
    raw: { extra_clubs: ec, extra_categories: ecat, amount_cents: amountCents, interval: sub.interval, mp_updated: mpUpdated },
  });

  return {
    extra_clubs: ec, extra_categories: ecat,
    amount_cents: amountCents, interval: sub.interval, mp_updated: mpUpdated,
    effective: sub.interval === 'yearly' ? 'next_renewal' : 'next_cycle',
  };
}

// -----------------------------------------------------------------------------
// Plano Free permanente + "assinatura efetiva"
//
// Ninguém fica mais trancado pra fora: se a assinatura/trial caducou (ou nunca
// existiu), o acesso cai no plano FREE (features limitadas — sem quadro tático,
// sem exportações, 30 atletas). Exigência da Apple (3.1.3(f)): o app precisa
// ser utilizável sem pagar e sem chamada pra compra dentro dele.
// -----------------------------------------------------------------------------
const FREE_PLAN_ID = 'free';

// Uma sub "usável" é a que ainda dá direito às features do SEU plano.
function isSubscriptionUsable(sub) {
  if (!sub) return false;
  if (sub.is_admin || sub.plan_id === 'admin' || sub.plan_id === 'lifetime') return true;
  const now = Date.now();
  if (sub.status === 'trialing') {
    return !sub.trial_ends_at || new Date(sub.trial_ends_at).getTime() >= now;
  }
  if (sub.status === 'active') {
    return !sub.current_period_end || new Date(sub.current_period_end).getTime() >= now;
  }
  return isSubscriptionActive(sub);
}

// Sub efetiva da dupla (user, workspace): a real se usável; senão um objeto
// Free sintético, carregando em `lapsed` a sub que caducou (pra UI explicar).
async function getEffectiveSubscription({ userId, workspaceId = null }) {
  let sub = null;
  if (workspaceId) sub = await getSubscriptionForWorkspace(workspaceId);
  if (!sub) sub = await getActiveSubscription(userId);
  if (sub && isSubscriptionUsable(sub)) {
    sub.is_free = sub.plan_id === FREE_PLAN_ID;
    return sub;
  }
  const free = await getPlan(FREE_PLAN_ID);
  return {
    plan_id: FREE_PLAN_ID,
    plan_name: free?.name || 'Free',
    status: 'active',
    price_cents: 0,
    interval: 'monthly',
    features: free?.features || { max_clubs: 1, max_categories: 1, max_athletes: 30 },
    is_free: true,
    is_fallback: true,
    user_id: userId,
    workspace_id: workspaceId || null,
    lapsed: sub ? {
      plan_id: sub.plan_id,
      plan_name: sub.plan_name,
      status: sub.status,
      trial_ends_at: sub.trial_ends_at,
      current_period_end: sub.current_period_end,
      cancel_at_period_end: sub.cancel_at_period_end,
    } : null,
  };
}

// Assinatura inicial no cadastro (email/Google/Apple):
//   admin → nada; lista lifetime → vitalícia; SIGNUP_TRIAL_DAYS>0 → trial do
//   Pro; padrão → Free permanente.
async function createInitialSubscription({ userId, workspaceId, email, role }) {
  if (role === 'admin') return { kind: 'admin', trialDays: 0 };
  if (isLifetime?.(email)) {
    await query(
      `INSERT INTO subscriptions (user_id, workspace_id, plan_id, status, current_period_start, current_period_end)
       VALUES ($1, $2, 'lifetime', 'active', now(), now() + interval '100 years')`,
      [userId, workspaceId]
    );
    return { kind: 'lifetime', trialDays: 0 };
  }
  const trialDays = Math.max(0, parseInt(process.env.SIGNUP_TRIAL_DAYS || '0', 10) || 0);
  if (trialDays > 0) {
    const trialEnd = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);
    await query(
      `INSERT INTO subscriptions (user_id, workspace_id, plan_id, status, trial_ends_at, current_period_start, current_period_end)
       VALUES ($1, $2, 'pro', 'trialing', $3, now(), $3)`,
      [userId, workspaceId, trialEnd]
    );
    return { kind: 'trial', trialDays };
  }
  await query(
    `INSERT INTO subscriptions (user_id, workspace_id, plan_id, status, current_period_start)
     VALUES ($1, $2, $3, 'active', now())`,
    [userId, workspaceId, FREE_PLAN_ID]
  );
  return { kind: 'free', trialDays: 0 };
}

module.exports = {
  FREE_PLAN_ID,
  isSubscriptionUsable,
  getEffectiveSubscription,
  createInitialSubscription,
  isEnabled,
  getPlan,
  getActiveSubscription,
  getSubscriptionForWorkspace,
  startTrial,
  createCheckout,
  setAddons,
  ADDON_PRICES,
  handleWebhook,
  cancelSubscription,
  migrateToCanceled,
  isSubscriptionActive,
  // Exportado pra rota do webhook consultar status/valor real do pagamento no MP.
  fetchPayment,
  mapMpStatus,
  logBillingEvent,
  // Exportado pro cron de reconciliação (reconcilePendingSubscriptions).
  syncSubscriptionFromPreapproval,
  // Exportado pra tests/scripts admin — não usar em rotas de user comum.
  _hardCancelActiveSubsForUser,
};
