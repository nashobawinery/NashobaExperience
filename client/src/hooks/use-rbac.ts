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
    if (!rbac) return false;
    if (rbac.isGlobalAdmin) return true;
    if (user?.role === 'admin') return true;
    return rbac.moduleAccess[moduleKey] === true;
  };

  const hasFeaturePermission = (
    moduleKey: string, 
    featureKey: string, 
    requiredLevel: PermissionLevel = 'view'
  ): boolean => {
    if (!rbac) return false;
    if (rbac.isGlobalAdmin) return true;
    if (user?.role === 'admin') return true;
    
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
  TASTING: 'tasting_experience',
  B2B: 'b2b_wholesale',
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
    PRODUCTS: 'product_management',
    MEDIA: 'media_management',
    QR_CODES: 'qr_codes',
    SURVEYS: 'survey_management',
    DISCOUNTS: 'discount_management',
    TRIVIA: 'trivia_management',
    SETTINGS: 'settings',
    ANALYTICS: 'analytics'
  },
  B2B: {
    CUSTOMERS: 'customer_management',
    ORDERS: 'order_management',
    PRODUCTS: 'product_catalog',
    PRICING: 'pricing_tiers',
    SALES_REPS: 'sales_rep_management',
    REPORTS: 'reports'
  },
  LMS: {
    COURSES: 'course_management',
    ENROLLMENTS: 'enrollment_management',
    QUIZZES: 'quiz_management',
    CERTIFICATES: 'certificate_management',
    PROGRESS: 'progress_tracking',
    REPORTS: 'reports'
  },
  COMPLIANCE: {
    TASKS: 'task_management',
    REMINDERS: 'reminder_management',
    DOCUMENTS: 'document_management',
    REPORTS: 'reports'
  }
} as const;
