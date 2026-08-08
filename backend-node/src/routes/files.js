const express = require('express');
const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { uploadSessionFile } = require('../middleware/upload');

const router = express.Router();

router.use(authMiddleware);

// Resolve a workspace_id (owner) da sessão.
async function workspaceForSession(sessionId, workspaceIds) {
  const r = await query(
    `SELECT m.workspace_id, m.club_id
       FROM training_sessions s
       JOIN training_microcycles m ON m.id = s.microcycle_id
      WHERE s.id = $1 AND m.workspace_id = ANY($2)`,
    [sessionId, workspaceIds]
  );
  return r.rows[0] || null;
}

// POST /api/files/upload
router.post('/upload', (req, res) => {
  if (!req.user.can('training:edit')) return res.status(403).json({ error: 'Sem permissão pra enviar arquivos' });
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

      const workspaceIds = req.user.workspaceIds || [];
      const session = await workspaceForSession(session_id, workspaceIds);
      if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

      const writableWs = req.user.writableWorkspaceForClub(session.club_id);
      if (!writableWs) return res.status(403).json({ error: 'Sem permissão de escrita nesta sessão' });

      const filePath = `/uploads/session-files/${req.file.filename}`;
      const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
      const result = await query(
        `INSERT INTO training_activity_files (session_id, title, file_path, url, file_name, file_size, mime_type, workspace_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [session_id, title || originalName, filePath, filePath, originalName, req.file.size, req.file.mimetype, session.workspace_id]
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
      'SELECT * FROM training_activity_files WHERE session_id = $1 AND workspace_id = ANY($2) ORDER BY created_at DESC',
      [req.params.sessionId, req.user.workspaceIds || []]
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
      'SELECT * FROM training_activity_files WHERE id = $1 AND workspace_id = ANY($2)',
      [req.params.id, req.user.workspaceIds || []]
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
    if (!req.user.can('training:delete')) return res.status(403).json({ error: 'Sem permissão' });
    const workspaceIds = req.user.workspaceIds || [];
    const result = await query(
      `SELECT f.*, m.club_id
         FROM training_activity_files f
         JOIN training_sessions s ON s.id = f.session_id
         JOIN training_microcycles m ON m.id = s.microcycle_id
        WHERE f.id = $1 AND f.workspace_id = ANY($2)`,
      [req.params.id, workspaceIds]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = result.rows[0];

    const writableWs = req.user.writableWorkspaceForClub(file.club_id);
    if (!writableWs) return res.status(403).json({ error: 'Sem permissão de escrita neste arquivo' });

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

    await query(
      'DELETE FROM training_activity_files WHERE id = $1 AND workspace_id = $2',
      [req.params.id, file.workspace_id]
    );

    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    console.error('Delete file error:', err);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

module.exports = router;
