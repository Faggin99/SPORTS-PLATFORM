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

// Boas-vindas — disparado logo após signup. Se trialDaysLeft > 0 fala do
// trial do Pro; senão (padrão hoje) apresenta o plano Free permanente.
async function sendWelcomeEmail({ to, name, trialDaysLeft, appUrl }) {
  const days = Number.isFinite(trialDaysLeft) ? trialDaysLeft : 0;
  const url = appUrl || 'https://app.tactiplan.faggin.com.br';
  const bUrl = `${url.replace(/\/$/, '')}/#/billing`;
  const subject = `Bem-vindo ao TactiPlan, ${name || 'treinador'}!`;
  if (days > 0) {
    const text = `Olá, ${name || ''}.\n\nSua conta no TactiPlan está pronta. Você já começa com ${days} dias grátis do plano Pro — treinos, jogos, plantel e o quadro tático. Ao final, você continua no plano Free (planejamento, jogos e estatísticas) ou assina pra manter tudo.\n\nComece agora: ${url}\n\nBons treinos!\n— TactiPlan`;
    const bodyHtml = `
      <p style="line-height: 1.5;">Olá, <strong>${name || ''}</strong>.</p>
      <p style="line-height: 1.5;">Sua conta está pronta. Você já começa com <strong>${days} dias grátis do plano Pro</strong>: treinos semanais, gestão de jogos, plantel e o quadro tático. Ao final, você continua no plano Free (planejamento, jogos e estatísticas) ou assina pra manter tudo.</p>
      ${button(url, 'Abrir o TactiPlan')}
      <p style="line-height: 1.5; color: #64748b; font-size: 13px;">Qualquer dúvida, é só responder este e-mail.</p>
    `;
    return sendMail({ to, subject, html: wrap({ title: 'Bem-vindo ao TactiPlan', bodyHtml }), text });
  }
  const text = `Olá, ${name || ''}.\n\nSua conta no TactiPlan está pronta, no plano Free — grátis pra sempre: planejamento semanal de treinos, jogos, plantel e estatísticas.\n\nComece agora: ${url}\n\nQuando quiser o quadro tático interativo e as exportações em PDF/vídeo, os planos Pro e Clube estão em: ${bUrl}\n\nBons treinos!\n— TactiPlan`;
  const bodyHtml = `
    <p style="line-height: 1.5;">Olá, <strong>${name || ''}</strong>.</p>
    <p style="line-height: 1.5;">Sua conta está pronta, no <strong>plano Free — grátis pra sempre</strong>: planejamento semanal de treinos, gestão de jogos, plantel e estatísticas.</p>
    ${button(url, 'Abrir o TactiPlan')}
    <p style="line-height: 1.5;">Quando quiser o <strong>quadro tático interativo</strong> e as <strong>exportações em PDF e vídeo</strong>, os planos Pro e Clube estão a um clique: <a href="${bUrl}" style="color:#2563eb;">ver planos</a>.</p>
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
  const text = `Olá, ${name || ''}.\n\nSeu período de avaliação termina em ${days} ${days === 1 ? 'dia' : 'dias'}. Pra continuar sem interrupção, ative a assinatura:\n\n${bUrl}\n\nSe não assinar, tudo bem: você continua no plano Free (treinos, jogos, plantel e estatísticas seguem funcionando) e seus dados ficam salvos. Só o quadro tático e as exportações ficam aguardando a assinatura.\n\n— TactiPlan`;
  const bodyHtml = `
    <p style="line-height: 1.5;">Olá, <strong>${name || ''}</strong>.</p>
    <p style="line-height: 1.5;">Seu período de avaliação termina em <strong>${days} ${days === 1 ? 'dia' : 'dias'}</strong>. Pra continuar com tudo funcionando (treinos, jogos, plantel, quadro tático), ative sua assinatura:</p>
    ${button(bUrl, 'Ativar assinatura')}
    <p style="line-height: 1.5; color: #64748b; font-size: 13px;">Se não assinar, tudo bem: você continua no <strong>plano Free</strong> (treinos, jogos, plantel e estatísticas seguem funcionando) e <strong>seus dados ficam salvos</strong>. Só o quadro tático e as exportações ficam aguardando a assinatura.</p>
  `;
  return sendMail({ to, subject, html: wrap({ title: `Seu teste acaba em ${days} ${days === 1 ? 'dia' : 'dias'}`, bodyHtml }), text });
}

// Trial terminou — convite pra assinar e continuar de onde parou.
async function sendTrialExpiredEmail({ to, name, appUrl, billingUrl }) {
  const url = appUrl || 'https://app.tactiplan.faggin.com.br';
  const bUrl = billingUrl || `${url.replace(/\/$/, '')}/#/billing`;
  const subject = 'Seu teste terminou — você continua no plano Free · TactiPlan';
  const text = `Olá, ${name || ''}.\n\nSeu período de avaliação do TactiPlan terminou e sua conta passou pro plano Free: treinos, jogos, plantel e estatísticas continuam funcionando, e suas jogadas ficam salvas. Pra voltar a usar o quadro tático e as exportações, é só ativar a assinatura:\n\n${bUrl}\n\n— TactiPlan`;
  const bodyHtml = `
    <p style="line-height: 1.5;">Olá, <strong>${name || ''}</strong>.</p>
    <p style="line-height: 1.5;">Seu período de avaliação terminou e sua conta passou pro <strong>plano Free</strong>: treinos, jogos, plantel e estatísticas continuam funcionando, e <strong>suas jogadas ficam salvas</strong>. Pra voltar a usar o quadro tático e as exportações, é só ativar a assinatura:</p>
    ${button(bUrl, 'Ativar assinatura')}
    <p style="line-height: 1.5; color: #64748b; font-size: 13px;">Ficou com alguma dúvida ou precisa de mais tempo pra avaliar? Responde este e-mail que a gente conversa.</p>
  `;
  return sendMail({ to, subject, html: wrap({ title: 'Seu teste terminou — você continua no Free', bodyHtml }), text });
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
  sendTrialExpiredEmail,
  sendPaymentApprovedEmail,
  sendPaymentFailedEmail,
};
