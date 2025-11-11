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
  role: 'guest' | 'admin' | 'wholesale';
}

export default function UserRoleManager() {
  const { toast } = useToast();

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'guest' | 'admin' | 'wholesale' }) => {
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
      wholesale: { variant: "secondary", label: "Wholesale" },
      guest: { variant: "outline", label: "Guest" },
    };
    const config = variants[role] || variants.guest;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    updateRoleMutation.mutate({ 
      userId, 
      role: newRole as 'guest' | 'admin' | 'wholesale' 
    });
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-primary" />
        <h2 className="font-serif text-xl font-medium">User Role Management</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Manage user roles and permissions. Admins can access the admin dashboard, while guests have standard app access.
      </p>

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
                  <SelectItem value="guest">Guest</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="wholesale">Wholesale</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
