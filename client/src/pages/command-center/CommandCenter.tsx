import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { queryClient } from "@/lib/queryClient";
import {
  ArrowLeft, Target, Lightbulb, Megaphone, DollarSign, Brain,
  Users, BarChart3, Search, Award, Gift, Zap, Share2, Plug,
  ChevronDown, ChevronRight, LayoutDashboard, TrendingUp,
  BookOpen, Store, Check, Crosshair, MessageSquare, UserPlus,
  UtensilsCrossed, Wand2, CalendarDays, Rocket, Gauge, Sparkles, FileText, Printer
} from "lucide-react";

import { TargetingOverview, RoiProjections } from "./TargetingDashboard";
import { SmsCampaignsTab } from "./SmsCampaigns";
import { ToastMenuBrowser } from "./ToastMenuBrowser";
import { ToastConnectDocs, ToastPrintMenus } from "@/pages/toast-connect/ToastConnect";
import { AiContentStudio } from "./AiContentStudio";
import { ContentCalendar } from "./ContentCalendar";
import { CampaignBuilder } from "./CampaignBuilder";
import { MarketingScorecard } from "./MarketingScorecard";
import { QuickPromotions } from "./QuickPromotions";

import {
  WeekSelector,
  InitializeWeeksCard,
  WeeklyFocusPanel,
  TasksPanel,
  CampaignsPanel as RccCampaignsPanel,
  RevenuePanel,
  AiAdvisorPanel,
  RccDocsPanel,
  ExportImportButtons,
  StatCard,
} from "@/pages/rcc/RccDashboard";

import {
  SegmentOverview,
  RfmTab,
  LoyaltyTab,
  CampaignsTab as BoomerangCampaignsTab,
  AutomationsTab,
  ReferralsTab,
  AnalyticsTab,
  CustomerBrowser,
  HighValueTargets,
  ToastIntegrationTab,
  NewCustomers,
} from "@/pages/reactivation/BoomerangDashboard";

import type {
  RccWeek,
  RccTask,
  RccCampaign,
  RccRevenue,
  RccAiRecommendation,
  RccTeam,
  RccDailyRevenue,
} from "@shared/schema";

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
    id: "revenue",
    label: "Revenue",
    icon: DollarSign,
    defaultOpen: true,
    items: [
      { id: "weekly-focus", label: "Weekly Focus", icon: Target },
      { id: "daily-revenue", label: "Daily Revenue", icon: DollarSign },
      { id: "tasks", label: "Tasks & Ideas", icon: Lightbulb },
      { id: "rcc-campaigns", label: "Revenue Campaigns", icon: Megaphone },
    ],
  },
  {
    id: "targeting",
    label: "Targeting",
    icon: Crosshair,
    defaultOpen: false,
    items: [
      { id: "targeting-overview", label: "Weekly Targets", icon: Crosshair },
      { id: "roi-projections", label: "ROI Projections", icon: TrendingUp },
    ],
  },
  {
    id: "customers",
    label: "Customers",
    icon: Users,
    defaultOpen: false,
    items: [
      { id: "segments", label: "Segments Overview", icon: Users },
      { id: "new-customers", label: "New Customers", icon: UserPlus },
      { id: "customer-browser", label: "Customer Browser", icon: Search },
      { id: "high-value", label: "High Value Targets", icon: DollarSign },
      { id: "rfm", label: "RFM Analysis", icon: Target },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    icon: Megaphone,
    defaultOpen: false,
    items: [
      { id: "sms-campaigns", label: "SMS Campaigns", icon: MessageSquare },
      { id: "campaigns", label: "Campaigns", icon: Gift },
      { id: "automations", label: "Automations", icon: Zap },
      { id: "loyalty", label: "Loyalty Program", icon: Award },
      { id: "referrals", label: "Referral Program", icon: Share2 },
    ],
  },
  {
    id: "insights",
    label: "Insights",
    icon: Brain,
    defaultOpen: false,
    items: [
      { id: "analytics", label: "Analytics", icon: BarChart3 },
      { id: "ai-advisor", label: "AI Advisor", icon: Brain },
    ],
  },
  {
    id: "growth-studio",
    label: "Growth Studio",
    icon: Rocket,
    defaultOpen: false,
    items: [
      { id: "content-studio", label: "AI Content Studio", icon: Wand2 },
      { id: "content-calendar", label: "Content Calendar", icon: CalendarDays },
      { id: "campaign-builder", label: "Campaign Builder", icon: Rocket },
      { id: "scorecard", label: "Marketing Scorecard", icon: Gauge },
      { id: "quick-promos", label: "Quick Promotions", icon: Sparkles },
    ],
  },
  {
    id: "toast-connect",
    label: "Toast Connect",
    icon: UtensilsCrossed,
    defaultOpen: false,
    items: [
      { id: "toast-menus", label: "Toast Menus", icon: UtensilsCrossed },
      { id: "toast-print", label: "Print Menus", icon: Printer },
      { id: "integrations", label: "Integrations", icon: Plug },
      { id: "toast-docs", label: "Documentation", icon: FileText },
    ],
  },
];

