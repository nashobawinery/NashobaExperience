import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Pencil, Trash2, Users, ClipboardList, FileText, Key } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ProceduresUser, ProceduresTemplate } from "@shared/schema";
import { format } from "date-fns";

export default function ProceduresUsers() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ProceduresUser | null>(null);
  const [formData, setFormData] = useState({
    displayName: "",
    pinCode: "",
    assignedProcedureCodes: [] as string[],
    isActive: true
  });

  const { data: users, isLoading: usersLoading } = useQuery<ProceduresUser[]>({
    queryKey: ["/api/procedures/users"],
  });

  const { data: templates } = useQuery<ProceduresTemplate[]>({
    queryKey: ["/api/procedures/templates"],
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => apiRequest("/api/procedures/users", "POST", data),
    onSuccess: () => {
      toast({ title: "User created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/procedures/users"] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error creating user", description: error.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof formData> }) => 
      apiRequest(`/api/procedures/users/${id}`, "PATCH", data),
    onSuccess: () => {
      toast({ title: "User updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/procedures/users"] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error updating user", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/procedures/users/${id}`, "DELETE"),
    onSuccess: () => {
      toast({ title: "User deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/procedures/users"] });
    },
    onError: (error: any) => {
      toast({ title: "Error deleting user", description: error.message, variant: "destructive" });
    }
  });

  const resetForm = () => {
    setEditingUser(null);
    setFormData({
      displayName: "",
      pinCode: "",
      assignedProcedureCodes: [],
      isActive: true
    });
  };

  const openEditDialog = (user: ProceduresUser) => {
    setEditingUser(user);
    setFormData({
      displayName: user.displayName,
      pinCode: user.pinCode,
      assignedProcedureCodes: user.assignedProcedureCodes || [],
      isActive: user.isActive
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const toggleProcedureCode = (code: string) => {
    setFormData(prev => ({
      ...prev,
      assignedProcedureCodes: prev.assignedProcedureCodes.includes(code)
        ? prev.assignedProcedureCodes.filter(c => c !== code)
        : [...prev.assignedProcedureCodes, code]
    }));
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/procedures")} data-testid="button-back">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Procedure Users</h1>
          <p className="text-muted-foreground">Manage staff access with PIN codes</p>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} data-testid="button-add-user">
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users" data-testid="tab-users">
            <Users className="w-4 h-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="procedures" onClick={() => setLocation("/procedures")} data-testid="tab-procedures">
            <ClipboardList className="w-4 h-4 mr-2" />
            Procedures
          </TabsTrigger>
          <TabsTrigger value="submissions" onClick={() => setLocation("/procedures/submissions")} data-testid="tab-submissions">
            <FileText className="w-4 h-4 mr-2" />
            Submissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>PIN Code</TableHead>
                    <TableHead>Assigned Procedures</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersLoading ? (
                    [...Array(3)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6} className="h-16">
                          <div className="animate-pulse h-4 bg-muted rounded w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : users && users.length > 0 ? (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium" data-testid={`text-user-name-${user.id}`}>{user.displayName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            <Key className="w-3 h-3 mr-1" />
                            {user.pinCode}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.assignedProcedureCodes?.slice(0, 3).map((code) => (
                              <Badge key={code} variant="secondary">{code}</Badge>
                            ))}
                            {(user.assignedProcedureCodes?.length || 0) > 3 && (
                              <Badge variant="outline">+{user.assignedProcedureCodes!.length - 3}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.lastLoginAt ? format(new Date(user.lastLoginAt), "MMM d, yyyy h:mm a") : "Never"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? "default" : "secondary"}>
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)} data-testid={`button-edit-user-${user.id}`}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => deleteMutation.mutate(user.id)}
                              data-testid={`button-delete-user-${user.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No users found. Add a user to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Add User"}</DialogTitle>
            <DialogDescription>
              {editingUser ? "Update user details and procedure access" : "Create a new user with PIN access"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name *</Label>
              <Input
                id="displayName"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="e.g., Jane Smith"
                data-testid="input-display-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pinCode">PIN Code *</Label>
              <Input
                id="pinCode"
                value={formData.pinCode}
                onChange={(e) => setFormData({ ...formData, pinCode: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                placeholder="e.g., 1234"
                maxLength={10}
                data-testid="input-pin-code"
              />
              <p className="text-xs text-muted-foreground">A unique numeric code for login</p>
            </div>

            <div className="space-y-2">
              <Label>Assigned Procedures</Label>
              <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                {templates?.map((template) => (
                  <div key={template.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`proc-${template.id}`}
                      checked={formData.assignedProcedureCodes.includes(template.procedureCode)}
                      onChange={() => toggleProcedureCode(template.procedureCode)}
                      className="rounded"
                    />
                    <label htmlFor={`proc-${template.id}`} className="text-sm flex-1 cursor-pointer">
                      <span className="font-medium">{template.procedureName}</span>
                      <span className="text-muted-foreground ml-2">({template.procedureCode})</span>
                    </label>
                  </div>
                ))}
                {(!templates || templates.length === 0) && (
                  <p className="text-sm text-muted-foreground">No procedures available. Create procedures first.</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-user-active"
              />
              <Label htmlFor="isActive">User is Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="button-cancel">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isPending || !formData.displayName || !formData.pinCode}
              data-testid="button-submit-user"
            >
              {editingUser ? "Save Changes" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
