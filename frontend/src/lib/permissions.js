/**
 * Sistema de Permissões baseado em Roles
 *
 * Roles disponíveis:
 * - superadmin: Acesso total ao sistema
 * - admin: Administrador do tenant (pode gerenciar atletas)
 * - coach: Treinador (pode criar/editar treinos)
 * - staff: Equipe técnica (apenas visualização)
 * - user: Usuário básico
 */

/**
 * Obtém o usuário atual do localStorage
 */
export const getCurrentUser = () => {
  const userJson = localStorage.getItem('user');
  return userJson ? JSON.parse(userJson) : null;
};

/**
 * Verifica se o usuário tem uma role específica
 */
export const hasRole = (role) => {
  const user = getCurrentUser();
  return user?.role === role;
};

/**
 * Verifica se o usuário tem alguma das roles especificadas
 */
export const hasAnyRole = (roles) => {
  const user = getCurrentUser();
  return user && roles.includes(user.role);
};

/**
 * Verifica se é administrador (superadmin ou admin)
 */
export const isAdmin = () => {
  return hasAnyRole(['superadmin', 'admin']);
};

/**
 * Verifica se é superadmin
 */
export const isSuperAdmin = () => {
  return hasRole('superadmin');
};

/**
 * Verifica se é coach (treinador)
 */
export const isCoach = () => {
  return hasRole('coach');
};

/**
 * Verifica se é staff (equipe técnica)
 */
export const isStaff = () => {
  return hasRole('staff');
};

// ========================================
// PERMISSÕES ESPECÍFICAS
// ========================================

/**
 * Pode gerenciar atletas (adicionar/editar/deletar)?
 */
export const canManageAthletes = () => {
  return hasAnyRole(['superadmin', 'admin']);
};

/**
 * Pode visualizar atletas?
 */
export const canViewAthletes = () => {
  return hasAnyRole(['superadmin', 'admin', 'coach', 'staff']);
};

/**
 * Pode criar/editar treinos?
 */
export const canManageTrainings = () => {
  return hasAnyRole(['superadmin', 'admin', 'coach']);
};

/**
 * Pode visualizar treinos?
 */
export const canViewTrainings = () => {
  return hasAnyRole(['superadmin', 'admin', 'coach', 'staff']);
};

/**
 * Pode fazer upload de arquivos (vídeos/PDFs)?
 */
export const canUploadFiles = () => {
  return hasAnyRole(['superadmin', 'admin', 'coach']);
};

/**
 * Pode gerenciar tenants?
 */
export const canManageTenants = () => {
  return hasRole('superadmin');
};

// ========================================
// COMPONENTE DE PERMISSÃO (React)
// ========================================

/**
 * Componente que só renderiza filhos se o usuário tiver permissão
 *
 * Uso:
 * <PermissionGuard permission={canManageAthletes}>
 *   <button>Adicionar Atleta</button>
 * </PermissionGuard>
 */
export const PermissionGuard = ({ permission, children, fallback = null }) => {
  if (typeof permission === 'function') {
    return permission() ? children : fallback;
  }
  return permission ? children : fallback;
};

/**
 * Componente que só renderiza filhos se o usuário tiver a role
 *
 * Uso:
 * <RoleGuard roles={['admin', 'coach']}>
 *   <button>Editar Treino</button>
 * </RoleGuard>
 */
export const RoleGuard = ({ roles, children, fallback = null }) => {
  const hasPermission = Array.isArray(roles)
    ? hasAnyRole(roles)
    : hasRole(roles);

  return hasPermission ? children : fallback;
};

export default {
  getCurrentUser,
  hasRole,
  hasAnyRole,
  isAdmin,
  isSuperAdmin,
  isCoach,
  isStaff,
  canManageAthletes,
  canViewAthletes,
  canManageTrainings,
  canViewTrainings,
  canUploadFiles,
  canManageTenants,
  PermissionGuard,
  RoleGuard,
};
