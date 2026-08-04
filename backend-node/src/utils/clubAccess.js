// Helpers de acesso compartilhado a clubes.
// Filosofia:
//   - `tenant_id` continua sendo o OWNER do clube (criador, dono do dado).
//   - Quando um user é convidado como coach/assistant, ele vê e edita os dados
//     do tenant=owner como se fosse o próprio owner, mas dentro do escopo do clube.
//   - Pra cada request, o auth middleware carrega `req.user.accessibleClubs`,
//     um array de { club_id, tenant_id (owner), role, is_owner }.

const { query } = require('../config/database');

/**
 * Retorna lista de clubes que o usuário pode acessar:
 *   - clubes que ele possui (tenant_id = userId)
 *   - clubes onde ele é membro aceito (club_members)
 *
 * Cada item: { club_id, tenant_id (owner), role: 'owner'|'coach'|'assistant', is_owner }
 */
async function getAccessibleClubs(userId) {
  const result = await query(
    `SELECT c.id AS club_id, c.tenant_id, 'owner' AS role, TRUE AS is_owner
       FROM clubs c
      WHERE c.tenant_id = $1
      UNION
     SELECT c.id AS club_id, c.tenant_id, m.role, FALSE AS is_owner
       FROM club_members m
       JOIN clubs c ON c.id = m.club_id
      WHERE m.user_id = $1 AND m.accepted_at IS NOT NULL`,
    [userId]
  );
  return result.rows;
}

/**
 * Retorna { tenant_id (owner), role } se o user tem acesso ao clube, senão null.
 */
function findClubAccess(accessibleClubs, clubId) {
  if (!clubId) return null;
  return accessibleClubs.find(c => c.club_id === clubId) || null;
}

/**
 * Lista de tenants (owners) cujos dados o user pode ler.
 * Inclui o próprio user (pra recursos sem clube — ex.: contents customs) +
 * os owners de todos os clubes onde ele é membro.
 */
function tenantsAccessibleBy(userId, accessibleClubs) {
  const set = new Set([userId]);
  for (const c of accessibleClubs) set.add(c.tenant_id);
  return Array.from(set);
}

/**
 * Verifica se o role é suficiente pra uma operação.
 *   - owner       → pode tudo (inclui gerenciar membros e billing)
 *   - coach       → CRUD em treinos/atletas/jogos
 *   - assistant   → só leitura
 */
function canWrite(role) {
  return role === 'owner' || role === 'coach';
}

function canManageMembers(role) {
  return role === 'owner';
}

module.exports = {
  getAccessibleClubs,
  findClubAccess,
  tenantsAccessibleBy,
  canWrite,
  canManageMembers,
};
