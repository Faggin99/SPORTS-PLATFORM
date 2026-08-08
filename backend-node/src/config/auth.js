// JWT config — SEM FALLBACK EM PRODUÇÃO.
// Um secret fraco/fixo permite forjar tokens de qualquer usuário. Só toleramos
// fallback pra facilitar dev local; em produção abortamos o boot.

const isProduction = process.env.NODE_ENV === 'production';
const secret = process.env.JWT_SECRET;

if (!secret || secret.length < 32) {
  const msg = 'FATAL: JWT_SECRET ausente ou com menos de 32 chars. Defina uma string forte no .env.';
  if (isProduction) {
    console.error(msg);
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }
  console.warn('[dev] ' + msg + ' — usando fallback (NÃO USAR EM PROD).');
}

module.exports = {
  jwtSecret: secret || 'DEV-ONLY-fallback-secret-change-me-in-production-32chars',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
};
