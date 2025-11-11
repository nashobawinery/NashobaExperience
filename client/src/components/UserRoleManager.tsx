import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Shield } from "lucide-react";

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: 'viewer' | 'admin';
}

export default function UserRoleManager() {
  const { toast } = useToast();

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'viewer' | 'admin' }) => {
      return apiRequest('PATCH', `/api/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Role updated",
        description: "User role has been successfully updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const getRoleBadge = (role: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline"; label: string }> = {
      admin: { variant: "default", label: "Admin" },
      viewer: { variant: "outline", label: "Viewer" },
    };
    const config = variants[role] || variants.viewer;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    updateRoleMutation.mutate({ 
      userId, 
      role: newRole as 'viewer' | 'admin' 
    });
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-primary" />
        <h2 className="font-serif text-xl font-medium">User Role Management</h2>
      </div>
      <div className="space-y-2 mb-6">
        <p className="text-sm text-muted-foreground">
          Manage user roles and permissions. Users are automatically added when they log in with Replit Auth.
        </p>
        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
          <p className="font-medium mb-1">Role Descriptions:</p>
          <ul className="space-y-1 ml-4">
            <li><span className="font-medium">Admin:</span> Full access to admin dashboard and app content management</li>
            <li><span className="font-medium">Viewer:</span> Standard app access for browsing products and tasting features</li>
          </ul>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 border rounded-md">
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-9 w-32" />
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No users have logged in yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user: User) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 border rounded-md hover-elevate"
              data-testid={`user-row-${user.id}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium truncate" data-testid={`text-user-email-${user.id}`}>
                    {user.email}
                  </p>
                  {getRoleBadge(user.role)}
                </div>
                {(user.firstName || user.lastName) && (
                  <p className="text-sm text-muted-foreground truncate">
                    {[user.firstName, user.lastName].filter(Boolean).join(' ')}
                  </p>
                )}
              </div>
              <Select
                value={user.role}
                onValueChange={(newRole) => handleRoleChange(user.id, newRole)}
                disabled={updateRoleMutation.isPending}
              >
                <SelectTrigger 
                  className="w-32" 
                  data-testid={`select-role-${user.id}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
