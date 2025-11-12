import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Plus, Trash2, ShieldCheck } from "lucide-react";

interface WhitelistedEmail {
  id: string;
  email: string;
  role: 'viewer' | 'admin';
  createdAt: string;
}

export default function WhitelistManager() {
  const { toast } = useToast();
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<'viewer' | 'admin'>('viewer');

  const { data: whitelist = [], isLoading } = useQuery<WhitelistedEmail[]>({
    queryKey: ['/api/whitelist'],
  });

  const addEmailMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: 'viewer' | 'admin' }) => {
      return apiRequest('POST', '/api/whitelist', { email, role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/whitelist'] });
      setNewEmail("");
      setNewRole('viewer');
      toast({
        title: "Email added",
        description: "The email has been added to the whitelist",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add email to whitelist",
        variant: "destructive",
      });
    },
  });

  const deleteEmailMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/whitelist/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/whitelist'] });
      toast({
        title: "Email removed",
        description: "The email has been removed from the whitelist",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove email from whitelist",
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

  const handleAddEmail = () => {
    if (!newEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    addEmailMutation.mutate({ email: newEmail.trim().toLowerCase(), role: newRole });
  };

  const handleDeleteEmail = (id: string) => {
    if (confirm("Are you sure you want to remove this email from the whitelist?")) {
      deleteEmailMutation.mutate(id);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="w-5 h-5 text-primary" />
        <h2 className="font-serif text-xl font-medium">Email Whitelist</h2>
      </div>
      
      <div className="space-y-2 mb-6">
        <p className="text-sm text-muted-foreground">
          Pre-approve email addresses before users log in. Only whitelisted emails can access this application.
        </p>
        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
          <p className="font-medium mb-1">Important:</p>
          <ul className="space-y-1 ml-4">
            <li>Users must be whitelisted before they can log in</li>
            <li>Set the role when adding the email (Admin or Viewer)</li>
            <li>Non-whitelisted login attempts will be rejected</li>
          </ul>
        </div>
      </div>

      <div className="mb-6 p-4 border rounded-md bg-card">
        <h3 className="font-medium mb-3">Add New Email</h3>
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="email@example.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddEmail()}
            disabled={addEmailMutation.isPending}
            data-testid="input-whitelist-email"
            className="flex-1"
          />
          <Select
            value={newRole}
            onValueChange={(value) => setNewRole(value as 'viewer' | 'admin')}
            disabled={addEmailMutation.isPending}
          >
            <SelectTrigger className="w-32" data-testid="select-whitelist-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="viewer">Viewer</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={handleAddEmail}
            disabled={addEmailMutation.isPending}
            data-testid="button-add-whitelist"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
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
              <Skeleton className="h-9 w-20" />
            </div>
          ))}
        </div>
      ) : whitelist.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Mail className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No emails whitelisted yet</p>
          <p className="text-sm mt-1">Add an email above to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {whitelist.map((item: WhitelistedEmail) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 border rounded-md hover-elevate"
              data-testid={`whitelist-row-${item.id}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium truncate" data-testid={`text-whitelist-email-${item.id}`}>
                    {item.email}
                  </p>
                  {getRoleBadge(item.role)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Added {new Date(item.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteEmail(item.id)}
                disabled={deleteEmailMutation.isPending}
                data-testid={`button-delete-whitelist-${item.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
