/**
 * B2B Role-Based Permissions System
 * 
 * Defines 4 user roles with specific access levels:
 * - Admin: Full access to all features
 * - Sales Rep: Limited access focused on their assigned customers
 * - Power User: Extended access but cannot manage other users
 * - View Only: Read-only access across the platform
 */

export type B2bUserRole = 'admin' | 'sales_rep' | 'power_user' | 'view_only';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'full';

export interface TabPermission {
  canView: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  scopeToAssigned?: boolean; // For sales reps: only see their assigned items
  viewOwnOnly?: boolean; // For viewing only own records (e.g., sales rep profile)
}

export interface RolePermissions {
  tabs: {
    customers: TabPermission;
    orders: TabPermission;
    tasks: TabPermission;
    exportImport: TabPermission;
    marketing: TabPermission;
    commitments: TabPermission;
    qrCodes: TabPermission;
    slideshow: TabPermission;
    notes: TabPermission;
    reports: TabPermission;
    payroll: TabPermission;
    commissions: TabPermission;
    salesReps: TabPermission;
    settings: TabPermission;
  };
  canApproveCustomers: boolean;
  canManageAdmins: boolean;
  canManageTiers: boolean;
  canChangePayrollSettings: boolean;
  canSendPayroll: boolean;
  canAssignPayPeriods: boolean;
  canEditWelcomeStatement: boolean;
  canImpersonateCustomers: boolean;
}

// Define permissions for each role
export const rolePermissions: Record<B2bUserRole, RolePermissions> = {
  admin: {
    tabs: {
      customers: { canView: true, canCreate: true, canEdit: true, canDelete: true },
      orders: { canView: true, canCreate: true, canEdit: true, canDelete: true },
      tasks: { canView: true, canCreate: true, canEdit: true, canDelete: true },
      exportImport: { canView: true, canCreate: true, canEdit: true },
      marketing: { canView: true, canCreate: true, canEdit: true, canDelete: true },
      commitments: { canView: true, canCreate: true, canEdit: true },
      qrCodes: { canView: true, canCreate: true },
      slideshow: { canView: true, canCreate: true, canEdit: true, canDelete: true },
      notes: { canView: true, canCreate: true, canEdit: true, canDelete: true },
      reports: { canView: true },
      payroll: { canView: true, canCreate: true, canEdit: true },
      commissions: { canView: true, canCreate: true, canEdit: true },
      salesReps: { canView: true, canCreate: true, canEdit: true, canDelete: true },
      settings: { canView: true, canCreate: true, canEdit: true },
    },
    canApproveCustomers: true,
    canManageAdmins: true,
    canManageTiers: true,
    canChangePayrollSettings: true,
    canSendPayroll: true,
    canAssignPayPeriods: true,
    canEditWelcomeStatement: true,
    canImpersonateCustomers: true,
  },
  
  sales_rep: {
    tabs: {
      customers: { 
        canView: true, 
        canCreate: true, 
        canEdit: true, 
        canDelete: false,
        scopeToAssigned: true // Only see assigned customers
      },
      orders: { 
        canView: true, 
        canCreate: true, 
        canEdit: false, 
        canDelete: false,
        scopeToAssigned: true // Only see orders for assigned customers
      },
      tasks: { canView: false }, // No access
      exportImport: { canView: false }, // No access
      marketing: { canView: true, canCreate: false, canEdit: false }, // View only
      commitments: { canView: true, canCreate: false, canEdit: false }, // View only
      qrCodes: { canView: true, canCreate: false }, // View only
      slideshow: { canView: false }, // No access
      notes: { canView: true, canCreate: true, canEdit: true, canDelete: true }, // Full access
      reports: { canView: true, scopeToAssigned: true }, // View reports scoped to assigned customers
      payroll: { canView: false }, // No access
      commissions: { 
        canView: true, 
        canCreate: false, 
        canEdit: false,
        scopeToAssigned: true // Only see commissions for their customers
      },
      salesReps: { 
        canView: true, 
        canCreate: false, 
        canEdit: false,
        viewOwnOnly: true // Only see their own profile
      },
      settings: { canView: false }, // No access
    },
    canApproveCustomers: false,
    canManageAdmins: false,
    canManageTiers: false,
    canChangePayrollSettings: false,
    canSendPayroll: false,
    canAssignPayPeriods: false,
    canEditWelcomeStatement: false,
    canImpersonateCustomers: false,
  },
  
  power_user: {
    tabs: {
      customers: { canView: true, canCreate: true, canEdit: true, canDelete: false },
      orders: { canView: true, canCreate: true, canEdit: true, canDelete: false },
      tasks: { canView: true, canCreate: true, canEdit: true, canDelete: true },
      exportImport: { canView: true, canCreate: true, canEdit: true },
      marketing: { canView: true, canCreate: true, canEdit: true, canDelete: false },
      commitments: { canView: true, canCreate: true, canEdit: true },
      qrCodes: { canView: true, canCreate: true },
      slideshow: { canView: true, canCreate: true, canEdit: true, canDelete: false },
      notes: { canView: true, canCreate: true, canEdit: true, canDelete: true },
      reports: { canView: true },
      payroll: { canView: true, canCreate: false, canEdit: false }, // View only
      commissions: { canView: true, canCreate: false, canEdit: false }, // View only
      salesReps: { canView: true, canCreate: false, canEdit: false }, // View only
      settings: { canView: true, canCreate: false, canEdit: false }, // View only
    },
    canApproveCustomers: true,
    canManageAdmins: false,
    canManageTiers: false,
    canChangePayrollSettings: false,
    canSendPayroll: false,
    canAssignPayPeriods: false,
    canEditWelcomeStatement: false,
    canImpersonateCustomers: true,
  },
  
  view_only: {
    tabs: {
      customers: { canView: true, canCreate: false, canEdit: false, canDelete: false },
      orders: { canView: true, canCreate: false, canEdit: false, canDelete: false },
      tasks: { canView: true, canCreate: false, canEdit: false, canDelete: false },
      exportImport: { canView: false }, // No export/import for view only
      marketing: { canView: true, canCreate: false, canEdit: false },
      commitments: { canView: true, canCreate: false, canEdit: false },
      qrCodes: { canView: true, canCreate: false },
      slideshow: { canView: true, canCreate: false, canEdit: false },
      notes: { canView: true, canCreate: false, canEdit: false },
      reports: { canView: true },
      payroll: { canView: true, canCreate: false, canEdit: false },
      commissions: { canView: true, canCreate: false, canEdit: false },
      salesReps: { canView: true, canCreate: false, canEdit: false },
      settings: { canView: true, canCreate: false, canEdit: false },
    },
    canApproveCustomers: false,
    canManageAdmins: false,
    canManageTiers: false,
    canChangePayrollSettings: false,
    canSendPayroll: false,
    canAssignPayPeriods: false,
    canEditWelcomeStatement: false,
    canImpersonateCustomers: false,
  },
};

