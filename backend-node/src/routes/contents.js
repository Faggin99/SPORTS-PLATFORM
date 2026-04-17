const express = require('express');
const { query } = require('../config/database');

const router = express.Router();

// GET /api/contents
router.get('/contents', async (req, res) => {
  try {
    const result = await query('SELECT * FROM contents ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('List contents error:', err);
    res.status(500).json({ error: 'Failed to list contents' });
  }
});

// GET /api/stages
router.get('/stages', async (req, res) => {
  try {
    const result = await query('SELECT * FROM stages ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('List stages error:', err);
    res.status(500).json({ error: 'Failed to list stages' });
  }
});

module.exports = router;
