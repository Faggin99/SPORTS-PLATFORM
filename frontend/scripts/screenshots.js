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
const TOKEN   = process.env.TP_TOKEN || null;   // JWT injetado no localStorage → pula o login (e o rate-limit)
const WORKSPACE = process.env.TP_WS || null;    // workspace ativa (opcional)
const USER    = process.env.TP_USER || null;    // JSON do user (o AuthContext exige 'user' + 'auth_token')

if (!PASS && !TOKEN) {
  console.error('ERRO: defina TP_TEST_PASS=... (ou TP_TOKEN=<jwt> pra pular o login) antes de rodar.');
  process.exit(1);
}

// Google Play requer 16:9 ou 9:16. Sugestão comum: 9:16 pra celular
// (1080x1920 tira em portrait, 1920x1080 em landscape). App Store 6.7":
// 1290x2796. Ambos aceitos.
// IMPORTANTE: width/height são em CSS px; deviceScaleFactor multiplica pra
// resolução final da imagem. Pra sair o LAYOUT MOBILE de verdade, a largura CSS
// precisa ser de celular (< 768px, senão o app cai no layout desktop). Ex:
// 360×640 @3 = imagem 1080×1920.
const VIEWPORTS = [
  { name: 'android-1080x1920',  width: 360,  height: 640,  deviceScaleFactor: 3, isMobile: true },  // Google Play → 1080×1920
  { name: 'android-1440x2560',  width: 360,  height: 640,  deviceScaleFactor: 4, isMobile: true },  // Google Play alta densidade → 1440×2560
  { name: 'ios-6.7-1290x2796',  width: 430,  height: 932,  deviceScaleFactor: 3, isMobile: true },  // App Store iPhone 6.7"
  { name: 'ios-6.5-1284x2778',  width: 428,  height: 926,  deviceScaleFactor: 3, isMobile: true },  // App Store iPhone 6.5"
  { name: 'ipad-13-2064x2752',  width: 1032, height: 1376, deviceScaleFactor: 2, isMobile: false }, // App Store iPad 13" (tablet = layout amplo)
  { name: 'desktop-1920x1080',  width: 1920, height: 1080, deviceScaleFactor: 1, isMobile: false }, // Bônus web
];

// Rotas a capturar (relativas ao # do HashRouter). Cada uma dá um screenshot
// por viewport. Ordem = ordem nas lojas.
const ROUTES = [
  { path: '/#/home',                    name: '1-home',        wait: 2500 },
  { path: '/#/training',                name: '2-programacao', wait: 3000 },
  { path: '/#/training-stats',          name: '3-stats',       wait: 3500 },
  { path: '/#/plantel',                 name: '4-plantel',     wait: 2500 },
  { path: '/#/tactical-board',          name: '5-tactical',    wait: 2800, landscape: true, play: 'tabela e finalização' },
  // { path: '/#/settings/competitions', name: '6-campeonatos', wait: 2000 }, // desativado: a página dá 401 e cai no login no contexto headless
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

const UA_MOBILE = 'Mozilla/5.0 (Linux; Android 13; TactiPlan) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36';

// Cria um contexto na orientação certa (evita setViewportSize, que falha quando
// alguma tela pediu fullscreen) e captura as rotas dadas.
async function shoot(browser, vp, routes, landscape) {
  if (!routes.length) return;
  // Paisagem: troca w/h em qualquer viewport retrato (celular E tablet) — o
  // quadro tático fica melhor deitado; desktop já é paisagem, não troca.
  const swap = landscape && vp.width < vp.height;
  const width  = swap ? vp.height : vp.width;
  const height = swap ? vp.width  : vp.height;
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: vp.deviceScaleFactor,
    isMobile: vp.isMobile,
    hasTouch: vp.isMobile,
    userAgent: vp.isMobile ? UA_MOBILE : undefined,
  });
  // Antes do app carregar: (1) marca tutoriais como vistos (senão o TourGuide
  // aparece por cima); (2) se veio um JWT, injeta no localStorage pra já entrar
  // logado — sem POST de login (evita o rate-limit de auth).
  await context.addInitScript((auth) => {
    try {
      ['plantel', 'stats', 'tactical-board', 'training'].forEach((k) =>
        window.localStorage.setItem('tour_seen_' + k, '1'));
      if (auth && auth.token) {
        window.localStorage.setItem('auth_token', auth.token);
        if (auth.user) window.localStorage.setItem('user', auth.user);
        if (auth.ws) window.localStorage.setItem('active_workspace_id', auth.ws);
      }
    } catch (e) { /* noop */ }
  }, { token: TOKEN, ws: WORKSPACE, user: USER });
  const page = await context.newPage();
  try {
    if (!TOKEN) await login(page);   // com JWT injetado já entramos logados
    for (const r of routes) {
      const url = APP_URL + r.path;
      console.log('  → ' + r.name + (landscape ? ' (paisagem)' : ''));
      // domcontentloaded (não networkidle: Sentry/manifest OTA mantêm rede
      // ativa e o idle nunca dispara, estourando o timeout de navegação).
      await page.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForTimeout(r.wait + 1500);
      // Quadro tático: carrega uma jogada de treino salva (espaço reduzido,
      // tabela e finalização — 2 frames + setas). Mantém o chrome visível
      // (mostra a barra "Frame 1 de 2", que comunica a animação).
      if (r.play) {
        // Flaky em contextos lentos (bundle grande): tenta até 3x, recarregando
        // a página entre tentativas.
        let loaded = false;
        for (let attempt = 1; attempt <= 3 && !loaded; attempt++) {
          try {
            if (attempt > 1) {
              await page.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => {});
              await page.waitForTimeout(3500);
            }
            // O chrome do quadro auto-esconde (pointer-events:none) após ~3.5s;
            // mexer o mouse revela de novo antes de clicar.
            await page.mouse.move(50, 50);
            await page.mouse.move(220, 160);
            await page.waitForSelector('button[title="Abrir jogada"]', { timeout: 15000, state: 'visible' });
            await page.mouse.move(120, 90);
            await page.click('button[title="Abrir jogada"]', { timeout: 8000 });
            await page.waitForSelector(`text=${r.play}`, { timeout: 10000 });
            await page.locator(`text=${r.play}`).first().click({ timeout: 8000 });
            await page.waitForTimeout(1800); // carrega + assenta; chrome ainda visível
            loaded = true;
          } catch (e) { console.log(`    (jogada t${attempt}: ` + String(e.message).split('\n')[0] + ')'); }
        }
      }
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
      console.log('\n== ' + vp.name + ' ==');
      await shoot(browser, vp, ROUTES.filter(r => !r.landscape), false);
      await shoot(browser, vp, ROUTES.filter(r => r.landscape), true);
    }
  } finally {
    await browser.close();
  }
  console.log('\nDone. Screenshots em: ' + OUT_DIR);
})();
