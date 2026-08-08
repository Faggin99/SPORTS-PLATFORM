const express = require('express');
const { query } = require('../config/database');

const router = express.Router();

// Endpoint público, chamado pela landing (tactiplan.faggin.com.br) de outro
// domínio → CORS liberado manualmente (não depende do middleware global, que
// pode não pegar aqui se essa rota for montada antes de app.use(cors(...))).
// Também respondemos ao preflight OPTIONS.
const LANDING_ORIGIN = 'https://tactiplan.faggin.com.br';

router.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', LANDING_ORIGIN);
  res.set('Vary', 'Origin');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

// Cache in-memory de 10 min: stats agregadas mudam devagar e não queremos
// bater o banco em toda pageview da landing.
const CACHE_TTL_MS = 10 * 60 * 1000;
let cache = { data: null, expiresAt: 0 };

async function loadStats() {
  // Single roundtrip: 4 COUNTs em subqueries.
  //  - coaches:  users não soft-deletados (migration 041 adicionou users.deleted_at).
  //  - clubs:    tabela clubs não tem soft-delete hoje, então conta tudo.
  //  - athletes: filtra status='active' (default da coluna, migração 001).
  //  - sessions: training_sessions não tem soft-delete, conta tudo.
  const sql = `
    SELECT
      (SELECT COUNT(*)::bigint FROM users             WHERE deleted_at IS NULL) AS coaches,
      (SELECT COUNT(*)::bigint FROM clubs)                                       AS clubs,
      (SELECT COUNT(*)::bigint FROM athletes          WHERE status = 'active')   AS athletes,
      (SELECT COUNT(*)::bigint FROM training_sessions)                           AS sessions
  `;
  const { rows } = await query(sql);
  const r = rows[0] || {};
  return {
    coaches: parseInt(r.coaches || 0, 10),
    clubs: parseInt(r.clubs || 0, 10),
    athletes: parseInt(r.athletes || 0, 10),
    sessions: parseInt(r.sessions || 0, 10),
  };
}

// GET /api/public/stats — SEM auth.
router.get('/stats', async (req, res) => {
  try {
    const now = Date.now();
    if (cache.data && cache.expiresAt > now) {
      res.set('Cache-Control', 'public, max-age=600');
      return res.json(cache.data);
    }

    const data = await loadStats();
    cache = { data, expiresAt: now + CACHE_TTL_MS };
    res.set('Cache-Control', 'public, max-age=600');
    return res.json(data);
  } catch (err) {
    console.error('Public stats error:', err);
    // Se ainda temos cache stale, devolve pra não quebrar a LP.
    if (cache.data) {
      res.set('Cache-Control', 'public, max-age=60');
      return res.json(cache.data);
    }
    return res.status(500).json({ error: 'Failed to load public stats' });
  }
});

module.exports = router;
