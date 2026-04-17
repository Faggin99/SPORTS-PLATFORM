const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { jwtSecret, jwtExpiresIn } = require('../config/auth');
const authMiddleware = require('../middleware/auth');
const { uploadProfilePhoto } = require('../middleware/upload');

const router = express.Router();

function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, jwtSecret, { expiresIn: jwtExpiresIn });
}

// POST /api/auth/register
router.post('/register', [
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, phone } = req.body;

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO users (email, encrypted_password, name, phone, role)
       VALUES ($1, $2, $3, $4, 'coach')
       RETURNING id, email, name, phone, bio, profile_photo, role`,
      [email, hashedPassword, name, phone || null]
    );

    const user = result.rows[0];
    user.tenant_id = user.id;

    const token = generateToken(user);

    res.status(201).json({ token, user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const result = await query(
      'SELECT id, email, encrypted_password, name, phone, bio, profile_photo, role, id as tenant_id FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.encrypted_password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    delete user.encrypted_password;
    user.tenant_id = user.tenant_id || user.id;

    const token = generateToken(user);

    res.json({ token, user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, email, name, phone, bio, profile_photo, role, id as tenant_id FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    user.tenant_id = user.tenant_id || user.id;

    res.json(user);
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Failed to get user data' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, phone, bio } = req.body;

    const result = await query(
      `UPDATE users SET name = $1, phone = $2, bio = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING id, email, name, phone, bio, profile_photo, role, id as tenant_id`,
      [name, phone || null, bio || null, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    user.tenant_id = user.tenant_id || user.id;

    res.json(user);
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PUT /api/auth/password
router.put('/password', authMiddleware, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    const result = await query('SELECT encrypted_password FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const validPassword = await bcrypt.compare(currentPassword, result.rows[0].encrypted_password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await query(
      'UPDATE users SET encrypted_password = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, req.user.id]
    );

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// POST /api/auth/upload-photo
router.post('/upload-photo', authMiddleware, (req, res) => {
  uploadProfilePhoto(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const photoPath = `/uploads/profile-photos/${req.file.filename}`;
      const result = await query(
        `UPDATE users SET profile_photo = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, email, name, phone, bio, profile_photo, role, id as tenant_id`,
        [photoPath, req.user.id]
      );

      res.json(result.rows[0]);
    } catch (dbErr) {
      console.error('Upload photo DB error:', dbErr);
      res.status(500).json({ error: 'Failed to save photo' });
    }
  });
});

module.exports = router;
