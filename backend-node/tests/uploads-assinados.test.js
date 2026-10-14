// Testes dos links assinados de uploads sensíveis.
// Uso: node --test tests/uploads-assinados.test.js  (sem banco; usa diretório temporário)
process.env.JWT_SECRET = process.env.JWT_SECRET || 'teste-'.padEnd(40, 'x');
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const request = require('supertest');
const su = require('../src/utils/signedUpload');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tp-uploads-'));
for (const sub of ['athlete-photos', 'session-files', 'club-logos', 'profile-photos']) {
  fs.mkdirSync(path.join(dir, sub));
  fs.writeFileSync(path.join(dir, sub, 'a.jpg'), 'img');
}

function app() {
  const a = express();
  a.use(su.signJsonResponses);
  a.use('/uploads', su.uploadsGate);
  a.use('/uploads', express.static(dir, {
    setHeaders: (res, filePath) => {
      const rel = '/uploads/' + path.relative(dir, filePath).split(path.sep).join('/');
      if (su.isSensitive(rel)) res.setHeader('Cache-Control', 'private, max-age=3600');
    },
  }));
  a.get('/api/atleta', (req, res) => res.json({
    id: 1, photo_url: '/uploads/athlete-photos/a.jpg',
    lineup: [{ athlete: { photo_url: '/uploads/athlete-photos/a.jpg' } }],
    files: [{ url: '/uploads/session-files/a.jpg', file_path: '/uploads/session-files/a.jpg' }],
    logo_path: '/uploads/club-logos/a.jpg', externo: 'https://x.com/uploads/athlete-photos/a.jpg',
  }));
  return a;
}

test('assina paths sensíveis em qualquer profundidade do JSON e deixa os públicos', async () => {
  const r = await request(app()).get('/api/atleta');
  assert.match(r.body.photo_url, /^\/uploads\/athlete-photos\/a\.jpg\?t=\d+\.[\w-]{32}$/);
  assert.match(r.body.lineup[0].athlete.photo_url, /\?t=/);
  assert.match(r.body.files[0].url, /^\/uploads\/session-files\/a\.jpg\?t=/);
  assert.strictEqual(r.body.logo_path, '/uploads/club-logos/a.jpg');
  assert.strictEqual(r.body.externo, 'https://x.com/uploads/athlete-photos/a.jpg');
});

test('URL é estável dentro da hora e vale entre 6h e 7h', () => {
  const t0 = Date.UTC(2026, 9, 14, 12, 0, 5);
  const a = su.signUpload('/uploads/athlete-photos/a.jpg', t0);
  const b = su.signUpload('/uploads/athlete-photos/a.jpg', t0 + 30 * 60 * 1000);
  assert.strictEqual(a, b);
  const exp = Number(a.split('?t=')[1].split('.')[0]);
  const dur = exp - t0 / 1000;
  assert.ok(dur >= 6 * 3600 && dur <= 7 * 3600, `duração ${dur}`);
});

test('modo enforce: com assinatura 200, sem ou adulterada 403, expirada 403', async () => {
  process.env.UPLOADS_ASSINATURA = 'enforce';
  const a = app();
  const assinado = su.signUpload('/uploads/athlete-photos/a.jpg');
  let r = await request(a).get(assinado);
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.headers['cache-control'], 'private, max-age=3600');
  r = await request(a).get('/uploads/athlete-photos/a.jpg');
  assert.strictEqual(r.status, 403);
  r = await request(a).get(assinado.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A')));
  assert.strictEqual(r.status, 403);
  // assinatura de um arquivo não abre outro
  const outro = su.signUpload('/uploads/session-files/a.jpg').split('?')[1];
  r = await request(a).get('/uploads/athlete-photos/a.jpg?' + outro);
  assert.strictEqual(r.status, 403);
  const velho = Date.now() - 8 * 3600 * 1000;
  r = await request(a).get(su.signUpload('/uploads/athlete-photos/a.jpg', velho));
  assert.strictEqual(r.status, 403);
});

test('públicos (escudo, foto de perfil) continuam abertos no enforce', async () => {
  process.env.UPLOADS_ASSINATURA = 'enforce';
  const a = app();
  assert.strictEqual((await request(a).get('/uploads/club-logos/a.jpg')).status, 200);
  assert.strictEqual((await request(a).get('/uploads/profile-photos/a.jpg')).status, 200);
});

test('path traversal é barrado', async () => {
  process.env.UPLOADS_ASSINATURA = 'enforce';
  const r = await request(app()).get('/uploads/club-logos/..%2fathlete-photos/a.jpg');
  assert.strictEqual(r.status, 400);
});

test('modo log (padrão): link antigo sem assinatura continua funcionando', async () => {
  delete process.env.UPLOADS_ASSINATURA;
  const r = await request(app()).get('/uploads/athlete-photos/a.jpg');
  assert.strictEqual(r.status, 200);
});

test('stripUploadSig limpa a assinatura antes de gravar', () => {
  assert.strictEqual(su.stripUploadSig('/uploads/athlete-photos/a.jpg?t=1.abc'), '/uploads/athlete-photos/a.jpg');
  assert.strictEqual(su.stripUploadSig('/uploads/athlete-photos/a.jpg'), '/uploads/athlete-photos/a.jpg');
  assert.strictEqual(su.stripUploadSig('https://x.com/a.jpg?x=1'), 'https://x.com/a.jpg?x=1');
  assert.strictEqual(su.stripUploadSig(null), null);
});
