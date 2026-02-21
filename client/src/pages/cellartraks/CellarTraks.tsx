import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft, Home, ChevronDown, ChevronRight, BarChart3,
  Wine, Beer, Beaker, Grape, Factory, Warehouse,
  ClipboardList, FileText, Settings, BookOpen,
  LayoutDashboard, Clock, ArrowRightLeft, FlaskConical, Tag, DollarSign
} from "lucide-react";
import { AbccGallonsReport, AbccClassifications } from "../command-center/AbccReport";
import { FederalStateTaxPage } from "./FederalStateTaxPage";

interface NavSection {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  items: NavItem[];
  defaultOpen?: boolean;
}

interface NavItem {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const NAV_SECTIONS: NavSection[] = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    defaultOpen: true,
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    id: "winery",
    label: "Winery",
    icon: Wine,
    defaultOpen: false,
    items: [
      { id: "winery-production", label: "Production", icon: Factory },
      { id: "winery-inventory", label: "Inventory", icon: Warehouse },
      { id: "winery-reports", label: "Reports", icon: FileText },
    ],
  },
  {
    id: "distillery",
    label: "Distillery",
    icon: FlaskConical,
    defaultOpen: false,
    items: [
      { id: "distillery-production", label: "Production", icon: Factory },
      { id: "distillery-inventory", label: "Inventory", icon: Warehouse },
      { id: "distillery-reports", label: "Reports", icon: FileText },
    ],
  },
  {
    id: "brewery",
    label: "Brewery",
    icon: Beer,
    defaultOpen: false,
    items: [
      { id: "brewery-production", label: "Production", icon: Factory },
      { id: "brewery-inventory", label: "Inventory", icon: Warehouse },
      { id: "brewery-reports", label: "Reports", icon: FileText },
    ],
  },
  {
    id: "shared",
    label: "Shared Operations",
    icon: ArrowRightLeft,
    defaultOpen: false,
    items: [
      { id: "inventory-transfers", label: "Inventory Transfers", icon: ArrowRightLeft },
    ],
  },
  {
    id: "classifications",
    label: "Classifications",
    icon: Tag,
    defaultOpen: true,
    items: [
      { id: "federal-state-tax", label: "Federal & State Tax", icon: DollarSign },
      { id: "toast-classifications", label: "Toast Item Mapping", icon: Wine },
    ],
  },
  {
    id: "temp-reports",
    label: "Temporary",
    icon: Clock,
    defaultOpen: true,
    items: [
      { id: "wine-sales-report", label: "Wine Sales Report", icon: BarChart3 },
    ],
  },
];

