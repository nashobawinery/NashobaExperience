import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import type { User } from "@shared/schema";

export type PermissionLevel = 'none' | 'view' | 'edit' | 'admin';

export interface RbacPermissions {
  groups: string[];
  moduleAccess: Record<string, boolean>;
  featurePermissions: Record<string, PermissionLevel>;
  isGlobalAdmin: boolean;
}

export interface UserWithRbac extends User {
  rbac: RbacPermissions | null;
}

const permissionLevelOrder: Record<PermissionLevel, number> = {
  'none': 0,
  'view': 1,
  'edit': 2,
  'admin': 3
};

export function useAuth() {
  const { data: user, isLoading } = useQuery<UserWithRbac | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 0,
    gcTime: 1000 * 60 * 5,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const rbac = user?.rbac;

  const hasModuleAccess = (moduleKey: string): boolean => {
    if (!rbac) return user?.role === 'admin';
    if (rbac.isGlobalAdmin || user?.role === 'admin') return true;
    return rbac.moduleAccess[moduleKey] === true;
  };

  const hasFeaturePermission = (
    moduleKey: string, 
    featureKey: string, 
    requiredLevel: PermissionLevel = 'view'
  ): boolean => {
    if (!rbac) return user?.role === 'admin';
    if (rbac.isGlobalAdmin || user?.role === 'admin') return true;
    
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

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin" || rbac?.isGlobalAdmin === true,
    rbac,
    hasModuleAccess,
    hasFeaturePermission,
    canView,
    canEdit,
    canAdmin,
    groups: rbac?.groups || [],
  };
}
