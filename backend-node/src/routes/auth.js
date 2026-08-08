const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { jwtSecret, jwtExpiresIn } = require('../config/auth');
const authMiddleware = require('../middleware/auth');
const { uploadProfilePhoto } = require('../middleware/upload');
const { loginLimiter, registerLimiter, recoveryLimiter } = require('../middleware/rateLimit');
const { sendPasswordResetEmail, sendWelcomeEmail } = require('../services/mailer');
const billing = require('../services/billing');
const { isAdmin, isLifetime } = require('../config/specialUsers');
const { OAuth2Client } = require('google-auth-library');

const googleClient = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;

const router = express.Router();

function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, jwtSecret, { expiresIn: jwtExpiresIn });
}

// POST /api/auth/register
router.post('/register', registerLimiter, [
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().notEmpty(),
  body('accept_terms').equals('true'),
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
    const role = isAdmin(email) ? 'admin' : 'coach';

    const result = await query(
      `INSERT INTO users (email, encrypted_password, name, phone, role, terms_accepted_at, terms_version)
       VALUES ($1, $2, $3, $4, $5, now(), '2026-05-11')
       RETURNING id, email, name, phone, bio, profile_photo, role`,
      [email, hashedPassword, name, phone || null, role]
    );

    const user = result.rows[0];
    user.tenant_id = user.id;

    // Cria workspace inicial pro user (uma por user no cadastro)
    const wsName = (name && name.trim()) || (email.split('@')[0]) || 'Minha conta';
    const wsRes = await query(
      `INSERT INTO workspaces (name, owner_id) VALUES ($1, $2) RETURNING id`,
      [wsName, user.id]
    );
    const workspaceId = wsRes.rows[0].id;

    // Cria assinatura linkada à workspace:
    // - admin: nada (acesso ilimitado via role)
    // - lifetime list: assinatura vitalícia
    // - demais: trial de 30 dias no plano Clube (cobre tudo, vira gatilho de upsell)
    if (role !== 'admin') {
      if (isLifetime(email)) {
        await query(
          `INSERT INTO subscriptions (user_id, workspace_id, plan_id, status, current_period_start, current_period_end)
           VALUES ($1, $2, 'lifetime', 'active', now(), now() + interval '100 years')`,
          [user.id, workspaceId]
        );
      } else {
        const trialEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await query(
          `INSERT INTO subscriptions (user_id, workspace_id, plan_id, status, trial_ends_at, current_period_start, current_period_end)
           VALUES ($1, $2, 'clube', 'trialing', $3, now(), $3)`,
          [user.id, workspaceId, trialEnd]
        );
      }
    }

    const token = generateToken(user);

    // Fire-and-forget: e-mail de boas-vindas (não bloqueia o response).
    // Trial de 30d é hard-coded no INSERT acima; se for admin/lifetime, ainda mandamos welcome.
    setImmediate(() => {
      const appUrl = process.env.APP_BASE_URL || 'https://app.tactiplan.faggin.com.br';
      sendWelcomeEmail({ to: user.email, name: user.name, trialDaysLeft: 30, appUrl })
        .catch(err => console.error('sendWelcomeEmail error:', err?.message));
    });

    res.status(201).json({ token, user, workspace_id: workspaceId });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, [
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
      'SELECT id, email, encrypted_password, name, phone, bio, profile_photo, role, deleted_at, id as tenant_id FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email]
    );

    if (result.rows.length === 0) {
      // Não distinguimos "não existe" de "conta removida" pra evitar user enumeration
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    if (user.deleted_at) {
      return res.status(401).json({ error: 'Conta removida' });
    }
    const validPassword = await bcrypt.compare(password, user.encrypted_password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    delete user.deleted_at;

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
      `SELECT id, email, name, phone, bio, profile_photo, role, id as tenant_id,
              (encrypted_password IS NULL OR encrypted_password = '') AS requires_password
       FROM users WHERE id = $1`,
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

// DELETE /api/auth/me — LGPD "direito ao esquecimento"
// Anonimiza PII (não hard-delete pra preservar integridade referencial), cancela
// assinaturas imediatamente e invalida sessões futuras (JWT existente será rejeitado
// pelo middleware quando bater no check de deleted_at).
router.delete('/me', authMiddleware, async (req, res) => {
  try {
    // Confirma que o user existe e recupera a senha atual pra validar (se houver)
    const userRes = await query(
      'SELECT id, encrypted_password, deleted_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const u = userRes.rows[0];
    if (u.deleted_at) {
      return res.status(410).json({ error: 'Conta já foi removida' });
    }

    // Se tiver senha, exige confirmação. Google-only users (sem senha) passam direto.
    if (u.encrypted_password) {
      const { password } = req.body || {};
      if (!password) {
        return res.status(400).json({ error: 'Senha obrigatória para confirmar exclusão' });
      }
      const valid = await bcrypt.compare(password, u.encrypted_password);
      if (!valid) {
        return res.status(401).json({ error: 'Senha incorreta' });
      }
    }

    // Anonimiza PII e marca soft-delete. Email vira placeholder único
    // pra liberar o e-mail original pra futuros cadastros.
    await query(
      `UPDATE users
          SET deleted_at         = NOW(),
              email              = 'deleted-' || id || '@deleted.local',
              name               = 'Usuário removido',
              encrypted_password = NULL,
              google_id          = NULL,
              avatar_url         = NULL,
              profile_photo      = NULL,
              phone              = NULL,
              bio                = NULL,
              updated_at         = NOW()
        WHERE id = $1`,
      [req.user.id]
    );

    // Cancela a recorrência no Mercado Pago E marca a sub local como canceled.
    // NÃO usar DELETE: (1) sem cancelar no MP a cobrança recorrente continua
    // pro cartão do usuário excluído; (2) deletar a linha faz o próximo webhook
    // do MP RE-INSERIR a sub via external_reference, ressuscitando-a. Manter a
    // linha 'canceled' faz o webhook só dar UPDATE (idempotente).
    try {
      await billing._hardCancelActiveSubsForUser(req.user.id, 'account_deleted');
    } catch (e) {
      console.error('Falha ao cancelar assinatura na exclusão de conta:', e?.message);
      // Não bloqueia a exclusão LGPD — mas registra pra reconciliação manual.
    }

    // ── LGPD: purga os DADOS do tenant, não só a PII do usuário ──
    // Antes só o registro em `users` era anonimizado; clubes, atletas (com foto),
    // treinos, jogos e arquivos ficavam pra sempre. Aqui apagamos tudo que o
    // usuário É DONO. Quase todas as tabelas têm ON DELETE CASCADE a partir de
    // workspaces, então deletar as workspaces próprias cascateia o resto.
    try {
      const fs = require('fs');
      const path = require('path');
      const uploadDir = path.resolve(process.env.UPLOAD_DIR || '../uploads');

      // 1) Coleta caminhos de arquivos físicos ANTES de apagar as linhas.
      const owned = await query('SELECT id FROM workspaces WHERE owner_id = $1', [req.user.id]);
      const ownedIds = owned.rows.map(r => r.id);
      const filePaths = [];
      if (ownedIds.length > 0) {
        const f1 = await query(
          `SELECT file_path FROM training_activity_files WHERE workspace_id = ANY($1) AND file_path IS NOT NULL`,
          [ownedIds]
        );
        const f2 = await query(
          `SELECT logo_path FROM clubs WHERE workspace_id = ANY($1) AND logo_path IS NOT NULL`,
          [ownedIds]
        );
        const f3 = await query(
          `SELECT photo_url FROM athletes WHERE workspace_id = ANY($1) AND photo_url IS NOT NULL`,
          [ownedIds]
        );
        for (const row of f1.rows) filePaths.push(row.file_path);
        for (const row of f2.rows) filePaths.push(row.logo_path);
        for (const row of f3.rows) filePaths.push(row.photo_url);
      }
      // Foto de perfil do próprio usuário (capturada antes da anonimização acima —
      // relê do banco pra garantir; já foi setada NULL, então usa a lista se houver).

      // 2) Destaca a assinatura das workspaces pra ela SOBREVIVER ao cascade
      //    (subscriptions→workspaces é CASCADE; queremos manter a linha canceled).
      await query('UPDATE subscriptions SET workspace_id = NULL WHERE user_id = $1', [req.user.id]);

      // 3) Apaga as workspaces próprias — cascateia clubes, atletas, categorias,
      //    conteúdos, microciclos/sessões/atividades, jogos, quadro tático,
      //    lesões, temas do mês, memberships dessas workspaces, etc.
      await query('DELETE FROM workspaces WHERE owner_id = $1', [req.user.id]);

      // 4) Remove o usuário das workspaces de OUTRAS pessoas (memberships).
      await query('DELETE FROM workspace_members WHERE user_id = $1', [req.user.id]);
      await query('DELETE FROM announcement_dismissals WHERE user_id = $1', [req.user.id]);

      // 5) Apaga os arquivos físicos (best-effort — nunca derruba a exclusão).
      for (const p of filePaths) {
        try {
          const rel = String(p).replace(/^\/uploads\//, '');
          const abs = path.join(uploadDir, rel);
          // Confinamento: só apaga dentro do uploadDir (evita path traversal).
          if (abs.startsWith(uploadDir) && fs.existsSync(abs)) fs.unlinkSync(abs);
        } catch (_) { /* ignora arquivo individual */ }
      }
    } catch (e) {
      console.error('Falha na purga LGPD de dados do tenant:', e?.message);
      // A conta já está soft-deleted (sem login). Registra pra limpeza manual.
    }

    // Invalida cache de accessible workspaces/clubs pra esse user
    if (typeof authMiddleware.invalidateAccessibleCache === 'function') {
      authMiddleware.invalidateAccessibleCache(req.user.id);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// POST /api/auth/set-password — primeira senha (pra quem entrou só via Google)
router.post('/set-password', authMiddleware, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Senha deve ter pelo menos 8 caracteres' });
    }
    // Confirma que ainda não tem senha (não é endpoint pra trocar — pra trocar usa /password)
    const u = await query('SELECT encrypted_password FROM users WHERE id = $1', [req.user.id]);
    if (u.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    if (u.rows[0].encrypted_password) {
      return res.status(400).json({ error: 'Senha já está definida. Use /api/auth/password pra trocar.' });
    }
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(password, 10);
    await query(
      `UPDATE users SET encrypted_password = $1, updated_at = NOW() WHERE id = $2`,
      [hash, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Set password error:', err);
    res.status(500).json({ error: 'Failed to set password' });
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

// =============================================================
// Google OAuth login
// =============================================================
// POST /api/auth/google — recebe ID token do Google e autentica/cria conta
router.post('/google', loginLimiter, async (req, res) => {
  try {
    if (!googleClient) {
      return res.status(501).json({ error: 'Google OAuth not configured' });
    }
    const { credential } = req.body || {};
    if (!credential) return res.status(400).json({ error: 'Missing credential' });

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email_verified) {
      return res.status(401).json({ error: 'Google email não verificado' });
    }

    const email = (payload.email || '').toLowerCase();
    const googleId = payload.sub;
    const name = payload.name || payload.given_name || email.split('@')[0];

    // Procura por google_id ou email — ignora contas removidas (LGPD)
    let userRes = await query(
      'SELECT id, email, name, phone, bio, profile_photo, role, deleted_at FROM users WHERE (google_id = $1 OR email = $2) AND deleted_at IS NULL LIMIT 1',
      [googleId, email]
    );

    let user;
    if (userRes.rows.length > 0) {
      user = userRes.rows[0];
      if (user.deleted_at) {
        return res.status(401).json({ error: 'Conta removida' });
      }
      delete user.deleted_at;
      // Atualiza google_id se ainda não estiver setado (vinculação à conta existente)
      await query(
        `UPDATE users SET google_id = COALESCE(google_id, $1), auth_provider = CASE WHEN google_id IS NULL THEN 'google' ELSE auth_provider END WHERE id = $2`,
        [googleId, user.id]
      );
    } else {
      // Cria nova conta
      const role = isAdmin(email) ? 'admin' : 'coach';
      const insertRes = await query(
        `INSERT INTO users (email, name, google_id, auth_provider, role, terms_accepted_at, terms_version)
         VALUES ($1, $2, $3, 'google', $4, now(), '2026-05-11')
         RETURNING id, email, name, phone, bio, profile_photo, role`,
        [email, name, googleId, role]
      );
      user = insertRes.rows[0];

      // Cria workspace inicial
      const wsName = (name && name.trim()) || (email.split('@')[0]) || 'Minha conta';
      const wsRes = await query(
        `INSERT INTO workspaces (name, owner_id) VALUES ($1, $2) RETURNING id`,
        [wsName, user.id]
      );
      const workspaceId = wsRes.rows[0].id;

      if (role !== 'admin') {
        if (isLifetime(email)) {
          await query(
            `INSERT INTO subscriptions (user_id, workspace_id, plan_id, status, current_period_start, current_period_end)
             VALUES ($1, $2, 'lifetime', 'active', now(), now() + interval '100 years')`,
            [user.id, workspaceId]
          );
        } else {
          const trialEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          await query(
            `INSERT INTO subscriptions (user_id, workspace_id, plan_id, status, trial_ends_at, current_period_start, current_period_end)
             VALUES ($1, $2, 'clube', 'trialing', $3, now(), $3)`,
            [user.id, workspaceId, trialEnd]
          );
        }
      }

      // Email de boas-vindas — o cadastro via Google não disparava (só o
      // cadastro por email/senha chamava). Fire-and-forget.
      const appUrl = process.env.APP_BASE_URL || 'https://app.tactiplan.faggin.com.br';
      sendWelcomeEmail({ to: user.email, name: user.name, trialDaysLeft: 30, appUrl })
        .catch(err => console.error('sendWelcomeEmail (google) error:', err?.message));
    }

    user.tenant_id = user.id;
    const token = generateToken(user);
    res.json({ token, user });
  } catch (err) {
    console.error('Google auth error:', err?.message);
    res.status(401).json({ error: 'Falha ao autenticar com Google' });
  }
});

// =============================================================
// Password recovery
// =============================================================

// POST /api/auth/forgot — solicita link de redefinição
router.post('/forgot', recoveryLimiter, [
  body('email').isEmail(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email } = req.body;
    const user = await query('SELECT id, email, name FROM users WHERE email = $1', [email]);

    // Resposta uniforme — não revela se o e-mail existe
    if (user.rows.length === 0) {
      return res.json({ ok: true });
    }

    const u = user.rows[0];
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

    // invalida tokens anteriores ainda não usados
    await query('UPDATE password_resets SET used_at = now() WHERE user_id = $1 AND used_at IS NULL', [u.id]);

    await query(
      `INSERT INTO password_resets (user_id, token_hash, expires_at, requested_ip)
       VALUES ($1, $2, $3, $4)`,
      [u.id, tokenHash, expiresAt, req.ip]
    );

    const baseUrl = process.env.APP_BASE_URL || 'https://app.tactiplan.faggin.com.br';
    const resetUrl = `${baseUrl}/#/reset-password?token=${rawToken}`;

    try {
      await sendPasswordResetEmail({ to: u.email, name: u.name, resetUrl });
    } catch (err) {
      console.error('Failed to send reset email:', err);
      // Não vazamos a falha de envio pro cliente — log only.
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Erro ao processar solicitação' });
  }
});

// POST /api/auth/reset — completa a redefinição
router.post('/reset', recoveryLimiter, [
  body('token').isString().isLength({ min: 32 }),
  body('password').isLength({ min: 6 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { token, password } = req.body;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const result = await query(
      `SELECT pr.id, pr.user_id, pr.expires_at, pr.used_at, u.email
       FROM password_resets pr
       JOIN users u ON u.id = pr.user_id
       WHERE pr.token_hash = $1`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Token inválido' });
    }
    const row = result.rows[0];
    if (row.used_at) return res.status(400).json({ error: 'Token já utilizado' });
    if (new Date(row.expires_at) < new Date()) return res.status(400).json({ error: 'Token expirado' });

    const hashed = await bcrypt.hash(password, 10);

    await query('UPDATE users SET encrypted_password = $1, updated_at = now() WHERE id = $2', [hashed, row.user_id]);
    await query('UPDATE password_resets SET used_at = now() WHERE id = $1', [row.id]);

    res.json({ ok: true });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Erro ao redefinir senha' });
  }
});

module.exports = router;
