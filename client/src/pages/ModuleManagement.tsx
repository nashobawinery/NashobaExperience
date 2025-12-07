import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { 
  ArrowLeft, 
  Box, 
  Edit2, 
  Save,
  X,
  Check,
  AlertCircle,
  Loader2,
  Info,
  Code,
  Calendar,
  Palette
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import * as LucideIcons from "lucide-react";

type ModuleStatus = 'active' | 'development' | 'planned' | 'inactive';

interface PlatformModule {
  id: string;
  module_key: string;
  module_name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  route_prefix: string | null;
  status: ModuleStatus;
  sort_order: number;
  launch_date: string | null;
  created_at: string;
  updated_at: string;
}

const statusColors: Record<ModuleStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  development: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  planned: "bg-muted text-muted-foreground border-muted-foreground/20",
  inactive: "bg-destructive/10 text-destructive border-destructive/20",
};

const statusLabels: Record<ModuleStatus, string> = {
  active: "Active",
  development: "In Development",
  planned: "Planned",
  inactive: "Inactive",
};

const availableIcons = [
  'Wine', 'Building2', 'GraduationCap', 'FileText', 'BookOpen', 'Wrench', 
  'Factory', 'ClipboardCheck', 'Headphones', 'Scale', 'ClipboardList', 
  'Users', 'Package', 'Calendar', 'Gamepad2', 'CheckSquare', 'MessageCircle',
  'ShoppingCart', 'CreditCard', 'Settings', 'Database', 'Shield', 'Bell'
];

