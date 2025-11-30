import { useQuery } from "@tanstack/react-query";

export type PermissionLevel = 'none' | 'view' | 'edit' | 'admin';

export interface RbacPermissions {
  groups: string[];
  moduleAccess: Record<string, boolean>;
  featurePermissions: Record<string, PermissionLevel>;
  isGlobalAdmin: boolean;
}

export interface UserWithRbac {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  role: string;
  rbac: RbacPermissions | null;
}

const permissionLevelOrder: Record<PermissionLevel, number> = {
  'none': 0,
  'view': 1,
  'edit': 2,
  'admin': 3
};

export function useRbac() {
  const { data: user, isLoading } = useQuery<UserWithRbac>({
    queryKey: ['/api/auth/user'],
  });

  const rbac = user?.rbac;

  const hasModuleAccess = (moduleKey: string): boolean => {
    if (user?.role === 'admin') return true;
    if (!rbac) return false;
    if (rbac.isGlobalAdmin) return true;
    return rbac.moduleAccess[moduleKey] === true;
  };

  const hasFeaturePermission = (
    moduleKey: string, 
    featureKey: string, 
    requiredLevel: PermissionLevel = 'view'
  ): boolean => {
    if (user?.role === 'admin') return true;
    if (!rbac) return false;
    if (rbac.isGlobalAdmin) return true;
    
    if (!hasModuleAccess(moduleKey)) return false;
    
    const fullKey = `${moduleKey}.${featureKey}`;
    const userLevel = rbac.featurePermissions[fullKey] || 'none';
    
    return permissionLevelOrder[userLevel] >= permissionLevelOrder[requiredLevel];
  };

  const canView = (moduleKey: string, featureKey: string): boolean => {
    return hasFeaturePermission(moduleKey, featureKey, 'view');
  };

  const canEdit = (moduleKey: string, featureKey: string): boolean => {
    return hasFeaturePermission(moduleKey, featureKey, 'edit');
  };

  const canAdmin = (moduleKey: string, featureKey: string): boolean => {
    return hasFeaturePermission(moduleKey, featureKey, 'admin');
  };

  const isAdmin = (): boolean => {
    if (!rbac) return user?.role === 'admin';
    return rbac.isGlobalAdmin || user?.role === 'admin';
  };

  const isInGroup = (groupName: string): boolean => {
    if (!rbac) return false;
    return rbac.groups.includes(groupName);
  };

  return {
    user,
    rbac,
    isLoading,
    hasModuleAccess,
    hasFeaturePermission,
    canView,
    canEdit,
    canAdmin,
    isAdmin,
    isInGroup,
    groups: rbac?.groups || [],
  };
}

export const MODULE_KEYS = {
  TASTING: 'tasting',
  B2B: 'b2b',
  LMS: 'lms',
  COMPLIANCE: 'compliance',
  SOP: 'sop',
  MAINTENANCE: 'maintenance',
  OPERATIONS: 'operations',
  PROCEDURES: 'daily_procedures',
  SUPPORT: 'customer_support',
  APPLE_GAME: 'apple_game',
  EXPERIENCE: 'experience_library'
} as const;

export const FEATURE_KEYS = {
  TASTING: {
    PRODUCTS: 'products',
    PRODUCTS_MANAGE: 'products_manage',
    MEDIA: 'media',
    QR_CODES: 'qr_codes',
    SURVEYS: 'surveys',
    RECOMMENDATIONS: 'recommendations',
    SETTINGS: 'settings'
  },
  B2B: {
    CUSTOMERS: 'customers',
    CUSTOMERS_MANAGE: 'customers_manage',
    ORDERS: 'orders',
    ORDERS_MANAGE: 'orders_manage',
    PRICING: 'pricing',
    PRICING_MANAGE: 'pricing_manage',
    SALES_REPS: 'sales_reps',
    IMPERSONATION: 'impersonation',
    SETTINGS: 'settings'
  },
  LMS: {
    COURSES: 'courses',
    COURSES_MANAGE: 'courses_manage',
    LESSONS: 'lessons',
    LESSONS_MANAGE: 'lessons_manage',
    QUIZZES: 'quizzes',
    QUIZZES_MANAGE: 'quizzes_manage',
    CERTIFICATES: 'certificates',
    ENROLLMENTS: 'enrollments',
    REPORTS: 'reports',
    SETTINGS: 'settings'
  },
  COMPLIANCE: {
    TASKS: 'tasks',
    TASKS_MANAGE: 'tasks_manage',
    CALENDAR: 'calendar',
    REMINDERS: 'reminders',
    HISTORY: 'history',
    ARCHIVE: 'archive',
    PORTAL_CREDENTIALS: 'portal_credentials',
    REPORTS: 'reports',
    SETTINGS: 'settings'
  }
} as const;
