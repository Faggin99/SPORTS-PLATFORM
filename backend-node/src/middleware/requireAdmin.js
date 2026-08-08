const { query } = require('../config/database');
const { isAdmin } = require('../config/specialUsers');

/**
 * Middleware que exige que o req.user seja admin.
 * Combina dois critérios:
 *  - role='admin' no banco
 *  - OU email na lista ADMIN_EMAILS (specialUsers.js)
 *
 * Deve vir DEPOIS do authMiddleware (precisa de req.user já populado).
 */
module.exports = async function requireAdmin(req, res, next) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    // Busca role e email do banco (fonte da verdade)
    const r = await query('SELECT email, role FROM users WHERE id = $1', [req.user.id]);
    if (r.rows.length === 0) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }
    const user = r.rows[0];
    const allowed = user.role === 'admin' || isAdmin(user.email);
    if (!allowed) {
      return res.status(403).json({ error: 'Acesso restrito a administradores' });
    }
    req.adminUser = user;
    next();
  } catch (err) {
    console.error('requireAdmin error:', err);
    res.status(500).json({ error: 'Failed admin auth' });
  }
};
