// Testes unitários do filtro de SANDBOX no webhook da RevenueCat.
// Uso: node --test tests/revenuecat-sandbox.test.js  (não toca no banco: query é simulada)
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const calls = [];
const USER = '11111111-2222-4333-8444-555555555555';
let userEmail = 'treinador@exemplo.com';

const dbPath = path.join(__dirname, '../src/config/database.js');
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true,
  exports: {
    query: async (sql, params) => {
      calls.push({ sql, params });
      if (/FROM users WHERE id/.test(sql)) return { rows: [{ id: USER, email: userEmail }] };
      if (/FROM workspaces/.test(sql)) return { rows: [{ id: 'ws-1' }] };
      return { rows: [] };
    },
  },
};

const billing = require('../src/services/billing');

function evento(environment, type = 'INITIAL_PURCHASE') {
  return {
    type, environment, app_user_id: USER, store: 'APP_STORE',
    product_id: 'com.faggin.tactiplan.pro.monthly', original_transaction_id: 'tx-1',
    expiration_at_ms: Date.now() + 86400000,
  };
}
const escreveuAssinatura = () => calls.some((c) => /(INSERT INTO|UPDATE) subscriptions/.test(c.sql));
const registrouEvento = () => calls.find((c) => /INSERT INTO billing_events/.test(c.sql));

function reset(env = {}) {
  calls.length = 0;
  delete process.env.REVENUECAT_ACEITAR_SANDBOX;
  delete process.env.REVENUECAT_SANDBOX_EMAILS;
  Object.assign(process.env, env);
  userEmail = 'treinador@exemplo.com';
}

test('SANDBOX é só registrado, não muda plano (padrão)', async () => {
  reset();
  const r = await billing.applyRevenueCatEvent(evento('SANDBOX'));
  assert.deepStrictEqual(r, { handled: false, reason: 'sandbox_ignored' });
  assert.ok(registrouEvento(), 'deve registrar em billing_events');
  assert.match(registrouEvento().params[2], /"ignored":"sandbox"/);
  assert.strictEqual(escreveuAssinatura(), false);
});

test('SANDBOX também não expira/cancela assinatura real', async () => {
  reset();
  for (const t of ['EXPIRATION', 'CANCELLATION', 'BILLING_ISSUE']) {
    const r = await billing.applyRevenueCatEvent(evento('SANDBOX', t));
    assert.strictEqual(r.reason, 'sandbox_ignored');
  }
  assert.strictEqual(escreveuAssinatura(), false);
});

test('PRODUCTION continua liberando o plano', async () => {
  reset();
  const r = await billing.applyRevenueCatEvent(evento('PRODUCTION'));
  assert.strictEqual(r.handled, true);
  assert.strictEqual(r.plan, 'pro');
  assert.strictEqual(escreveuAssinatura(), true);
});

test('REVENUECAT_ACEITAR_SANDBOX=1 aceita sandbox', async () => {
  reset({ REVENUECAT_ACEITAR_SANDBOX: '1' });
  const r = await billing.applyRevenueCatEvent(evento('SANDBOX'));
  assert.strictEqual(r.handled, true);
  assert.strictEqual(escreveuAssinatura(), true);
});

test('REVENUECAT_SANDBOX_EMAILS aceita só as contas listadas', async () => {
  reset({ REVENUECAT_SANDBOX_EMAILS: 'Review@tactiplan.faggin.com.br, outra@x.com' });
  userEmail = 'review@tactiplan.faggin.com.br';
  let r = await billing.applyRevenueCatEvent(evento('SANDBOX'));
  assert.strictEqual(r.handled, true);

  reset({ REVENUECAT_SANDBOX_EMAILS: 'review@tactiplan.faggin.com.br' });
  r = await billing.applyRevenueCatEvent(evento('SANDBOX'));
  assert.strictEqual(r.reason, 'sandbox_ignored');
  assert.strictEqual(escreveuAssinatura(), false);
});

test('outros valores da env não liberam sandbox', async () => {
  reset({ REVENUECAT_ACEITAR_SANDBOX: 'true' });
  assert.strictEqual(billing._rcSandboxAllowed('x@y.com'), false);
});
