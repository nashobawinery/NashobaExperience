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
  UserCog
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
  module_id: string;
  module_key: string;
  module_name: string;
  has_access: boolean;
}

interface FeaturePermission {
  feature_id: string;
  module_id: string;
  feature_key: string;
  feature_name: string;
  permission_level: 'none' | 'view' | 'edit' | 'admin';
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
  groups: { id: string; name: string; color: string }[];
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

  // Fetch all user groups
  const { data: groups = [], isLoading: loadingGroups } = useQuery<UserGroup[]>({
    queryKey: ['/api/rbac/groups'],
  });

  // Fetch selected group with permissions
  const { data: groupDetails, isLoading: loadingDetails } = useQuery<GroupWithPermissions>({
    queryKey: ['/api/rbac/groups', selectedGroup],
    enabled: !!selectedGroup,
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

  // Group features by module for display
  const featuresByModule = groupDetails?.featurePermissions.reduce((acc, feature) => {
    if (!acc[feature.module_id]) {
      const moduleAccess = groupDetails.moduleAccess.find(m => m.module_id === feature.module_id);
      acc[feature.module_id] = {
        moduleKey: moduleAccess?.module_key || '',
        moduleName: moduleAccess?.module_name || '',
        hasAccess: moduleAccess?.has_access || false,
        features: []
      };
    }
    acc[feature.module_id].features.push(feature);
    return acc;
  }, {} as Record<string, { moduleKey: string; moduleName: string; hasAccess: boolean; features: FeaturePermission[] }>);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/modules">
            <Button variant="ghost" size="icon" data-testid="button-back-modules">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Access Control</h1>
            <p className="text-muted-foreground">Manage user groups and permissions across all modules</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Groups List */}
          <Card className="lg:col-span-1">
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
                        ? 'border-primary bg-primary/5' 
                        : 'border-transparent hover-elevate'
                    }`}
                    onClick={() => setSelectedGroup(group.id)}
                    data-testid={`group-item-${group.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className={`w-3 h-3 rounded-full bg-${group.color}-500`}
                          style={{ backgroundColor: group.color ? `var(--${group.color}-500, ${group.color})` : undefined }}
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
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
          <Card className="lg:col-span-2">
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
                            key={module.module_id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                            data-testid={`module-access-${module.module_key}`}
                          >
                            <div>
                              <p className="font-medium">{module.module_name}</p>
                              <p className="text-sm text-muted-foreground">{module.module_key}</p>
                            </div>
                            <Switch
                              checked={module.has_access}
                              onCheckedChange={(checked) => {
                                updateModuleAccessMutation.mutate({
                                  groupId: selectedGroup,
                                  moduleId: module.module_id,
                                  hasAccess: checked
                                });
                              }}
                              disabled={updateModuleAccessMutation.isPending}
                              data-testid={`switch-module-${module.module_key}`}
                            />
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="features">
                      <div className="space-y-6">
                        {featuresByModule && Object.entries(featuresByModule).map(([moduleId, moduleData]) => (
                          <div key={moduleId} className="border rounded-lg overflow-hidden">
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
                                  <TableRow key={feature.feature_id}>
                                    <TableCell>
                                      <span className="font-medium">{feature.feature_name}</span>
                                    </TableCell>
                                    {(['none', 'view', 'edit', 'admin'] as const).map((level) => (
                                      <TableCell key={level} className="text-center">
                                        <button
                                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                            feature.permission_level === level
                                              ? 'border-primary bg-primary text-primary-foreground'
                                              : 'border-muted-foreground/30 hover:border-primary/50'
                                          }`}
                                          onClick={() => {
                                            updateFeaturePermissionMutation.mutate({
                                              groupId: selectedGroup,
                                              featureId: feature.feature_id,
                                              permissionLevel: level
                                            });
                                          }}
                                          disabled={updateFeaturePermissionMutation.isPending}
                                          data-testid={`permission-${feature.feature_key}-${level}`}
                                        >
                                          {feature.permission_level === level && (
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
              <CardDescription>View users and their group memberships</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="text-center py-4 text-muted-foreground">Loading users...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">No users found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Global Role</TableHead>
                    <TableHead>Groups</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                      <TableCell className="font-medium">
                        {user.first_name} {user.last_name}
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
    </div>
  );
}
