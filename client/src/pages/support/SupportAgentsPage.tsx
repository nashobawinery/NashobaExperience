import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  XCircle, 
  Mail,
  Users,
  Shield,
  AlertCircle,
  Pencil,
  Check,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type SupportAgentCategory = {
  categoryId: string;
  categoryName: string;
  isLead: boolean;
};

type SupportAgent = {
  id: string;
  platformUserId: string;
  email: string;
  displayName: string;
  pinCode: string;
  isActive: boolean;
  isDefaultAgent: boolean;
  receiveEmailNotifications: boolean;
  createdAt: string;
  categories: SupportAgentCategory[];
};

type PlatformUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  department: string | null;
  jobTitle: string | null;
};

type SupportCategory = {
  id: string;
  name: string;
};

export default function SupportAgentsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isDefaultAgent, setIsDefaultAgent] = useState(false);
  const [customPin, setCustomPin] = useState<string>("");
  const [showPinFor, setShowPinFor] = useState<string | null>(null);
  const [editPinFor, setEditPinFor] = useState<string | null>(null);
  const [editPinValue, setEditPinValue] = useState<string>("");
  const [deleteConfirmAgent, setDeleteConfirmAgent] = useState<SupportAgent | null>(null);

  const { data: agents = [], isLoading: agentsLoading } = useQuery<SupportAgent[]>({
    queryKey: ['/api/admin/support/agents'],
  });

  const { data: platformUsers = [], isLoading: usersLoading } = useQuery<PlatformUser[]>({
    queryKey: ['/api/admin/support/platform-users'],
  });

  const { data: categories = [] } = useQuery<SupportCategory[]>({
    queryKey: ['/api/admin/support/categories'],
  });

  const existingPlatformUserIds = agents.map(a => a.platformUserId);
  const availableUsers = platformUsers.filter(u => !existingPlatformUserIds.includes(u.id));

  const createAgentMutation = useMutation({
    mutationFn: async (data: { platformUserId: string; categories: string[]; isDefaultAgent: boolean; customPin?: string }) => {
      return await apiRequest('POST', '/api/admin/support/agents', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support/agents'] });
      toast({ title: "Agent created", description: "Support agent has been added successfully." });
      setShowAddDialog(false);
      setSelectedUserId("");
      setSelectedCategories([]);
      setIsDefaultAgent(false);
      setCustomPin("");
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create agent",
        variant: "destructive"
      });
    }
  });

  const updateAgentMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; [key: string]: any }) => {
      return await apiRequest('PATCH', `/api/admin/support/agents/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support/agents'] });
      toast({ title: "Agent updated" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update agent",
        variant: "destructive"
      });
    }
  });

  const regeneratePinMutation = useMutation({
    mutationFn: async (agentId: string) => {
      const res = await apiRequest('POST', `/api/admin/support/agents/${agentId}/regenerate-pin`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support/agents'] });
      toast({ 
        title: "PIN regenerated", 
        description: `New PIN: ${data.pinCode}` 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to regenerate PIN",
        variant: "destructive"
      });
    }
  });

  const deleteAgentMutation = useMutation({
    mutationFn: async (agentId: string) => {
      return await apiRequest('DELETE', `/api/admin/support/agents/${agentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support/agents'] });
      toast({ title: "Agent deleted" });
      setDeleteConfirmAgent(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete agent",
        variant: "destructive"
      });
    }
  });

  const handleAddAgent = () => {
    if (!selectedUserId) {
      toast({ title: "Please select a platform user", variant: "destructive" });
      return;
    }
    if (customPin && !/^\d{4}$/.test(customPin)) {
      toast({ title: "PIN must be exactly 4 digits", variant: "destructive" });
      return;
    }
    createAgentMutation.mutate({
      platformUserId: selectedUserId,
      categories: selectedCategories,
      isDefaultAgent,
      customPin: customPin || undefined
    });
  };

  const handleEditPin = (agentId: string) => {
    if (!/^\d{4}$/.test(editPinValue)) {
      toast({ title: "PIN must be exactly 4 digits", variant: "destructive" });
      return;
    }
    updateAgentMutation.mutate({ id: agentId, pinCode: editPinValue });
    setEditPinFor(null);
    setEditPinValue("");
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  if (agentsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b p-4">
          <div className="flex items-center gap-3">
            <Link href="/support">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold">Support Agents</h1>
              <p className="text-sm text-muted-foreground">Manage support team members</p>
            </div>
          </div>
        </header>
        <div className="p-6 space-y-4 max-w-4xl mx-auto">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/support">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold">Support Agents</h1>
              <p className="text-sm text-muted-foreground">Manage support team members and email notifications</p>
            </div>
          </div>
          <Button onClick={() => setShowAddDialog(true)} data-testid="button-add-agent">
            <Plus className="h-4 w-4 mr-2" />
            Add Agent
          </Button>
        </div>
      </header>

      <div className="p-6 max-w-4xl mx-auto space-y-4">
        {agents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No support agents yet</h3>
              <p className="text-muted-foreground mb-4">
                Add platform users as support agents to enable email notifications for new tickets.
              </p>
              <Button onClick={() => setShowAddDialog(true)} data-testid="button-add-first-agent">
                <Plus className="h-4 w-4 mr-2" />
                Add First Agent
              </Button>
            </CardContent>
          </Card>
        ) : (
          agents.map(agent => (
            <Card key={agent.id} className="relative" data-testid={`agent-card-${agent.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {agent.displayName}
                        {agent.isDefaultAgent && (
                          <Badge variant="secondary" className="text-xs">Default</Badge>
                        )}
                        {!agent.isActive && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>{agent.email}</CardDescription>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setDeleteConfirmAgent(agent)}
                    data-testid={`button-delete-${agent.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Quick Access Code</Label>
                    {editPinFor === agent.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          placeholder="1234"
                          maxLength={4}
                          value={editPinValue}
                          onChange={(e) => setEditPinValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          className="w-20 font-mono tracking-widest text-center text-lg"
                          autoFocus
                          data-testid={`input-edit-pin-${agent.id}`}
                        />
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleEditPin(agent.id)}
                          disabled={editPinValue.length !== 4}
                          data-testid={`button-save-pin-${agent.id}`}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => { setEditPinFor(null); setEditPinValue(""); }}
                          data-testid={`button-cancel-pin-${agent.id}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 bg-muted rounded text-lg font-mono tracking-widest">
                          {showPinFor === agent.id ? agent.pinCode : "••••"}
                        </code>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setShowPinFor(showPinFor === agent.id ? null : agent.id)}
                          data-testid={`button-toggle-pin-${agent.id}`}
                        >
                          {showPinFor === agent.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => { setEditPinFor(agent.id); setEditPinValue(agent.pinCode); }}
                          data-testid={`button-edit-pin-${agent.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Set a memorable 4-digit code for this agent
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`active-${agent.id}`} className="text-sm">Active</Label>
                      <Switch
                        id={`active-${agent.id}`}
                        checked={agent.isActive}
                        onCheckedChange={(checked) => updateAgentMutation.mutate({ id: agent.id, isActive: checked })}
                        data-testid={`switch-active-${agent.id}`}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`default-${agent.id}`} className="text-sm">Default Agent</Label>
                      <Switch
                        id={`default-${agent.id}`}
                        checked={agent.isDefaultAgent}
                        onCheckedChange={(checked) => updateAgentMutation.mutate({ id: agent.id, isDefaultAgent: checked })}
                        data-testid={`switch-default-${agent.id}`}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`email-${agent.id}`} className="text-sm flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        Email Notifications
                      </Label>
                      <Switch
                        id={`email-${agent.id}`}
                        checked={agent.receiveEmailNotifications}
                        onCheckedChange={(checked) => updateAgentMutation.mutate({ id: agent.id, receiveEmailNotifications: checked })}
                        data-testid={`switch-email-${agent.id}`}
                      />
                    </div>
                  </div>
                </div>

                {agent.categories.length > 0 && (
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">Assigned Categories</Label>
                    <div className="flex flex-wrap gap-2">
                      {agent.categories.map(cat => (
                        <Badge 
                          key={cat.categoryId} 
                          variant={cat.isLead ? "default" : "secondary"}
                        >
                          {cat.categoryName}
                          {cat.isLead && <span className="ml-1 text-xs">(Lead)</span>}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Support Agent</DialogTitle>
            <DialogDescription>
              Select a platform user to add as a support agent. They will receive email notifications for new tickets.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Platform User</Label>
              {usersLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : availableUsers.length === 0 ? (
                <div className="flex items-center gap-2 p-3 border rounded-md text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  All platform users are already agents
                </div>
              ) : (
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger data-testid="select-user">
                    <SelectValue placeholder="Select a user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex flex-col">
                          <span>{user.displayName}</span>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {categories.length > 0 && (
              <div className="space-y-2">
                <Label>Assign to Categories</Label>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <Badge
                      key={cat.id}
                      variant={selectedCategories.includes(cat.id) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleCategory(cat.id)}
                      data-testid={`category-${cat.id}`}
                    >
                      {cat.name}
                      {selectedCategories.includes(cat.id) && (
                        <CheckCircle className="h-3 w-3 ml-1" />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>4-Digit Access Code (Optional)</Label>
              <Input
                type="text"
                placeholder="e.g., 1234"
                maxLength={4}
                value={customPin}
                onChange={(e) => setCustomPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="font-mono tracking-widest text-center text-lg"
                data-testid="input-custom-pin"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to auto-generate, or enter a memorable 4-digit code
              </p>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-md">
              <div>
                <Label className="block mb-1">Default Agent</Label>
                <p className="text-xs text-muted-foreground">
                  Receives all uncategorized tickets
                </p>
              </div>
              <Switch 
                checked={isDefaultAgent} 
                onCheckedChange={setIsDefaultAgent}
                data-testid="switch-default-new"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddAgent}
              disabled={!selectedUserId || createAgentMutation.isPending}
              data-testid="button-confirm-add"
            >
              {createAgentMutation.isPending ? "Adding..." : "Add Agent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirmAgent} onOpenChange={() => setDeleteConfirmAgent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Agent</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {deleteConfirmAgent?.displayName} as a support agent? 
              They will no longer receive email notifications or have quick access to tickets.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmAgent(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteConfirmAgent && deleteAgentMutation.mutate(deleteConfirmAgent.id)}
              disabled={deleteAgentMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteAgentMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
