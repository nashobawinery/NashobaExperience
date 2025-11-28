import { useMemo } from 'react';
import { useB2bAuth } from '@/contexts/B2bAuthContext';
import {
  B2bUserRole,
  RolePermissions,
  getUserRole,
  getPermissions,
  canAccessTab,
  canPerformAction,
  isScopedToAssigned,
  isViewOwnOnly,
  getVisibleTabs,
} from '@/lib/b2b-permissions';

/**
 * Hook to access B2B role-based permissions
 * 
 * Usage:
 * const { permissions, can, role } = useB2bPermissions();
 * 
 * // Check if user can view a tab
 * if (can.viewTab('customers')) { ... }
 * 
 * // Check if user can create in a tab
 * if (can.create('orders')) { ... }
 * 
 * // Check if view is scoped to assigned items
 * if (can.scopedToAssigned('customers')) { ... }
 */
export function useB2bPermissions() {
  const { currentUser } = useB2bAuth();
  
  const role: B2bUserRole = useMemo(() => {
    return getUserRole(currentUser?.type);
  }, [currentUser?.type]);
  
  const permissions: RolePermissions = useMemo(() => {
    return getPermissions(role);
  }, [role]);
  
  const salesRepId = useMemo(() => {
    return currentUser?.type === 'sales_rep' ? currentUser.id : null;
  }, [currentUser?.type, currentUser?.id]);
  
  const can = useMemo(() => ({
    // Tab visibility
    viewTab: (tab: keyof RolePermissions['tabs']) => canAccessTab(role, tab),
    
    // CRUD operations
    create: (tab: keyof RolePermissions['tabs']) => canPerformAction(role, tab, 'create'),
    edit: (tab: keyof RolePermissions['tabs']) => canPerformAction(role, tab, 'edit'),
    delete: (tab: keyof RolePermissions['tabs']) => canPerformAction(role, tab, 'delete'),
    
    // Scope checks
    scopedToAssigned: (tab: keyof RolePermissions['tabs']) => isScopedToAssigned(role, tab),
    viewOwnOnly: (tab: keyof RolePermissions['tabs']) => isViewOwnOnly(role, tab),
    
    // Special permissions
    approveCustomers: permissions.canApproveCustomers,
    manageAdmins: permissions.canManageAdmins,
    manageTiers: permissions.canManageTiers,
    changePayrollSettings: permissions.canChangePayrollSettings,
    sendPayroll: permissions.canSendPayroll,
    assignPayPeriods: permissions.canAssignPayPeriods,
    editWelcomeStatement: permissions.canEditWelcomeStatement,
    impersonateCustomers: permissions.canImpersonateCustomers,
  }), [role, permissions]);
  
  const visibleTabs = useMemo(() => {
    return getVisibleTabs(role);
  }, [role]);
  
  return {
    role,
    permissions,
    can,
    visibleTabs,
    salesRepId,
    isAdmin: role === 'admin',
    isSalesRep: role === 'sales_rep',
    isPowerUser: role === 'power_user',
    isViewOnly: role === 'view_only',
  };
}
