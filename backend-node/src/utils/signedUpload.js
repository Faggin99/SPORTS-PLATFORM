// Links assinados de curta duração para os uploads SENSÍVEIS (padrão do Gestsport,
// escola-app/backend/src/utils/signedUpload.js).
//
// Sensíveis: fotos de atletas (muitos são menores) e anexos de treino
// (imagens/vídeos/PDFs com atletas e material interno do clube).
// Públicos: escudos de clube e foto de perfil do treinador (o front monta a URL
// da foto de perfil a partir do nome do arquivo — assinar exige front novo, ver plano F0).
//
// Como funciona:
//   1) toda resposta JSON da API tem os paths "/uploads/<sensível>/..." trocados por
//      "/uploads/<sensível>/...?t=<exp>.<hmac>" (signDeep, em server.js);
//   2) o gate de /uploads confere a assinatura. Modo controlado por UPLOADS_ASSINATURA:
//        off     → não confere nada
//        log     → (padrão) aceita sem assinatura mas registra no log — período de tolerância
//                   para links antigos (app instalado, PDFs, cache)
//        enforce → sem assinatura válida = 403
//   ATENÇÃO: em produção o nginx serve /uploads direto do disco (alias). O gate só vale
//   depois de trocar o location /uploads/ do nginx para proxy_pass no Node.
const crypto = require('crypto');
const { jwtSecret } = require('../config/auth');

const SENSITIVE = /^\/uploads\/(athlete-photos|session-files)\//;

// TTL de 6h, com expiração arredondada para a hora cheia seguinte: o mesmo arquivo
// devolve a MESMA URL dentro da hora (o navegador aproveita o cache) e o link vale
// entre 6h e 7h.
const TTL_SEC = 6 * 3600;
const BUCKET_SEC = 3600;

function secret() {
  return process.env.UPLOAD_SIGNING_SECRET || jwtSecret;
}

function sig(pathname, exp) {
  return crypto.createHmac('sha256', secret()).update(`${pathname}:${exp}`).digest('base64url').slice(0, 32);
}

function isSensitive(pathname) {
  return typeof pathname === 'string' && SENSITIVE.test(pathname);
}

// Remove a assinatura (?t=...) de um path de upload — usado antes de gravar no banco,
// porque o front devolve o photo_url que recebeu (já assinado) no PUT do atleta.
function stripUploadSig(value) {
  if (typeof value !== 'string' || !value.startsWith('/uploads/')) return value;
  const i = value.indexOf('?');
  return i === -1 ? value : value.slice(0, i);
}

function signUpload(pathname, nowMs = Date.now()) {
  if (!isSensitive(pathname) || pathname.includes('?')) return pathname;
  const now = Math.floor(nowMs / 1000);
  const exp = Math.ceil((now + TTL_SEC) / BUCKET_SEC) * BUCKET_SEC;
  return `${pathname}?t=${exp}.${sig(pathname, exp)}`;
}

function verifyUploadSig(pathname, token, nowMs = Date.now()) {
  const [exp, s] = String(token || '').split('.');
  if (!exp || !s || !/^\d+$/.test(exp)) return false;
  if (Number(exp) < Math.floor(nowMs / 1000)) return false;
  const expected = sig(pathname, exp);
  const a = Buffer.from(s);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function signDeep(v, depth = 0) {
  if (depth > 40) return v; // guarda contra estrutura cíclica/patológica
  if (typeof v === 'string') return signUpload(v);
  if (Array.isArray(v)) { for (let i = 0; i < v.length; i++) v[i] = signDeep(v[i], depth + 1); return v; }
  if (v && typeof v === 'object' && !(v instanceof Date) && !Buffer.isBuffer(v)) {
    for (const k of Object.keys(v)) v[k] = signDeep(v[k], depth + 1);
    return v;
  }
  return v;
}

// Middleware: assina os paths sensíveis em toda resposta res.json().
function signJsonResponses(req, res, next) {
  const orig = res.json.bind(res);
  res.json = (body) => orig(signDeep(body, 0));
  next();
}

// Middleware do gate, montado em app.use('/uploads', ...) ANTES do express.static.
function uploadsGate(req, res, next) {
  const modo = process.env.UPLOADS_ASSINATURA || 'log';
  let decoded;
  try { decoded = decodeURIComponent(req.path); } catch { return res.status(400).json({ error: 'Caminho inválido.' }); }
  // Bloqueia path traversal (senão /uploads/club-logos/../athlete-photos/x driblaria o regex).
  if (decoded.includes('..') || decoded.includes('\0')) return res.status(400).json({ error: 'Caminho inválido.' });
  const full = '/uploads' + decoded;
  if (!isSensitive(full)) return next();
  // Sensível: nunca em cache compartilhado.
  res.set('Cache-Control', 'private, max-age=3600');
  if (modo === 'off') return next();
  if (verifyUploadSig(full, req.query.t)) return next();
  if (modo === 'enforce') return res.status(403).json({ error: 'Acesso negado a este arquivo.' });
  console.warn(`[uploads] acesso SEM assinatura válida (tolerado, UPLOADS_ASSINATURA=log): ${full}`);
  return next();
}

module.exports = {
  SENSITIVE, isSensitive, signUpload, verifyUploadSig, stripUploadSig, signDeep,
  signJsonResponses, uploadsGate,
};
