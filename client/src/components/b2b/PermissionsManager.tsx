import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Shield, 
  ChevronDown, 
  ChevronRight, 
  RefreshCw, 
  Save,
  Users,
  ShoppingCart,
  ClipboardList,
  Download,
  Megaphone,
  Target,
  QrCode,
  Image,
  FileText,
  DollarSign,
  Settings,
  UserCheck,
  UserCog,
  Percent,
  Receipt,
  MessageCircle,
  Eye,
  Pencil,
  Plus,
  Trash2
} from "lucide-react";
import type { B2bRolePermission } from "@shared/schema";

interface TabPermission {
  canView?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  scopeToAssigned?: boolean;
  viewOwnOnly?: boolean;
}

interface SpecialPermission {
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

const TAB_CONFIG = [
  { key: 'customers', label: 'Customers', icon: Users, description: 'Customer management and viewing' },
  { key: 'orders', label: 'Orders', icon: ShoppingCart, description: 'Order creation and management' },
  { key: 'tasks', label: 'Tasks', icon: ClipboardList, description: 'Task management' },
  { key: 'exportImport', label: 'Export/Import', icon: Download, description: 'Database export and import' },
  { key: 'marketing', label: 'Marketing', icon: Megaphone, description: 'Email templates and marketing' },
  { key: 'commitments', label: 'Commitments', icon: Target, description: 'Tier commitment tracking' },
  { key: 'qrCodes', label: 'QR Codes', icon: QrCode, description: 'QR code generation' },
  { key: 'slideshow', label: 'Slideshow', icon: Image, description: 'Landing page slideshow' },
  { key: 'notes', label: 'Notes', icon: FileText, description: 'Improvement notes' },
  { key: 'payroll', label: 'Payroll', icon: DollarSign, description: 'Payroll management' },
  { key: 'commissions', label: 'Commissions', icon: Receipt, description: 'Commission tracking' },
  { key: 'salesReps', label: 'Sales Reps', icon: UserCheck, description: 'Sales rep management' },
  { key: 'settings', label: 'Settings', icon: Settings, description: 'System settings' },
];

const SPECIAL_PERMISSIONS_CONFIG = [
  { key: 'canApproveCustomers', label: 'Approve Customers', description: 'Can approve pending customer applications' },
  { key: 'canManageAdmins', label: 'Manage Admins', description: 'Can add, edit, and remove admin accounts' },
  { key: 'canManageTiers', label: 'Manage Tiers', description: 'Can edit pricing tier configurations' },
  { key: 'canChangePayrollSettings', label: 'Change Payroll Settings', description: 'Can modify payroll configuration' },
  { key: 'canSendPayroll', label: 'Send Payroll', description: 'Can send payroll reports' },
  { key: 'canAssignPayPeriods', label: 'Assign Pay Periods', description: 'Can assign commissions to pay periods' },
  { key: 'canEditWelcomeStatement', label: 'Edit Welcome Statement', description: 'Can edit the catalog welcome message' },
  { key: 'canImpersonateCustomers', label: 'Impersonate Customers', description: 'Can place orders on behalf of customers' },
  { key: 'canManagePermissions', label: 'Manage Permissions', description: 'Can modify role permissions (admin only)' },
];

const PERMISSION_ICONS = {
  canView: Eye,
  canCreate: Plus,
  canEdit: Pencil,
  canDelete: Trash2,
};

export function PermissionsManager() {
  const { toast } = useToast();
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set(['admin']));
  const [pendingChanges, setPendingChanges] = useState<Record<string, B2bRolePermission>>({});
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; roleName: string | null }>({ isOpen: false, roleName: null });

  const { data: rolePermissions, isLoading } = useQuery<B2bRolePermission[]>({
    queryKey: ['/api/b2b/role-permissions'],
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async ({ roleName, data }: { roleName: string; data: Partial<B2bRolePermission> }) => {
      return apiRequest('PUT', `/api/b2b/role-permissions/${roleName}`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/b2b/role-permissions'] });
      setPendingChanges((prev) => {
        const newChanges = { ...prev };
        delete newChanges[variables.roleName];
        return newChanges;
      });
      toast({
        title: "Permissions Updated",
        description: `Permissions for ${variables.roleName} have been saved.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update permissions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    },
  });

  const resetPermissionMutation = useMutation({
    mutationFn: async (roleName: string) => {
      return apiRequest('POST', `/api/b2b/role-permissions/${roleName}/reset`);
    },
    onSuccess: (_, roleName) => {
      queryClient.invalidateQueries({ queryKey: ['/api/b2b/role-permissions'] });
      setPendingChanges((prev) => {
        const newChanges = { ...prev };
        delete newChanges[roleName];
        return newChanges;
      });
      toast({
        title: "Permissions Reset",
        description: `Permissions for ${roleName} have been reset to defaults.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to reset permissions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    },
  });

  const toggleRole = (roleName: string) => {
    setExpandedRoles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(roleName)) {
        newSet.delete(roleName);
      } else {
        newSet.add(roleName);
      }
      return newSet;
    });
  };

  const getPermissionData = (roleName: string): B2bRolePermission | undefined => {
    if (pendingChanges[roleName]) {
      return pendingChanges[roleName];
    }
    return rolePermissions?.find((rp) => rp.roleName === roleName);
  };

  const updateTabPermission = (
    roleName: string, 
    tabKey: string, 
    permissionKey: keyof TabPermission, 
    value: boolean
  ) => {
    const current = getPermissionData(roleName);
    if (!current) return;

    const currentTabPermissions = (current.tabPermissions as Record<string, TabPermission>) || {};
    const currentTabPerm = currentTabPermissions[tabKey] || {};
    
    const updatedTabPerm = {
      ...currentTabPerm,
      [permissionKey]: value,
    };

    const updatedPermission: B2bRolePermission = {
      ...current,
      tabPermissions: {
        ...currentTabPermissions,
        [tabKey]: updatedTabPerm,
      },
    };

    setPendingChanges((prev) => ({
      ...prev,
      [roleName]: updatedPermission,
    }));
  };

  const updateSpecialPermission = (
    roleName: string,
    permissionKey: keyof SpecialPermission,
    value: boolean
  ) => {
    const current = getPermissionData(roleName);
    if (!current) return;

    const currentSpecialPermissions = (current.specialPermissions as SpecialPermission) || {};
    
    const updatedPermission: B2bRolePermission = {
      ...current,
      specialPermissions: {
        ...currentSpecialPermissions,
        [permissionKey]: value,
      },
    };

    setPendingChanges((prev) => ({
      ...prev,
      [roleName]: updatedPermission,
    }));
  };

  const handleSave = (roleName: string) => {
    const changes = pendingChanges[roleName];
    if (!changes) return;

    updatePermissionMutation.mutate({
      roleName,
      data: {
        tabPermissions: changes.tabPermissions,
        specialPermissions: changes.specialPermissions,
      },
    });
  };

  const handleReset = (roleName: string) => {
    setConfirmDialog({ isOpen: true, roleName });
  };

  const confirmReset = () => {
    if (confirmDialog.roleName) {
      resetPermissionMutation.mutate(confirmDialog.roleName);
    }
    setConfirmDialog({ isOpen: false, roleName: null });
  };

  const hasPendingChanges = (roleName: string) => {
    return !!pendingChanges[roleName];
  };

  const getRoleIcon = (roleName: string) => {
    switch (roleName) {
      case 'admin': return Shield;
      case 'sales_rep': return UserCheck;
      case 'power_user': return UserCog;
      case 'view_only': return Eye;
      default: return Users;
    }
  };

  const getRoleBadgeVariant = (roleName: string): "default" | "secondary" | "outline" => {
    switch (roleName) {
      case 'admin': return 'default';
      case 'sales_rep': return 'secondary';
      case 'power_user': return 'outline';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedRoles = [...(rolePermissions || [])].sort((a, b) => {
    const order = ['admin', 'power_user', 'sales_rep', 'view_only'];
    return order.indexOf(a.roleName) - order.indexOf(b.roleName);
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-serif flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Role Permissions
          </CardTitle>
          <CardDescription>
            Configure what each user role can access and modify in the B2B platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedRoles.map((role) => {
              const RoleIcon = getRoleIcon(role.roleName);
              const isExpanded = expandedRoles.has(role.roleName);
              const permData = getPermissionData(role.roleName);
              const tabPerms = (permData?.tabPermissions || {}) as Record<string, TabPermission>;
              const specialPerms = (permData?.specialPermissions || {}) as SpecialPermission;

              return (
                <Collapsible
                  key={role.roleName}
                  open={isExpanded}
                  onOpenChange={() => toggleRole(role.roleName)}
                >
                  <div className="border rounded-lg">
                    <CollapsibleTrigger className="w-full" data-testid={`role-trigger-${role.roleName}`}>
                      <div className="flex items-center justify-between p-4 hover-elevate rounded-t-lg">
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <RoleIcon className="h-5 w-5" />
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{role.roleDisplayName}</span>
                              <Badge variant={getRoleBadgeVariant(role.roleName)}>
                                {role.roleName}
                              </Badge>
                              {hasPendingChanges(role.roleName) && (
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                                  Unsaved
                                </Badge>
                              )}
                              {!role.isDefault && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                                  Customized
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {role.roleDescription}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {hasPendingChanges(role.roleName) && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSave(role.roleName);
                              }}
                              disabled={updatePermissionMutation.isPending}
                              data-testid={`button-save-${role.roleName}`}
                            >
                              <Save className="h-4 w-4 mr-1" />
                              Save
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReset(role.roleName);
                            }}
                            disabled={resetPermissionMutation.isPending}
                            data-testid={`button-reset-${role.roleName}`}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Reset
                          </Button>
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="p-4 pt-0 space-y-6 border-t">
                        <div>
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            Tab Access Permissions
                          </h4>
                          <div className="grid gap-3">
                            {TAB_CONFIG.map((tab) => {
                              const TabIcon = tab.icon;
                              const tabPerm = tabPerms[tab.key] || {};
                              
                              return (
                                <div
                                  key={tab.key}
                                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                                >
                                  <div className="flex items-center gap-3">
                                    <TabIcon className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <p className="text-sm font-medium">{tab.label}</p>
                                      <p className="text-xs text-muted-foreground">{tab.description}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    {(['canView', 'canCreate', 'canEdit', 'canDelete'] as const).map((perm) => {
                                      const PermIcon = PERMISSION_ICONS[perm];
                                      const isEnabled = tabPerm[perm] ?? false;
                                      const isViewDisabled = perm !== 'canView' && !tabPerm.canView;
                                      
                                      return (
                                        <div key={perm} className="flex items-center gap-1.5">
                                          <Switch
                                            id={`${role.roleName}-${tab.key}-${perm}`}
                                            checked={isEnabled}
                                            disabled={isViewDisabled}
                                            onCheckedChange={(checked) => {
                                              updateTabPermission(role.roleName, tab.key, perm, checked);
                                              if (perm === 'canView' && !checked) {
                                                updateTabPermission(role.roleName, tab.key, 'canCreate', false);
                                                updateTabPermission(role.roleName, tab.key, 'canEdit', false);
                                                updateTabPermission(role.roleName, tab.key, 'canDelete', false);
                                              }
                                            }}
                                            data-testid={`switch-${role.roleName}-${tab.key}-${perm}`}
                                          />
                                          <Label 
                                            htmlFor={`${role.roleName}-${tab.key}-${perm}`}
                                            className={`text-xs flex items-center gap-1 cursor-pointer ${isViewDisabled ? 'opacity-50' : ''}`}
                                          >
                                            <PermIcon className="h-3 w-3" />
                                            {perm.replace('can', '')}
                                          </Label>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Special Permissions
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {SPECIAL_PERMISSIONS_CONFIG.map((perm) => {
                              const isEnabled = specialPerms[perm.key as keyof SpecialPermission] ?? false;
                              
                              return (
                                <div
                                  key={perm.key}
                                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                                >
                                  <div>
                                    <p className="text-sm font-medium">{perm.label}</p>
                                    <p className="text-xs text-muted-foreground">{perm.description}</p>
                                  </div>
                                  <Switch
                                    id={`${role.roleName}-special-${perm.key}`}
                                    checked={isEnabled}
                                    onCheckedChange={(checked) => {
                                      updateSpecialPermission(
                                        role.roleName, 
                                        perm.key as keyof SpecialPermission, 
                                        checked
                                      );
                                    }}
                                    data-testid={`switch-${role.roleName}-special-${perm.key}`}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground mt-6 pt-4 border-t">
            Note: Changes to permissions take effect immediately after saving. The Admin role always 
            retains full access. Sales reps are always scoped to their assigned customers regardless 
            of permission settings.
          </p>
        </CardContent>
      </Card>

      <Dialog open={confirmDialog.isOpen} onOpenChange={(open) => setConfirmDialog({ isOpen: open, roleName: confirmDialog.roleName })}>
        <DialogContent data-testid="dialog-reset-permissions">
          <DialogHeader>
            <DialogTitle>Reset Permissions?</DialogTitle>
            <DialogDescription>
              This will reset all permissions for the "{confirmDialog.roleName}" role back to their default values. 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ isOpen: false, roleName: null })}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmReset}
              disabled={resetPermissionMutation.isPending}
              data-testid="button-confirm-reset"
            >
              {resetPermissionMutation.isPending ? "Resetting..." : "Reset to Defaults"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
