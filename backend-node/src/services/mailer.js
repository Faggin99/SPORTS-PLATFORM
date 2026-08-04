const nodemailer = require('nodemailer');

let cachedTransport = null;

function buildTransport() {
  if (cachedTransport) return cachedTransport;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;

  if (!SMTP_HOST) {
    // Sem SMTP configurado: cria um transport "stream" que só loga.
    console.warn('[mailer] SMTP_HOST not set — emails will be logged, not sent.');
    cachedTransport = nodemailer.createTransport({ jsonTransport: true });
    cachedTransport._isStub = true;
    return cachedTransport;
  }

  cachedTransport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: String(SMTP_SECURE || 'false') === 'true',
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
  return cachedTransport;
}

async function sendMail({ to, subject, html, text }) {
  const transport = buildTransport();
  const from = process.env.MAIL_FROM || 'TactiPlan <no-reply@tactiplan.faggin.com.br>';
  const info = await transport.sendMail({ from, to, subject, html, text });

  if (transport._isStub) {
    console.log('[mailer:stub] would send email:', JSON.stringify({ to, subject, text: text?.slice(0, 200) }));
  }
  return info;
}

async function sendPasswordResetEmail({ to, name, resetUrl }) {
  const subject = 'Redefina sua senha — TactiPlan';
  const text = `Olá, ${name || ''}.\n\nVocê solicitou a redefinição de senha. Acesse o link abaixo (válido por 1 hora):\n\n${resetUrl}\n\nSe não foi você, pode ignorar este e-mail.\n\n— TactiPlan`;
  const html = `
    <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #0f172a;">
      <h2 style="margin: 0 0 12px 0;">Redefina sua senha</h2>
      <p style="line-height: 1.5;">Olá, <strong>${name || ''}</strong>.</p>
      <p style="line-height: 1.5;">Você solicitou a redefinição de senha. Clique no botão abaixo para criar uma nova (link válido por 1 hora):</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Redefinir senha</a>
      </p>
      <p style="line-height: 1.5; color: #64748b; font-size: 13px;">Se não foi você, pode ignorar este e-mail com segurança.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #94a3b8;">TactiPlan</p>
    </div>
  `;
  return sendMail({ to, subject, html, text });
}

module.exports = { sendMail, sendPasswordResetEmail };
