const express = require('express');
const { query } = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Resolve workspace_id e club_id do atleta. Usado pra INSERTs/UPDATEs.
async function workspaceForAthlete(athleteId, workspaceIds) {
  const r = await query(
    'SELECT workspace_id, club_id FROM athletes WHERE id = $1 AND workspace_id = ANY($2)',
    [athleteId, workspaceIds]
  );
  return r.rows[0] || null;
}

// GET /api/athletes/:athleteId/injuries
router.get('/athletes/:athleteId/injuries', async (req, res) => {
  try {
    if (!req.user.can('athletes:view')) return res.status(403).json({ error: 'Sem permissão' });
    const tenantIds = req.user.workspaceIds || [];
    const ownership = await query(
      'SELECT id FROM athletes WHERE id = $1 AND workspace_id = ANY($2)',
      [req.params.athleteId, tenantIds]
    );
    if (ownership.rows.length === 0) return res.status(404).json({ error: 'Atleta não encontrado' });

    const result = await query(
      `SELECT * FROM athlete_injuries
        WHERE workspace_id = ANY($1) AND athlete_id = $2
        ORDER BY started_at DESC, created_at DESC`,
      [tenantIds, req.params.athleteId]
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('List injuries error:', err);
    res.status(500).json({ error: 'Failed to list injuries' });
  }
});

// GET /api/injuries/active
router.get('/injuries/active', async (req, res) => {
  try {
    if (!req.user.can('athletes:view')) return res.status(403).json({ error: 'Sem permissão' });
    const tenantIds = req.user.workspaceIds || [];
    const result = await query(
      `SELECT i.*, a.name AS athlete_name, a.jersey_number, a.photo_url
         FROM athlete_injuries i
         JOIN athletes a ON a.id = i.athlete_id
        WHERE i.workspace_id = ANY($1) AND i.resolved_at IS NULL
        ORDER BY i.started_at DESC`,
      [tenantIds]
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('List active injuries error:', err);
    res.status(500).json({ error: 'Failed to list active injuries' });
  }
});

const VALID_SEVERITY = ['light', 'medium', 'severe'];

// POST /api/athletes/:athleteId/injuries
router.post('/athletes/:athleteId/injuries', async (req, res) => {
  try {
    if (!req.user.can('injuries:manage')) return res.status(403).json({ error: 'Sem permissão pra registrar lesões' });
    const { injury_type, body_part, severity, started_at, expected_return, notes } = req.body;
    if (!injury_type?.trim()) return res.status(400).json({ error: 'injury_type é obrigatório' });
    if (severity && !VALID_SEVERITY.includes(severity)) return res.status(400).json({ error: 'severity inválida' });

    const workspaceIds = req.user.workspaceIds || [];
    const athlete = await workspaceForAthlete(req.params.athleteId, workspaceIds);
    if (!athlete) return res.status(404).json({ error: 'Atleta não encontrado' });

    const writableWs = athlete.club_id
      ? req.user.writableWorkspaceForClub(athlete.club_id)
      : (req.user.canWriteWorkspace(athlete.workspace_id) ? athlete.workspace_id : null);
    if (!writableWs) return res.status(403).json({ error: 'Sem permissão de escrita neste atleta' });

    const result = await query(
      `INSERT INTO athlete_injuries
         (workspace_id, athlete_id, injury_type, body_part, severity, started_at, expected_return, notes)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, CURRENT_DATE), $7, $8)
       RETURNING *`,
      [
        athlete.workspace_id, req.params.athleteId,
        injury_type.trim(), body_part?.trim() || null,
        severity || 'medium',
        started_at || null, expected_return || null,
        notes?.trim() || null,
      ]
    );

    await query(`UPDATE athletes SET status = 'injured', updated_at = NOW() WHERE id = $1 AND workspace_id = $2`,
      [req.params.athleteId, athlete.workspace_id]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create injury error:', err);
    res.status(500).json({ error: 'Failed to create injury' });
  }
});

// PUT /api/injuries/:id
router.put('/injuries/:id', async (req, res) => {
  try {
    if (!req.user.can('injuries:manage')) return res.status(403).json({ error: 'Sem permissão' });
    const { injury_type, body_part, severity, started_at, expected_return, resolved_at, notes } = req.body;
    if (severity && !VALID_SEVERITY.includes(severity)) return res.status(400).json({ error: 'severity inválida' });

    const workspaceIds = req.user.workspaceIds || [];

    const existing = await query(
      `SELECT i.workspace_id, i.athlete_id, a.club_id
         FROM athlete_injuries i
         JOIN athletes a ON a.id = i.athlete_id
        WHERE i.id = $1 AND i.workspace_id = ANY($2)`,
      [req.params.id, workspaceIds]
    );
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Lesão não encontrada' });
    const { workspace_id: ownerWs, athlete_id: athleteId, club_id } = existing.rows[0];

    const writableWs = club_id
      ? req.user.writableWorkspaceForClub(club_id)
      : (req.user.canWriteWorkspace(ownerWs) ? ownerWs : null);
    if (!writableWs) return res.status(403).json({ error: 'Sem permissão de escrita nesta lesão' });

    const result = await query(
      `UPDATE athlete_injuries
          SET injury_type     = COALESCE($1, injury_type),
              body_part       = COALESCE($2, body_part),
              severity        = COALESCE($3, severity),
              started_at      = COALESCE($4, started_at),
              expected_return = COALESCE($5, expected_return),
              resolved_at     = $6,
              notes           = COALESCE($7, notes),
              updated_at      = NOW()
        WHERE id = $8 AND workspace_id = $9
        RETURNING *`,
      [
        injury_type?.trim() || null, body_part?.trim() ?? null, severity || null,
        started_at || null, expected_return || null,
        resolved_at !== undefined ? resolved_at : null,
        notes?.trim() ?? null,
        req.params.id, ownerWs,
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Lesão não encontrada' });

    if (resolved_at) {
      const stillActive = await query(
        `SELECT 1 FROM athlete_injuries WHERE athlete_id = $1 AND workspace_id = $2 AND resolved_at IS NULL LIMIT 1`,
        [athleteId, ownerWs]
      );
      if (stillActive.rows.length === 0) {
        await query(`UPDATE athletes SET status = 'active', updated_at = NOW() WHERE id = $1 AND workspace_id = $2`,
          [athleteId, ownerWs]);
      }
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update injury error:', err);
    res.status(500).json({ error: 'Failed to update injury' });
  }
});

// DELETE /api/injuries/:id
router.delete('/injuries/:id', async (req, res) => {
  try {
    if (!req.user.can('injuries:manage')) return res.status(403).json({ error: 'Sem permissão' });
    const workspaceIds = req.user.workspaceIds || [];

    const existing = await query(
      `SELECT i.workspace_id, i.athlete_id, a.club_id
         FROM athlete_injuries i
         JOIN athletes a ON a.id = i.athlete_id
        WHERE i.id = $1 AND i.workspace_id = ANY($2)`,
      [req.params.id, workspaceIds]
    );
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Lesão não encontrada' });
    const { workspace_id: ownerWs, athlete_id: athleteId, club_id } = existing.rows[0];

    const writableWs = club_id
      ? req.user.writableWorkspaceForClub(club_id)
      : (req.user.canWriteWorkspace(ownerWs) ? ownerWs : null);
    if (!writableWs) return res.status(403).json({ error: 'Sem permissão de escrita nesta lesão' });

    await query(
      'DELETE FROM athlete_injuries WHERE id = $1 AND workspace_id = $2',
      [req.params.id, ownerWs]
    );

    const stillActive = await query(
      `SELECT 1 FROM athlete_injuries WHERE athlete_id = $1 AND workspace_id = $2 AND resolved_at IS NULL LIMIT 1`,
      [athleteId, ownerWs]
    );
    if (stillActive.rows.length === 0) {
      await query(`UPDATE athletes SET status = 'active', updated_at = NOW() WHERE id = $1 AND workspace_id = $2`,
        [athleteId, ownerWs]);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Delete injury error:', err);
    res.status(500).json({ error: 'Failed to delete injury' });
  }
});

module.exports = router;
