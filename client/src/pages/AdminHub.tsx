import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ModuleDocumentation from "@/components/ModuleDocumentation";
import { getModuleDocs } from "@/docs/index";
import "@/docs/admin-hub";
import type { RbacPermissions, UserWithRbac } from "@/hooks/useAuth";
import { 
  Wine, Building2, GraduationCap, FileText, BookOpen, Wrench, Factory, ClipboardCheck,
  ArrowRight, Users, ShoppingCart, Package, TrendingUp, Clock, AlertCircle,
  Home, Settings, Bell, LayoutGrid, Headphones, Scale, Shield, ClipboardList,
  LogOut, User, Lock, ChevronDown, Lightbulb, Info, UserCheck, Sparkles
} from "lucide-react";
import { Link } from "wouter";

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
  TrendingUp,
  UserCheck,
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

interface UserGroup {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  is_system_group: boolean;
  member_count: number;
  active: boolean;
}

function UserGroupsSection() {
  const [, setLocation] = useLocation();
  
  const { data: groups, isLoading } = useQuery<UserGroup[]>({
    queryKey: ['/api/rbac/groups'],
  });

  const activeGroups = groups?.filter(g => g.active) || [];

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Users & Groups</h2>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setLocation('/access-control')}
          data-testid="button-manage-users-groups"
        >
          <Settings className="h-4 w-4 mr-2" />
          Manage All
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-6 w-12" />
              </CardContent>
            </Card>
          ))
        ) : activeGroups.length === 0 ? (
          <Card className="col-span-full border-dashed">
            <CardContent className="py-8 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">No user groups created yet</p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setLocation('/access-control')}
                data-testid="button-create-first-group"
              >
                Create your first group
              </Button>
            </CardContent>
          </Card>
        ) : (
          activeGroups.map((group) => (
            <Card 
              key={group.id} 
              className="hover-elevate cursor-pointer"
              onClick={() => setLocation('/access-control')}
              data-testid={`group-card-${group.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  {group.color && (
                    <div 
                      className="h-3 w-3 rounded-full" 
                      style={{ backgroundColor: group.color }}
                    />
                  )}
                  <span className="text-sm font-medium truncate">{group.name}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span className="text-lg font-bold">{group.member_count}</span>
                  <span className="text-xs">members</span>
                </div>
                {group.is_system_group && (
                  <Badge variant="secondary" className="mt-2 text-xs">System</Badge>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </section>
  );
}

interface AdminHubProps {
  onBackToGuest: () => void;
  user: UserWithRbac;
  rbac: RbacPermissions | null | undefined;
  isAdmin: boolean;
}

export default function AdminHub({ onBackToGuest, user, rbac, isAdmin }: AdminHubProps) {
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
    enabled: isAdmin, // Only fetch KPIs for admins
  });

  // Helper to check if user has access to a module
  const hasModuleAccess = (moduleKey: string): boolean => {
    // Admins have access to everything
    if (isAdmin || rbac?.isGlobalAdmin) return true;
    // Check RBAC module access
    return rbac?.moduleAccess[moduleKey] === true;
  };

  // Filter modules to show only those the user has access to (hide inactive modules)
  const accessibleModules = modules?.filter(module => module.status !== 'inactive' && hasModuleAccess(module.moduleKey)) || [];
  
  // Count of accessible active modules
  const activeModuleCount = accessibleModules.filter(m => m.status === 'active').length;

  const modulesWithoutAdminSuffix = ['/command-center', '/cellartraks'];

  const navigateToModule = (routePrefix: string, status: ModuleStatus, moduleKey: string) => {
    if (!hasModuleAccess(moduleKey)) {
      return;
    }
    if (status === 'active') {
      if (routePrefix === '/app') {
        setLocation('/admin');
      } else if (modulesWithoutAdminSuffix.includes(routePrefix)) {
        setLocation(routePrefix);
      } else {
        setLocation(`${routePrefix}/admin`);
      }
    }
  };

  // Get user display name
  const getUserDisplayName = () => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) return user.firstName;
    return user.email || 'User';
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.firstName) return user.firstName[0].toUpperCase();
    if (user.email) return user.email[0].toUpperCase();
    return 'U';
  };

  // Handle logout
  const handleLogout = () => {
    window.location.href = '/api/logout';
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
              <p className="text-xs text-muted-foreground">
                {isAdmin ? 'Central Platform Administration' : 'Operations Platform'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
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
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setLocation('/module-management')}
                  data-testid="button-module-management"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Modules
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" data-testid="button-notifications">
              <Bell className="h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onBackToGuest}
              data-testid="button-back-to-guest"
            >
              Guest View
            </Button>
            
            {/* User Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 pl-2 pr-3" data-testid="button-user-menu">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={user.profileImageUrl || undefined} alt={getUserDisplayName()} />
                    <AvatarFallback className="text-xs">{getUserInitials()}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm">{getUserDisplayName()}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{getUserDisplayName()}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  {rbac?.groups && rbac.groups.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {rbac.groups.slice(0, 3).map(group => (
                        <Badge key={group} variant="secondary" className="text-xs">
                          {group}
                        </Badge>
                      ))}
                      {rbac.groups.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{rbac.groups.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation('/reset-password')} data-testid="menu-change-password">
                  <Lock className="h-4 w-4 mr-2" />
                  Change Password
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive" data-testid="menu-logout">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Quick Links Ribbon */}
      {isAdmin && (
        <div className="border-b bg-muted/30">
          <div className="container py-2">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground font-medium">Quick Links:</span>
              <Link href="/access-control" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors" data-testid="link-access-control">
                <Users className="h-4 w-4 text-primary" />
                Users & Groups
              </Link>
              <Link href="/future-concepts" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors" data-testid="link-future-concepts">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                Future Concepts
              </Link>
              <Link href="/enhancement-requests" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors" data-testid="link-enhancement-requests">
                <Sparkles className="h-4 w-4 text-purple-500" />
                Enhancement Requests
              </Link>
              <Link href="/company-info" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors" data-testid="link-company-info">
                <Info className="h-4 w-4 text-blue-500" />
                Company Info
              </Link>
            </div>
          </div>
        </div>
      )}

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
            {/* Welcome Section */}
            <section className="mb-8">
              <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={user.profileImageUrl || undefined} alt={getUserDisplayName()} />
                      <AvatarFallback className="text-lg">{getUserInitials()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="text-2xl font-semibold">Welcome back, {user.firstName || 'User'}</h2>
                      <p className="text-muted-foreground">
                        {isAdmin 
                          ? `You have full access to all ${modules?.length || 0} platform modules.`
                          : `You have access to ${activeModuleCount} active module${activeModuleCount !== 1 ? 's' : ''}.`
                        }
                      </p>
                      {rbac?.groups && rbac.groups.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {rbac.groups.map(group => (
                            <Badge key={group} variant="secondary" className="text-xs">
                              {group}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* KPIs Section - Only for admins */}
            {isAdmin && (
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
            )}

            {/* Users & Groups Section - Only for admins */}
            {isAdmin && (
              <UserGroupsSection />
            )}

            <section>
              <h2 className="text-xl font-semibold mb-4">
                {isAdmin ? 'All Modules' : 'Your Modules'}
              </h2>
              {modulesError && (
                <div className="mb-4 p-4 bg-destructive/10 border border-destructive rounded-lg text-destructive">
                  Error loading modules: {String(modulesError)}
                </div>
              )}
              
              {/* Empty State for users with no module access */}
              {!modulesLoading && accessibleModules.length === 0 && (
                <Card className="border-dashed" data-testid="no-modules-state">
                  <CardContent className="py-12 text-center">
                    <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No Module Access</h3>
                    <p className="text-muted-foreground max-w-md mx-auto mb-4">
                      You don't have access to any modules yet. Please contact your administrator to request access.
                    </p>
                    <Button variant="outline" onClick={handleLogout} data-testid="button-signout-empty">
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </Button>
                  </CardContent>
                </Card>
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
                  accessibleModules.map((module) => {
                    const IconComponent = iconMap[module.icon || ''] || Package;
                    const isClickable = module.status === 'active';
                    
                    return (
                      <Card 
                        key={module.id}
                        className={isClickable ? "hover-elevate cursor-pointer transition-all" : "opacity-75"}
                        onClick={() => navigateToModule(module.routePrefix, module.status, module.moduleKey)}
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

            {/* Quick Actions - Only for admins */}
            {isAdmin && (
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
            )}
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