export default function ModuleManagement() {
  const { toast } = useToast();
  const [editingModule, setEditingModule] = useState<PlatformModule | null>(null);
  const [editForm, setEditForm] = useState({
    moduleName: '',
    description: '',
    icon: '',
    color: '',
    status: 'planned' as ModuleStatus,
    sortOrder: 0
  });

  const { data: modules = [], isLoading } = useQuery<PlatformModule[]>({
    queryKey: ['/api/admin/modules'],
  });

  const updateModuleMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<PlatformModule> }) => {
      return apiRequest('PATCH', `/api/admin/modules/${data.id}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/modules'] });
      queryClient.invalidateQueries({ queryKey: ['/api/platform/modules'] });
      setEditingModule(null);
      toast({
        title: "Module updated",
        description: "Module metadata has been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message || "Failed to update module",
      });
    }
  });

  const handleEdit = (module: PlatformModule) => {
    setEditingModule(module);
    setEditForm({
      moduleName: module.module_name,
      description: module.description || '',
      icon: module.icon || '',
      color: module.color || '',
      status: module.status,
      sortOrder: module.sort_order
    });
  };

  const handleSave = () => {
    if (!editingModule) return;
    
    updateModuleMutation.mutate({
      id: editingModule.id,
      updates: {
        module_name: editForm.moduleName,
        description: editForm.description || null,
        icon: editForm.icon || null,
        color: editForm.color || null,
        status: editForm.status,
        sort_order: editForm.sortOrder
      }
    });
  };

  const getIconComponent = (iconName: string | null) => {
    if (!iconName) return Box;
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent || Box;
  };

  const activeCount = modules.filter(m => m.status === 'active').length;
  const devCount = modules.filter(m => m.status === 'development').length;
  const plannedCount = modules.filter(m => m.status === 'planned').length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="module-management-page">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/hub">
              <Button variant="ghost" size="icon" data-testid="button-back-hub">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold">Module Management</h1>
              <p className="text-xs text-muted-foreground">
                View and configure platform modules
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Modules</CardTitle>
              <Box className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-modules">{modules.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Check className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600" data-testid="text-active-modules">{activeCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Development</CardTitle>
              <Code className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600" data-testid="text-dev-modules">{devCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Planned</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground" data-testid="text-planned-modules">{plannedCount}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Platform Modules</CardTitle>
            <CardDescription>
              All registered platform modules. Edit metadata like name, description, and status. 
              <span className="block mt-1 text-xs">
                <Info className="h-3 w-3 inline mr-1" />
                To add new modules, they must be added to the code registry in server/rbac.ts
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Icon</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-16">Order</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modules.sort((a, b) => a.sort_order - b.sort_order).map((module) => {
                  const IconComponent = getIconComponent(module.icon);
                  return (
                    <TableRow key={module.id} data-testid={`row-module-${module.module_key}`}>
                      <TableCell>
                        <div className={`h-8 w-8 rounded-md flex items-center justify-center ${module.color || 'bg-muted'}`}>
                          <IconComponent className="h-4 w-4 text-white" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium" data-testid={`text-module-name-${module.module_key}`}>
                            {module.module_name}
                          </div>
                          {module.description && (
                            <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                              {module.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {module.module_key}
                        </code>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs text-muted-foreground">
                          {module.route_prefix || '-'}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[module.status]}>
                          {statusLabels[module.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {module.sort_order}
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(module)}
                              data-testid={`button-edit-${module.module_key}`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit module</TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              Adding New Modules
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              To add a new module to the platform, add an entry to the <code className="bg-muted px-1 rounded">defaultModules</code> array 
              in <code className="bg-muted px-1 rounded">server/rbac.ts</code>. The module will be automatically created on next deployment.
            </p>
            <p>
              Each module entry requires: <code className="bg-muted px-1 rounded">moduleKey</code>, 
              <code className="bg-muted px-1 rounded">moduleName</code>, <code className="bg-muted px-1 rounded">description</code>, 
              <code className="bg-muted px-1 rounded">icon</code>, <code className="bg-muted px-1 rounded">color</code>, 
              <code className="bg-muted px-1 rounded">routePrefix</code>, <code className="bg-muted px-1 rounded">status</code>, 
              <code className="bg-muted px-1 rounded">sortOrder</code>
            </p>
          </CardContent>
        </Card>
      </main>

      <Dialog open={!!editingModule} onOpenChange={(open) => !open && setEditingModule(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Module</DialogTitle>
            <DialogDescription>
              Update module metadata. The module key cannot be changed.
            </DialogDescription>
          </DialogHeader>
          
          {editingModule && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Module Key</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted px-3 py-2 rounded-md text-sm">
                    {editingModule.module_key}
                  </code>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="moduleName">Display Name</Label>
                <Input
                  id="moduleName"
                  value={editForm.moduleName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, moduleName: e.target.value }))}
                  data-testid="input-module-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  data-testid="input-description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Icon</Label>
                  <Select
                    value={editForm.icon}
                    onValueChange={(value) => setEditForm(prev => ({ ...prev, icon: value }))}
                  >
                    <SelectTrigger data-testid="select-icon">
                      <SelectValue placeholder="Select icon" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableIcons.map(icon => {
                        const IconComp = (LucideIcons as any)[icon];
                        return (
                          <SelectItem key={icon} value={icon}>
                            <div className="flex items-center gap-2">
                              {IconComp && <IconComp className="h-4 w-4" />}
                              <span>{icon}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editForm.status}
                    onValueChange={(value) => setEditForm(prev => ({ ...prev, status: value as ModuleStatus }))}
                  >
                    <SelectTrigger data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="development">In Development</SelectItem>
                      <SelectItem value="planned">Planned</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="color">Color Class</Label>
                  <Input
                    id="color"
                    value={editForm.color}
                    onChange={(e) => setEditForm(prev => ({ ...prev, color: e.target.value }))}
                    placeholder="e.g., bg-blue-500"
                    data-testid="input-color"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sortOrder">Sort Order</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    value={editForm.sortOrder}
                    onChange={(e) => setEditForm(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                    data-testid="input-sort-order"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingModule(null)} data-testid="button-cancel">
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={updateModuleMutation.isPending}
              data-testid="button-save-module"
            >
              {updateModuleMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
