import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useB2bAuth } from '@/contexts/B2bAuthContext';
import {
  B2bUserRole,
  RolePermissions,
  TabPermission,
  getUserRole,
  getPermissions,
  rolePermissions as defaultRolePermissions,
} from '@/lib/b2b-permissions';
import type { B2bRolePermission } from '@shared/schema';

interface DatabaseTabPermission {
  canView?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  scopeToAssigned?: boolean;
  viewOwnOnly?: boolean;
}

interface DatabaseSpecialPermissions {
  canApproveCustomers?: boolean;
  canManageAdmins?: boolean;
  canManageTiers?: boolean;
  canChangePayrollSettings?: boolean;
  canSendPayroll?: boolean;
  canAssignPayPeriods?: boolean;
  canEditWelcomeStatement?: boolean;
  canImpersonateCustomers?: boolean;
  canManagePermissions?: boolean;
}

function convertDbToRolePermissions(
  dbPermission: B2bRolePermission | undefined,
  defaultPerms: RolePermissions
): RolePermissions {
  if (!dbPermission) {
    return defaultPerms;
  }

  const tabPerms = dbPermission.tabPermissions as Record<string, DatabaseTabPermission> | null;
  const specialPerms = dbPermission.specialPermissions as DatabaseSpecialPermissions | null;

  if (!tabPerms) {
    return defaultPerms;
  }

  const tabs: RolePermissions['tabs'] = {
    customers: convertTabPermission(tabPerms.customers, defaultPerms.tabs.customers),
    orders: convertTabPermission(tabPerms.orders, defaultPerms.tabs.orders),
    tasks: convertTabPermission(tabPerms.tasks, defaultPerms.tabs.tasks),
    exportImport: convertTabPermission(tabPerms.exportImport, defaultPerms.tabs.exportImport),
    marketing: convertTabPermission(tabPerms.marketing, defaultPerms.tabs.marketing),
    commitments: convertTabPermission(tabPerms.commitments, defaultPerms.tabs.commitments),
    qrCodes: convertTabPermission(tabPerms.qrCodes, defaultPerms.tabs.qrCodes),
    slideshow: convertTabPermission(tabPerms.slideshow, defaultPerms.tabs.slideshow),
    notes: convertTabPermission(tabPerms.notes, defaultPerms.tabs.notes),
    payroll: convertTabPermission(tabPerms.payroll, defaultPerms.tabs.payroll),
    commissions: convertTabPermission(tabPerms.commissions, defaultPerms.tabs.commissions),
    salesReps: convertTabPermission(tabPerms.salesReps, defaultPerms.tabs.salesReps),
    settings: convertTabPermission(tabPerms.settings, defaultPerms.tabs.settings),
  };

  return {
    tabs,
    canApproveCustomers: specialPerms?.canApproveCustomers ?? defaultPerms.canApproveCustomers,
    canManageAdmins: specialPerms?.canManageAdmins ?? defaultPerms.canManageAdmins,
    canManageTiers: specialPerms?.canManageTiers ?? defaultPerms.canManageTiers,
    canChangePayrollSettings: specialPerms?.canChangePayrollSettings ?? defaultPerms.canChangePayrollSettings,
    canSendPayroll: specialPerms?.canSendPayroll ?? defaultPerms.canSendPayroll,
    canAssignPayPeriods: specialPerms?.canAssignPayPeriods ?? defaultPerms.canAssignPayPeriods,
    canEditWelcomeStatement: specialPerms?.canEditWelcomeStatement ?? defaultPerms.canEditWelcomeStatement,
    canImpersonateCustomers: specialPerms?.canImpersonateCustomers ?? defaultPerms.canImpersonateCustomers,
  };
}

function convertTabPermission(
  dbPerm: DatabaseTabPermission | undefined,
  defaultPerm: TabPermission
): TabPermission {
  if (!dbPerm) {
    return defaultPerm;
  }

  return {
    canView: dbPerm.canView ?? defaultPerm.canView,
    canCreate: dbPerm.canCreate ?? defaultPerm.canCreate,
    canEdit: dbPerm.canEdit ?? defaultPerm.canEdit,
    canDelete: dbPerm.canDelete ?? defaultPerm.canDelete,
    scopeToAssigned: dbPerm.scopeToAssigned ?? defaultPerm.scopeToAssigned,
    viewOwnOnly: dbPerm.viewOwnOnly ?? defaultPerm.viewOwnOnly,
  };
}

/**
 * Hook to access B2B role-based permissions
 * 
 * Fetches permissions from the database with fallback to hardcoded defaults.
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
  const { user } = useB2bAuth();
  
  const role: B2bUserRole = useMemo(() => {
    return getUserRole(user?.type);
  }, [user?.type]);
  
  const { data: dbRolePermissions } = useQuery<B2bRolePermission[]>({
    queryKey: ['/api/b2b/role-permissions'],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  
  const permissions: RolePermissions = useMemo(() => {
    const defaultPerms = getPermissions(role);
    
    if (!dbRolePermissions || dbRolePermissions.length === 0) {
      return defaultPerms;
    }
    
    const dbPermission = dbRolePermissions.find((p) => p.roleName === role);
    return convertDbToRolePermissions(dbPermission, defaultPerms);
  }, [role, dbRolePermissions]);
  
  const salesRepId = useMemo(() => {
    return user?.type === 'sales_rep' ? user.id : null;
  }, [user?.type, user?.id]);
  
  const can = useMemo(() => ({
    viewTab: (tab: keyof RolePermissions['tabs']) => permissions.tabs[tab]?.canView ?? false,
    
    create: (tab: keyof RolePermissions['tabs']) => permissions.tabs[tab]?.canCreate ?? false,
    edit: (tab: keyof RolePermissions['tabs']) => permissions.tabs[tab]?.canEdit ?? false,
    delete: (tab: keyof RolePermissions['tabs']) => permissions.tabs[tab]?.canDelete ?? false,
    
    scopedToAssigned: (tab: keyof RolePermissions['tabs']) => permissions.tabs[tab]?.scopeToAssigned ?? false,
    viewOwnOnly: (tab: keyof RolePermissions['tabs']) => permissions.tabs[tab]?.viewOwnOnly ?? false,
    
    approveCustomers: permissions.canApproveCustomers,
    manageAdmins: permissions.canManageAdmins,
    manageTiers: permissions.canManageTiers,
    changePayrollSettings: permissions.canChangePayrollSettings,
    sendPayroll: permissions.canSendPayroll,
    assignPayPeriods: permissions.canAssignPayPeriods,
    editWelcomeStatement: permissions.canEditWelcomeStatement,
    impersonateCustomers: permissions.canImpersonateCustomers,
  }), [permissions]);
  
  const visibleTabs = useMemo(() => {
    return Object.entries(permissions.tabs)
      .filter(([_, tabPerm]) => tabPerm.canView)
      .map(([tabName]) => tabName as keyof RolePermissions['tabs']);
  }, [permissions]);
  
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
