// Seletor de produtos Faggin (login único, F3). A sessão NUNCA atravessa domínios: a origem pede ao
// Conta uma URL com código de uso único (2 min) e o destino resgata servidor a servidor, emitindo a
// PRÓPRIA sessão. Detalhes: /var/www/conta/CLAUDE.md.
const express = require('express');
const { query } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimit');
const conta = require('../services/conta');
const { generateToken } = require('./auth');

const router = express.Router();

async function emailDoUsuario(id) {
  const r = await query('SELECT email FROM users WHERE id = $1 AND deleted_at IS NULL', [id]);
  return r.rows[0]?.email || null;
}

// GET /api/conta/produtos → { produtos: [{ produto, nome, atual }] } ([] se desligado/indisponível)
router.get('/produtos', authMiddleware, async (req, res) => {
  try {
    const email = await emailDoUsuario(req.user.id);
    res.json({ produtos: await conta.produtos(email) });
  } catch (err) {
    console.error('conta/produtos:', err.message);
    res.json({ produtos: [] });
  }
});

// POST /api/conta/trocar { destino } → { url } | 404
router.post('/trocar', authMiddleware, async (req, res) => {
  try {
    const destino = String(req.body?.destino || '').trim();
    if (!destino || destino.length > 50) return res.status(400).json({ error: 'Produto inválido' });
    const email = await emailDoUsuario(req.user.id);
    const url = await conta.trocar(email, destino);
    if (!url) return res.status(404).json({ error: 'Não foi possível abrir esse produto agora.' });
    res.json({ url });
  } catch (err) {
    console.error('conta/trocar:', err.message);
    res.status(404).json({ error: 'Não foi possível abrir esse produto agora.' });
  }
});

// POST /api/conta/resgatar { codigo } → mesmo payload do POST /api/auth/login ({ token, user })
router.post('/resgatar', loginLimiter, async (req, res) => {
  try {
    const codigo = String(req.body?.codigo || '');
    if (!codigo || codigo.length > 100) return res.status(400).json({ error: 'Link de acesso inválido ou expirado' });
    const r = await conta.resgatar(codigo);
    if (!r) return res.status(400).json({ error: 'Link de acesso inválido ou expirado' });

    const cols = 'id, email, name, phone, bio, profile_photo, role, id as tenant_id';
    let result = { rows: [] };
    if (r.usuario_id) {
      result = await query(`SELECT ${cols} FROM users WHERE id::text = $1 AND deleted_at IS NULL`, [String(r.usuario_id)]);
    }
    if (!result.rows.length && r.conta?.email) {
      // Sem vínculo (ou vínculo velho): o e-mail da conta é a identidade, igual ao login.
      result = await query(`SELECT ${cols} FROM users WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL`, [r.conta.email]);
      if (result.rows[0] && r.conta.id) await conta.vincular(r.conta.id, result.rows[0].id);
    }
    if (!result.rows.length) return res.status(400).json({ error: 'Link de acesso inválido ou expirado' });

    const user = result.rows[0];
    user.tenant_id = user.tenant_id || user.id;
    const token = generateToken(user);
    res.json({ token, user });
  } catch (err) {
    console.error('conta/resgatar:', err.message);
    res.status(500).json({ error: 'Falha ao entrar' });
  }
});

module.exports = router;
