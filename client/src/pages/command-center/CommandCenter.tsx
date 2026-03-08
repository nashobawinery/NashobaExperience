import { useState, useEffect, type ReactNode } from "react";
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
  UtensilsCrossed, Wand2, CalendarDays, Rocket, Gauge, Sparkles, FileText, Printer, Home
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
import QuickBooksSync from "./QuickBooksSync";
import { PageDocBanner } from "@/components/PageDocBanner";

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
    id: "quickbooks",
    label: "QuickBooks",
    icon: BookOpen,
    defaultOpen: false,
    items: [
      { id: "qb-sync", label: "Invoice Import", icon: FileText },
    ],
  },
];

interface DocInfo {
  summary: string;
  details?: string[];
  tips?: string[];
  docsLink?: string;
}

const PAGE_DOC_INFO: Record<string, DocInfo> = {
  dashboard: {
    summary: "Your weekly command center — see revenue totals, customer activity, active campaigns, and AI recommendations at a glance.",
    details: [
      "KPIs roll up revenue from Toast POS, Shopify, and B2B wholesale for the selected week.",
      "Quick-action cards let you jump directly into any section.",
      "AI-powered suggestions surface actionable opportunities based on your data.",
    ],
  },
  "weekly-focus": {
    summary: "Set your weekly revenue goal, document what drove performance, and grade the week — builds a running record of institutional knowledge.",
    details: [
      "Enter your goal before the week starts; actual vs. target is tracked automatically.",
      "Log what worked and what flopped each week to identify patterns over time.",
      "Grades and notes are visible in historical weeks so you can review trends.",
    ],
  },
  "daily-revenue": {
    summary: "Day-by-day revenue from Toast POS, Shopify, and B2B wholesale — syncs automatically in the background and shows weather context plus prior-year comparison.",
    details: [
      "Toast and Shopify data auto-sync when you open this page; if a day shows $0 it may still be syncing — it will refresh automatically within ~10 seconds.",
      "Use 'Refresh All' to force an immediate sync of all sources for the week.",
      "Weather data is auto-fetched for each day to help explain revenue patterns.",
      "Prior-year comparison is shown for each day to track growth.",
      "B2B wholesale revenue is pulled live from your internal order records.",
    ],
    tips: [
      "If revenue looks missing, check that the correct week is selected in the top navigation.",
      "You can manually enter 'Other Revenue' for cash sales or events not captured by the connected systems.",
    ],
  },
  tasks: {
    summary: "Track action items and revenue-driving ideas tied to the current week — assign to teams and mark them complete.",
    details: [
      "Ideas can be rated by estimated revenue impact to help prioritize.",
      "Completed tasks roll up into the weekly summary.",
      "Teams can be assigned to tasks for accountability.",
    ],
  },
  "rcc-campaigns": {
    summary: "Log promotions, events, and marketing pushes running this week and track their contribution to revenue.",
    details: [
      "Linking campaigns to specific days lets you see revenue correlation.",
      "Campaign notes carry forward into the weekly summary for review.",
      "Compare campaign weeks vs. non-campaign weeks over time in Analytics.",
    ],
  },
  "targeting-overview": {
    summary: "AI-generated weekly revenue targets based on historical performance, seasonality, and trends — see which customer segments to prioritize.",
    details: [
      "Targets are calculated from same-week prior years and recent momentum.",
      "Individual segment targets show which customer groups have the most upside.",
      "Use these as stretch goals alongside your manually set Weekly Focus target.",
    ],
    tips: [
      "Check this section Monday morning to set your priorities for the week.",
    ],
  },
  "roi-projections": {
    summary: "Model the expected return on investment for marketing spend across channels before committing budget.",
    details: [
      "Input spend per channel and see projected revenue lift based on historical response rates.",
      "Compare projected vs. actual ROI after campaigns run to improve future estimates.",
    ],
  },
  segments: {
    summary: "Visual breakdown of your entire customer base grouped by purchase behavior — understand what portion of guests fall into each segment.",
    details: [
      "Segments are recalculated nightly based on purchase history across all channels.",
      "Click any segment to see the specific customers in it.",
      "Segment health trends over time to show how your customer mix is shifting.",
    ],
    docsLink: "docs",
  },
  "new-customers": {
    summary: "Track first-time customers by week and month — see acquisition trends and which channel is bringing in new guests.",
    details: [
      "New customers are identified by their first recorded purchase date.",
      "Source data (Toast vs. Shopify vs. B2B) shows which channel drives the most acquisition.",
      "Month-over-month trends help track whether your acquisition efforts are working.",
    ],
  },
  "customer-browser": {
    summary: "Search and browse every customer in your database — filter by segment, purchase history, spend, and activity level.",
    details: [
      "Filter by segment, last visit date, total lifetime spend, order count, and more.",
      "Click any customer to view their full profile including complete order history.",
      "Data combines purchase records from Toast, Shopify, and B2B.",
    ],
    tips: [
      "Use the segment filter to quickly build a targeted list for a campaign.",
      "Export filtered results for use in email or SMS tools.",
    ],
    docsLink: "docs",
  },
  "high-value": {
    summary: "AI-identified high-value and at-risk customers — top spenders, loyal repeat visitors, and lapsed guests worth re-engaging.",
    details: [
      "High-value customers are ranked by total lifetime spend and purchase frequency.",
      "At-risk customers are frequent buyers who have gone quiet recently.",
      "Use these lists to prioritize personal outreach or targeted campaigns.",
    ],
  },
  rfm: {
    summary: "Recency, Frequency, Monetary analysis — a proven marketing framework that scores every customer so you know exactly who to target.",
    details: [
      "Recency: how recently a customer made a purchase.",
      "Frequency: how often they buy from you.",
      "Monetary: how much they spend in total.",
      "Each customer is scored 1–5 on all three dimensions, producing an RFM score.",
      "Customers with high RFM scores are your most valuable — protect them. Low scores are win-back opportunities.",
    ],
    tips: [
      "Champions (high R, F, M) are your best customers — reward them and ask for referrals.",
      "At-Risk customers (high F and M, low R) are worth a personal win-back message.",
    ],
    docsLink: "docs",
  },
  "sms-campaigns": {
    summary: "Create and send targeted SMS text message campaigns to specific customer segments — track delivery and responses.",
    details: [
      "Compose messages up to 160 characters with customer name personalization.",
      "Select a segment or build a manual list for the send.",
      "Track delivery rates and opt-outs in real time.",
      "Requires Twilio SMS to be configured in your account settings.",
    ],
  },
  campaigns: {
    summary: "Automated re-engagement (Boomerang) campaigns that bring lapsed customers back — set your triggers once and let the system run.",
    details: [
      "Define win-back triggers based on days since a customer's last visit.",
      "Messages are personalized with customer name and purchase history.",
      "Track open rates, click-throughs, and revenue recovered per campaign.",
      "Once activated, campaigns run automatically in the background.",
    ],
  },
  automations: {
    summary: "Rule-based automations that send messages based on customer behavior — post-visit follow-ups, birthday offers, anniversary messages, and more.",
    details: [
      "Create rules such as 'send a thank-you 24 hours after a purchase'.",
      "Layer multiple automations to build a simple customer journey.",
      "All automation activity is logged so you can see what each customer received.",
      "Automations run in the background once activated — no manual sends required.",
    ],
    tips: [
      "Start with a simple post-visit follow-up before building more complex journeys.",
      "Review automation logs monthly to check engagement rates.",
    ],
    docsLink: "docs",
  },
  loyalty: {
    summary: "Manage the customer loyalty program — view active members, point balances, redemption activity, and configure earn/burn rules.",
    details: [
      "Points are earned per dollar spent across Toast and Shopify.",
      "Members can redeem points for rewards at configurable thresholds.",
      "View the leaderboard of top loyalty members.",
      "Earn/burn rates and reward tiers are configurable in the program settings.",
    ],
  },
  referrals: {
    summary: "Track customer referrals and manage referral incentives — see who's referring, how many converted, and the revenue they're driving.",
    details: [
      "Referrers earn incentives when their referred friends make a purchase.",
      "Track the full referral chain and overall conversion rate.",
      "Configure reward amounts and eligibility rules in program settings.",
    ],
  },
  analytics: {
    summary: "Deep-dive into revenue trends, channel performance, customer behavior, and product mix — compare across weeks, months, and years.",
    details: [
      "Compare time periods side-by-side: this week vs. last week, this month vs. last year.",
      "Break down revenue by source: Toast POS, Shopify, and B2B wholesale.",
      "See product category trends and top-selling items.",
      "Customer acquisition and retention metrics show long-term health.",
    ],
    docsLink: "docs",
  },
  "ai-advisor": {
    summary: "AI-powered weekly insights and specific, actionable recommendations based on your actual revenue data and customer trends.",
    details: [
      "Recommendations are generated fresh each week using your real data.",
      "Covers revenue opportunities, customer segments to target, and marketing ideas.",
      "Click any recommendation to see the AI's reasoning and suggested next steps.",
      "The AI uses your historical performance and seasonal patterns to contextualize advice.",
    ],
    tips: [
      "Review AI recommendations every Monday alongside your Weekly Focus goal.",
      "Dismiss recommendations that aren't relevant — this helps improve future suggestions.",
    ],
    docsLink: "docs",
  },
  "content-studio": {
    summary: "Generate marketing copy, social posts, email subject lines, and promotional messages using AI — customize tone, channel, and campaign type.",
    details: [
      "Choose a content type: email, SMS, social media, or in-store signage.",
      "Specify your campaign goal and target audience for tailored copy.",
      "AI generates multiple variations — pick the one that fits and edit as needed.",
      "Generated copy can be copied directly or sent to your email tool.",
    ],
  },
  "content-calendar": {
    summary: "Plan and visualize your marketing content schedule — see what's going out this week and plan the next few weeks ahead.",
    details: [
      "Drag and drop content items onto calendar dates.",
      "Color-coded by channel: email, SMS, social, and in-store.",
      "Integrates with Campaign Builder for scheduling sends.",
    ],
  },
  "campaign-builder": {
    summary: "Step-by-step wizard to build a complete marketing campaign — define audience, message, channel, timing, and budget in one guided flow.",
    details: [
      "Step 1: Define your campaign goal and select the target segment.",
      "Step 2: Write or AI-generate your message content.",
      "Step 3: Choose channel (email, SMS, or both) and set timing.",
      "Step 4: Set budget and review projected ROI before launching.",
    ],
    docsLink: "docs",
  },
  scorecard: {
    summary: "Quantified marketing performance scorecard — tracks email open rates, click rates, conversion, and revenue attributable to marketing.",
    details: [
      "Updated weekly with data from all active campaigns.",
      "Benchmarks your metrics against typical performance for your category.",
      "Identifies underperforming channels and surfaces improvement opportunities.",
    ],
  },
  "quick-promos": {
    summary: "Rapidly launch simple promotions — weekend specials, flash offers, happy hour deals — without building a full campaign.",
    details: [
      "Choose a promo type, set dates and discount amount.",
      "Auto-generates promotional copy for multiple channels.",
      "Track redemptions and revenue impact after the promo runs.",
    ],
  },
  "toast-menus": {
    summary: "Browse your live Toast POS menus, sync menu items to the internal product catalog, and manage the product data that flows into flight cards and shelf talkers.",
    details: [
      "Expanding a menu shows all courses and items pulled directly from Toast.",
      "Use 'Sync Selected' to import specific items into your internal catalog.",
      "Synced items update name, description, and price — manually entered pairings are preserved.",
    ],
  },
  "toast-print": {
    summary: "Print-ready menu views built from your live Toast POS data — generate and download formatted menus for table cards, wall displays, or handouts.",
  },
  integrations: {
    summary: "Connect and manage your Toast POS integration — configure the API credentials that power revenue tracking, menu sync, and customer data.",
    details: [
      "Toast credentials are required for Daily Revenue auto-sync to work.",
      "Multiple Toast locations can be connected for consolidated reporting.",
    ],
  },
  "qb-sync": {
    summary: "Import EKOS wholesale invoices from QuickBooks — maps invoice line items to your internal product catalog and tracks payment status.",
    details: [
      "Only pulls E-prefix invoices (EKOS distributor invoices) — not all QuickBooks transactions.",
      "Invoice line items are automatically matched to catalog products by SKU or name.",
      "Packaging, shipping, and freight items are auto-ignored.",
      "Review unmatched items and map them manually before finalizing.",
      "Synced invoice totals are available for B2B wholesale revenue reporting.",
    ],
    tips: [
      "Run 'Pull Items from QB' first, then 'Pull Invoices from QB' to ensure all line items are mapped.",
      "Check the mapping table after each sync and resolve any unmatched items.",
    ],
    docsLink: "docs",
  },
};

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
  const [activeSection, setActiveSection] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("section") || "dashboard";
  });
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    NAV_SECTIONS.forEach(s => { initial[s.id] = s.defaultOpen ?? false; });
    const params = new URLSearchParams(window.location.search);
    const section = params.get("section");
    if (section) {
      const parent = NAV_SECTIONS.find(ns => ns.items.some(i => i.id === section));
      if (parent) initial[parent.id] = true;
    }
    return initial;
  });
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const section = (e as CustomEvent<string>).detail;
      if (section) {
        setActiveSection(section);
        const parent = NAV_SECTIONS.find(ns => ns.items.some(i => i.id === section));
        if (parent) setExpandedSections(prev => ({ ...prev, [parent.id]: true }));
      }
    };
    window.addEventListener("rcc-navigate", handler);
    return () => window.removeEventListener("rcc-navigate", handler);
  }, []);

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

    let sectionContent: ReactNode = null;

    switch (activeSection) {
      case "dashboard":
        sectionContent = (
          <CombinedDashboard
            activeWeek={activeWeek}
            dailyTotals={dailyTotals}
            dailyGrandTotal={dailyGrandTotal}
            tasks={tasks}
            campaigns={campaigns}
            ideas={ideas}
          />
        );
        break;
      case "weekly-focus":
        sectionContent = activeWeek ? <WeeklyFocusPanel week={activeWeek} /> : null;
        break;
      case "daily-revenue":
        sectionContent = activeWeek && activeWeekId ? (
          <RevenuePanel weekId={activeWeekId} week={activeWeek} revenue={revenue ?? null} />
        ) : null;
        break;
      case "tasks":
        sectionContent = activeWeekId ? (
          <TasksPanel weekId={activeWeekId} tasks={tasks || []} ideas={ideas || []} teams={teams || []} />
        ) : null;
        break;
      case "rcc-campaigns":
        sectionContent = activeWeekId ? (
          <RccCampaignsPanel weekId={activeWeekId} campaigns={campaigns || []} />
        ) : null;
        break;
      case "segments":
        sectionContent = <SegmentOverview />;
        break;
      case "new-customers":
        sectionContent = <NewCustomers />;
        break;
      case "customer-browser":
        sectionContent = <CustomerBrowser />;
        break;
      case "high-value":
        sectionContent = <HighValueTargets />;
        break;
      case "rfm":
        sectionContent = <RfmTab />;
        break;
      case "sms-campaigns":
        sectionContent = <SmsCampaignsTab />;
        break;
      case "campaigns":
        sectionContent = <BoomerangCampaignsTab />;
        break;
      case "automations":
        sectionContent = <AutomationsTab />;
        break;
      case "loyalty":
        sectionContent = <LoyaltyTab />;
        break;
      case "referrals":
        sectionContent = <ReferralsTab />;
        break;
      case "analytics":
        sectionContent = <AnalyticsTab />;
        break;
      case "ai-advisor":
        sectionContent = activeWeekId ? (
          <AiAdvisorPanel weekId={activeWeekId} recommendations={aiRecs || []} />
        ) : null;
        break;
      case "targeting-overview":
        sectionContent = <TargetingOverview />;
        break;
      case "roi-projections":
        sectionContent = <RoiProjections />;
        break;
      case "content-studio":
        sectionContent = <AiContentStudio />;
        break;
      case "content-calendar":
        sectionContent = <ContentCalendar />;
        break;
      case "campaign-builder":
        sectionContent = <CampaignBuilder />;
        break;
      case "scorecard":
        sectionContent = <MarketingScorecard />;
        break;
      case "quick-promos":
        sectionContent = <QuickPromotions />;
        break;
      case "toast-menus":
        sectionContent = <ToastMenuBrowser />;
        break;
      case "toast-print":
        sectionContent = <ToastPrintMenus />;
        break;
      case "integrations":
        sectionContent = <ToastIntegrationTab />;
        break;
      case "toast-docs":
        sectionContent = <ToastConnectDocs />;
        break;
      case "qb-sync":
        sectionContent = <QuickBooksSync />;
        break;
      case "docs":
        sectionContent = <RccDocsPanel />;
        break;
      default:
        sectionContent = <CombinedDashboard activeWeek={activeWeek} dailyTotals={dailyTotals} dailyGrandTotal={dailyGrandTotal} tasks={tasks} campaigns={campaigns} ideas={ideas} />;
    }

    const docInfo = PAGE_DOC_INFO[activeSection];
    if (!docInfo) return sectionContent;

    return (
      <div>
        <PageDocBanner
          summary={docInfo.summary}
          details={docInfo.details}
          tips={docInfo.tips}
          docsLink={docInfo.docsLink}
        />
        {sectionContent}
      </div>
    );
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
