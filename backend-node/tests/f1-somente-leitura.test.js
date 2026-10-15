// F1: modo SÓ LEITURA imposto no servidor (middleware requireActiveSubscription).
// Uso: node --test tests/f1-somente-leitura.test.js  (banco simulado, sem Postgres)
const test = require('node:test');
const assert = require('node:assert');
const fake = require('./helpers/fakeDb');
fake.instalar();

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../src/config/auth');
const requireActiveSubscription = require('../src/middleware/requireActiveSubscription');

const DONO = '00000000-0000-4000-8000-000000000001';
const MEMBRO = '00000000-0000-4000-8000-000000000002';
const WS = 'aaaaaaaa-0000-4000-8000-000000000001';
const dia = 24 * 60 * 60 * 1000;

const app = express();
app.use(requireActiveSubscription);
app.all('*', (req, res) => res.json({ passou: true }));

const token = (id) => 'Bearer ' + jwt.sign({ id }, jwtSecret);

function cenario({ email = 'tecnico@exemplo.com', role = 'coach', cortesia = false, subs = [] } = {}) {
  const c = fake.reset();
  c.users[DONO] = { email, role, cortesia_permanente: cortesia, cortesia_motivo: cortesia ? 'teste' : null };
  c.users[MEMBRO] = { email: 'auxiliar@exemplo.com', role: 'coach', cortesia_permanente: false };
  c.workspaces[WS] = { owner_id: DONO, name: 'Sub-15 Exemplo' };
  c.members.push({ workspace_id: WS, user_id: MEMBRO, accepted: true });
  subs.forEach((s, i) => c.subs.push({ user_id: DONO, workspace_id: WS, created_at: i + 1, ...s }));
  return c;
}

const escrever = (id = DONO, metodo = 'post', rota = '/api/athletes') =>
  request(app)[metodo](rota).set('Authorization', token(id)).set('X-Workspace-Id', WS).send({});

test('conta sem assinatura: lê (200) mas não escreve (402 READ_ONLY)', async () => {
  cenario();
  const get = await request(app).get('/api/athletes').set('Authorization', token(DONO)).set('X-Workspace-Id', WS);
  assert.strictEqual(get.status, 200);
  for (const [m, r] of [['post', '/api/athletes'], ['put', '/api/athletes/1'], ['patch', '/api/contents/1/active'], ['delete', '/api/athletes/1'], ['post', '/api/files/upload']]) {
    const res = await escrever(DONO, m, r);
    assert.strictEqual(res.status, 402, `${m} ${r}`);
    assert.strictEqual(res.body.code, 'READ_ONLY');
    assert.strictEqual(res.body.read_only, true);
  }
});

test('Free antigo ativo não dá mais escrita', async () => {
  cenario({ subs: [{ plan_id: 'free', status: 'active' }] });
  const res = await escrever();
  assert.strictEqual(res.status, 402);
  assert.strictEqual(res.body.code, 'READ_ONLY');
});

test('assinatura paga ativa (Essencial = id pro) escreve normalmente', async () => {
  cenario({ subs: [{ plan_id: 'free', status: 'active' }, { plan_id: 'pro', status: 'active', current_period_end: new Date(Date.now() + 30 * dia).toISOString() }] });
  assert.strictEqual((await escrever()).status, 200);
});

test('trial vencido e assinatura expirada caem em só leitura', async () => {
  cenario({ subs: [{ plan_id: 'pro', status: 'trialing', trial_ends_at: new Date(Date.now() - dia).toISOString() }] });
  assert.strictEqual((await escrever()).body.code, 'READ_ONLY');
  cenario({ subs: [{ plan_id: 'clube', status: 'expired' }] });
  assert.strictEqual((await escrever()).body.code, 'READ_ONLY');
});

test('cancelada mas dentro do período pago continua escrevendo', async () => {
  cenario({ subs: [{ plan_id: 'clube', status: 'canceled', cancel_at_period_end: true, current_period_end: new Date(Date.now() + 5 * dia).toISOString() }] });
  assert.strictEqual((await escrever()).status, 200);
});

test('membro convidado herda o acesso do DONO da workspace', async () => {
  cenario({ subs: [{ plan_id: 'pro', status: 'active' }] });
  assert.strictEqual((await escrever(MEMBRO)).status, 200);
  cenario();
  assert.strictEqual((await escrever(MEMBRO)).body.code, 'READ_ONLY');
});

test('admin e cortesia permanente escrevem sem assinatura', async () => {
  cenario({ role: 'admin', email: 'arthurfaggin@gmail.com' });
  assert.strictEqual((await escrever()).status, 200);
  cenario({ cortesia: true });
  assert.strictEqual((await escrever()).status, 200);
  cenario({ email: 'prof.lauromartins@gmail.com' }); // LIFETIME_EMAILS, mesmo sem a flag
  assert.strictEqual((await escrever()).status, 200);
  assert.strictEqual((await escrever(MEMBRO)).status, 200, 'convidado do Lauro também escreve');
});

test('só leitura ainda pode assinar, mexer no perfil, aceitar convite e abrir a semana', async () => {
  cenario();
  for (const r of ['/api/billing/checkout', '/api/auth/profile', '/api/invites/tok/accept', '/api/microcycles/ensure', '/api/announcements/x/dismiss', '/api/conta/trocar', '/api/workspaces']) {
    const res = await escrever(DONO, 'post', r);
    assert.strictEqual(res.status, 200, r);
  }
});

test('só leitura vê o quadro tático salvo, mas não salva jogada', async () => {
  cenario();
  const get = await request(app).get('/api/plays').set('Authorization', token(DONO)).set('X-Workspace-Id', WS);
  assert.strictEqual(get.status, 200);
  const post = await escrever(DONO, 'post', '/api/plays');
  assert.strictEqual(post.body.code, 'READ_ONLY');
});

test('sem X-Workspace-Id usa a workspace própria do usuário', async () => {
  cenario({ subs: [{ plan_id: 'clube', status: 'active' }] });
  const res = await request(app).post('/api/athletes').set('Authorization', token(DONO)).send({});
  assert.strictEqual(res.status, 200);
  cenario();
  const res2 = await request(app).post('/api/athletes').set('Authorization', token(DONO)).send({});
  assert.strictEqual(res2.body.code, 'READ_ONLY');
});

test('workspace de outra pessoa: 403', async () => {
  const c = cenario();
  c.members.length = 0;
  const res = await escrever(MEMBRO);
  assert.strictEqual(res.status, 403);
});
