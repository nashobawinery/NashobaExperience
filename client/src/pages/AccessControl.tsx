import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { 
  ArrowLeft, 
  Users, 
  Shield, 
  Plus, 
  Edit2, 
  Trash2, 
  Settings,
  ChevronRight,
  Check,
  X,
  Eye,
  Pencil,
  UserCog,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Key,
  Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface UserGroup {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  is_system_group: boolean;
  sort_order: number;
  active: boolean;
  member_count: number;
  created_at: string;
}

interface ModuleAccess {
  moduleId: string;
  moduleKey: string;
  moduleName: string;
  hasAccess: boolean;
}

interface FeaturePermission {
  featureId: string;
  moduleId: string;
  featureKey: string;
  featureName: string;
  permissionLevel: 'none' | 'view' | 'edit' | 'admin';
}

interface GroupWithPermissions extends UserGroup {
  moduleAccess: ModuleAccess[];
  featurePermissions: FeaturePermission[];
}

interface PlatformUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  global_role: string;
  department: string | null;
  job_title: string | null;
  phone_number: string | null;
  active: boolean;
  groups: { id: string; name: string; color: string }[];
}

interface UserFormData {
  email: string;
  firstName: string;
  lastName: string;
  selectedGroupIds: string[];
  department: string;
  jobTitle: string;
  phoneNumber: string;
  globalRole: string;
}

interface SyncStatus {
  totalModules: number;
  totalFeatures: number;
  totalGroups: number;
  missingModuleAccess: number;
  missingFeaturePermissions: number;
  needsSync: boolean;
}

const permissionColors: Record<string, string> = {
  none: "bg-gray-100 text-gray-600",
  view: "bg-blue-100 text-blue-700",
  edit: "bg-amber-100 text-amber-700",
  admin: "bg-green-100 text-green-700"
};

const groupColors = [
  { value: "red", label: "Red", class: "bg-red-500" },
  { value: "blue", label: "Blue", class: "bg-blue-500" },
  { value: "green", label: "Green", class: "bg-green-500" },
  { value: "purple", label: "Purple", class: "bg-purple-500" },
  { value: "orange", label: "Orange", class: "bg-orange-500" },
  { value: "teal", label: "Teal", class: "bg-teal-500" },
  { value: "pink", label: "Pink", class: "bg-pink-500" },
  { value: "gray", label: "Gray", class: "bg-gray-500" },
];

const defaultUserForm: UserFormData = {
  email: "",
  firstName: "",
  lastName: "",
  globalRole: "viewer",
  selectedGroupIds: [],
  department: "",
  jobTitle: "",
  phoneNumber: ""
};

