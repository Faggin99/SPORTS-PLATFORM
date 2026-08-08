const express = require('express');
const { query, pool } = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

const VALID_DIMENSIONS = ['tatico', 'tecnico', 'fisico', 'mental'];

// GET /api/contents — globais (workspace_id IS NULL) + do workspace ativo, com flag `active`.
// user_content_state continua usando user_id (é state por usuário, não por workspace).
router.get('/contents', async (req, res) => {
  try {
    const wsId = req.user.workspaceId || null;
    const result = await query(
      `SELECT c.*, COALESCE(ucs.active, TRUE) AS active
         FROM contents c
         LEFT JOIN user_content_state ucs
           ON ucs.content_id = c.id AND ucs.tenant_id = $1
        WHERE c.workspace_id IS NULL OR c.workspace_id = $2
        ORDER BY c.name ASC`,
      [req.user.id, wsId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List contents error:', err);
    res.status(500).json({ error: 'Failed to list contents' });
  }
});

// POST /api/contents
router.post('/contents', async (req, res) => {
  try {
    if (!req.user.can('library:edit')) return res.status(403).json({ error: 'Sem permissão pra editar biblioteca' });
    const { name, abbreviation, description, dimension } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name é obrigatório' });
    if (!dimension || !VALID_DIMENSIONS.includes(dimension)) {
      return res.status(400).json({ error: 'dimension é obrigatório (tatico/tecnico/fisico/mental)' });
    }
    const wsId = req.user.workspaceId;
    if (!wsId) return res.status(400).json({ error: 'Nenhuma workspace ativa' });

    const result = await query(
      `INSERT INTO contents (workspace_id, name, abbreviation, description, dimension)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [wsId, name.trim(), abbreviation?.trim() || null, description || null, dimension]
    );
    res.status(201).json({ ...result.rows[0], active: true });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Já existe um conteúdo com esse nome' });
    console.error('Create content error:', err);
    res.status(500).json({ error: 'Failed to create content' });
  }
});

// PUT /api/contents/:id — edita.
// Se global, clona pro workspace + re-aponta atividades + desativa global.
router.put('/contents/:id', async (req, res) => {
  if (!req.user.can('library:edit')) return res.status(403).json({ error: 'Sem permissão' });
  const client = await pool.connect();
  try {
    const { name, abbreviation, description, dimension } = req.body;
    if (dimension && !VALID_DIMENSIONS.includes(dimension)) {
      return res.status(400).json({ error: 'dimension inválida' });
    }
    const wsId = req.user.workspaceId;
    if (!wsId) return res.status(400).json({ error: 'Nenhuma workspace ativa' });

    await client.query('BEGIN');

    const found = await client.query(
      'SELECT * FROM contents WHERE id = $1 AND (workspace_id IS NULL OR workspace_id = $2)',
      [req.params.id, wsId]
    );
    if (found.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Conteúdo não encontrado' });
    }
    const original = found.rows[0];

    if (original.workspace_id === null) {
      const cloned = await client.query(
        `INSERT INTO contents (workspace_id, name, abbreviation, description, dimension)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          wsId,
          (name?.trim() || original.name),
          abbreviation !== undefined ? (abbreviation?.trim() || null) : original.abbreviation,
          description !== undefined ? description : original.description,
          dimension || original.dimension,
        ]
      );
      const newContent = cloned.rows[0];

      await client.query(
        `UPDATE training_activity_contents
            SET content_id = $1
          WHERE content_id = $2
            AND activity_id IN (SELECT id FROM training_activities WHERE workspace_id = $3)`,
        [newContent.id, original.id, wsId]
      );

      if (original.dimension === 'tatico') {
        const globalSubs = await client.query(
          'SELECT id, name, description, display_order FROM stages WHERE content_id = $1 AND workspace_id IS NULL',
          [original.id]
        );
        for (const sub of globalSubs.rows) {
          const newSub = await client.query(
            `INSERT INTO stages (workspace_id, content_id, name, description, display_order)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [wsId, newContent.id, sub.name, sub.description, sub.display_order]
          );
          await client.query(
            `UPDATE training_activity_stages
                SET stage_id = $1
              WHERE stage_id = $2
                AND activity_id IN (SELECT id FROM training_activities WHERE workspace_id = $3)`,
            [newSub.rows[0].id, sub.id, wsId]
          );
        }
      }

      // Desativa global pro usuário (user_content_state continua sendo per-user)
      await client.query(
        `INSERT INTO user_content_state (tenant_id, content_id, active)
         VALUES ($1, $2, FALSE)
         ON CONFLICT (tenant_id, content_id) DO UPDATE SET active = FALSE, updated_at = now()`,
        [req.user.id, original.id]
      );

      await client.query('COMMIT');
      return res.json({ ...newContent, active: true, cloned_from: original.id });
    }

    const updated = await client.query(
      `UPDATE contents
          SET name         = COALESCE($1, name),
              abbreviation = COALESCE($2, abbreviation),
              description  = COALESCE($3, description),
              dimension    = COALESCE($4, dimension),
              updated_at   = NOW()
        WHERE id = $5 AND workspace_id = $6
        RETURNING *`,
      [name?.trim() || null, abbreviation?.trim() ?? null, description ?? null, dimension || null, req.params.id, wsId]
    );
    await client.query('COMMIT');
    res.json({ ...updated.rows[0], active: true });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23505') return res.status(409).json({ error: 'Já existe um conteúdo com esse nome' });
    console.error('Update content error:', err);
    res.status(500).json({ error: 'Failed to update content' });
  } finally {
    client.release();
  }
});

// PATCH /api/contents/:id/active — toggle ativo/inativo (per-user)
router.patch('/contents/:id/active', async (req, res) => {
  try {
    if (!req.user.can('library:edit')) return res.status(403).json({ error: 'Sem permissão' });
    const { active } = req.body;
    if (typeof active !== 'boolean') return res.status(400).json({ error: 'active boolean obrigatório' });
    const wsId = req.user.workspaceId;

    const found = await query(
      'SELECT id FROM contents WHERE id = $1 AND (workspace_id IS NULL OR workspace_id = $2)',
      [req.params.id, wsId]
    );
    if (found.rows.length === 0) return res.status(404).json({ error: 'Conteúdo não encontrado' });

    await query(
      `INSERT INTO user_content_state (tenant_id, content_id, active)
       VALUES ($1, $2, $3)
       ON CONFLICT (tenant_id, content_id) DO UPDATE SET active = EXCLUDED.active, updated_at = now()`,
      [req.user.id, req.params.id, active]
    );
    res.json({ ok: true, active });
  } catch (err) {
    console.error('Toggle content active error:', err);
    res.status(500).json({ error: 'Failed to toggle content' });
  }
});

// DELETE /api/contents/:id — só do próprio workspace
router.delete('/contents/:id', async (req, res) => {
  try {
    if (!req.user.can('library:edit')) return res.status(403).json({ error: 'Sem permissão' });
    const result = await query(
      'DELETE FROM contents WHERE id = $1 AND workspace_id = ANY($2) RETURNING id',
      [req.params.id, req.user.workspaceIds || []]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conteúdo não encontrado (globais não são removíveis — desative-os)' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete content error:', err);
    res.status(500).json({ error: 'Failed to delete content' });
  }
});

// GET /api/stages
// Aceita ?modality=football_11|football_7|futsal pra filtrar submomentos pela
// modalidade do clube ativo (ex: futsal não vê Falta Frontal/Lateral; só ele vê Tiro Livre).
// Se omitido, retorna tudo (compat).
router.get('/stages', async (req, res) => {
  try {
    const { content_id, modality } = req.query;
    const wsId = req.user.workspaceId || null;
    const params = [req.user.id, wsId];
    let sql = `SELECT s.*, c.name AS content_name, COALESCE(uss.active, TRUE) AS active
                 FROM stages s
                 LEFT JOIN contents c ON c.id = s.content_id
                 LEFT JOIN user_stage_state uss
                   ON uss.stage_id = s.id AND uss.tenant_id = $1
                WHERE (s.workspace_id IS NULL OR s.workspace_id = $2)`;
    if (content_id) {
      params.push(content_id);
      sql += ` AND s.content_id = $${params.length}`;
    }
    if (modality && ['football_11', 'football_7', 'futsal'].includes(modality)) {
      params.push(modality);
      sql += ` AND (s.excluded_modalities IS NULL OR NOT ($${params.length}::varchar = ANY(s.excluded_modalities)))`;
    }
    sql += ` ORDER BY c.name ASC NULLS LAST, s.display_order ASC, s.name ASC`;
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List stages error:', err);
    res.status(500).json({ error: 'Failed to list stages' });
  }
});

// POST /api/stages
router.post('/stages', async (req, res) => {
  try {
    if (!req.user.can('library:edit')) return res.status(403).json({ error: 'Sem permissão' });
    const { content_id, name, description, display_order } = req.body;
    if (!content_id || !name) {
      return res.status(400).json({ error: 'content_id e name são obrigatórios' });
    }
    const wsId = req.user.workspaceId;
    if (!wsId) return res.status(400).json({ error: 'Nenhuma workspace ativa' });

    const parent = await query('SELECT dimension FROM contents WHERE id = $1', [content_id]);
    if (parent.rows.length === 0) {
      return res.status(404).json({ error: 'Conteúdo não encontrado' });
    }
    if (parent.rows[0].dimension !== 'tatico') {
      return res.status(400).json({ error: 'Submomentos só existem em conteúdos táticos' });
    }
    const result = await query(
      `INSERT INTO stages (workspace_id, content_id, name, description, display_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [wsId, content_id, name.trim(), description || null, display_order ?? 999]
    );
    res.status(201).json({ ...result.rows[0], active: true });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Já existe um submomento com esse nome neste conteúdo' });
    }
    console.error('Create stage error:', err);
    res.status(500).json({ error: 'Failed to create stage' });
  }
});

// PUT /api/stages/:id
router.put('/stages/:id', async (req, res) => {
  if (!req.user.can('library:edit')) return res.status(403).json({ error: 'Sem permissão' });
  const client = await pool.connect();
  try {
    const { name, description, display_order, content_id } = req.body;
    const wsId = req.user.workspaceId;
    if (!wsId) return res.status(400).json({ error: 'Nenhuma workspace ativa' });

    await client.query('BEGIN');

    const found = await client.query(
      'SELECT * FROM stages WHERE id = $1 AND (workspace_id IS NULL OR workspace_id = $2)',
      [req.params.id, wsId]
    );
    if (found.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Submomento não encontrado' });
    }
    const original = found.rows[0];

    if (original.workspace_id === null) {
      const cloned = await client.query(
        `INSERT INTO stages (workspace_id, content_id, name, description, display_order)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          wsId,
          content_id || original.content_id,
          name?.trim() || original.name,
          description !== undefined ? description : original.description,
          display_order ?? original.display_order,
        ]
      );
      const newStage = cloned.rows[0];

      await client.query(
        `UPDATE training_activity_stages
            SET stage_id = $1
          WHERE stage_id = $2
            AND activity_id IN (SELECT id FROM training_activities WHERE workspace_id = $3)`,
        [newStage.id, original.id, wsId]
      );

      await client.query(
        `INSERT INTO user_stage_state (tenant_id, stage_id, active)
         VALUES ($1, $2, FALSE)
         ON CONFLICT (tenant_id, stage_id) DO UPDATE SET active = FALSE, updated_at = now()`,
        [req.user.id, original.id]
      );

      await client.query('COMMIT');
      return res.json({ ...newStage, active: true, cloned_from: original.id });
    }

    const updated = await client.query(
      `UPDATE stages
          SET name = COALESCE($1, name),
              description = COALESCE($2, description),
              display_order = COALESCE($3, display_order),
              content_id = COALESCE($4, content_id),
              updated_at = NOW()
        WHERE id = $5 AND workspace_id = $6
        RETURNING *`,
      [name?.trim() || null, description ?? null, display_order ?? null, content_id || null, req.params.id, wsId]
    );
    await client.query('COMMIT');
    res.json({ ...updated.rows[0], active: true });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Já existe um submomento com esse nome neste conteúdo' });
    }
    console.error('Update stage error:', err);
    res.status(500).json({ error: 'Failed to update stage' });
  } finally {
    client.release();
  }
});

// PATCH /api/stages/:id/active
router.patch('/stages/:id/active', async (req, res) => {
  try {
    if (!req.user.can('library:edit')) return res.status(403).json({ error: 'Sem permissão' });
    const { active } = req.body;
    if (typeof active !== 'boolean') return res.status(400).json({ error: 'active boolean obrigatório' });
    const wsId = req.user.workspaceId;

    const found = await query(
      'SELECT id FROM stages WHERE id = $1 AND (workspace_id IS NULL OR workspace_id = $2)',
      [req.params.id, wsId]
    );
    if (found.rows.length === 0) return res.status(404).json({ error: 'Submomento não encontrado' });

    await query(
      `INSERT INTO user_stage_state (tenant_id, stage_id, active)
       VALUES ($1, $2, $3)
       ON CONFLICT (tenant_id, stage_id) DO UPDATE SET active = EXCLUDED.active, updated_at = now()`,
      [req.user.id, req.params.id, active]
    );
    res.json({ ok: true, active });
  } catch (err) {
    console.error('Toggle stage active error:', err);
    res.status(500).json({ error: 'Failed to toggle stage' });
  }
});

// DELETE /api/stages/:id
router.delete('/stages/:id', async (req, res) => {
  try {
    if (!req.user.can('library:edit')) return res.status(403).json({ error: 'Sem permissão' });
    const result = await query(
      'DELETE FROM stages WHERE id = $1 AND workspace_id = ANY($2) RETURNING id',
      [req.params.id, req.user.workspaceIds || []]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Submomento não encontrado (globais não são removíveis — desative-os)' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete stage error:', err);
    res.status(500).json({ error: 'Failed to delete stage' });
  }
});

module.exports = router;
