import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ModuleDocumentation from "@/components/ModuleDocumentation";
import { getModuleDocs } from "@/docs/index";
import "@/docs/admin-hub";
import { 
  Wine, Building2, GraduationCap, FileText, BookOpen, Wrench, Factory, ClipboardCheck,
  ArrowRight, Users, ShoppingCart, Package, TrendingUp, Clock, AlertCircle,
  Home, Settings, Bell, LayoutGrid, Headphones, Scale, Shield, ClipboardList
} from "lucide-react";

type ModuleStatus = 'active' | 'development' | 'planned' | 'inactive';

interface PlatformModule {
  id: string;
  moduleKey: string;
  moduleName: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  routePrefix: string;
  status: ModuleStatus;
  sortOrder: number;
  launchDate: string | null;
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

const statusColors: Record<ModuleStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  development: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  planned: "bg-muted text-muted-foreground",
  inactive: "bg-destructive/10 text-destructive",
};

const statusLabels: Record<ModuleStatus, string> = {
  active: "Active",
  development: "In Development",
  planned: "Coming Soon",
  inactive: "Inactive",
};

interface AdminHubProps {
  onBackToGuest: () => void;
}

export default function AdminHub({ onBackToGuest }: AdminHubProps) {
  const [, setLocation] = useLocation();

  const { data: modules, isLoading: modulesLoading, error: modulesError } = useQuery<PlatformModule[]>({
    queryKey: ['/api/platform/modules'],
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  });

  const { data: kpis, isLoading: kpisLoading } = useQuery<{
    totalGuests: number;
    todayOrders: number;
    activeProducts: number;
    b2bCustomers: number;
    pendingApprovals: number;
    recentActivity: number;
  }>({
    queryKey: ['/api/platform/kpis'],
  });

  const navigateToModule = (routePrefix: string, status: ModuleStatus) => {
    if (status === 'active') {
      if (routePrefix === '/app') {
        setLocation('/admin');
      } else {
        setLocation(`${routePrefix}/admin`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background" data-testid="admin-hub-page">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Home className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Nashoba Operations Hub</h1>
              <p className="text-xs text-muted-foreground">Central Platform Administration</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation('/modules')}
              data-testid="button-module-directory"
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Module Directory
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation('/access-control')}
              data-testid="button-access-control"
            >
              <Shield className="h-4 w-4 mr-2" />
              Access Control
            </Button>
            <Button variant="ghost" size="icon" data-testid="button-notifications">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" data-testid="button-settings">
              <Settings className="h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onBackToGuest}
              data-testid="button-back-to-guest"
            >
              Guest View
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <LayoutGrid className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="documentation" data-testid="tab-documentation">
              <BookOpen className="h-4 w-4 mr-2" />
              Documentation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">Platform Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {kpisLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <Skeleton className="h-4 w-20 mb-2" />
                        <Skeleton className="h-8 w-16" />
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <>
                    <Card data-testid="kpi-total-guests">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Users className="h-4 w-4" />
                          <span className="text-xs font-medium">Total Guests</span>
                        </div>
                        <p className="text-2xl font-bold">{kpis?.totalGuests ?? 0}</p>
                      </CardContent>
                    </Card>
                    <Card data-testid="kpi-today-orders">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <ShoppingCart className="h-4 w-4" />
                          <span className="text-xs font-medium">Today's Orders</span>
                        </div>
                        <p className="text-2xl font-bold">{kpis?.todayOrders ?? 0}</p>
                      </CardContent>
                    </Card>
                    <Card data-testid="kpi-active-products">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Package className="h-4 w-4" />
                          <span className="text-xs font-medium">Active Products</span>
                        </div>
                        <p className="text-2xl font-bold">{kpis?.activeProducts ?? 0}</p>
                      </CardContent>
                    </Card>
                    <Card data-testid="kpi-b2b-customers">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Building2 className="h-4 w-4" />
                          <span className="text-xs font-medium">B2B Customers</span>
                        </div>
                        <p className="text-2xl font-bold">{kpis?.b2bCustomers ?? 0}</p>
                      </CardContent>
                    </Card>
                    <Card data-testid="kpi-pending-approvals">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
                          <Clock className="h-4 w-4" />
                          <span className="text-xs font-medium">Pending</span>
                        </div>
                        <p className="text-2xl font-bold">{kpis?.pendingApprovals ?? 0}</p>
                      </CardContent>
                    </Card>
                    <Card data-testid="kpi-recent-activity">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <TrendingUp className="h-4 w-4" />
                          <span className="text-xs font-medium">24h Activity</span>
                        </div>
                        <p className="text-2xl font-bold">{kpis?.recentActivity ?? 0}</p>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">Modules</h2>
              {modulesError && (
                <div className="mb-4 p-4 bg-destructive/10 border border-destructive rounded-lg text-destructive">
                  Error loading modules: {String(modulesError)}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {modulesLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <Card key={i}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <Skeleton className="h-10 w-10 rounded-lg" />
                          <Skeleton className="h-5 w-20" />
                        </div>
                        <Skeleton className="h-5 w-32 mt-3" />
                        <Skeleton className="h-4 w-full mt-2" />
                      </CardHeader>
                      <CardContent className="pt-0">
                        <Skeleton className="h-9 w-full" />
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  modules?.map((module) => {
                    const IconComponent = iconMap[module.icon || ''] || Package;
                    const isClickable = module.status === 'active';
                    
                    return (
                      <Card 
                        key={module.id}
                        className={isClickable ? "hover-elevate cursor-pointer transition-all" : "opacity-75"}
                        onClick={() => navigateToModule(module.routePrefix, module.status)}
                        data-testid={`module-card-${module.moduleKey}`}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${module.color || 'bg-muted'} text-white`}>
                              <IconComponent className="h-5 w-5" />
                            </div>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${statusColors[module.status]}`}
                            >
                              {statusLabels[module.status]}
                            </Badge>
                          </div>
                          <CardTitle className="text-base mt-3">{module.moduleName}</CardTitle>
                          <CardDescription className="text-sm line-clamp-2">
                            {module.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          {isClickable ? (
                            <Button 
                              className="w-full gap-2" 
                              variant="secondary"
                              data-testid={`button-open-${module.moduleKey}`}
                            >
                              Open Module
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button 
                              className="w-full gap-2" 
                              variant="outline" 
                              disabled
                            >
                              {module.status === 'development' ? 'In Development' : 'Coming Soon'}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </section>

            <section className="mt-10">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base">Quick Actions</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => setLocation('/admin')}
                      data-testid="button-tasting-admin"
                    >
                      <Wine className="h-4 w-4 mr-2" />
                      Tasting Admin
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setLocation('/b2b/admin')}
                      data-testid="button-b2b-admin"
                    >
                      <Building2 className="h-4 w-4 mr-2" />
                      B2B Admin
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setLocation('/admin/database-sync')}
                      data-testid="button-database-sync"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Database Sync
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </section>
          </TabsContent>

          <TabsContent value="documentation">
            {getModuleDocs("admin-hub") && (
              <ModuleDocumentation documentation={getModuleDocs("admin-hub")!} />
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
