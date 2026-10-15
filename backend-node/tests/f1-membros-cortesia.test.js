// F1: limite de membros no servidor + cortesia permanente + cadastro sem Free.
// Uso: node --test tests/f1-membros-cortesia.test.js  (banco simulado, sem Postgres)
const test = require('node:test');
const assert = require('node:assert');
const fake = require('./helpers/fakeDb');
fake.instalar();

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../src/config/auth');
const billing = require('../src/services/billing');
const clubMembersRoutes = require('../src/routes/clubMembers');
const { NOME_ENTRADA } = require('../src/config/planos');

const DONO = '00000000-0000-4000-8000-0000000000a1';
const OUTRO = '00000000-0000-4000-8000-0000000000a2';
const WS = 'bbbbbbbb-0000-4000-8000-000000000001';
const CLUBE = 'cccccccc-0000-4000-8000-000000000001';
const token = (id) => 'Bearer ' + jwt.sign({ id }, jwtSecret);

const app = express();
app.use(express.json());
app.use('/api', clubMembersRoutes);

function cenario({ plan = null, email = 'dono@exemplo.com', cortesia = false, aceitos = 0, pendentes = 0 } = {}) {
  const c = fake.reset();
  c.users[DONO] = { email, role: 'coach', cortesia_permanente: cortesia, cortesia_motivo: null };
  c.users[OUTRO] = { email: 'convidado@exemplo.com', role: 'coach', cortesia_permanente: false };
  c.workspaces[WS] = { owner_id: DONO, name: 'Escolinha Exemplo' };
  c.clubs[CLUBE] = WS;
  if (plan) c.subs.push({ user_id: DONO, workspace_id: WS, plan_id: plan, status: 'active', created_at: 1 });
  for (let i = 0; i < aceitos; i++) c.members.push({ workspace_id: WS, user_id: `aceito-${i}`, accepted: true });
  for (let i = 0; i < pendentes; i++) c.members.push({ workspace_id: WS, user_id: null, accepted: false });
  return c;
}

const convidar = (email = 'novo@exemplo.com') =>
  request(app).post(`/api/clubs/${CLUBE}/invite`).set('Authorization', token(DONO)).set('X-Workspace-Id', WS)
    .send({ email, role: 'assistant_coach' });

// ---------- limite de membros ----------

test(`${NOME_ENTRADA} (id pro): dono + 1 convidado`, async () => {
  cenario({ plan: 'pro' });
  assert.strictEqual((await convidar()).status, 201, '1º convite passa');
  const res = await convidar('segundo@exemplo.com');
  assert.strictEqual(res.status, 402, '2º convite é recusado');
  assert.strictEqual(res.body.code, 'MEMBER_LIMIT');
  assert.strictEqual(res.body.limit, 1);
  assert.match(res.body.error, new RegExp(`plano ${NOME_ENTRADA} inclui o responsável \\+ 1 convidado`));
});

test('convite pendente conta no limite do plano de entrada', async () => {
  cenario({ plan: 'pro_annual', pendentes: 1 });
  const res = await convidar();
  assert.strictEqual(res.body.code, 'MEMBER_LIMIT');
});

test('plano de entrada sem a migration 048 (features antigas) também limita a 1', async () => {
  const c = cenario({ plan: 'pro', aceitos: 1 });
  // simula o plano pro antigo, sem equipe/max_convidados
  const original = billing.limiteConvidados({ plan_id: 'pro', features: { max_clubs: 1 } });
  assert.strictEqual(original, 1);
  assert.ok(c);
  assert.strictEqual((await convidar()).body.code, 'MEMBER_LIMIT');
});

test('Clube: até 5 convidados (como hoje)', async () => {
  cenario({ plan: 'clube', aceitos: 3, pendentes: 1 });
  assert.strictEqual((await convidar()).status, 201, '5º convidado passa');
  const res = await convidar('sexto@exemplo.com');
  assert.strictEqual(res.body.code, 'MEMBER_LIMIT');
  assert.strictEqual(res.body.limit, 5);
});

test('conta só leitura não convida', async () => {
  cenario();
  const res = await convidar();
  assert.strictEqual(res.status, 402);
  assert.strictEqual(res.body.code, 'READ_ONLY');
});

test('cortesia permanente convida sem limite', async () => {
  cenario({ cortesia: true, aceitos: 10 });
  assert.strictEqual((await convidar()).status, 201);
});

