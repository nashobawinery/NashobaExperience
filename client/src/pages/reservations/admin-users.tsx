import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Search, Shield, UserCog, Users, Crown } from "lucide-react";
import type { User, UserRole } from "@shared/schema";
import { userRoles } from "@shared/schema";
import { format } from "date-fns";

export default function AdminUsers() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>("viewer");
  const [isActive, setIsActive] = useState(true);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/resy/users"],
  });

  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/resy/users/me"],
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role, isActive }: { userId: string; role: UserRole; isActive: boolean }) => {
      const response = await apiRequest("PUT", `/api/users/${userId}/role`, { role, isActive });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/users"] });
      setEditingUser(null);
      toast({
        title: "User updated",
        description: "User role and status have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredUsers = users?.filter((user) => {
    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.toLowerCase();
    const matchesSearch = 
      fullName.includes(searchTerm.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  }) || [];

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setSelectedRole((user.role as UserRole) || "viewer");
    setIsActive(user.isActive ?? true);
  };

  const handleSaveRole = () => {
    if (editingUser) {
      updateRoleMutation.mutate({
        userId: editingUser.id,
        role: selectedRole,
        isActive,
      });
    }
  };

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-red-500 hover:bg-red-600"><Crown className="w-3 h-3 mr-1" />Admin</Badge>;
      case "manager":
        return <Badge className="bg-blue-500 hover:bg-blue-600"><Shield className="w-3 h-3 mr-1" />Manager</Badge>;
      case "staff":
        return <Badge variant="secondary"><UserCog className="w-3 h-3 mr-1" />Staff</Badge>;
      default:
        return <Badge variant="outline">Viewer</Badge>;
    }
  };

  const getRoleDescription = (role: UserRole) => {
    switch (role) {
      case "admin":
        return "Full access to all features including user management";
      case "manager":
        return "Can view all data and manage reservations, experiences, and settings";
      case "staff":
        return "Can view reservations and customer information";
      case "viewer":
        return "Read-only access to dashboard and reports";
      default:
        return "";
    }
  };

  const isCurrentUserAdmin = currentUser?.role === "admin";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl font-semibold mb-2">User Management</h1>
          <p className="text-muted-foreground">Manage user accounts and access levels</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
          <CardDescription>
            Understanding what each role can do in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-red-500" />
                <span className="font-medium">Admin</span>
              </div>
              <p className="text-sm text-muted-foreground">Full access to all features including user management and settings</p>
            </div>
            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-500" />
                <span className="font-medium">Manager</span>
              </div>
              <p className="text-sm text-muted-foreground">Can manage reservations, customers, experiences, and view all data</p>
            </div>
            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <UserCog className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">Staff</span>
              </div>
              <p className="text-sm text-muted-foreground">Can view and manage reservations and customer information</p>
            </div>
            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">Viewer</span>
              </div>
              <p className="text-sm text-muted-foreground">Read-only access to dashboard and basic reports</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-users"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger data-testid="select-role-filter">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            All Users ({filteredUsers.length})
          </CardTitle>
          <CardDescription>
            Users who have logged in to the admin system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.profileImageUrl || undefined} />
                            <AvatarFallback>
                              {(user.firstName?.[0] || "") + (user.lastName?.[0] || "")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="font-medium">
                            {user.firstName} {user.lastName}
                            {user.id === currentUser?.id && (
                              <span className="text-xs text-muted-foreground ml-2">(You)</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        {user.isActive ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.createdAt && format(new Date(user.createdAt), "M/d/yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        {isCurrentUserAdmin && user.id !== currentUser?.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                            data-testid={`button-edit-user-${user.id}`}
                          >
                            Edit Role
                          </Button>
                        )}
                        {user.id === currentUser?.id && (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                        {!isCurrentUserAdmin && user.id !== currentUser?.id && (
                          <span className="text-sm text-muted-foreground">View Only</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || roleFilter !== "all" 
                ? "No users match your filters" 
                : "No users found. Users appear here after they log in to the admin system."}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
            <DialogDescription>
              Change the role and status for {editingUser?.firstName} {editingUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={editingUser?.profileImageUrl || undefined} />
                <AvatarFallback>
                  {(editingUser?.firstName?.[0] || "") + (editingUser?.lastName?.[0] || "")}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{editingUser?.firstName} {editingUser?.lastName}</div>
                <div className="text-sm text-muted-foreground">{editingUser?.email}</div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole)}>
                <SelectTrigger data-testid="select-user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {userRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        {role === "admin" && <Crown className="w-4 h-4 text-red-500" />}
                        {role === "manager" && <Shield className="w-4 h-4 text-blue-500" />}
                        {role === "staff" && <UserCog className="w-4 h-4" />}
                        {role === "viewer" && <Users className="w-4 h-4" />}
                        <span className="capitalize">{role}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">{getRoleDescription(selectedRole)}</p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Account Status</label>
                <p className="text-sm text-muted-foreground">Inactive users cannot log in</p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
                data-testid="switch-user-active"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEditingUser(null)}
              data-testid="button-cancel-edit-user"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveRole}
              disabled={updateRoleMutation.isPending}
              data-testid="button-save-user-role"
            >
              {updateRoleMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
