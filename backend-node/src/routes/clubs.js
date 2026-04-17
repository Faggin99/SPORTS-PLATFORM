const express = require('express');
const { query } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { uploadClubLogo } = require('../middleware/upload');

const router = express.Router();

router.use(authMiddleware);

// GET /api/clubs
router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM clubs WHERE tenant_id = $1 ORDER BY created_at ASC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List clubs error:', err);
    res.status(500).json({ error: 'Failed to list clubs' });
  }
});

// GET /api/clubs/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM clubs WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Club not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get club error:', err);
    res.status(500).json({ error: 'Failed to get club' });
  }
});

// POST /api/clubs
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Club name is required' });
    }

    const result = await query(
      `INSERT INTO clubs (name, description, tenant_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, description || null, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create club error:', err);
    res.status(500).json({ error: 'Failed to create club' });
  }
});

// PUT /api/clubs/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, description } = req.body;
    const result = await query(
      `UPDATE clubs SET name = $1, description = $2, updated_at = NOW()
       WHERE id = $3 AND tenant_id = $4
       RETURNING *`,
      [name, description || null, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Club not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update club error:', err);
    res.status(500).json({ error: 'Failed to update club' });
  }
});

// DELETE /api/clubs/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM clubs WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Club not found' });
    }
    res.json({ message: 'Club deleted successfully' });
  } catch (err) {
    console.error('Delete club error:', err);
    res.status(500).json({ error: 'Failed to delete club' });
  }
});

// POST /api/clubs/:id/logo
router.post('/:id/logo', (req, res) => {
  uploadClubLogo(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const logoPath = `/uploads/club-logos/${req.file.filename}`;
      const result = await query(
        `UPDATE clubs SET logo_path = $1, updated_at = NOW()
         WHERE id = $2 AND tenant_id = $3
         RETURNING *`,
        [logoPath, req.params.id, req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Club not found' });
      }

      res.json(result.rows[0]);
    } catch (dbErr) {
      console.error('Upload logo DB error:', dbErr);
      res.status(500).json({ error: 'Failed to save logo' });
    }
  });
});

// POST /api/clubs/:id/migrate-data
// Migrate orphaned data (microcycles/athletes without club_id) to this club
router.post('/:id/migrate-data', async (req, res) => {
  try {
    const clubId = req.params.id;
    const tenantId = req.user.id;

    // Migrate training_microcycles without club_id
    await query(
      `UPDATE training_microcycles SET club_id = $1
       WHERE tenant_id = $2 AND club_id IS NULL`,
      [clubId, tenantId]
    );

    // Migrate athletes without club_id
    await query(
      `UPDATE athletes SET club_id = $1
       WHERE tenant_id = $2 AND club_id IS NULL`,
      [clubId, tenantId]
    );

    // Migrate tactical_plays without club_id
    await query(
      `UPDATE tactical_plays SET club_id = $1
       WHERE tenant_id = $2 AND club_id IS NULL`,
      [clubId, tenantId]
    );

    res.json({ message: 'Data migrated successfully' });
  } catch (err) {
    console.error('Migrate data error:', err);
    res.status(500).json({ error: 'Failed to migrate data' });
  }
});

module.exports = router;