export default function AccessControl() {
  const { toast } = useToast();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [newGroupColor, setNewGroupColor] = useState("blue");
  
  // User management state
  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);
  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [showDeleteUserDialog, setShowDeleteUserDialog] = useState(false);
  const [showManageGroupsDialog, setShowManageGroupsDialog] = useState(false);
  const [showSetPasswordDialog, setShowSetPasswordDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<PlatformUser | null>(null);
  const [userForm, setUserForm] = useState<UserFormData>(defaultUserForm);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Fetch all user groups
  const { data: groups = [], isLoading: loadingGroups } = useQuery<UserGroup[]>({
    queryKey: ['/api/rbac/groups'],
  });

  // Fetch selected group with permissions
  const { data: groupDetails, isLoading: loadingDetails } = useQuery<GroupWithPermissions>({
    queryKey: ['/api/rbac/groups', selectedGroup],
    enabled: !!selectedGroup,
  });

  // Fetch sync status
  const { data: syncStatus } = useQuery<SyncStatus>({
    queryKey: ['/api/rbac/sync-status'],
  });

  // Sync security entries mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/rbac/sync');
    },
    onSuccess: (data: any) => {
      // Invalidate all RBAC-related queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['/api/rbac/sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rbac/groups'] });
      if (selectedGroup) {
        queryClient.invalidateQueries({ queryKey: ['/api/rbac/groups', selectedGroup] });
      }
      toast({ 
        title: "Sync Complete", 
        description: `Created ${data.moduleAccessCreated} module access entries and ${data.featurePermissionsCreated} feature permission entries.` 
      });
    },
    onError: (error: any) => {
      toast({ title: "Sync Failed", description: error.message, variant: "destructive" });
    }
  });

  // Fetch all users
  const { data: users = [], isLoading: loadingUsers } = useQuery<PlatformUser[]>({
    queryKey: ['/api/rbac/users'],
  });

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; color: string }) => {
      return apiRequest('POST', '/api/rbac/groups', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rbac/groups'] });
      setShowCreateDialog(false);
      setNewGroupName("");
      setNewGroupDescription("");
      setNewGroupColor("blue");
      toast({ title: "Group created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create group", description: error.message, variant: "destructive" });
    }
  });

  // Update group mutation
  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; description?: string; color?: string }) => {
      return apiRequest('PATCH', `/api/rbac/groups/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rbac/groups'] });
      setShowEditDialog(false);
      setEditingGroup(null);
      toast({ title: "Group updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update group", description: error.message, variant: "destructive" });
    }
  });

  // Delete group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/rbac/groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rbac/groups'] });
      setShowDeleteDialog(false);
      setEditingGroup(null);
      if (selectedGroup === editingGroup?.id) {
        setSelectedGroup(null);
      }
      toast({ title: "Group deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete group", description: error.message, variant: "destructive" });
    }
  });

  // Update module access mutation
  const updateModuleAccessMutation = useMutation({
    mutationFn: async ({ groupId, moduleId, hasAccess }: { groupId: string; moduleId: string; hasAccess: boolean }) => {
      return apiRequest('PUT', `/api/rbac/groups/${groupId}/modules/${moduleId}`, { hasAccess });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rbac/groups', selectedGroup] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update module access", description: error.message, variant: "destructive" });
    }
  });

  // Update feature permission mutation
  const updateFeaturePermissionMutation = useMutation({
    mutationFn: async ({ groupId, featureId, permissionLevel }: { groupId: string; featureId: string; permissionLevel: string }) => {
      return apiRequest('PUT', `/api/rbac/groups/${groupId}/features/${featureId}`, { permissionLevel });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rbac/groups', selectedGroup] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update permission", description: error.message, variant: "destructive" });
    }
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const { selectedGroupIds, ...userData } = data;
      const response = await apiRequest('POST', '/api/rbac/users', userData);
      const newUser = await response.json();
      
      if (selectedGroupIds.length > 0 && newUser?.id) {
        for (const groupId of selectedGroupIds) {
          await apiRequest('POST', `/api/rbac/users/${newUser.id}/groups/${groupId}`, {});
        }
      }
      return newUser;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rbac/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rbac/groups'] });
      setShowCreateUserDialog(false);
      setUserForm(defaultUserForm);
      toast({ title: "User created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create user", description: error.message, variant: "destructive" });
    }
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<UserFormData>) => {
      return apiRequest('PATCH', `/api/rbac/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rbac/users'] });
      setShowEditUserDialog(false);
      setEditingUser(null);
      setUserForm(defaultUserForm);
      toast({ title: "User updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update user", description: error.message, variant: "destructive" });
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/rbac/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rbac/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rbac/groups'] });
      setShowDeleteUserDialog(false);
      setEditingUser(null);
      toast({ title: "User deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete user", description: error.message, variant: "destructive" });
    }
  });

  // Add user to group mutation
  const addUserToGroupMutation = useMutation({
    mutationFn: async ({ userId, groupId }: { userId: string; groupId: string }) => {
      return apiRequest('POST', `/api/rbac/users/${userId}/groups/${groupId}`, {});
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/rbac/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rbac/groups'] });
      
      // Update editingUser state to reflect the change immediately
      if (editingUser && editingUser.id === variables.userId) {
        const addedGroup = groups.find(g => g.id === variables.groupId);
        if (addedGroup) {
          setEditingUser({
            ...editingUser,
            groups: [...(editingUser.groups || []), { id: addedGroup.id, name: addedGroup.name, color: addedGroup.color || '' }]
          });
        }
      }
      
      toast({ title: "User added to group" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to add user to group", description: error.message, variant: "destructive" });
    }
  });

  // Remove user from group mutation
  const removeUserFromGroupMutation = useMutation({
    mutationFn: async ({ userId, groupId }: { userId: string; groupId: string }) => {
      return apiRequest('DELETE', `/api/rbac/users/${userId}/groups/${groupId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/rbac/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rbac/groups'] });
      
      // Update editingUser state to reflect the change immediately
      if (editingUser && editingUser.id === variables.userId) {
        setEditingUser({
          ...editingUser,
          groups: (editingUser.groups || []).filter(g => g.id !== variables.groupId)
        });
      }
      
      toast({ title: "User removed from group" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to remove user from group", description: error.message, variant: "destructive" });
    }
  });

  // Set password mutation
  const setPasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      return apiRequest('POST', `/api/rbac/users/${userId}/set-password`, { password });
    },
    onSuccess: () => {
      setShowSetPasswordDialog(false);
      setNewPassword("");
      setConfirmPassword("");
      setEditingUser(null);
      toast({ title: "Password set successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to set password", description: error.message, variant: "destructive" });
    }
  });

  // Send password reset email mutation
  const sendResetEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      return apiRequest('POST', '/api/auth/request-password-reset', { email });
    },
    onSuccess: () => {
      toast({ title: "Password reset email sent", description: "If the email is registered, a reset link has been sent." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to send reset email", description: error.message, variant: "destructive" });
    }
  });

  const handleSetPassword = () => {
    if (!editingUser) return;
    if (newPassword.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setPasswordMutation.mutate({ userId: editingUser.id, password: newPassword });
  };

  const openSetPasswordDialog = (user: PlatformUser) => {
    setEditingUser(user);
    setNewPassword("");
    setConfirmPassword("");
    setShowSetPasswordDialog(true);
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) {
      toast({ title: "Group name is required", variant: "destructive" });
      return;
    }
    createGroupMutation.mutate({
      name: newGroupName,
      description: newGroupDescription,
      color: newGroupColor
    });
  };

  const handleUpdateGroup = () => {
    if (!editingGroup) return;
    updateGroupMutation.mutate({
      id: editingGroup.id,
      name: editingGroup.name,
      description: editingGroup.description || undefined,
      color: editingGroup.color || undefined
    });
  };

  const handleCreateUser = () => {
    if (!userForm.email.trim() || !userForm.firstName.trim() || !userForm.lastName.trim()) {
      toast({ title: "Email, first name, and last name are required", variant: "destructive" });
      return;
    }
    createUserMutation.mutate(userForm);
  };

  const handleUpdateUser = () => {
    if (!editingUser) return;
    updateUserMutation.mutate({
      id: editingUser.id,
      email: userForm.email,
      firstName: userForm.firstName,
      lastName: userForm.lastName,
      globalRole: userForm.globalRole,
      department: userForm.department || undefined,
      jobTitle: userForm.jobTitle || undefined,
      phoneNumber: userForm.phoneNumber || undefined
    });
  };

  const openEditUserDialog = (user: PlatformUser) => {
    setEditingUser(user);
    setUserForm({
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      globalRole: user.global_role || "viewer",
      selectedGroupIds: user.groups?.map(g => g.id) || [],
      department: user.department || "",
      jobTitle: user.job_title || "",
      phoneNumber: user.phone_number || ""
    });
    setShowEditUserDialog(true);
  };

  const openManageGroupsDialog = (user: PlatformUser) => {
    setEditingUser(user);
    setShowManageGroupsDialog(true);
  };

  // Group features by module for display, preserving module order from moduleAccess
  const featuresByModule = groupDetails?.moduleAccess.map((module) => {
    const features = groupDetails.featurePermissions.filter(f => f.moduleId === module.moduleId);
    return {
      moduleId: module.moduleId,
      moduleKey: module.moduleKey,
      moduleName: module.moduleName,
      hasAccess: module.hasAccess,
      features
    };
  }).filter(m => m.features.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <Link href="/modules">
            <Button variant="ghost" size="icon" data-testid="button-back-modules">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1 min-w-[200px]">
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Access Control</h1>
            <p className="text-muted-foreground">Manage user groups and permissions across all modules</p>
          </div>
          <div className="flex items-center gap-3">
            {syncStatus && (
              syncStatus.needsSync ? (
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">
                    {syncStatus.missingModuleAccess + syncStatus.missingFeaturePermissions} missing entries
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm">Synced</span>
                </div>
              )
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              data-testid="button-sync-security"
            >
              {syncMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync Security
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Groups List */}
          <Card className="md:w-80 md:flex-shrink-0">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Groups
                </CardTitle>
                <CardDescription>Select a group to configure</CardDescription>
              </div>
              <Button 
                size="sm" 
                onClick={() => setShowCreateDialog(true)}
                data-testid="button-create-group"
              >
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {loadingGroups ? (
                <div className="text-center py-4 text-muted-foreground">Loading groups...</div>
              ) : groups.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">No groups found</div>
              ) : (
                groups.map((group) => (
                  <div
                    key={group.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                      selectedGroup === group.id 
                        ? 'border-primary bg-primary/10' 
                        : 'border-transparent hover-elevate'
                    }`}
                    onClick={() => setSelectedGroup(group.id)}
                    data-testid={`group-item-${group.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: group.color || '#6b7280' }}
                        />
                        <span className="font-medium">{group.name}</span>
                        {group.is_system_group && (
                          <Badge variant="secondary" className="text-xs">System</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {group.member_count} {group.member_count === 1 ? 'user' : 'users'}
                        </Badge>
                        <ChevronRight className={`h-4 w-4 transition-transform ${selectedGroup === group.id ? 'text-primary rotate-90' : 'text-muted-foreground'}`} />
                      </div>
                    </div>
                    {group.description && (
                      <p className="text-sm text-muted-foreground mt-1 truncate">{group.description}</p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Permissions Panel */}
          <Card className="flex-1 min-w-0">
            {!selectedGroup ? (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                <div className="text-center">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a group to configure permissions</p>
                </div>
              </div>
            ) : loadingDetails ? (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                Loading permissions...
              </div>
            ) : groupDetails ? (
              <>
                <CardHeader className="flex flex-row items-start justify-between gap-2 pb-4">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      {groupDetails.name} Permissions
                    </CardTitle>
                    <CardDescription>{groupDetails.description || 'Configure module access and feature permissions'}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {!groupDetails.is_system_group && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setEditingGroup(groupDetails);
                            setShowEditDialog(true);
                          }}
                          data-testid="button-edit-group"
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setEditingGroup(groupDetails);
                            setShowDeleteDialog(true);
                          }}
                          data-testid="button-delete-group"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="modules">
                    <TabsList className="mb-4">
                      <TabsTrigger value="modules" data-testid="tab-modules">Module Access</TabsTrigger>
                      <TabsTrigger value="features" data-testid="tab-features">Feature Permissions</TabsTrigger>
                    </TabsList>

                    <TabsContent value="modules">
                      <div className="space-y-3">
                        {groupDetails.moduleAccess.map((module) => (
                          <div 
                            key={module.moduleId}
                            className="flex items-center justify-between p-3 border rounded-lg"
                            data-testid={`module-access-${module.moduleKey}`}
                          >
                            <div>
                              <p className="font-medium">{module.moduleName}</p>
                              <p className="text-sm text-muted-foreground">{module.moduleKey}</p>
                            </div>
                            <Switch
                              checked={module.hasAccess}
                              onCheckedChange={(checked) => {
                                updateModuleAccessMutation.mutate({
                                  groupId: selectedGroup,
                                  moduleId: module.moduleId,
                                  hasAccess: checked
                                });
                              }}
                              disabled={updateModuleAccessMutation.isPending}
                              data-testid={`switch-module-${module.moduleKey}`}
                            />
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="features">
                      <div className="space-y-6">
                        {featuresByModule && featuresByModule.map((moduleData) => (
                          <div key={moduleData.moduleId} className="border rounded-lg overflow-hidden">
                            <div className="bg-muted/50 px-4 py-2 flex items-center justify-between">
                              <h3 className="font-medium">{moduleData.moduleName}</h3>
                              <Badge variant={moduleData.hasAccess ? "default" : "secondary"}>
                                {moduleData.hasAccess ? "Access Enabled" : "No Access"}
                              </Badge>
                            </div>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Feature</TableHead>
                                  <TableHead className="w-[100px] text-center">None</TableHead>
                                  <TableHead className="w-[100px] text-center">View</TableHead>
                                  <TableHead className="w-[100px] text-center">Edit</TableHead>
                                  <TableHead className="w-[100px] text-center">Admin</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {moduleData.features.map((feature) => (
                                  <TableRow key={feature.featureId}>
                                    <TableCell>
                                      <span className="font-medium">{feature.featureName}</span>
                                    </TableCell>
                                    {(['none', 'view', 'edit', 'admin'] as const).map((level) => (
                                      <TableCell key={level} className="text-center">
                                        <button
                                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                            feature.permissionLevel === level
                                              ? 'border-primary bg-primary text-primary-foreground'
                                              : 'border-muted-foreground/30 hover:border-primary/50'
                                          }`}
                                          onClick={() => {
                                            updateFeaturePermissionMutation.mutate({
                                              groupId: selectedGroup,
                                              featureId: feature.featureId,
                                              permissionLevel: level
                                            });
                                          }}
                                          disabled={updateFeaturePermissionMutation.isPending}
                                          data-testid={`permission-${feature.featureKey}-${level}`}
                                        >
                                          {feature.permissionLevel === level && (
                                            <Check className="h-4 w-4" />
                                          )}
                                        </button>
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </>
            ) : null}
          </Card>
        </div>

        {/* Users Section */}
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserCog className="h-5 w-5" />
                Platform Users
              </CardTitle>
              <CardDescription>Manage users and their group memberships</CardDescription>
            </div>
            <Button 
              size="sm" 
              onClick={() => {
                setUserForm(defaultUserForm);
                setShowCreateUserDialog(true);
              }}
              data-testid="button-create-user"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add User
            </Button>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="text-center py-4 text-muted-foreground">Loading users...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <p>No users found</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => {
                    setUserForm(defaultUserForm);
                    setShowCreateUserDialog(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create First User
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Global Role</TableHead>
                    <TableHead>Groups</TableHead>
                    <TableHead className="w-[200px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                      <TableCell className="font-medium">
                        {user.first_name} {user.last_name}
                        {user.active === false && (
                          <Badge variant="secondary" className="ml-2 text-xs">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.global_role}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {user.groups && user.groups.length > 0 ? (
                            user.groups.map((group) => (
                              <Badge 
                                key={group.id} 
                                variant="secondary"
                                className="text-xs"
                              >
                                {group.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">No groups</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditUserDialog(user)}
                            title="Edit user"
                            data-testid={`button-edit-user-${user.id}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openManageGroupsDialog(user)}
                            title="Manage groups"
                            data-testid={`button-manage-groups-${user.id}`}
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openSetPasswordDialog(user)}
                            title="Set password"
                            data-testid={`button-set-password-${user.id}`}
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => sendResetEmailMutation.mutate(user.email)}
                            disabled={sendResetEmailMutation.isPending}
                            title="Send password reset email"
                            data-testid={`button-send-reset-${user.id}`}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setEditingUser(user);
                              setShowDeleteUserDialog(true);
                            }}
                            title="Delete user"
                            data-testid={`button-delete-user-${user.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Group Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User Group</DialogTitle>
            <DialogDescription>
              Add a new user group to organize permissions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Group Name</Label>
              <Input
                id="group-name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g., Marketing Team"
                data-testid="input-group-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group-description">Description</Label>
              <Textarea
                id="group-description"
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                placeholder="Brief description of this group's purpose"
                data-testid="input-group-description"
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {groupColors.map((color) => (
                  <button
                    key={color.value}
                    className={`w-8 h-8 rounded-full ${color.class} ${
                      newGroupColor === color.value ? 'ring-2 ring-offset-2 ring-primary' : ''
                    }`}
                    onClick={() => setNewGroupColor(color.value)}
                    title={color.label}
                    data-testid={`color-${color.value}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateGroup}
              disabled={createGroupMutation.isPending}
              data-testid="button-confirm-create"
            >
              {createGroupMutation.isPending ? "Creating..." : "Create Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Group</DialogTitle>
            <DialogDescription>
              Update this group's details
            </DialogDescription>
          </DialogHeader>
          {editingGroup && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-group-name">Group Name</Label>
                <Input
                  id="edit-group-name"
                  value={editingGroup.name}
                  onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                  data-testid="input-edit-group-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-group-description">Description</Label>
                <Textarea
                  id="edit-group-description"
                  value={editingGroup.description || ''}
                  onChange={(e) => setEditingGroup({ ...editingGroup, description: e.target.value })}
                  data-testid="input-edit-group-description"
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2 flex-wrap">
                  {groupColors.map((color) => (
                    <button
                      key={color.value}
                      className={`w-8 h-8 rounded-full ${color.class} ${
                        editingGroup.color === color.value ? 'ring-2 ring-offset-2 ring-primary' : ''
                      }`}
                      onClick={() => setEditingGroup({ ...editingGroup, color: color.value })}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateGroup}
              disabled={updateGroupMutation.isPending}
              data-testid="button-confirm-edit"
            >
              {updateGroupMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Group Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{editingGroup?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => editingGroup && deleteGroupMutation.mutate(editingGroup.id)}
              disabled={deleteGroupMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteGroupMutation.isPending ? "Deleting..." : "Delete Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={showCreateUserDialog} onOpenChange={setShowCreateUserDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new platform user with their details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="user-firstName">First Name *</Label>
                <Input
                  id="user-firstName"
                  value={userForm.firstName}
                  onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                  placeholder="John"
                  data-testid="input-user-firstname"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-lastName">Last Name *</Label>
                <Input
                  id="user-lastName"
                  value={userForm.lastName}
                  onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                  placeholder="Doe"
                  data-testid="input-user-lastname"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-email">Email *</Label>
              <Input
                id="user-email"
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                placeholder="john.doe@example.com"
                data-testid="input-user-email"
              />
            </div>
            <div className="space-y-2">
              <Label>User Groups</Label>
              <div className="border rounded-lg p-3 max-h-[150px] overflow-y-auto space-y-2">
                {groups.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No groups available. Create a group first.</p>
                ) : (
                  groups.map((group) => (
                    <div key={group.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`create-group-${group.id}`}
                        checked={userForm.selectedGroupIds.includes(group.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setUserForm({ ...userForm, selectedGroupIds: [...userForm.selectedGroupIds, group.id] });
                          } else {
                            setUserForm({ ...userForm, selectedGroupIds: userForm.selectedGroupIds.filter(id => id !== group.id) });
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                        data-testid={`checkbox-create-group-${group.id}`}
                      />
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: group.color || '#6b7280' }}
                      />
                      <label htmlFor={`create-group-${group.id}`} className="text-sm font-medium cursor-pointer">
                        {group.name}
                      </label>
                      {group.is_system_group && (
                        <Badge variant="secondary" className="text-xs">System</Badge>
                      )}
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-muted-foreground">Select which groups this user should belong to</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="user-department">Department</Label>
                <Input
                  id="user-department"
                  value={userForm.department}
                  onChange={(e) => setUserForm({ ...userForm, department: e.target.value })}
                  placeholder="e.g., Operations"
                  data-testid="input-user-department"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-jobTitle">Job Title</Label>
                <Input
                  id="user-jobTitle"
                  value={userForm.jobTitle}
                  onChange={(e) => setUserForm({ ...userForm, jobTitle: e.target.value })}
                  placeholder="e.g., Manager"
                  data-testid="input-user-jobtitle"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-phone">Phone Number</Label>
              <Input
                id="user-phone"
                type="tel"
                value={userForm.phoneNumber}
                onChange={(e) => setUserForm({ ...userForm, phoneNumber: e.target.value })}
                placeholder="(555) 123-4567"
                data-testid="input-user-phone"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateUserDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateUser}
              disabled={createUserMutation.isPending}
              data-testid="button-confirm-create-user"
            >
              {createUserMutation.isPending ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditUserDialog} onOpenChange={setShowEditUserDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user details for {editingUser?.first_name} {editingUser?.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-user-firstName">First Name *</Label>
                <Input
                  id="edit-user-firstName"
                  value={userForm.firstName}
                  onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                  data-testid="input-edit-user-firstname"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-user-lastName">Last Name *</Label>
                <Input
                  id="edit-user-lastName"
                  value={userForm.lastName}
                  onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                  data-testid="input-edit-user-lastname"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-user-email">Email *</Label>
              <Input
                id="edit-user-email"
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                data-testid="input-edit-user-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-user-globalRole">Global Role</Label>
              <Select
                value={userForm.globalRole}
                onValueChange={(value) => setUserForm({ ...userForm, globalRole: value })}
              >
                <SelectTrigger id="edit-user-globalRole" data-testid="select-edit-user-globalrole">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Controls platform-level access (Admin Hub, Access Control). Use User Groups for module permissions.
              </p>
            </div>
            <div className="space-y-2">
              <Label>User Groups</Label>
              <div className="border rounded-lg p-3 max-h-[120px] overflow-y-auto">
                {editingUser?.groups && editingUser.groups.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {editingUser.groups.map((group) => (
                      <Badge 
                        key={group.id} 
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: group.color || '#6b7280' }}
                        />
                        {group.name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No groups assigned</p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Use the "Manage Groups" button on the user row to change group assignments
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-user-department">Department</Label>
                <Input
                  id="edit-user-department"
                  value={userForm.department}
                  onChange={(e) => setUserForm({ ...userForm, department: e.target.value })}
                  data-testid="input-edit-user-department"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-user-jobTitle">Job Title</Label>
                <Input
                  id="edit-user-jobTitle"
                  value={userForm.jobTitle}
                  onChange={(e) => setUserForm({ ...userForm, jobTitle: e.target.value })}
                  data-testid="input-edit-user-jobtitle"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-user-phone">Phone Number</Label>
              <Input
                id="edit-user-phone"
                type="tel"
                value={userForm.phoneNumber}
                onChange={(e) => setUserForm({ ...userForm, phoneNumber: e.target.value })}
                data-testid="input-edit-user-phone"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditUserDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateUser}
              disabled={updateUserMutation.isPending}
              data-testid="button-confirm-edit-user"
            >
              {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={showDeleteUserDialog} onOpenChange={setShowDeleteUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{editingUser?.first_name} {editingUser?.last_name}"? 
              This will also remove all their group memberships. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteUserDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => editingUser && deleteUserMutation.mutate(editingUser.id)}
              disabled={deleteUserMutation.isPending}
              data-testid="button-confirm-delete-user"
            >
              {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Groups Dialog */}
      <Dialog open={showManageGroupsDialog} onOpenChange={setShowManageGroupsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Group Memberships</DialogTitle>
            <DialogDescription>
              Assign {editingUser?.first_name} {editingUser?.last_name} to groups
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {groups.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No groups available. Create a group first.
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {groups.map((group) => {
                  const isMember = editingUser?.groups?.some(g => g.id === group.id) || false;
                  return (
                    <div 
                      key={group.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: group.color || '#6b7280' }}
                        />
                        <span className="font-medium">{group.name}</span>
                        {group.is_system_group && (
                          <Badge variant="secondary" className="text-xs">System</Badge>
                        )}
                      </div>
                      <Switch
                        checked={isMember}
                        onCheckedChange={(checked) => {
                          if (editingUser) {
                            if (checked) {
                              addUserToGroupMutation.mutate({ userId: editingUser.id, groupId: group.id });
                            } else {
                              removeUserFromGroupMutation.mutate({ userId: editingUser.id, groupId: group.id });
                            }
                          }
                        }}
                        disabled={addUserToGroupMutation.isPending || removeUserFromGroupMutation.isPending}
                        data-testid={`switch-group-${group.id}`}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowManageGroupsDialog(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Password Dialog */}
      <Dialog open={showSetPasswordDialog} onOpenChange={setShowSetPasswordDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Password</DialogTitle>
            <DialogDescription>
              Set a password for {editingUser?.first_name} {editingUser?.last_name} to enable email/password login
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                data-testid="input-new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                data-testid="input-confirm-password"
              />
            </div>
            {newPassword && newPassword.length < 8 && (
              <p className="text-sm text-destructive">Password must be at least 8 characters</p>
            )}
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-sm text-destructive">Passwords do not match</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSetPasswordDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSetPassword}
              disabled={setPasswordMutation.isPending || newPassword.length < 8 || newPassword !== confirmPassword}
              data-testid="button-confirm-set-password"
            >
              {setPasswordMutation.isPending ? "Setting..." : "Set Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
