// ============================================================
// Role-Based Access Control (RBAC) Permission System
// ============================================================

// ============================================
// ROLE TYPES
// ============================================
export type UserRole = 'owner' | 'manager' | 'staff';

// ============================================
// MODULE DEFINITIONS
// ============================================
export const CRM_MODULES = {
  DASHBOARD: 'dashboard',
  PRODUCTS: 'products',
  SUPPLIERS: 'suppliers',
  CUSTOMERS: 'customers',
  SALES: 'sales',
  CONSIGNMENTS: 'consignments',
  EXPENSES: 'expenses',
  REPORTS: 'reports',
  ANALYTICS: 'analytics',
  SETTINGS: 'settings',
  USER_MANAGEMENT: 'user_management',
} as const;

export type CRMModule = typeof CRM_MODULES[keyof typeof CRM_MODULES];

// ============================================
// ACTION DEFINITIONS
// ============================================
export const ACTIONS = {
  VIEW: 'view',
  CREATE: 'create',
  EDIT: 'edit',
  DELETE: 'delete',
} as const;

export type Action = typeof ACTIONS[keyof typeof ACTIONS];

// ============================================
// PERMISSION MATRIX
// ============================================
// Define what each role can do for each module
// true = allowed, false = denied

type ModulePermissions = {
  [action in Action]?: boolean;
};

type RolePermissions = {
  [module in CRMModule]: ModulePermissions;
};

type PermissionMatrix = {
  [role in UserRole]: RolePermissions;
};

export const PERMISSION_MATRIX: PermissionMatrix = {
  owner: {
    dashboard: { view: true },
    products: { view: true, create: true, edit: true, delete: true },
    suppliers: { view: true, create: true, edit: true, delete: true },
    customers: { view: true, create: true, edit: true, delete: true },
    sales: { view: true, create: true, edit: true, delete: true },
    consignments: { view: true, create: true, edit: true, delete: true },
    expenses: { view: true, create: true, edit: true, delete: true },
    reports: { view: true },
    analytics: { view: true },
    settings: { view: true, create: true, edit: true, delete: true },
    user_management: { view: true, create: true, edit: true, delete: true },
  },
  manager: {
    dashboard: { view: true },
    products: { view: true, create: true, edit: true, delete: true },
    suppliers: { view: true, create: true, edit: true, delete: true },
    customers: { view: true, create: true, edit: true, delete: true },
    sales: { view: true, create: true, edit: true, delete: true },
    consignments: { view: true, create: true, edit: true, delete: true },
    expenses: { view: true, create: true, edit: true, delete: true },
    reports: { view: false },
    analytics: { view: true },
    settings: { view: false },
    user_management: { view: false },
  },
  staff: {
    dashboard: { view: true },
    products: { view: true, create: false, edit: false, delete: false },
    suppliers: { view: true, create: false, edit: false, delete: false },
    customers: { view: true, create: true, edit: false, delete: false },
    sales: { view: true, create: true, edit: false, delete: false },
    consignments: { view: true, create: false, edit: false, delete: false },
    expenses: { view: true, create: false, edit: false, delete: false },
    reports: { view: false },
    analytics: { view: false },
    settings: { view: false },
    user_management: { view: false },
  },
};

// ============================================
// PERMISSION CHECKING FUNCTIONS
// ============================================

/**
 * Check if a role has permission for a specific action on a module
 */
export function hasPermission(
  role: UserRole,
  module: CRMModule,
  action: Action
): boolean {
  return PERMISSION_MATRIX[role]?.[module]?.[action] ?? false;
}

/**
 * Check if a role can access a module (has view permission)
 */
export function canAccessModule(role: UserRole, module: CRMModule): boolean {
  return hasPermission(role, module, ACTIONS.VIEW);
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): RolePermissions {
  return PERMISSION_MATRIX[role];
}

/**
 * Check if role is at least a certain level in the hierarchy
 * Hierarchy: staff < manager < owner
 */
export function isAtLeastRole(currentRole: UserRole, minimumRole: UserRole): boolean {
  const roleHierarchy: UserRole[] = ['staff', 'manager', 'owner'];
  return roleHierarchy.indexOf(currentRole) >= roleHierarchy.indexOf(minimumRole);
}

/**
 * Get role hierarchy level (0 = staff, 1 = manager, 2 = owner)
 */
export function getRoleLevel(role: UserRole): number {
  const roleHierarchy: UserRole[] = ['staff', 'manager', 'owner'];
  return roleHierarchy.indexOf(role);
}

// ============================================
// ROLE DISPLAY HELPERS
// ============================================
export const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Owner',
  manager: 'Manager',
  staff: 'Staff',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  owner: 'Full access to all features including settings and user management',
  manager: 'Full access to operations, reports, and analytics. Cannot manage users or settings.',
  staff: 'Can view data and create sales. Limited editing capabilities.',
};

export const ROLE_BADGE_VARIANTS: Record<UserRole, 'default' | 'secondary' | 'outline'> = {
  owner: 'default',
  manager: 'secondary',
  staff: 'outline',
};

// ============================================
// MODULE DISPLAY HELPERS
// ============================================
export const MODULE_LABELS: Record<CRMModule, string> = {
  dashboard: 'Dashboard',
  products: 'Products',
  suppliers: 'Suppliers',
  customers: 'Customers',
  sales: 'Sales/POS',
  consignments: 'Consignments',
  expenses: 'Expenses',
  reports: 'Reports',
  analytics: 'Analytics',
  settings: 'Settings',
  user_management: 'User Management',
};

export const ACTION_LABELS: Record<Action, string> = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
};
