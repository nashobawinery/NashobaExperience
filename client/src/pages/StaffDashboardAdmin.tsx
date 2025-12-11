import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Wine, Building2, GraduationCap, FileText, BookOpen, Wrench, Factory, ClipboardCheck,
  ArrowLeft, Home, Headphones, Scale, ClipboardList, Users, Package, Save, RefreshCw,
  ExternalLink, Settings, GripVertical, Loader2
} from "lucide-react";
import { Link } from "wouter";

interface PlatformModule {
  id: string;
  moduleKey: string;
  moduleName: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  routePrefix: string;
  status: string;
  sortOrder: number;
}

interface StaffDashboardModule {
  id: string;
  moduleId: string;
  isEnabled: boolean;
  linkUrl: string;
  customLabel: string | null;
  customDescription: string | null;
  sortOrder: number;
  module: PlatformModule;
}

const iconMap: Record<string, any> = {
  Wine,
  Building2,
  GraduationCap,
  FileText,
  BookOpen,
  Wrench,
  Factory,
  ClipboardCheck,
  Headphones,
  Scale,
  ClipboardList,
  Users,
  Package,
};

export default function StaffDashboardAdmin() {
  const { toast } = useToast();
  const [editedModules, setEditedModules] = useState<Record<string, Partial<StaffDashboardModule>>>({});

  const { data: modules, isLoading, error, refetch } = useQuery<StaffDashboardModule[]>({
    queryKey: ['/api/admin/staff-dashboard'],
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  });

  const initializeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/admin/staff-dashboard/initialize');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/staff-dashboard'] });
      toast({
        title: "Initialized",
        description: "Staff dashboard modules have been initialized from platform modules.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to initialize modules.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ moduleId, data }: { moduleId: string; data: Partial<StaffDashboardModule> }) => {
      return apiRequest('PATCH', `/api/admin/staff-dashboard/${moduleId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/staff-dashboard'] });
      toast({
        title: "Saved",
        description: "Module configuration has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update module.",
        variant: "destructive",
      });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async (modulesData: Array<{ moduleId: string; isEnabled: boolean; linkUrl: string; customLabel?: string; customDescription?: string; sortOrder: number }>) => {
      return apiRequest('POST', '/api/admin/staff-dashboard/bulk', { modules: modulesData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/staff-dashboard'] });
      setEditedModules({});
      toast({
        title: "All Changes Saved",
        description: "All module configurations have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save changes.",
        variant: "destructive",
      });
    },
  });

  const handleToggleEnabled = (item: StaffDashboardModule) => {
    const currentState = editedModules[item.moduleId]?.isEnabled ?? item.isEnabled;
    setEditedModules(prev => ({
      ...prev,
      [item.moduleId]: {
        ...prev[item.moduleId],
        isEnabled: !currentState
      }
    }));
  };

  const handleFieldChange = (moduleId: string, field: keyof StaffDashboardModule, value: string) => {
    setEditedModules(prev => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        [field]: value
      }
    }));
  };

  const handleSaveAll = () => {
    if (!modules) return;
    
    const updatedModules = modules.map(m => ({
      moduleId: m.moduleId,
      isEnabled: editedModules[m.moduleId]?.isEnabled ?? m.isEnabled,
      linkUrl: editedModules[m.moduleId]?.linkUrl ?? m.linkUrl,
      customLabel: editedModules[m.moduleId]?.customLabel ?? m.customLabel ?? undefined,
      customDescription: editedModules[m.moduleId]?.customDescription ?? m.customDescription ?? undefined,
      sortOrder: m.sortOrder
    }));
    
    bulkUpdateMutation.mutate(updatedModules);
  };

  const hasChanges = Object.keys(editedModules).length > 0;

  const getIconComponent = (iconName: string | null) => {
    if (!iconName || !iconMap[iconName]) return Home;
    return iconMap[iconName];
  };

  const getModuleValue = <K extends keyof StaffDashboardModule>(
    item: StaffDashboardModule, 
    field: K
  ): StaffDashboardModule[K] => {
    return (editedModules[item.moduleId]?.[field] ?? item[field]) as StaffDashboardModule[K];
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" data-testid="staff-dashboard-admin-error">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Failed to load configuration. Please try again later.</p>
            <Button className="mt-4" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="staff-dashboard-admin-page">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/hub">
              <Button variant="ghost" size="icon" data-testid="button-back-hub">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Staff Dashboard Configuration</h1>
              <p className="text-xs text-muted-foreground">
                Configure which modules appear on the public staff dashboard
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!modules || modules.length === 0 ? (
              <Button 
                onClick={() => initializeMutation.mutate()}
                disabled={initializeMutation.isPending}
                data-testid="button-initialize"
              >
                {initializeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Initialize Modules
              </Button>
            ) : (
              <>
                <Link href="/staff-dashboard">
                  <Button variant="outline" size="sm" data-testid="button-preview">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                </Link>
                <Button 
                  onClick={handleSaveAll}
                  disabled={!hasChanges || bulkUpdateMutation.isPending}
                  data-testid="button-save-all"
                >
                  {bulkUpdateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save All Changes
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container py-8">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-48 mt-1" />
                    </div>
                    <Skeleton className="h-6 w-12" />
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : modules && modules.length > 0 ? (
          <>
            <div className="mb-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">Module Configuration</h2>
                  <p className="text-muted-foreground">
                    Enable modules and customize their appearance on the staff dashboard
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {modules.filter(m => getModuleValue(m, 'isEnabled')).length} Enabled
                  </Badge>
                  <Badge variant="outline">
                    {modules.length} Total
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {modules.map((item) => {
                const IconComponent = getIconComponent(item.module.icon);
                const isEnabled = getModuleValue(item, 'isEnabled');
                const linkUrl = getModuleValue(item, 'linkUrl');
                const customLabel = getModuleValue(item, 'customLabel');
                const customDescription = getModuleValue(item, 'customDescription');

                return (
                  <Card 
                    key={item.id}
                    className={!isEnabled ? 'opacity-60' : ''}
                    data-testid={`card-admin-module-${item.module.moduleKey}`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start gap-4">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                          <div 
                            className="flex h-10 w-10 items-center justify-center rounded-lg"
                            style={{ 
                              backgroundColor: item.module.color ? `${item.module.color}20` : 'hsl(var(--primary)/0.1)',
                              color: item.module.color || 'hsl(var(--primary))'
                            }}
                          >
                            <IconComponent className="h-5 w-5" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-lg">{item.module.moduleName}</CardTitle>
                            <Badge variant={item.module.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                              {item.module.status}
                            </Badge>
                          </div>
                          <CardDescription className="line-clamp-1">
                            {item.module.description}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-3">
                          <Label htmlFor={`enabled-${item.id}`} className="text-sm text-muted-foreground">
                            {isEnabled ? 'Enabled' : 'Disabled'}
                          </Label>
                          <Switch
                            id={`enabled-${item.id}`}
                            checked={isEnabled}
                            onCheckedChange={() => handleToggleEnabled(item)}
                            data-testid={`switch-enable-${item.module.moduleKey}`}
                          />
                        </div>
                      </div>
                    </CardHeader>
                    
                    {isEnabled && (
                      <CardContent className="pt-4 border-t">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor={`url-${item.id}`}>Link URL</Label>
                            <Input
                              id={`url-${item.id}`}
                              placeholder="e.g., /reservations or https://example.com"
                              value={linkUrl || ''}
                              onChange={(e) => handleFieldChange(item.moduleId, 'linkUrl', e.target.value)}
                              data-testid={`input-url-${item.module.moduleKey}`}
                            />
                            <p className="text-xs text-muted-foreground">
                              Use absolute paths (/path) or full URLs (https://...)
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`label-${item.id}`}>Custom Label (Optional)</Label>
                            <Input
                              id={`label-${item.id}`}
                              placeholder={item.module.moduleName}
                              value={customLabel || ''}
                              onChange={(e) => handleFieldChange(item.moduleId, 'customLabel', e.target.value)}
                              data-testid={`input-label-${item.module.moduleKey}`}
                            />
                            <p className="text-xs text-muted-foreground">
                              Override the default module name
                            </p>
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor={`desc-${item.id}`}>Custom Description (Optional)</Label>
                            <Input
                              id={`desc-${item.id}`}
                              placeholder={item.module.description || 'Add a description'}
                              value={customDescription || ''}
                              onChange={(e) => handleFieldChange(item.moduleId, 'customDescription', e.target.value)}
                              data-testid={`input-description-${item.module.moduleKey}`}
                            />
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </>
        ) : (
          <Card data-testid="staff-dashboard-admin-empty">
            <CardContent className="py-12 text-center">
              <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Modules Configured</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                Initialize staff dashboard modules from the platform module registry to get started.
              </p>
              <Button 
                onClick={() => initializeMutation.mutate()}
                disabled={initializeMutation.isPending}
                data-testid="button-initialize-empty"
              >
                {initializeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Initialize Modules
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
