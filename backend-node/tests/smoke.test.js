/**
 * Smoke tests — verificações mínimas para detectar quebra grave.
 * Roda contra a API em produção (https://app.tactiplan.faggin.com.br).
 *
 * Uso: node tests/smoke.test.js
 * Exit 0 = todos OK. Exit 1 = falhou.
 */

const https = require('https');

const BASE_URL = process.env.SMOKE_BASE_URL || 'https://app.tactiplan.faggin.com.br';

function request(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...headers,
      },
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        let parsed = null;
        try { parsed = JSON.parse(raw); } catch (_) {}
        resolve({ status: res.statusCode, body: parsed, raw });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const results = [];
async function test(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  ✓ ${name}`);
  } catch (err) {
    results.push({ name, ok: false, error: err.message });
    console.error(`  ✗ ${name}: ${err.message}`);
  }
}

function expect(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

(async () => {
  console.log(`\n=== Smoke tests: ${BASE_URL} ===\n`);

  await test('health endpoint returns 200', async () => {
    const r = await request('GET', '/api/health');
    expect(r.status, 200, 'status');
    if (r.body?.status !== 'ok') throw new Error(`unexpected body: ${JSON.stringify(r.body)}`);
  });

  await test('plans endpoint lists at least 3 plans', async () => {
    const r = await request('GET', '/api/billing/plans');
    expect(r.status, 200, 'status');
    if (!Array.isArray(r.body)) throw new Error('body is not array');
    if (r.body.length < 3) throw new Error(`expected >= 3 plans, got ${r.body.length}`);
  });

  await test('login rejects empty payload (400)', async () => {
    const r = await request('POST', '/api/auth/login', {});
    expect(r.status, 400, 'status');
  });

  await test('login rejects bad credentials (401)', async () => {
    const r = await request('POST', '/api/auth/login', { email: 'noexist@test.com', password: 'wrongpass' });
    expect(r.status, 401, 'status');
  });

  await test('register rejects without terms (400)', async () => {
    const email = `smoketest+${Date.now()}@test.local`;
    const r = await request('POST', '/api/auth/register', { email, password: 'test123', name: 'Smoke' });
    expect(r.status, 400, 'status');
  });

  await test('protected route without auth returns 401', async () => {
    const r = await request('GET', '/api/clubs');
    expect(r.status, 401, 'status');
  });

  await test('forgot password sempre retorna 200', async () => {
    const r = await request('POST', '/api/auth/forgot', { email: 'nonexistent@test.com' });
    expect(r.status, 200, 'status');
  });

  await test('webhook MP sem assinatura aceita (200) mas não processa', async () => {
    const r = await request('POST', '/api/billing/webhook', { type: 'test', data: { id: '0' } });
    expect(r.status, 200, 'status');
  });

  await test('frontend HTML serves', async () => {
    const r = await request('GET', '/');
    expect(r.status, 200, 'status');
    if (!r.raw.includes('<html')) throw new Error('not HTML');
  });

  // ===== Resumo =====
  const passed = results.filter(r => r.ok).length;
  const failed = results.length - passed;
  console.log(`\n${passed}/${results.length} passed${failed ? ` (${failed} FAILED)` : ''}\n`);
  process.exit(failed ? 1 : 0);
})();
