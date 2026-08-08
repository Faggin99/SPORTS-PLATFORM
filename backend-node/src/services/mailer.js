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

// Wrapper visual comum pros templates novos — mantém tudo minimalista e consistente.
function wrap({ title, bodyHtml }) {
  return `
    <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #0f172a;">
      <h2 style="margin: 0 0 12px 0;">${title}</h2>
      ${bodyHtml}
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #94a3b8;">TactiPlan</p>
    </div>
  `;
}

function button(href, label, color = '#2563eb') {
  return `
    <p style="text-align: center; margin: 24px 0;">
      <a href="${href}" style="display: inline-block; padding: 12px 24px; background: ${color}; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">${label}</a>
    </p>
  `;
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

// Boas-vindas — disparado logo após signup. Menciona os 30d do plano Clube grátis.
async function sendWelcomeEmail({ to, name, trialDaysLeft, appUrl }) {
  const days = Number.isFinite(trialDaysLeft) ? trialDaysLeft : 30;
  const url = appUrl || 'https://app.tactiplan.faggin.com.br';
  const subject = `Bem-vindo ao TactiPlan, ${name || 'treinador'}!`;
  const text = `Olá, ${name || ''}.\n\nSua conta no TactiPlan está pronta. Você já começa com ${days} dias grátis do plano Clube — acesso completo a treinos, jogos, plantel e o quadro tático.\n\nComece agora: ${url}\n\nBons treinos!\n— TactiPlan`;
  const bodyHtml = `
    <p style="line-height: 1.5;">Olá, <strong>${name || ''}</strong>.</p>
    <p style="line-height: 1.5;">Sua conta está pronta. Você já começa com <strong>${days} dias grátis do plano Clube</strong> — o pacote completo: treinos semanais, gestão de jogos, plantel e o quadro tático.</p>
    ${button(url, 'Abrir o TactiPlan')}
    <p style="line-height: 1.5; color: #64748b; font-size: 13px;">Qualquer dúvida, é só responder este e-mail.</p>
  `;
  return sendMail({ to, subject, html: wrap({ title: 'Bem-vindo ao TactiPlan', bodyHtml }), text });
}

// Trial acabando — mandado quando o teste expira em ~3 dias.
async function sendTrialExpiringEmail({ to, name, daysLeft, appUrl, billingUrl }) {
  const days = Number.isFinite(daysLeft) ? daysLeft : 3;
  const url = appUrl || 'https://app.tactiplan.faggin.com.br';
  const bUrl = billingUrl || `${url.replace(/\/$/, '')}/#/billing`;
  const subject = `Seu teste grátis acaba em ${days} ${days === 1 ? 'dia' : 'dias'} — TactiPlan`;
  const text = `Olá, ${name || ''}.\n\nSeu teste grátis do plano Clube termina em ${days} ${days === 1 ? 'dia' : 'dias'}. Pra continuar sem interrupção, ative a assinatura:\n\n${bUrl}\n\nSe preferir, é só ignorar — a conta segue disponível, mas os recursos pagos param até você assinar.\n\n— TactiPlan`;
  const bodyHtml = `
    <p style="line-height: 1.5;">Olá, <strong>${name || ''}</strong>.</p>
    <p style="line-height: 1.5;">Seu teste grátis do <strong>plano Clube</strong> termina em <strong>${days} ${days === 1 ? 'dia' : 'dias'}</strong>. Pra continuar com tudo funcionando (treinos, jogos, plantel, quadro tático), ative sua assinatura:</p>
    ${button(bUrl, 'Ativar assinatura')}
    <p style="line-height: 1.5; color: #64748b; font-size: 13px;">Se preferir, é só ignorar — a conta segue disponível, mas os recursos pagos ficam bloqueados até você assinar.</p>
  `;
  return sendMail({ to, subject, html: wrap({ title: `Seu teste acaba em ${days} ${days === 1 ? 'dia' : 'dias'}`, bodyHtml }), text });
}

// Pagamento aprovado.
async function sendPaymentApprovedEmail({ to, name, planName, amountBRL, appUrl }) {
  const url = appUrl || 'https://app.tactiplan.faggin.com.br';
  const plan = planName || 'TactiPlan';
  const amountStr = Number.isFinite(amountBRL) && amountBRL > 0
    ? amountBRL.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : null;
  const subject = `Pagamento confirmado — ${plan}`;
  const text = `Olá, ${name || ''}.\n\nRecebemos seu pagamento${amountStr ? ` de ${amountStr}` : ''} do plano ${plan}. Sua assinatura está ativa.\n\nAcessar: ${url}\n\nObrigado por seguir com o TactiPlan!\n— TactiPlan`;
  const bodyHtml = `
    <p style="line-height: 1.5;">Olá, <strong>${name || ''}</strong>.</p>
    <p style="line-height: 1.5;">Recebemos seu pagamento${amountStr ? ` de <strong>${amountStr}</strong>` : ''} do plano <strong>${plan}</strong>. Sua assinatura está ativa.</p>
    ${button(url, 'Abrir o TactiPlan')}
    <p style="line-height: 1.5; color: #64748b; font-size: 13px;">Obrigado por seguir com a gente. Bons treinos!</p>
  `;
  return sendMail({ to, subject, html: wrap({ title: 'Pagamento confirmado', bodyHtml }), text });
}

// Pagamento falhou/recusado.
async function sendPaymentFailedEmail({ to, name, planName, billingUrl }) {
  const plan = planName || 'TactiPlan';
  const bUrl = billingUrl || 'https://app.tactiplan.faggin.com.br/#/billing';
  const subject = `Não conseguimos processar seu pagamento — ${plan}`;
  const text = `Olá, ${name || ''}.\n\nO pagamento do plano ${plan} não foi aprovado pelo seu meio de pagamento. Sua assinatura pode ser suspensa se não regularizar.\n\nAtualize a forma de pagamento:\n${bUrl}\n\n— TactiPlan`;
  const bodyHtml = `
    <p style="line-height: 1.5;">Olá, <strong>${name || ''}</strong>.</p>
    <p style="line-height: 1.5;">O pagamento do plano <strong>${plan}</strong> não foi aprovado pelo seu meio de pagamento. Pra evitar interrupção, atualize os dados de cobrança:</p>
    ${button(bUrl, 'Atualizar pagamento', '#dc2626')}
    <p style="line-height: 1.5; color: #64748b; font-size: 13px;">Se já resolveu diretamente com sua operadora/banco, pode ignorar este e-mail.</p>
  `;
  return sendMail({ to, subject, html: wrap({ title: 'Pagamento não aprovado', bodyHtml }), text });
}

module.exports = {
  sendMail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendTrialExpiringEmail,
  sendPaymentApprovedEmail,
  sendPaymentFailedEmail,
};
