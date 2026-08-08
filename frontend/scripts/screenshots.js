// Gera screenshots do TactiPlan pra Google Play + App Store.
// Usa a versão em produção (https://app.tactiplan.faggin.com.br) e loga com
// credenciais de teste.
//
// Uso:
//   TP_TEST_EMAIL=xxx TP_TEST_PASS=xxx node scripts/screenshots.js

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const APP_URL = process.env.APP_URL || 'https://app.tactiplan.faggin.com.br';
const EMAIL   = process.env.TP_TEST_EMAIL || 'arthurfaggin@gmail.com';
const PASS    = process.env.TP_TEST_PASS;

if (!PASS) {
  console.error('ERRO: defina TP_TEST_PASS=... antes de rodar.');
  console.error('Uso: TP_TEST_EMAIL=... TP_TEST_PASS=... node scripts/screenshots.js');
  process.exit(1);
}

// Google Play requer 16:9 ou 9:16. Sugestão comum: 9:16 pra celular
// (1080x1920 tira em portrait, 1920x1080 em landscape). App Store 6.7":
// 1290x2796. Ambos aceitos.
const VIEWPORTS = [
  { name: 'android-1080x1920',  width: 1080, height: 1920, deviceScaleFactor: 1, isMobile: true }, // Google Play
  { name: 'android-1440x2560',  width: 1440, height: 2560, deviceScaleFactor: 1, isMobile: true }, // Google Play (extra)
  { name: 'ios-6.7-1290x2796',  width: 1290, height: 2796, deviceScaleFactor: 3, isMobile: true }, // App Store iPhone 6.7"
  { name: 'ios-6.5-1284x2778',  width: 1284, height: 2778, deviceScaleFactor: 3, isMobile: true }, // App Store iPhone 6.5"
  { name: 'ipad-13-2064x2752',  width: 2064, height: 2752, deviceScaleFactor: 2, isMobile: false }, // App Store iPad 13"
  { name: 'desktop-1920x1080',  width: 1920, height: 1080, deviceScaleFactor: 1, isMobile: false }, // Extra bônus
];

// Rotas a capturar (relativas ao # do HashRouter). Cada uma dá um screenshot
// por viewport. Ordem = ordem nas lojas.
const ROUTES = [
  { path: '/#/home',                    name: '1-home',        wait: 2500 },
  { path: '/#/training',                name: '2-programacao', wait: 3000 },
  { path: '/#/training-stats',          name: '3-stats',       wait: 3500 },
  { path: '/#/plantel',                 name: '4-plantel',     wait: 2500 },
  { path: '/#/tactical-board',          name: '5-tactical',    wait: 3000 },
  { path: '/#/settings/competitions',   name: '6-campeonatos', wait: 2000 },
];

const OUT_DIR = path.join(__dirname, '..', 'mobile-artifacts', 'screenshots');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function login(page) {
  await page.goto(APP_URL + '/#/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  // Espera navegação pra home
  await page.waitForURL(/#\/home/i, { timeout: 20000 });
  await page.waitForTimeout(2000);
}

async function captureViewport(browser, vp) {
  console.log('\n== ' + vp.name + ' ==');
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.deviceScaleFactor,
    isMobile: vp.isMobile,
    hasTouch: vp.isMobile,
    userAgent: vp.isMobile
      ? 'Mozilla/5.0 (Linux; Android 13; TactiPlan) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36'
      : undefined,
  });
  const page = await context.newPage();

  try {
    await login(page);
    for (const r of ROUTES) {
      const url = APP_URL + r.path;
      console.log('  → ' + r.name);
      await page.goto(url, { waitUntil: 'networkidle' }).catch(() => {});
      await page.waitForTimeout(r.wait);
      const file = path.join(OUT_DIR, vp.name + '_' + r.name + '.png');
      await page.screenshot({ path: file, fullPage: false });
      console.log('     ' + file);
    }
  } finally {
    await context.close();
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    for (const vp of VIEWPORTS) {
      await captureViewport(browser, vp);
    }
  } finally {
    await browser.close();
  }
  console.log('\nDone. Screenshots em: ' + OUT_DIR);
})();