function CombinedDashboard({
  activeWeek,
  dailyTotals,
  dailyGrandTotal,
  tasks,
  campaigns,
  ideas,
}: {
  activeWeek: RccWeek | null | undefined;
  dailyTotals: { toast: number; shopify: number; wholesale: number; other: number };
  dailyGrandTotal: number;
  tasks: RccTask[] | undefined;
  campaigns: RccCampaign[] | undefined;
  ideas: RccTask[] | undefined;
}) {
  const { data: segmentData } = useQuery<{
    segments: { segment: string; customerCount: number; totalLifetimeRevenue: number }[];
    totalCustomers: number;
    sourceCounts?: Record<string, number>;
    mergedCount?: number;
  }>({
    queryKey: ["/api/reactivation/segments"],
  });

  const totalCustomers = segmentData?.totalCustomers || 0;
  const atRiskCustomers = segmentData?.segments?.find(s => s.segment === "at_risk")?.customerCount || 0;
  const lapsedCustomers = segmentData?.segments?.find(s => s.segment === "lapsed")?.customerCount || 0;
  const dormantCustomers = segmentData?.segments?.find(s => s.segment === "dormant")?.customerCount || 0;
  const reactivationTargets = atRiskCustomers + lapsedCustomers + dormantCustomers;

  const formatCurrency = (val: number) => `$${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-3" data-testid="text-dashboard-heading">Weekly Snapshot</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <StatCard
            label="Weekly Revenue"
            value={dailyGrandTotal > 0 ? formatCurrency(dailyGrandTotal) : "Not entered"}
            icon={<DollarSign className="h-4 w-4" />}
            active={dailyGrandTotal > 0}
          />
          <StatCard
            label="Focus"
            value={activeWeek?.focusStatement ? "Set" : "Not set"}
            icon={<Target className="h-4 w-4" />}
            active={!!activeWeek?.focusStatement}
          />
          <StatCard
            label="Tasks"
            value={`${tasks?.filter(t => t.status === "done").length || 0}/${tasks?.length || 0}`}
            icon={<Check className="h-4 w-4" />}
            active={(tasks?.filter(t => t.status === "done").length || 0) > 0}
          />
          <StatCard
            label="Campaigns"
            value={`${campaigns?.length || 0}`}
            icon={<Megaphone className="h-4 w-4" />}
            active={(campaigns?.length || 0) > 0}
          />
          <StatCard
            label="Total Customers"
            value={totalCustomers.toLocaleString()}
            icon={<Users className="h-4 w-4" />}
            active={totalCustomers > 0}
          />
          <StatCard
            label="Reactivation Targets"
            value={reactivationTargets.toLocaleString()}
            icon={<TrendingUp className="h-4 w-4" />}
            active={reactivationTargets > 0}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Revenue Breakdown</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Toast POS</span>
                <span className="font-medium">{formatCurrency(dailyTotals.toast)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Shopify</span>
                <span className="font-medium">{formatCurrency(dailyTotals.shopify)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Wholesale</span>
                <span className="font-medium">{formatCurrency(dailyTotals.wholesale)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Other</span>
                <span className="font-medium">{formatCurrency(dailyTotals.other)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between font-semibold">
                <span>Total</span>
                <span>{formatCurrency(dailyGrandTotal)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Customer Health</h3>
            <div className="space-y-2 text-sm">
              {segmentData?.segments?.map(seg => (
                <div key={seg.segment} className="flex items-center justify-between">
                  <span className="text-muted-foreground capitalize">{seg.segment.replace("_", " ")}</span>
                  <span className="font-medium">{seg.customerCount.toLocaleString()}</span>
                </div>
              ))}
              {segmentData?.sourceCounts && Object.keys(segmentData.sourceCounts).length > 1 && (
                <>
                  <Separator />
                  <div className="flex items-center gap-2 flex-wrap">
                    {Object.entries(segmentData.sourceCounts).map(([src, cnt]) => (
                      <Badge key={src} variant="outline" className="text-xs">{src}: {(cnt as number).toLocaleString()}</Badge>
                    ))}
                    {(segmentData.mergedCount ?? 0) > 0 && (
                      <Badge variant="outline" className="text-xs">merged: {segmentData.mergedCount}</Badge>
                    )}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {activeWeek?.focusStatement && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-1">This Week's Focus</h3>
            <p className="text-sm">{activeWeek.focusStatement}</p>
            {activeWeek.hookAngle && (
              <p className="text-xs text-muted-foreground mt-1">Hook: {activeWeek.hookAngle}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function CommandCenter() {
  const [, navigate] = useLocation();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    NAV_SECTIONS.forEach(s => { initial[s.id] = s.defaultOpen ?? false; });
    return initial;
  });
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);

  const { data: weeks, isLoading: weeksLoading } = useQuery<RccWeek[]>({
    queryKey: ["/api/rcc/weeks"],
  });
  const { data: currentWeek, isLoading: currentWeekLoading } = useQuery<RccWeek | null>({
    queryKey: ["/api/rcc/weeks/current"],
  });
  const { data: teams } = useQuery<RccTeam[]>({
    queryKey: ["/api/rcc/teams"],
  });

  const activeWeekId = selectedWeekId || currentWeek?.id;

  const { data: tasks } = useQuery<RccTask[]>({
    queryKey: ["/api/rcc/tasks", activeWeekId],
    queryFn: () => activeWeekId
      ? fetch(`/api/rcc/tasks?weekId=${activeWeekId}`).then(r => r.json())
      : Promise.resolve([]),
    enabled: !!activeWeekId,
  });
  const { data: ideas } = useQuery<RccTask[]>({
    queryKey: ["/api/rcc/ideas"],
  });
  const { data: campaigns } = useQuery<RccCampaign[]>({
    queryKey: ["/api/rcc/campaigns", activeWeekId],
    queryFn: () => activeWeekId
      ? fetch(`/api/rcc/campaigns?weekId=${activeWeekId}`).then(r => r.json())
      : Promise.resolve([]),
    enabled: !!activeWeekId,
  });
  const { data: revenue } = useQuery<RccRevenue | null>({
    queryKey: ["/api/rcc/revenue", activeWeekId],
    queryFn: () => activeWeekId
      ? fetch(`/api/rcc/revenue/${activeWeekId}`).then(r => r.json())
      : Promise.resolve(null),
    enabled: !!activeWeekId,
  });
  const { data: dailyRevenue } = useQuery<RccDailyRevenue[]>({
    queryKey: ["/api/rcc/daily-revenue", activeWeekId],
    queryFn: () => activeWeekId
      ? fetch(`/api/rcc/daily-revenue/${activeWeekId}`).then(r => r.json())
      : Promise.resolve([]),
    enabled: !!activeWeekId,
  });
  const { data: aiRecs } = useQuery<RccAiRecommendation[]>({
    queryKey: ["/api/rcc/ai-recommendations", activeWeekId],
    queryFn: () => activeWeekId
      ? fetch(`/api/rcc/ai-recommendations/${activeWeekId}`).then(r => r.json())
      : Promise.resolve([]),
    enabled: !!activeWeekId,
  });

  const activeWeek = weeks?.find(w => w.id === activeWeekId) || currentWeek;

  const dailyTotals = {
    toast: dailyRevenue?.reduce((sum, d) => sum + parseFloat(d.toastRevenue || "0"), 0) || 0,
    shopify: dailyRevenue?.reduce((sum, d) => sum + parseFloat(d.shopifyRevenue || "0"), 0) || 0,
    wholesale: dailyRevenue?.reduce((sum, d) => sum + parseFloat(d.wholesaleRevenue || "0"), 0) || 0,
    other: dailyRevenue?.reduce((sum, d) => sum + parseFloat(d.otherRevenue || "0"), 0) || 0,
  };
  const dailyGrandTotal = dailyTotals.toast + dailyTotals.shopify + dailyTotals.wholesale + dailyTotals.other;

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  if (weeksLoading || currentWeekLoading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-12 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const renderContent = () => {
    if (!activeWeek && (activeSection === "weekly-focus" || activeSection === "daily-revenue" || activeSection === "tasks" || activeSection === "rcc-campaigns" || activeSection === "ai-advisor")) {
      return <InitializeWeeksCard onSuccess={() => queryClient.invalidateQueries({ queryKey: ["/api/rcc/weeks"] })} />;
    }

    switch (activeSection) {
      case "dashboard":
        return (
          <CombinedDashboard
            activeWeek={activeWeek}
            dailyTotals={dailyTotals}
            dailyGrandTotal={dailyGrandTotal}
            tasks={tasks}
            campaigns={campaigns}
            ideas={ideas}
          />
        );

      case "weekly-focus":
        return activeWeek ? <WeeklyFocusPanel week={activeWeek} /> : null;

      case "daily-revenue":
        return activeWeek && activeWeekId ? (
          <RevenuePanel weekId={activeWeekId} week={activeWeek} revenue={revenue ?? null} />
        ) : null;

      case "tasks":
        return activeWeekId ? (
          <TasksPanel weekId={activeWeekId} tasks={tasks || []} ideas={ideas || []} teams={teams || []} />
        ) : null;

      case "rcc-campaigns":
        return activeWeekId ? (
          <RccCampaignsPanel weekId={activeWeekId} campaigns={campaigns || []} />
        ) : null;

      case "segments":
        return <SegmentOverview />;

      case "new-customers":
        return <NewCustomers />;

      case "customer-browser":
        return <CustomerBrowser />;

      case "high-value":
        return <HighValueTargets />;

      case "rfm":
        return <RfmTab />;

      case "sms-campaigns":
        return <SmsCampaignsTab />;

      case "campaigns":
        return <BoomerangCampaignsTab />;

      case "automations":
        return <AutomationsTab />;

      case "loyalty":
        return <LoyaltyTab />;

      case "referrals":
        return <ReferralsTab />;

      case "analytics":
        return <AnalyticsTab />;

      case "ai-advisor":
        return activeWeekId ? (
          <AiAdvisorPanel weekId={activeWeekId} recommendations={aiRecs || []} />
        ) : null;

      case "targeting-overview":
        return <TargetingOverview />;

      case "roi-projections":
        return <RoiProjections />;

      case "content-studio":
        return <AiContentStudio />;

      case "content-calendar":
        return <ContentCalendar />;

      case "campaign-builder":
        return <CampaignBuilder />;

      case "scorecard":
        return <MarketingScorecard />;

      case "quick-promos":
        return <QuickPromotions />;

      case "toast-menus":
        return <ToastMenuBrowser />;

      case "toast-print":
        return <ToastPrintMenus />;

      case "integrations":
        return <ToastIntegrationTab />;

      case "toast-docs":
        return <ToastConnectDocs />;

      case "docs":
        return <RccDocsPanel />;

      default:
        return <CombinedDashboard activeWeek={activeWeek} dailyTotals={dailyTotals} dailyGrandTotal={dailyGrandTotal} tasks={tasks} campaigns={campaigns} ideas={ideas} />;
    }
  };

  const currentNavItem = NAV_SECTIONS.flatMap(s => s.items).find(i => i.id === activeSection);
  const currentSectionLabel = NAV_SECTIONS.find(s => s.items.some(i => i.id === activeSection))?.label;

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <div className="w-60 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} data-testid="button-return-hub">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold leading-tight" data-testid="text-command-center-title">Command Center</h1>
              <p className="text-xs text-muted-foreground">Data & Marketing</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3"
            onClick={() => setActiveSection("docs")}
            data-testid="button-nav-docs-top"
          >
            <BookOpen className="h-3.5 w-3.5 mr-2" />
            Documentation
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {NAV_SECTIONS.map(section => (
              <div key={section.id}>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover-elevate"
                  onClick={() => toggleSection(section.id)}
                  data-testid={`button-nav-section-${section.id}`}
                >
                  <section.icon className="h-4 w-4" />
                  <span className="flex-1 text-left">{section.label}</span>
                  {expandedSections[section.id] ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </button>
                {expandedSections[section.id] && (
                  <div className="ml-4 space-y-0.5 mt-0.5">
                    {section.items.map(item => {
                      const isActive = activeSection === item.id;
                      return (
                        <button
                          key={item.id}
                          className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                            isActive
                              ? "bg-primary text-primary-foreground font-medium"
                              : "text-muted-foreground hover-elevate"
                          }`}
                          onClick={() => {
                            setActiveSection(item.id);
                          }}
                          data-testid={`button-nav-${item.id}`}
                        >
                          <item.icon className="h-3.5 w-3.5" />
                          <span>{item.label}</span>
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
        {(activeSection === "weekly-focus" || activeSection === "daily-revenue" || activeSection === "tasks" || activeSection === "rcc-campaigns" || activeSection === "dashboard") && activeWeek && (
          <div className="border-b px-6 py-2 flex items-center gap-3 flex-wrap bg-muted/20">
            <WeekSelector
              weeks={weeks || []}
              activeWeekId={activeWeekId}
              onSelectWeek={setSelectedWeekId}
            />
            {activeWeekId && (
              <ExportImportButtons
                weekId={activeWeekId}
                weeks={weeks || []}
                onImportComplete={(targetWeekId) => {
                  queryClient.invalidateQueries({ queryKey: ["/api/rcc/weeks"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/rcc/weeks/current"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/rcc/tasks", targetWeekId] });
                  queryClient.invalidateQueries({ queryKey: ["/api/rcc/campaigns", targetWeekId] });
                }}
              />
            )}
          </div>
        )}

        <ScrollArea className="flex-1">
          <div className="p-6 max-w-7xl">
            <div className="mb-4">
              {currentSectionLabel && currentNavItem && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <span>{currentSectionLabel}</span>
                  <ChevronRight className="h-3 w-3" />
                  <span className="font-medium text-foreground">{currentNavItem.label}</span>
                </div>
              )}
            </div>
            {renderContent()}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
