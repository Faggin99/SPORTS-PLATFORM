import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { effectivePermissions, PERMISSIONS } from '../lib/memberPermissions';

// Hook que retorna helpers de permissão baseados na workspace ativa.
//   const { can, allowedCategoryIds } = useCan();
//   if (can('training:edit')) { ... }
//   if (allowedCategoryIds === null) { ... } // todas
export function useCan() {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();

  const { permissionSet, allowedCategoryIds, isOwner } = useMemo(() => {
    // Admin global: passa tudo
    if (user?.role === 'admin') {
      return { permissionSet: new Set(PERMISSIONS), allowedCategoryIds: null, isOwner: true };
    }
    if (!activeWorkspace) {
      return { permissionSet: new Set(), allowedCategoryIds: [], isOwner: false };
    }
    const isOwner = !!activeWorkspace.is_owner;
    const memberLike = {
      role: activeWorkspace.role,
      permissions: activeWorkspace.permissions ?? null,
    };
    const set = effectivePermissions(memberLike, { isOwner });
    const cats = isOwner ? null : (activeWorkspace.category_ids || null);
    return { permissionSet: set, allowedCategoryIds: cats, isOwner };
  }, [user, activeWorkspace]);

  function can(permission) {
    if (!permission) return true;
    return permissionSet.has(permission);
  }

  return { can, allowedCategoryIds, isOwner, permissions: permissionSet };
}
