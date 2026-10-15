// F1: script de virada (parte pura: classificação e ações). Não toca no banco.
const test = require('node:test');
const assert = require('node:assert');
const { planejar, argumentos } = require('../scripts/virada-f1');

const dia = 86400000;
const users = [
  { id: 'a', email: 'arthurfaggin@gmail.com', role: 'admin' },
  { id: 'l', email: 'prof.lauromartins@gmail.com', role: 'coach', cortesia_permanente: false },
  { id: 'r', email: 'review@tactiplan.faggin.com.br', role: 'coach' },
  { id: 'p', email: 'pagante@exemplo.com', role: 'coach' },
  { id: 'f', email: 'free@exemplo.com', role: 'coach' },
  { id: 'm', email: 'auxiliar@exemplo.com', role: 'coach' },
  { id: 'x', email: 'apagado@exemplo.com', role: 'coach', deleted_at: '2026-09-01' },
];
const subs = [
  { id: 's1', user_id: 'l', plan_id: 'lifetime', status: 'active' },
  { id: 's2', user_id: 'p', plan_id: 'clube_annual', status: 'active', current_period_end: new Date(Date.now() + 30 * dia).toISOString(), metadata: { demo: true } },
  { id: 's3', user_id: 'f', plan_id: 'free', status: 'active' },
  { id: 's4', user_id: 'r', plan_id: 'free', status: 'active' },
];
const members = [{ user_id: 'm', owner_id: 'p' }];

test('dry-run é o padrão; --apply e --revisao', () => {
  assert.deepStrictEqual(argumentos([]), { apply: false, revisao: ['review@tactiplan.faggin.com.br'] });
  assert.strictEqual(argumentos(['--apply']).apply, true);
  assert.deepStrictEqual(argumentos(['--revisao=']).revisao, []);
  assert.deepStrictEqual(argumentos(['--revisao=A@x.com, b@y']).revisao, ['a@x.com', 'b@y']);
});

test('marca a cortesia do Lauro, a da revisão e encerra os Free', () => {
  const { acoes } = planejar({ users, subs, members, adminEmails: ['arthurfaggin@gmail.com'] });
  const tipos = acoes.map((a) => `${a.tipo}:${a.email || a.sub_id}`);
  assert.ok(tipos.includes('cortesia:prof.lauromartins@gmail.com'));
  assert.ok(!tipos.includes('lifetime:prof.lauromartins@gmail.com'), 'já tem vitalícia');
  assert.ok(tipos.includes('cortesia:review@tactiplan.faggin.com.br'));
  assert.ok(tipos.includes('encerrar_free:s3'));
  assert.ok(tipos.includes('encerrar_free:s4'));
});

test('cria a vitalícia do Lauro se não existir', () => {
  const { acoes } = planejar({ users, subs: subs.filter((s) => s.id !== 's1') });
  assert.ok(acoes.some((a) => a.tipo === 'lifetime' && a.user_id === 'l'));
});

test('classificação: admin, cortesia, paga, só leitura; apagado fica de fora', () => {
  const { contas } = planejar({ users, subs, members, adminEmails: ['arthurfaggin@gmail.com'] });
  const por = Object.fromEntries(contas.map((c) => [c.email, c]));
  assert.strictEqual(por['arthurfaggin@gmail.com'].acesso, 'admin');
  assert.strictEqual(por['prof.lauromartins@gmail.com'].acesso, 'cortesia');
  assert.strictEqual(por['review@tactiplan.faggin.com.br'].acesso, 'cortesia');
  assert.strictEqual(por['pagante@exemplo.com'].acesso, 'paga');
  assert.match(por['pagante@exemplo.com'].especial, /demo/);
  assert.strictEqual(por['free@exemplo.com'].acesso, 'so_leitura');
  assert.strictEqual(por['auxiliar@exemplo.com'].acesso, 'so_leitura');
  assert.strictEqual(por['auxiliar@exemplo.com'].membro_de, 'pagante@exemplo.com', 'mas edita na equipe de quem paga');
  assert.ok(!por['apagado@exemplo.com']);
});

test('sem contas de revisão quando --revisao= vazio', () => {
  const { acoes } = planejar({ users, subs, revisao: [] });
  assert.ok(!acoes.some((a) => a.email === 'review@tactiplan.faggin.com.br'));
});