test('aceite também respeita o limite (plano mudou depois do convite)', async () => {
  const c = cenario({ plan: 'pro', aceitos: 1 });
  c.invites.tok = { workspace_id: WS, invited_email: 'convidado@exemplo.com' };
  const res = await request(app).post('/api/invites/tok/accept').set('Authorization', token(OUTRO)).send({});
  assert.strictEqual(res.status, 402);
  assert.strictEqual(res.body.code, 'MEMBER_LIMIT');

  const c2 = cenario({ plan: 'pro' });
  c2.invites.tok = { workspace_id: WS, invited_email: 'convidado@exemplo.com' };
  const ok = await request(app).post('/api/invites/tok/accept').set('Authorization', token(OUTRO)).send({});
  assert.strictEqual(ok.status, 200);
});

// ---------- cortesia permanente ----------

test('cortesia (flag) = tudo liberado, sem data de fim', async () => {
  cenario({ cortesia: true });
  const sub = await billing.getEffectiveSubscription({ userId: DONO, workspaceId: WS });
  assert.strictEqual(sub.plan_id, 'lifetime');
  assert.strictEqual(sub.is_cortesia, true);
  assert.strictEqual(sub.read_only, false);
  assert.strictEqual(sub.current_period_end, undefined, 'não expira');
  assert.strictEqual(sub.features.quadro_tatico, true);
  assert.strictEqual(billing.limiteConvidados(sub), -1);
});

test('Lauro (LIFETIME_EMAILS) tem cortesia mesmo sem flag e sem assinatura', async () => {
  cenario({ email: 'prof.lauromartins@gmail.com' });
  const sub = await billing.getEffectiveSubscription({ userId: DONO, workspaceId: WS });
  assert.strictEqual(sub.is_cortesia, true);
  assert.strictEqual(sub.read_only, false);
});

test('cortesia vence uma assinatura vencida (nunca cai em só leitura)', async () => {
  const c = cenario({ email: 'prof.lauromartins@gmail.com' });
  c.subs.push({ user_id: DONO, workspace_id: WS, plan_id: 'pro', status: 'expired', created_at: 5 });
  const sub = await billing.getEffectiveSubscription({ userId: DONO, workspaceId: WS });
  assert.strictEqual(sub.read_only, false);
});

test('sem cortesia nem assinatura: só leitura, com nome de exibição na assinatura que venceu', async () => {
  const c = cenario();
  c.subs.push({ user_id: DONO, workspace_id: WS, plan_id: 'pro', status: 'trialing', trial_ends_at: new Date(Date.now() - 1000).toISOString(), created_at: 1 });
  const sub = await billing.getEffectiveSubscription({ userId: DONO, workspaceId: WS });
  assert.strictEqual(sub.plan_id, 'inactive');
  assert.strictEqual(sub.read_only, true);
  assert.strictEqual(sub.lapsed.plan_name, `${NOME_ENTRADA} Mensal`);
});

test('assinatura paga expõe o nome de exibição (Comissão Mensal/Anual)', async () => {
  cenario({ plan: 'pro_annual' });
  const sub = await billing.getEffectiveSubscription({ userId: DONO, workspaceId: WS });
  assert.strictEqual(sub.plan_name, `${NOME_ENTRADA} Anual`);
  assert.strictEqual(sub.plan_id, 'pro_annual', 'id interno não muda');
});

// ---------- cadastro sem Free ----------

test('cadastro comum não cria assinatura (nada de Free)', async () => {
  const c = cenario();
  delete process.env.SIGNUP_TRIAL_DAYS;
  const r = await billing.createInitialSubscription({ userId: DONO, workspaceId: WS, email: 'novo@exemplo.com', role: 'coach' });
  assert.strictEqual(r.kind, 'none');
  assert.ok(!c.log.some((q) => /INSERT INTO subscriptions/.test(q.sql)));
});

test('cadastro do Lauro cria vitalícia', async () => {
  const c = cenario();
  const r = await billing.createInitialSubscription({ userId: DONO, workspaceId: WS, email: 'prof.lauromartins@gmail.com', role: 'coach' });
  assert.strictEqual(r.kind, 'lifetime');
  assert.ok(c.log.some((q) => /INSERT INTO subscriptions/.test(q.sql) && /'lifetime'/.test(q.sql)));
});