export default function CellarTraks() {
  const [, navigate] = useLocation();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
    Object.fromEntries(NAV_SECTIONS.map(s => [s.id, s.defaultOpen ?? false]))
  );

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const currentNavItem = NAV_SECTIONS.flatMap(s => s.items).find(i => i.id === activeSection);
  const currentSectionLabel = NAV_SECTIONS.find(s => s.items.some(i => i.id === activeSection))?.label;

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <CellarTraksDashboard />;
      case "wine-sales-report":
        return <AbccGallonsReport />;
      case "federal-state-tax":
        return <FederalStateTaxPage />;
      case "toast-classifications":
        return <AbccClassifications />;
      case "winery-production":
      case "winery-inventory":
      case "winery-reports":
      case "distillery-production":
      case "distillery-inventory":
      case "distillery-reports":
      case "brewery-production":
      case "brewery-inventory":
      case "brewery-reports":
      case "inventory-transfers":
        return <ComingSoonPlaceholder section={currentNavItem?.label || activeSection} />;
      default:
        return <CellarTraksDashboard />;
    }
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <div className="w-60 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} data-testid="button-return-hub">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold leading-tight" data-testid="text-cellartraks-title">CellarTraks</h1>
              <p className="text-xs text-muted-foreground">Production Platform</p>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {NAV_SECTIONS.map(section => (
              <div key={section.id}>
                <button
                  onClick={() => toggleSection(section.id)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover-elevate rounded-md"
                  data-testid={`button-nav-section-${section.id}`}
                >
                  {expandedSections[section.id] ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  <section.icon className="h-3.5 w-3.5" />
                  <span>{section.label}</span>
                  {section.id === "temp-reports" && (
                    <Badge variant="outline" className="text-[10px] ml-auto">Temp</Badge>
                  )}
                </button>
                {expandedSections[section.id] && (
                  <div className="ml-3 space-y-0.5 mt-0.5">
                    {section.items.map(item => {
                      const isActive = activeSection === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveSection(item.id)}
                          className={`flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md transition-colors ${
                            isActive
                              ? "bg-accent text-accent-foreground font-medium"
                              : "text-muted-foreground hover-elevate"
                          }`}
                          data-testid={`button-nav-${item.id}`}
                        >
                          <item.icon className="h-4 w-4" />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1">
          <div className="p-6 max-w-7xl">
            <div className="mb-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                {currentSectionLabel && currentNavItem ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <span>{currentSectionLabel}</span>
                    <ChevronRight className="h-3 w-3" />
                    <span className="font-medium text-foreground">{currentNavItem.label}</span>
                  </div>
                ) : <div />}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/")}
                  data-testid="button-return-to-hub"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Return to Hub
                </Button>
              </div>
            </div>
            {renderContent()}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

function CellarTraksDashboard() {
  const divisions = [
    {
      title: "Winery",
      icon: Wine,
      color: "text-rose-600 dark:text-rose-400",
      bgColor: "bg-rose-50 dark:bg-rose-950/30",
      description: "Grape reception, crushing, fermentation, aging, blending, bottling, and labeling workflows."
    },
    {
      title: "Distillery",
      icon: FlaskConical,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950/30",
      description: "Mash bills, distillation runs, barrel aging, proofing, bottling, and spirits production tracking."
    },
    {
      title: "Brewery",
      icon: Beer,
      color: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
      description: "Brew day logging, fermentation monitoring, conditioning, packaging, and batch management."
    },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Grape className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight" data-testid="text-cellartraks-heading">CellarTraks</h2>
            <p className="text-muted-foreground" data-testid="text-cellartraks-subtitle">Production Management Platform</p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg" data-testid="text-about-heading">About This Module</h3>
            <div className="text-sm text-muted-foreground space-y-3 leading-relaxed">
              <p>
                <strong>CellarTraks</strong> is the comprehensive production management platform for Nashoba Valley's three
                beverage divisions: <strong>Winery</strong>, <strong>Distillery</strong>, and <strong>Brewery</strong>. Each division
                operates as a separate production entity with its own workflows, inventory systems, and regulatory requirements.
              </p>
              <p>
                This module will manage the full lifecycle of production activities for each operation -- from raw material
                intake through finished goods -- while enabling seamless <strong>inventory transfers</strong> between all three
                divisions. It will serve as the single source of truth for production data and will ultimately generate all
                reports required by <strong>Federal</strong> (TTB) and <strong>Massachusetts State</strong> (ABCC) law for
                each division.
              </p>
              <p>
                CellarTraks represents the most ambitious module on the platform, unifying production tracking, compliance
                reporting, and inter-division logistics into one integrated system.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {divisions.map(div => (
          <Card key={div.title} className="hover-elevate" data-testid={`card-division-${div.title.toLowerCase()}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${div.bgColor}`}>
                  <div.icon className={`h-5 w-5 ${div.color}`} />
                </div>
                <CardTitle className="text-base" data-testid={`text-division-${div.title.toLowerCase()}`}>{div.title}</CardTitle>
                <Badge variant="outline" className="ml-auto text-xs" data-testid={`badge-${div.title.toLowerCase()}-status`}>Coming Soon</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground" data-testid={`text-division-desc-${div.title.toLowerCase()}`}>{div.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card data-testid="card-inventory-transfers">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
              <ArrowRightLeft className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-base" data-testid="text-transfers-title">Inter-Division Inventory Transfers</CardTitle>
            <Badge variant="outline" className="ml-auto text-xs">Coming Soon</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Transfer raw materials, intermediary products, and finished goods between the Winery, Distillery,
            and Brewery with full traceability and compliance documentation.
          </p>
        </CardContent>
      </Card>

      <Card data-testid="card-compliance-reporting">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950/30">
              <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-base" data-testid="text-compliance-title">Compliance Reporting</CardTitle>
            <Badge variant="outline" className="ml-auto text-xs">Coming Soon</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Generate all required Federal (TTB) and Massachusetts State (ABCC) reports for each division, including
            production summaries, excise tax reports, and gallonage tracking.
          </p>
        </CardContent>
      </Card>

      <Separator />

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm" data-testid="text-temp-heading">Temporary Quick Reports</h3>
          <Badge variant="outline" className="text-xs" data-testid="badge-available-now">Available Now</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          While CellarTraks is being built out, the following reports are available to assist with ongoing operations.
          These will be integrated into the appropriate division sections as development progresses.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card className="hover-elevate cursor-pointer" data-testid="card-wine-sales-report">
            <CardContent className="py-4 flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              <div>
                <p className="font-medium text-sm">Wine Sales Report</p>
                <p className="text-xs text-muted-foreground">Monthly gallons tracking for ABCC compliance</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ComingSoonPlaceholder({ section }: { section: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4" data-testid="container-coming-soon">
      <div className="p-4 rounded-full bg-muted">
        <Settings className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold" data-testid="text-coming-soon-section">{section}</h3>
        <p className="text-sm text-muted-foreground max-w-md" data-testid="text-coming-soon-desc">
          This section is under development and will be available as CellarTraks is built out.
        </p>
      </div>
      <Badge variant="outline" data-testid="badge-coming-soon">Coming Soon</Badge>
    </div>
  );
}
