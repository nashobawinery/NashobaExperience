import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Wine, Building2, GraduationCap, FileText, BookOpen, Wrench, Factory, ClipboardCheck,
  ArrowRight, Home, Headphones, Scale, ClipboardList, Users, Package, ExternalLink
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

export default function StaffDashboard() {
  const { data: modules, isLoading, error } = useQuery<StaffDashboardModule[]>({
    queryKey: ['/api/staff-dashboard'],
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  });

  const handleNavigate = (linkUrl: string) => {
    if (linkUrl.startsWith('http://') || linkUrl.startsWith('https://')) {
      window.open(linkUrl, '_blank');
    } else {
      window.location.href = linkUrl;
    }
  };

  const getIconComponent = (iconName: string | null) => {
    if (!iconName || !iconMap[iconName]) return Home;
    return iconMap[iconName];
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" data-testid="staff-dashboard-error">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Failed to load staff dashboard. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="staff-dashboard-page">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Home className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Staff Dashboard</h1>
              <p className="text-xs text-muted-foreground">Quick access to staff resources</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="outline" size="sm" data-testid="button-back-home">
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container py-8">
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-5 w-32 mt-2" />
                  <Skeleton className="h-4 w-48 mt-1" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : modules && modules.length > 0 ? (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-2">Available Resources</h2>
              <p className="text-muted-foreground">
                Access staff and customer-facing tools and resources
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {modules.map((item) => {
                const IconComponent = getIconComponent(item.module.icon);
                const displayLabel = item.customLabel || item.module.moduleName;
                const displayDescription = item.customDescription || item.module.description;
                const isExternal = item.linkUrl.startsWith('http://') || item.linkUrl.startsWith('https://');

                return (
                  <Card 
                    key={item.id} 
                    className="hover-elevate cursor-pointer transition-all"
                    onClick={() => handleNavigate(item.linkUrl)}
                    data-testid={`card-module-${item.module.moduleKey}`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div 
                          className="flex h-10 w-10 items-center justify-center rounded-lg"
                          style={{ 
                            backgroundColor: item.module.color ? `${item.module.color}20` : 'hsl(var(--primary)/0.1)',
                            color: item.module.color || 'hsl(var(--primary))'
                          }}
                        >
                          <IconComponent className="h-5 w-5" />
                        </div>
                        {isExternal && (
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <CardTitle className="text-lg mt-2">{displayLabel}</CardTitle>
                      {displayDescription && (
                        <CardDescription className="line-clamp-2">
                          {displayDescription}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <Button 
                        className="w-full" 
                        variant="secondary"
                        data-testid={`button-open-${item.module.moduleKey}`}
                      >
                        {isExternal ? 'Open in New Tab' : 'Open'}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        ) : (
          <Card data-testid="staff-dashboard-empty">
            <CardContent className="py-12 text-center">
              <Home className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Resources Available</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                No staff resources have been configured yet. Please contact your administrator.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