/**
 * Get the role for a B2B user based on their type
 */
export function getUserRole(userType: string | undefined): B2bUserRole {
  switch (userType) {
    case 'admin':
      return 'admin';
    case 'sales_rep':
      return 'sales_rep';
    case 'power_user':
      return 'power_user';
    case 'view_only':
      return 'view_only';
    default:
      return 'view_only'; // Default to most restrictive
  }
}

/**
 * Get permissions for a specific role
 */
export function getPermissions(role: B2bUserRole): RolePermissions {
  return rolePermissions[role];
}

/**
 * Check if a user can access a specific tab
 */
export function canAccessTab(
  role: B2bUserRole, 
  tab: keyof RolePermissions['tabs']
): boolean {
  return rolePermissions[role].tabs[tab].canView;
}

/**
 * Check if a user can perform a specific action on a tab
 */
export function canPerformAction(
  role: B2bUserRole,
  tab: keyof RolePermissions['tabs'],
  action: 'create' | 'edit' | 'delete'
): boolean {
  const tabPermission = rolePermissions[role].tabs[tab];
  switch (action) {
    case 'create':
      return tabPermission.canCreate ?? false;
    case 'edit':
      return tabPermission.canEdit ?? false;
    case 'delete':
      return tabPermission.canDelete ?? false;
    default:
      return false;
  }
}

/**
 * Check if a user's view is scoped to their assigned items
 */
export function isScopedToAssigned(
  role: B2bUserRole,
  tab: keyof RolePermissions['tabs']
): boolean {
  return rolePermissions[role].tabs[tab].scopeToAssigned ?? false;
}

/**
 * Check if a user can only view their own records
 */
export function isViewOwnOnly(
  role: B2bUserRole,
  tab: keyof RolePermissions['tabs']
): boolean {
  return rolePermissions[role].tabs[tab].viewOwnOnly ?? false;
}

/**
 * Get list of visible tabs for a role
 */
export function getVisibleTabs(role: B2bUserRole): (keyof RolePermissions['tabs'])[] {
  const permissions = rolePermissions[role];
  return Object.entries(permissions.tabs)
    .filter(([_, tabPerm]) => tabPerm.canView)
    .map(([tabName]) => tabName as keyof RolePermissions['tabs']);
}
