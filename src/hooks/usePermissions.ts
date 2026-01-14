import { useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import {
  UserRole,
  CRMModule,
  Action,
  hasPermission,
  canAccessModule,
  isAtLeastRole,
  getRolePermissions,
  PERMISSION_MATRIX,
  CRM_MODULES,
  ACTIONS,
  RolePermissionOverrides,
} from '@/lib/permissions';

export interface UsePermissionsReturn {
  /** Current user's role */
  role: UserRole;

  /** Check if user has permission for a specific action on a module */
  can: (module: CRMModule, action: Action) => boolean;

  /** Check if user can view a module */
  canView: (module: CRMModule) => boolean;

  /** Check if user can create in a module */
  canCreate: (module: CRMModule) => boolean;

  /** Check if user can edit in a module */
  canEdit: (module: CRMModule) => boolean;

  /** Check if user can delete in a module */
  canDelete: (module: CRMModule) => boolean;

  /** Check if user can access a module (has view permission) */
  canAccess: (module: CRMModule) => boolean;

  /** Is the current user an owner */
  isOwner: boolean;

  /** Is the current user a manager */
  isManager: boolean;

  /** Is the current user staff */
  isStaff: boolean;

  /** Check if user's role is at least the specified level */
  isAtLeast: (minimumRole: UserRole) => boolean;

  /** All permissions for current role (with overrides applied) */
  permissions: typeof PERMISSION_MATRIX[UserRole];

  /** Custom role permission overrides from settings (if any) */
  customOverrides: RolePermissionOverrides | undefined;
}

/**
 * Hook for checking user permissions
 * Now supports custom permission overrides stored in app settings
 *
 * @example
 * const { can, canCreate, isOwner } = usePermissions();
 *
 * // Check specific permission
 * if (can('products', 'delete')) { ... }
 *
 * // Check common actions
 * if (canCreate('products')) { ... }
 *
 * // Check role level
 * if (isOwner) { ... }
 * if (isAtLeast('manager')) { ... }
 */
export function usePermissions(): UsePermissionsReturn {
  const { userRole } = useAuth();
  const { settings } = useSettings();

  // Ensure we have a valid role, default to staff (most restrictive)
  const role: UserRole = (userRole as UserRole) || 'staff';

  // Get custom permission overrides from settings
  const customOverrides = settings.rolePermissions;

  // Memoized permission checker with custom overrides
  const can = useCallback(
    (module: CRMModule, action: Action): boolean => {
      return hasPermission(role, module, action, customOverrides);
    },
    [role, customOverrides]
  );

  // Convenience methods for common actions
  const canView = useCallback(
    (module: CRMModule): boolean => can(module, ACTIONS.VIEW),
    [can]
  );

  const canCreate = useCallback(
    (module: CRMModule): boolean => can(module, ACTIONS.CREATE),
    [can]
  );

  const canEdit = useCallback(
    (module: CRMModule): boolean => can(module, ACTIONS.EDIT),
    [can]
  );

  const canDelete = useCallback(
    (module: CRMModule): boolean => can(module, ACTIONS.DELETE),
    [can]
  );

  const canAccess = useCallback(
    (module: CRMModule): boolean => canAccessModule(role, module, customOverrides),
    [role, customOverrides]
  );

  // Role checking helpers
  const isOwner = role === 'owner';
  const isManager = role === 'manager';
  const isStaff = role === 'staff';

  const isAtLeast = useCallback(
    (minimumRole: UserRole): boolean => isAtLeastRole(role, minimumRole),
    [role]
  );

  // Get all permissions for current role (with overrides applied)
  const permissions = useMemo(
    () => getRolePermissions(role, customOverrides),
    [role, customOverrides]
  );

  return {
    role,
    can,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canAccess,
    isOwner,
    isManager,
    isStaff,
    isAtLeast,
    permissions,
    customOverrides,
  };
}

// Re-export constants for convenience
export { CRM_MODULES, ACTIONS } from '@/lib/permissions';
export type { CRMModule, Action, UserRole, RolePermissionOverrides } from '@/lib/permissions';
