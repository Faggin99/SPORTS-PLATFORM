// Emails com tratamento especial no cadastro.
// Edite aqui pra adicionar/remover usuários iniciais sem mexer no banco.

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'arthurfaggin@gmail.com')
  .toLowerCase()
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const LIFETIME_EMAILS = (process.env.LIFETIME_EMAILS || 'prof.lauromartins@gmail.com')
  .toLowerCase()
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function isAdmin(email) {
  return ADMIN_EMAILS.includes(String(email || '').toLowerCase());
}

function isLifetime(email) {
  return LIFETIME_EMAILS.includes(String(email || '').toLowerCase());
}

module.exports = { ADMIN_EMAILS, LIFETIME_EMAILS, isAdmin, isLifetime };
