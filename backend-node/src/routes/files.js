const express = require('express');
const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { uploadSessionFile } = require('../middleware/upload');

const router = express.Router();

router.use(authMiddleware);

// POST /api/files/upload
router.post('/upload', (req, res) => {
  uploadSessionFile(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const { session_id, title } = req.body;
      if (!session_id) {
        return res.status(400).json({ error: 'session_id is required' });
      }

      const filePath = `/uploads/session-files/${req.file.filename}`;
      // Multer decodes filename as Latin-1 by default - convert to UTF-8
      const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
      const result = await query(
        `INSERT INTO training_activity_files (session_id, title, file_path, url, file_name, file_size, mime_type, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [session_id, title || originalName, filePath, filePath, originalName, req.file.size, req.file.mimetype, req.user.id]
      );

      res.status(201).json(result.rows[0]);
    } catch (dbErr) {
      console.error('Upload file DB error:', dbErr);
      res.status(500).json({ error: 'Failed to save file record' });
    }
  });
});

// Ensure file records always have url populated (fallback to file_path)
function normalizeFileRow(row) {
  if (row && !row.url && row.file_path) {
    row.url = row.file_path;
  }
  return row;
}

// GET /api/files/session/:sessionId
router.get('/session/:sessionId', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM training_activity_files WHERE session_id = $1 AND tenant_id = $2 ORDER BY created_at DESC',
      [req.params.sessionId, req.user.id]
    );
    res.json(result.rows.map(normalizeFileRow));
  } catch (err) {
    console.error('List session files error:', err);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// GET /api/files/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM training_activity_files WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.json(normalizeFileRow(result.rows[0]));
  } catch (err) {
    console.error('Get file error:', err);
    res.status(500).json({ error: 'Failed to get file' });
  }
});

// DELETE /api/files/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM training_activity_files WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = result.rows[0];

    // Delete physical file
    if (file.file_path) {
      const uploadDir = path.resolve(process.env.UPLOAD_DIR || '../uploads');
      const fullPath = path.join(uploadDir, '..', file.file_path);
      try {
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      } catch (fsErr) {
        console.error('Failed to delete physical file:', fsErr);
      }
    }

    // Delete DB record
    await query(
      'DELETE FROM training_activity_files WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.user.id]
    );

    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    console.error('Delete file error:', err);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

module.exports = router;
