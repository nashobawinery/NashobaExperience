import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft, Users, DollarSign, TrendingDown, Mail, Phone, Search,
  ChevronLeft, ChevronRight, AlertTriangle, Clock, UserX, UserCheck,
  BarChart3, Filter, Eye, Target, Award, Gift, Zap, Share2,
  Plus, Play, Pause, Trash2, RefreshCw, TrendingUp, PieChart,
  Percent, Hash, Star, Crown, Gem, ShieldCheck, Plug, CheckCircle,
  XCircle, Loader2, Store, Calendar
} from "lucide-react";

interface SegmentData {
  segment: string;
  customerCount: number;
  avgVisits: number;
  avgLifetimeSpend: number;
  avgSpendPerVisit: number;
  avgDaysInactive: number;
  withEmail: number;
  withPhone: number;
  totalLifetimeRevenue: number;
}

interface Customer {
  id: number;
  guestGuid: string;
  email: string | null;
  emailOptIn: boolean;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  firstVisitDate: string | null;
  lastVisitDate: string | null;
  lastDiningBehavior: string | null;
  totalVisits: number;
  diningBehaviors: string | null;
  averageSpend: number | null;
  averageTip: number | null;
  lifetimeSpend: number | null;
  daysSinceLastVisit: number | null;
  segment: string | null;
  source: string;
  isStaff: boolean;
  isMerged: boolean;
  canonicalId: number | null;
}

interface LinkedRecord {
  id: number;
  guestGuid: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  totalVisits: number;
  lifetimeSpend: number | null;
  averageSpend: number | null;
  daysSinceLastVisit: number | null;
  segment: string | null;
  source: string;
  linkedAt: string;
}

interface CustomerDetail extends Customer {
  emails: { email: string; preference: string }[];
  phones: { phone: string; preference: string }[];
  averageTipPercentage: number | null;
  linkedRecords: LinkedRecord[];
}

const SEGMENT_CONFIG: Record<string, { label: string; color: string; icon: typeof UserCheck; description: string }> = {
  active: { label: "Active", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", icon: UserCheck, description: "Visited within 30 days" },
  at_risk: { label: "At Risk", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", icon: AlertTriangle, description: "31-60 days since last visit" },
  lapsed: { label: "Lapsed", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200", icon: Clock, description: "61-120 days since last visit" },
  dormant: { label: "Dormant", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", icon: TrendingDown, description: "121-365 days since last visit" },
  lost: { label: "Lost", color: "bg-muted text-muted-foreground", icon: UserX, description: "365+ days since last visit" },
};

const RFM_SEGMENT_CONFIG: Record<string, { label: string; color: string; icon: typeof Star; description: string }> = {
  champions: { label: "Champions", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200", icon: Crown, description: "Best customers: recent, frequent, high spend" },
  loyal_customers: { label: "Loyal", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", icon: Star, description: "Regular visitors with good engagement" },
  big_spenders: { label: "Big Spenders", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200", icon: Gem, description: "High monetary value customers" },
  new_customers: { label: "New", color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200", icon: UserCheck, description: "Recently acquired, low frequency" },
  at_risk_high_value: { label: "At Risk HV", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", icon: AlertTriangle, description: "High-value customers slipping away" },
  needs_attention: { label: "Needs Attention", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200", icon: Clock, description: "Previously engaged, declining activity" },
  hibernating: { label: "Hibernating", color: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200", icon: TrendingDown, description: "Long time since last visit" },
  potential: { label: "Potential", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200", icon: TrendingUp, description: "Room to grow in all dimensions" },
};

function formatCurrency(val: number | null | undefined): string {
  if (val == null) return "$0";
  return `$${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(val: string | null | undefined): string {
  if (!val) return "N/A";
  return new Date(val).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function SegmentBadge({ segment }: { segment: string | null }) {
  const config = segment ? SEGMENT_CONFIG[segment] : null;
  if (!config) return <Badge variant="outline">Unknown</Badge>;
  return <Badge className={config.color}>{config.label}</Badge>;
}

const SOURCE_CONFIG: Record<string, { label: string; color: string }> = {
  toast: { label: "Toast", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  shopify: { label: "Shopify", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" },
};

function SourceBadge({ source, isMerged }: { source: string; isMerged?: boolean }) {
  const config = SOURCE_CONFIG[source] || { label: source, color: "bg-muted text-muted-foreground" };
  return (
    <div className="flex items-center gap-1">
      <Badge className={config.color} variant="secondary">{config.label}</Badge>
      {isMerged && <Badge variant="outline" className="text-xs"><Share2 className="h-3 w-3 mr-0.5" />Merged</Badge>}
    </div>
  );
}

// ==========================================
// OVERVIEW TAB
// ==========================================
export function SegmentOverview() {
  const { data, isLoading } = useQuery<{ segments: SegmentData[]; totalCustomers: number; sourceCounts?: Record<string, number>; mergedCount?: number }>({
    queryKey: ["/api/reactivation/segments"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map(i => (
          <Card key={i}><CardContent className="p-4"><div className="h-24 animate-pulse bg-muted rounded" /></CardContent></Card>
        ))}
      </div>
    );
  }

  const segments = data?.segments || [];
  const reactivatableSegments = segments.filter(s => ["at_risk", "lapsed", "dormant"].includes(s.segment));
  const reactivatableRevenue = reactivatableSegments.reduce((sum, s) => sum + s.totalLifetimeRevenue, 0);
  const reactivatableCount = reactivatableSegments.reduce((sum, s) => sum + s.customerCount, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4 justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Customers</p>
              <p className="text-2xl font-bold" data-testid="text-total-customers">{data?.totalCustomers?.toLocaleString()}</p>
            </div>
            <Separator orientation="vertical" className="h-10 hidden sm:block" />
            <div>
              <p className="text-sm text-muted-foreground">Reactivation Targets</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400" data-testid="text-reactivation-targets">{reactivatableCount.toLocaleString()}</p>
            </div>
            <Separator orientation="vertical" className="h-10 hidden sm:block" />
            <div>
              <p className="text-sm text-muted-foreground">At-Risk Revenue</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="text-at-risk-revenue">{formatCurrency(reactivatableRevenue)}</p>
            </div>
            {data?.sourceCounts && Object.keys(data.sourceCounts).length > 1 && (
              <>
                <Separator orientation="vertical" className="h-10 hidden sm:block" />
                <div className="flex items-center gap-3">
                  {data.sourceCounts.toast != null && (
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Toast</p>
                      <p className="text-lg font-bold text-orange-600 dark:text-orange-400" data-testid="text-toast-count">{data.sourceCounts.toast.toLocaleString()}</p>
                    </div>
                  )}
                  {data.sourceCounts.shopify != null && (
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Shopify</p>
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400" data-testid="text-shopify-count">{data.sourceCounts.shopify.toLocaleString()}</p>
                    </div>
                  )}
                  {(data.mergedCount ?? 0) > 0 && (
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Merged</p>
                      <p className="text-lg font-bold" data-testid="text-merged-count">{data.mergedCount?.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {segments.map(seg => {
          const config = SEGMENT_CONFIG[seg.segment];
          if (!config) return null;
          const Icon = config.icon;
          return (
            <Card key={seg.segment} data-testid={`card-segment-${seg.segment}`}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span className="font-semibold text-sm">{config.label}</span>
                  </div>
                  <span className="text-lg font-bold">{seg.customerCount.toLocaleString()}</span>
                </div>
                <p className="text-xs text-muted-foreground">{config.description}</p>
                <Separator />
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <span className="text-muted-foreground">Avg Visits</span>
                  <span className="text-right font-medium">{seg.avgVisits}</span>
                  <span className="text-muted-foreground">Avg Spend</span>
                  <span className="text-right font-medium">{formatCurrency(seg.avgSpendPerVisit)}</span>
                  <span className="text-muted-foreground">Avg Lifetime</span>
                  <span className="text-right font-medium">{formatCurrency(seg.avgLifetimeSpend)}</span>
                  <span className="text-muted-foreground">With Email</span>
                  <span className="text-right font-medium">{Math.round(seg.withEmail / seg.customerCount * 100)}%</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// RFM SEGMENTATION TAB
// ==========================================
interface RfmCustomer {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email1: string | null;
  phone1: string | null;
  lifetime_spend: string | null;
  total_visits: number | null;
  last_visit_date: string | null;
  days_since_last_visit: number | null;
  reactivation_segment: string | null;
  recency_score: number;
  frequency_score: number;
  monetary_score: number;
  rfm_total: number;
}

function RfmSegmentDialog({ segment, onClose }: { segment: string; onClose: () => void }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const config = RFM_SEGMENT_CONFIG[segment] || { label: segment, color: "bg-muted", icon: Users, description: "" };
  const Icon = config.icon;

  const { data, isLoading } = useQuery<{
    customers: RfmCustomer[];
    total: number;
    page: number;
    totalPages: number;
  }>({
    queryKey: ["/api/boomerang/rfm/segment", segment, String(page), search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/boomerang/rfm/segment/${segment}?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5" />
            {config.label} Customers
            {data && <Badge className={config.color}>{data.total.toLocaleString()}</Badge>}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-8"
              data-testid="input-rfm-segment-search"
            />
          </div>
          <Button onClick={handleSearch} data-testid="button-rfm-segment-search">
            <Search className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-auto min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !data?.customers?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2" />
              <p>No customers found</p>
            </div>
          ) : (
            <div className="border rounded-md">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/50">
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="p-2">Name</th>
                    <th className="p-2 hidden sm:table-cell">Email</th>
                    <th className="p-2 hidden md:table-cell">Phone</th>
                    <th className="p-2 text-right">LTV</th>
                    <th className="p-2 text-right hidden sm:table-cell">Visits</th>
                    <th className="p-2 text-center">R/F/M</th>
                    <th className="p-2 text-right">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {data.customers.map((c) => (
                    <tr key={c.id} className="border-t hover-elevate" data-testid={`row-rfm-customer-${c.id}`}>
                      <td className="p-2 font-medium">
                        {c.first_name || ""} {c.last_name || ""}
                      </td>
                      <td className="p-2 text-muted-foreground text-xs hidden sm:table-cell truncate max-w-[180px]">
                        {c.email1 || "—"}
                      </td>
                      <td className="p-2 text-muted-foreground text-xs hidden md:table-cell">
                        {c.phone1 || "—"}
                      </td>
                      <td className="p-2 text-right font-medium">
                        {formatCurrency(c.lifetime_spend ? parseFloat(c.lifetime_spend) : 0)}
                      </td>
                      <td className="p-2 text-right hidden sm:table-cell">
                        {c.total_visits ?? 0}
                      </td>
                      <td className="p-2 text-center text-xs text-muted-foreground">
                        {c.recency_score}/{c.frequency_score}/{c.monetary_score}
                      </td>
                      <td className="p-2 text-right">
                        <Badge variant="outline">{c.rfm_total}/15</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Page {data.page} of {data.totalPages} ({data.total.toLocaleString()} customers)
            </p>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                data-testid="button-rfm-prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                disabled={page >= data.totalPages}
                onClick={() => setPage(p => p + 1)}
                data-testid="button-rfm-next-page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function RfmTab() {
  const { toast } = useToast();
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const { data, isLoading } = useQuery<{
    computed: boolean;
    totalScored: number;
    segments: { segment: string; customerCount: number; avgRfmScore: number; avgRecency: number; avgFrequency: number; avgMonetary: number; avgLifetimeSpend: number; avgVisits: number; withEmail: number }[];
    distribution: { score: number; count: number }[];
  }>({
    queryKey: ["/api/boomerang/rfm/summary"],
  });

  const computeMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/boomerang/rfm/compute"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boomerang/rfm/summary"] });
      toast({ title: "RFM scores computed", description: "All customer scores updated" });
    },
    onError: () => toast({ title: "Error", description: "Failed to compute RFM scores", variant: "destructive" }),
  });

  const maxCount = data?.distribution?.reduce((max, d) => Math.max(max, d.count), 0) || 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 justify-between flex-wrap">
        <div>
          <h3 className="font-semibold">RFM Segmentation</h3>
          <p className="text-sm text-muted-foreground">Recency, Frequency, Monetary scoring for smarter targeting</p>
        </div>
        <Button onClick={() => computeMutation.mutate()} disabled={computeMutation.isPending} data-testid="button-compute-rfm">
          <RefreshCw className={`h-4 w-4 mr-2 ${computeMutation.isPending ? "animate-spin" : ""}`} />
          {computeMutation.isPending ? "Computing..." : "Compute RFM Scores"}
        </Button>
      </div>

      {!data?.computed && !isLoading && (
        <Card>
          <CardContent className="p-8 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-medium">RFM Scores Not Computed Yet</p>
            <p className="text-sm text-muted-foreground mt-1">Click "Compute RFM Scores" to analyze all customers</p>
          </CardContent>
        </Card>
      )}

      {data?.computed && (
        <>
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Customers Scored</p>
                  <p className="text-2xl font-bold" data-testid="text-rfm-total">{data.totalScored.toLocaleString()}</p>
                </div>
                <Separator orientation="vertical" className="h-10 hidden sm:block" />
                <div>
                  <p className="text-sm text-muted-foreground">RFM Segments</p>
                  <p className="text-2xl font-bold">{data.segments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {data.segments.map(seg => {
              const config = RFM_SEGMENT_CONFIG[seg.segment] || { label: seg.segment, color: "bg-muted", icon: Users, description: "" };
              const Icon = config.icon;
              return (
                <Card
                  key={seg.segment}
                  className="cursor-pointer hover-elevate active-elevate-2 transition-all"
                  onClick={() => setSelectedSegment(seg.segment)}
                  data-testid={`card-rfm-${seg.segment}`}
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2 justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <span className="font-semibold text-sm">{config.label}</span>
                      </div>
                      <Badge className={config.color}>{seg.customerCount.toLocaleString()}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{config.description}</p>
                    <Separator />
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <span className="text-muted-foreground">Avg RFM</span>
                      <span className="text-right font-medium">{seg.avgRfmScore}/15</span>
                      <span className="text-muted-foreground">R / F / M</span>
                      <span className="text-right font-medium">{seg.avgRecency} / {seg.avgFrequency} / {seg.avgMonetary}</span>
                      <span className="text-muted-foreground">Avg LTV</span>
                      <span className="text-right font-medium">{formatCurrency(seg.avgLifetimeSpend)}</span>
                      <span className="text-muted-foreground">Reachable</span>
                      <span className="text-right font-medium">{seg.customerCount > 0 ? Math.round(seg.withEmail / seg.customerCount * 100) : 0}%</span>
                    </div>
                    <p className="text-xs text-center text-muted-foreground pt-1">Click to view customers</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {data.distribution && data.distribution.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Score Distribution (3-15)</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex items-end gap-1 h-32">
                  {data.distribution.map((d) => (
                    <div key={d.score} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-primary/70 rounded-t"
                        style={{ height: `${(d.count / maxCount) * 100}%`, minHeight: d.count > 0 ? "4px" : "0" }}
                        data-testid={`bar-rfm-${d.score}`}
                      />
                      <span className="text-[10px] text-muted-foreground">{d.score}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {selectedSegment && (
        <RfmSegmentDialog
          segment={selectedSegment}
          onClose={() => setSelectedSegment(null)}
        />
      )}
    </div>
  );
}

// ==========================================
// LOYALTY PROGRAM TAB
// ==========================================
export function LoyaltyTab() {
  const { toast } = useToast();
  const [enrollSegment, setEnrollSegment] = useState("active");

  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalMembers: number;
    outstandingPoints: number;
    lifetimePointsIssued: number;
    recentTransactions: number;
    tierBreakdown: { tier: string; color: string; memberCount: number; totalPoints: number; avgLifetimePoints: number }[];
  }>({
    queryKey: ["/api/boomerang/loyalty/stats"],
  });

  const { data: tiers } = useQuery<{ tiers: any[] }>({
    queryKey: ["/api/boomerang/loyalty/tiers"],
  });

  const enrollMutation = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/boomerang/loyalty/enroll-batch", body),
    onSuccess: async (res) => {
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/boomerang/loyalty"] });
      toast({ title: "Enrollment complete", description: data.message });
    },
    onError: () => toast({ title: "Error", description: "Failed to enroll customers", variant: "destructive" }),
  });

  const tierIcons = [ShieldCheck, Star, Crown, Gem];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 justify-between flex-wrap">
        <div>
          <h3 className="font-semibold">Loyalty Program</h3>
          <p className="text-sm text-muted-foreground">Points, tiers, and rewards to drive repeat visits</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={enrollSegment} onValueChange={setEnrollSegment}>
            <SelectTrigger className="w-[140px]" data-testid="select-enroll-segment">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="at_risk">At Risk</SelectItem>
              <SelectItem value="lapsed">Lapsed</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => enrollMutation.mutate({ segment: enrollSegment, limit: 500 })} disabled={enrollMutation.isPending} data-testid="button-enroll-batch">
            <Users className="h-4 w-4 mr-2" />
            {enrollMutation.isPending ? "Enrolling..." : "Enroll Batch"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Members</p>
            <p className="text-2xl font-bold" data-testid="text-loyalty-members">{stats?.totalMembers?.toLocaleString() || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Outstanding Points</p>
            <p className="text-2xl font-bold">{stats?.outstandingPoints?.toLocaleString() || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Lifetime Points Issued</p>
            <p className="text-2xl font-bold">{stats?.lifetimePointsIssued?.toLocaleString() || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">30-Day Transactions</p>
            <p className="text-2xl font-bold">{stats?.recentTransactions?.toLocaleString() || 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {(tiers?.tiers || []).map((tier: any, i: number) => {
          const Icon = tierIcons[i] || Award;
          const breakdown = stats?.tierBreakdown?.find(t => t.tier === tier.name);
          return (
            <Card key={tier.id} data-testid={`card-tier-${tier.id}`}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: tier.color + "33" }}>
                    <Icon className="w-4 h-4" style={{ color: tier.color }} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{tier.name}</p>
                    <p className="text-xs text-muted-foreground">{tier.min_points.toLocaleString()}+ points</p>
                  </div>
                </div>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Members</span>
                    <span className="font-medium">{breakdown?.memberCount || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Multiplier</span>
                    <span className="font-medium">{tier.points_multiplier}x</span>
                  </div>
                </div>
                <Separator />
                <div className="space-y-1">
                  {(tier.benefits as string[] || []).slice(0, 3).map((b: string, j: number) => (
                    <p key={j} className="text-xs text-muted-foreground flex items-start gap-1">
                      <Gift className="w-3 h-3 mt-0.5 shrink-0" />{b}
                    </p>
                  ))}
                  {(tier.benefits as string[] || []).length > 3 && (
                    <p className="text-xs text-muted-foreground">+{(tier.benefits as string[]).length - 3} more</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// CAMPAIGNS TAB
// ==========================================
export function CampaignsTab() {
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState({ name: "", description: "", type: "winback", channel: "email", status: "draft", targetSegment: "", budget: "", costPerSend: "", startDate: "", endDate: "" });

  const { data, isLoading } = useQuery<{ campaigns: any[] }>({
    queryKey: ["/api/boomerang/campaigns", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/boomerang/campaigns?${params}`);
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/boomerang/campaigns", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boomerang/campaigns"] });
      setShowCreate(false);
      setForm({ name: "", description: "", type: "winback", channel: "email", status: "draft", targetSegment: "", budget: "", costPerSend: "", startDate: "", endDate: "" });
      toast({ title: "Campaign created" });
    },
    onError: () => toast({ title: "Error", description: "Failed to create campaign", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/boomerang/campaigns/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boomerang/campaigns"] });
      toast({ title: "Campaign deleted" });
    },
  });

  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    completed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 justify-between flex-wrap">
        <div>
          <h3 className="font-semibold">Campaigns & Offers</h3>
          <p className="text-sm text-muted-foreground">Create and track marketing campaigns with coupon offers</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]" data-testid="select-campaign-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setShowCreate(true)} data-testid="button-create-campaign">
            <Plus className="h-4 w-4 mr-2" /> New Campaign
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 animate-pulse bg-muted rounded" />)}</div>
      ) : (data?.campaigns || []).length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-medium">No Campaigns Yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create your first campaign to start targeting customers</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data?.campaigns?.map((c: any) => {
            const totalSpend = parseFloat(c.budget || "0");
            const totalRev = parseFloat(c.total_revenue || "0");
            const roi = totalSpend > 0 ? Math.round((totalRev - totalSpend) / totalSpend * 100) : 0;
            const convRate = c.total_sent > 0 ? Math.round(c.total_converted / c.total_sent * 100) : 0;

            return (
              <Card key={c.id} data-testid={`card-campaign-${c.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 justify-between flex-wrap">
                    <div className="space-y-1 flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{c.name}</span>
                        <Badge className={statusColors[c.status] || "bg-muted"}>{c.status}</Badge>
                        <Badge variant="outline">{c.type}</Badge>
                        <Badge variant="outline">{c.channel}</Badge>
                      </div>
                      {c.description && <p className="text-sm text-muted-foreground">{c.description}</p>}
                      {c.target_segment && <p className="text-xs text-muted-foreground">Target: {c.target_segment}</p>}
                    </div>
                    <div className="flex items-center gap-4 flex-wrap text-sm">
                      <div className="text-center">
                        <p className="text-muted-foreground text-xs">Sent</p>
                        <p className="font-bold">{c.total_sent}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground text-xs">Converted</p>
                        <p className="font-bold">{c.total_converted}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground text-xs">Conv %</p>
                        <p className="font-bold">{convRate}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground text-xs">Revenue</p>
                        <p className="font-bold">{formatCurrency(totalRev)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground text-xs">ROI</p>
                        <p className={`font-bold ${roi >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>{roi}%</p>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(c.id)} data-testid={`button-delete-campaign-${c.id}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Campaign Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Spring Win-Back Campaign" data-testid="input-campaign-name" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Campaign goals and notes" data-testid="input-campaign-desc" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger data-testid="select-campaign-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="winback">Win-Back</SelectItem>
                    <SelectItem value="retention">Retention</SelectItem>
                    <SelectItem value="acquisition">Acquisition</SelectItem>
                    <SelectItem value="upsell">Upsell</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="seasonal">Seasonal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Channel</Label>
                <Select value={form.channel} onValueChange={v => setForm(f => ({ ...f, channel: v }))}>
                  <SelectTrigger data-testid="select-campaign-channel"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="social">Social</SelectItem>
                    <SelectItem value="on_site">On-Site</SelectItem>
                    <SelectItem value="digital_ads">Digital Ads</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Target Segment</Label>
              <Select value={form.targetSegment} onValueChange={v => setForm(f => ({ ...f, targetSegment: v }))}>
                <SelectTrigger data-testid="select-campaign-target"><SelectValue placeholder="All customers" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="at_risk">At Risk</SelectItem>
                  <SelectItem value="lapsed">Lapsed</SelectItem>
                  <SelectItem value="dormant">Dormant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Budget ($)</Label>
                <Input type="number" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} placeholder="500" data-testid="input-campaign-budget" />
              </div>
              <div>
                <Label>Cost Per Send ($)</Label>
                <Input type="number" step="0.01" value={form.costPerSend} onChange={e => setForm(f => ({ ...f, costPerSend: e.target.value }))} placeholder="0.05" data-testid="input-campaign-cps" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.name || createMutation.isPending} data-testid="button-save-campaign">
              {createMutation.isPending ? "Creating..." : "Create Campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==========================================
// AUTOMATIONS TAB
// ==========================================
export function AutomationsTab() {
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", triggerType: "inactivity", actionType: "send_offer", conditions: { daysInactive: 45, hasEmail: true } as Record<string, any> });

  const { data, isLoading } = useQuery<{ rules: any[] }>({
    queryKey: ["/api/boomerang/automations"],
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/boomerang/automations", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boomerang/automations"] });
      setShowCreate(false);
      toast({ title: "Automation created" });
    },
    onError: () => toast({ title: "Error", description: "Failed to create automation", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/boomerang/automations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boomerang/automations"] });
      toast({ title: "Automation deleted" });
    },
  });

  const simulateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/boomerang/automations/${id}/simulate`);
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: `${data.eligibleCustomers.toLocaleString()} eligible customers`, description: `Rule: ${data.ruleName}` });
    },
  });

  const triggerLabels: Record<string, string> = {
    inactivity: "Inactivity Trigger",
    rfm_segment: "RFM Segment",
    visit_milestone: "Visit Milestone",
    spend_threshold: "Spend Threshold",
    birthday: "Birthday",
    segment_change: "Segment Change",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 justify-between flex-wrap">
        <div>
          <h3 className="font-semibold">Automated Triggers</h3>
          <p className="text-sm text-muted-foreground">Set rules to automatically target customers based on behavior</p>
        </div>
        <Button onClick={() => setShowCreate(true)} data-testid="button-create-automation">
          <Plus className="h-4 w-4 mr-2" /> New Automation
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 animate-pulse bg-muted rounded" />)}</div>
      ) : (data?.rules || []).length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-medium">No Automations Yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create automation rules to put customer engagement on autopilot</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data?.rules?.map((r: any) => (
            <Card key={r.id} data-testid={`card-automation-${r.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 justify-between flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Zap className={`w-4 h-4 ${r.is_active ? "text-yellow-500" : "text-muted-foreground"}`} />
                      <span className="font-semibold">{r.name}</span>
                      <Badge variant={r.is_active ? "default" : "outline"}>{r.is_active ? "Active" : "Paused"}</Badge>
                      <Badge variant="outline">{triggerLabels[r.trigger_type] || r.trigger_type}</Badge>
                    </div>
                    {r.description && <p className="text-sm text-muted-foreground mt-1">{r.description}</p>}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Triggered: {r.total_triggered}</span>
                      <span>Converted: {r.total_converted}</span>
                      {r.offer_name && <span>Offer: {r.offer_name}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" onClick={() => simulateMutation.mutate(r.id)} data-testid={`button-simulate-${r.id}`}>
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(r.id)} data-testid={`button-delete-automation-${r.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Automation</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Automation Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. 45-Day Win-Back" data-testid="input-automation-name" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What this automation does" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Trigger Type</Label>
                <Select value={form.triggerType} onValueChange={v => setForm(f => ({ ...f, triggerType: v }))}>
                  <SelectTrigger data-testid="select-trigger-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inactivity">Inactivity (Days)</SelectItem>
                    <SelectItem value="rfm_segment">RFM Segment</SelectItem>
                    <SelectItem value="visit_milestone">Visit Milestone</SelectItem>
                    <SelectItem value="spend_threshold">Spend Threshold</SelectItem>
                    <SelectItem value="segment_change">Segment Change</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Action</Label>
                <Select value={form.actionType} onValueChange={v => setForm(f => ({ ...f, actionType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="send_offer">Send Offer</SelectItem>
                    <SelectItem value="send_email">Send Email</SelectItem>
                    <SelectItem value="add_points">Add Points</SelectItem>
                    <SelectItem value="upgrade_tier">Upgrade Tier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.triggerType === "inactivity" && (
              <div>
                <Label>Days Inactive Threshold</Label>
                <Input type="number" value={form.conditions.daysInactive || ""} onChange={e => setForm(f => ({ ...f, conditions: { ...f.conditions, daysInactive: parseInt(e.target.value) } }))} placeholder="45" data-testid="input-days-inactive" />
              </div>
            )}
            {form.triggerType === "rfm_segment" && (
              <div>
                <Label>Target RFM Segment</Label>
                <Select value={form.conditions.rfmSegment || ""} onValueChange={v => setForm(f => ({ ...f, conditions: { ...f.conditions, rfmSegment: v } }))}>
                  <SelectTrigger><SelectValue placeholder="Select segment" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(RFM_SEGMENT_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.name || createMutation.isPending} data-testid="button-save-automation">
              {createMutation.isPending ? "Creating..." : "Create Automation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==========================================
// REFERRALS TAB
// ==========================================
export function ReferralsTab() {
  const { toast } = useToast();
  const [genSegment, setGenSegment] = useState("active");

  const { data: stats } = useQuery<{
    totalCodes: number;
    activeCodes: number;
    totalReferrals: number;
    totalConverted: number;
    conversionRate: number;
    totalPointsEarned: number;
  }>({
    queryKey: ["/api/boomerang/referrals/stats"],
  });

  const { data: codesData, isLoading } = useQuery<{ codes: any[]; pagination: any }>({
    queryKey: ["/api/boomerang/referrals/codes"],
  });

  const generateMutation = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/boomerang/referrals/generate-batch", body),
    onSuccess: async (res) => {
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/boomerang/referrals"] });
      toast({ title: "Referral codes generated", description: data.message });
    },
    onError: () => toast({ title: "Error", description: "Failed to generate codes", variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 justify-between flex-wrap">
        <div>
          <h3 className="font-semibold">Referral Program</h3>
          <p className="text-sm text-muted-foreground">Turn loyal customers into brand advocates</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={genSegment} onValueChange={setGenSegment}>
            <SelectTrigger className="w-[130px]" data-testid="select-referral-segment">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="at_risk">At Risk</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => generateMutation.mutate({ segment: genSegment, limit: 100 })} disabled={generateMutation.isPending} data-testid="button-generate-codes">
            <Hash className="h-4 w-4 mr-2" />
            {generateMutation.isPending ? "Generating..." : "Generate Codes"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Active Codes</p>
            <p className="text-2xl font-bold" data-testid="text-active-codes">{stats?.activeCodes || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Referrals</p>
            <p className="text-2xl font-bold">{stats?.totalReferrals || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Converted</p>
            <p className="text-2xl font-bold">{stats?.totalConverted || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Conversion Rate</p>
            <p className="text-2xl font-bold">{stats?.conversionRate || 0}%</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 animate-pulse bg-muted rounded" />)}</div>
      ) : (codesData?.codes || []).length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Share2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-medium">No Referral Codes Yet</p>
            <p className="text-sm text-muted-foreground mt-1">Generate codes for your most loyal customers</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="table-referral-codes">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-2">Customer</th>
                <th className="p-2">Code</th>
                <th className="p-2 text-right">Referrals</th>
                <th className="p-2 text-right">Converted</th>
                <th className="p-2 text-right">Points Earned</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {codesData?.codes?.map((c: any) => (
                <tr key={c.id} className="border-b" data-testid={`row-referral-${c.id}`}>
                  <td className="p-2 font-medium">{c.first_name} {c.last_name}</td>
                  <td className="p-2"><code className="bg-muted px-2 py-0.5 rounded text-xs">{c.code}</code></td>
                  <td className="p-2 text-right">{c.total_referrals}</td>
                  <td className="p-2 text-right">{c.total_converted}</td>
                  <td className="p-2 text-right">{c.total_points_earned}</td>
                  <td className="p-2"><Badge variant={c.is_active ? "default" : "outline"}>{c.is_active ? "Active" : "Inactive"}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ==========================================
// ANALYTICS TAB (Enhanced)
// ==========================================
export function AnalyticsTab() {
  const { data: reactivationData, isLoading: reactLoading } = useQuery<{
    spendDistribution: { range: string; count: number }[];
    visitDistribution: { range: string; count: number }[];
    reachability: { emailOptIn: number; emailOptOut: number; emailUnknown: number; noEmail: number; hasPhone: number; total: number };
    atRiskRevenue: { segment: string; totalRevenue: number; count: number }[];
  }>({
    queryKey: ["/api/reactivation/analytics"],
  });

  const { data: retentionData, isLoading: retLoading } = useQuery<{
    cac: number;
    avgLtv: number;
    avgVisitsPerCustomer: number;
    roi: number;
    retentionRate: number;
    totalCampaignSpend: number;
    totalCampaignRevenue: number;
    totalRedemptions: number;
    totalRedemptionValue: number;
    avgOrderValue: number;
    channelPerformance: { channel: string; campaigns: number; sent: number; converted: number; revenue: number; conversionRate: number }[];
  }>({
    queryKey: ["/api/boomerang/retention/metrics"],
  });

  const isLoading = reactLoading || retLoading;

  if (isLoading) {
    return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 animate-pulse bg-muted rounded" />)}</div>;
  }

  const reachability = reactivationData?.reachability;
  const maxSpend = reactivationData?.spendDistribution?.reduce((max, d) => Math.max(max, d.count), 0) || 1;
  const maxVisit = reactivationData?.visitDistribution?.reduce((max, d) => Math.max(max, d.count), 0) || 1;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Retention & Performance Metrics</h3>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Customer Acq. Cost</p>
            <p className="text-2xl font-bold" data-testid="text-cac">{formatCurrency(retentionData?.cac || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Avg Lifetime Value</p>
            <p className="text-2xl font-bold" data-testid="text-ltv">{formatCurrency(retentionData?.avgLtv || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Campaign ROI</p>
            <p className={`text-2xl font-bold ${(retentionData?.roi || 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} data-testid="text-roi">
              {retentionData?.roi || 0}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Retention Rate</p>
            <p className="text-2xl font-bold" data-testid="text-retention">{retentionData?.retentionRate || 0}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Avg Visits/Customer</p>
            <p className="text-2xl font-bold">{retentionData?.avgVisitsPerCustomer || 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Spend Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              {reactivationData?.spendDistribution?.map((d) => (
                <div key={d.range} className="flex items-center gap-2" data-testid={`bar-spend-${d.range}`}>
                  <span className="text-xs w-16 text-right text-muted-foreground">{d.range}</span>
                  <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                    <div className="h-full bg-primary/70 rounded" style={{ width: `${(d.count / maxSpend) * 100}%` }} />
                  </div>
                  <span className="text-xs w-14 text-muted-foreground">{d.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Visit Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              {reactivationData?.visitDistribution?.map((d) => (
                <div key={d.range} className="flex items-center gap-2" data-testid={`bar-visit-${d.range}`}>
                  <span className="text-xs w-16 text-right text-muted-foreground">{d.range}</span>
                  <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                    <div className="h-full bg-primary/70 rounded" style={{ width: `${(d.count / maxVisit) * 100}%` }} />
                  </div>
                  <span className="text-xs w-14 text-muted-foreground">{d.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {reachability && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Reachability</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Email Opt-In</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">{reachability.emailOptIn.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{Math.round(reachability.emailOptIn / reachability.total * 100)}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email Opt-Out</p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">{reachability.emailOptOut.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{Math.round(reachability.emailOptOut / reachability.total * 100)}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email Unknown</p>
                <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{reachability.emailUnknown.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{Math.round(reachability.emailUnknown / reachability.total * 100)}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">No Email</p>
                <p className="text-lg font-bold text-muted-foreground">{reachability.noEmail.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{Math.round(reachability.noEmail / reachability.total * 100)}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Has Phone</p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{reachability.hasPhone.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{Math.round(reachability.hasPhone / reachability.total * 100)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {reactivationData?.atRiskRevenue && reactivationData.atRiskRevenue.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Revenue at Risk by Segment</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {reactivationData.atRiskRevenue.map((r) => {
                const config = SEGMENT_CONFIG[r.segment];
                return (
                  <div key={r.segment} className="text-center">
                    <Badge className={config?.color || "bg-muted"}>{config?.label || r.segment}</Badge>
                    <p className="text-xl font-bold mt-1">{formatCurrency(r.totalRevenue)}</p>
                    <p className="text-xs text-muted-foreground">{r.count.toLocaleString()} customers</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {(retentionData?.channelPerformance || []).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Channel Performance</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="p-2">Channel</th>
                    <th className="p-2 text-right">Campaigns</th>
                    <th className="p-2 text-right">Sent</th>
                    <th className="p-2 text-right">Converted</th>
                    <th className="p-2 text-right">Conv %</th>
                    <th className="p-2 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {retentionData?.channelPerformance?.map((ch) => (
                    <tr key={ch.channel} className="border-b">
                      <td className="p-2 font-medium capitalize">{ch.channel.replace("_", " ")}</td>
                      <td className="p-2 text-right">{ch.campaigns}</td>
                      <td className="p-2 text-right">{ch.sent}</td>
                      <td className="p-2 text-right">{ch.converted}</td>
                      <td className="p-2 text-right">{ch.conversionRate}%</td>
                      <td className="p-2 text-right font-medium">{formatCurrency(ch.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ==========================================
// CUSTOMER BROWSER
// ==========================================
export function CustomerBrowser() {
  const [segment, setSegment] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState("lifetime_spend");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [hasEmail, setHasEmail] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [includeStaff, setIncludeStaff] = useState(false);

  const handleSearch = (val: string) => {
    setSearch(val);
    const timeout = setTimeout(() => { setDebouncedSearch(val); setPage(1); }, 300);
    return () => clearTimeout(timeout);
  };

  const { data, isLoading } = useQuery<{ customers: Customer[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>({
    queryKey: ["/api/reactivation/customers", segment, debouncedSearch, sortBy, sortDir, page, hasEmail, marketingOptIn, sourceFilter, includeStaff],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "25", sortBy, sortDir });
      if (segment !== "all") params.set("segment", segment);
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (hasEmail) params.set("hasEmail", "true");
      if (marketingOptIn) params.set("marketingOptIn", "true");
      if (sourceFilter !== "all") params.set("source", sourceFilter);
      if (includeStaff) params.set("includeStaff", "true");
      const res = await fetch(`/api/reactivation/customers?${params}`);
      return res.json();
    },
  });

  const { data: customerDetail } = useQuery<CustomerDetail>({
    queryKey: ["/api/reactivation/customers", selectedCustomer],
    queryFn: async () => {
      const res = await fetch(`/api/reactivation/customers/${selectedCustomer}`);
      return res.json();
    },
    enabled: !!selectedCustomer,
  });

  const toggleStaffMutation = useMutation({
    mutationFn: async ({ id, isStaff }: { id: number; isStaff: boolean }) => {
      const res = await apiRequest("PATCH", `/api/reactivation/customers/${id}/staff`, { isStaff });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reactivation/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reactivation/segments"] });
    },
  });

  const pagination = data?.pagination;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name, email, or phone..." value={search} onChange={(e) => handleSearch(e.target.value)} className="pl-8" data-testid="input-customer-search" />
        </div>
        <Select value={segment} onValueChange={(v) => { setSegment(v); setPage(1); }}>
          <SelectTrigger className="w-[150px]" data-testid="select-segment-filter"><SelectValue placeholder="All segments" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Segments</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="at_risk">At Risk</SelectItem>
            <SelectItem value="lapsed">Lapsed</SelectItem>
            <SelectItem value="dormant">Dormant</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[130px]" data-testid="select-source-filter"><SelectValue placeholder="All sources" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="toast">Toast</SelectItem>
            <SelectItem value="shopify">Shopify</SelectItem>
            <SelectItem value="merged">Merged</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[150px]" data-testid="select-sort"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="lifetime_spend">Lifetime Spend</SelectItem>
            <SelectItem value="total_visits">Total Visits</SelectItem>
            <SelectItem value="last_visit">Last Visit</SelectItem>
            <SelectItem value="average_spend">Avg Spend</SelectItem>
            <SelectItem value="days_inactive">Days Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Button size="icon" variant={sortDir === "desc" ? "default" : "outline"} onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")} data-testid="button-sort-dir">
          <BarChart3 className="h-4 w-4" />
        </Button>
        <Button variant={filtersOpen ? "default" : "outline"} onClick={() => setFiltersOpen(!filtersOpen)} data-testid="button-filters">
          <Filter className="h-4 w-4 mr-1" /> Filters
        </Button>
      </div>

      {filtersOpen && (
        <Card>
          <CardContent className="p-3 flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={hasEmail} onChange={e => setHasEmail(e.target.checked)} data-testid="checkbox-has-email" />
              Has Email
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={marketingOptIn} onChange={e => setMarketingOptIn(e.target.checked)} data-testid="checkbox-opt-in" />
              Marketing Opt-In
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={includeStaff} onChange={e => setIncludeStaff(e.target.checked)} data-testid="checkbox-include-staff" />
              Include Staff
            </label>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-10 animate-pulse bg-muted rounded" />)}</div>
      ) : (
        <>
          <div className="text-xs text-muted-foreground">
            Showing {((pagination?.page || 1) - 1) * (pagination?.limit || 25) + 1}-{Math.min((pagination?.page || 1) * (pagination?.limit || 25), pagination?.total || 0)} of {pagination?.total?.toLocaleString()} customers
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-customers">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-2">Name</th>
                  <th className="p-2">Contact</th>
                  <th className="p-2 text-right">Visits</th>
                  <th className="p-2 text-right">Lifetime $</th>
                  <th className="p-2 text-right">Avg/Visit</th>
                  <th className="p-2 text-right">Days Inactive</th>
                  <th className="p-2">Segment</th>
                  <th className="p-2">Source</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {data?.customers?.map((c) => (
                  <tr key={c.id} className="border-b hover-elevate cursor-pointer" onClick={() => setSelectedCustomer(c.id)} data-testid={`row-customer-${c.id}`}>
                    <td className="p-2 font-medium">
                      {c.firstName || ""} {c.lastName || ""}
                      {c.isStaff && <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">Staff</Badge>}
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-1">
                        {c.email && <Mail className="w-3 h-3 text-muted-foreground" />}
                        {c.phone && <Phone className="w-3 h-3 text-muted-foreground" />}
                      </div>
                    </td>
                    <td className="p-2 text-right">{c.totalVisits ?? 0}</td>
                    <td className="p-2 text-right font-medium">{formatCurrency(c.lifetimeSpend)}</td>
                    <td className="p-2 text-right">{formatCurrency(c.averageSpend)}</td>
                    <td className="p-2 text-right">{c.daysSinceLastVisit ?? "N/A"}</td>
                    <td className="p-2"><SegmentBadge segment={c.segment} /></td>
                    <td className="p-2"><SourceBadge source={(c as any).source || "toast"} isMerged={(c as any).isMerged} /></td>
                    <td className="p-2">
                      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedCustomer(c.id); }} data-testid={`button-view-${c.id}`}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} data-testid="button-prev-page">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">Page {page} of {pagination.totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)} data-testid="button-next-page">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      <Dialog open={!!selectedCustomer} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle data-testid="text-customer-detail-name">
              {customerDetail?.firstName} {customerDetail?.lastName}
            </DialogTitle>
          </DialogHeader>
          {customerDetail && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <SegmentBadge segment={customerDetail.segment} />
                <SourceBadge source={(customerDetail as any).source || "toast"} isMerged={(customerDetail as any).isMerged} />
                {customerDetail.daysSinceLastVisit != null && (
                  <span className="text-sm text-muted-foreground">{customerDetail.daysSinceLastVisit} days since last visit</span>
                )}
                <Button
                  variant={(customerDetail as any).isStaff ? "default" : "outline"}
                  size="sm"
                  className="ml-auto"
                  onClick={() => toggleStaffMutation.mutate({ id: customerDetail.id, isStaff: !(customerDetail as any).isStaff })}
                  disabled={toggleStaffMutation.isPending}
                  data-testid="button-toggle-staff"
                >
                  {(customerDetail as any).isStaff ? "Remove Staff Flag" : "Mark as Staff"}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">First Visit</p>
                  <p className="font-medium">{formatDate(customerDetail.firstVisitDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Visit</p>
                  <p className="font-medium">{formatDate(customerDetail.lastVisitDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Visits</p>
                  <p className="font-medium">{customerDetail.totalVisits}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Lifetime Spend</p>
                  <p className="font-medium">{formatCurrency(customerDetail.lifetimeSpend)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Avg per Visit</p>
                  <p className="font-medium">{formatCurrency(customerDetail.averageSpend)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Behavior</p>
                  <p className="font-medium">{customerDetail.lastDiningBehavior || "N/A"}</p>
                </div>
              </div>
              {customerDetail.emails.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-1">Email Addresses</p>
                  {customerDetail.emails.map((e, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      <span>{e.email}</span>
                      <Badge variant="outline" className="text-xs py-0">
                        {e.preference === "OPT_IN" ? "Opted In" : e.preference === "OPT_OUT" ? "Opted Out" : e.preference || "Unknown"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
              {customerDetail.phones.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-1">Phone Numbers</p>
                  {customerDetail.phones.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <span>{p.phone}</span>
                    </div>
                  ))}
                </div>
              )}
              {customerDetail.diningBehaviors && (
                <div>
                  <p className="text-sm font-semibold mb-1">Dining Behaviors</p>
                  <div className="flex flex-wrap gap-1">
                    {customerDetail.diningBehaviors.split(",").map((b, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{b.trim()}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {(customerDetail as any).linkedRecords?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-1">Linked Customer Records</p>
                  <div className="space-y-1">
                    {(customerDetail as any).linkedRecords.map((lr: any) => (
                      <div key={lr.id} className="flex items-center gap-2 text-sm p-2 rounded-md bg-muted/50">
                        <SourceBadge source={lr.source || "toast"} />
                        <span className="font-medium">{lr.firstName} {lr.lastName}</span>
                        {lr.email && <span className="text-muted-foreground text-xs">{lr.email}</span>}
                        <span className="ml-auto text-xs text-muted-foreground">{formatCurrency(lr.lifetimeSpend)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==========================================
// HIGH VALUE TARGETS
// ==========================================
export function HighValueTargets() {
  const [segment, setSegment] = useState("all");
  const { data, isLoading } = useQuery<{ customers: Customer[] }>({
    queryKey: ["/api/reactivation/high-value", segment],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "20" });
      if (segment !== "all") params.set("segment", segment);
      const res = await fetch(`/api/reactivation/high-value?${params}`);
      return res.json();
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={segment} onValueChange={setSegment}>
          <SelectTrigger className="w-[180px]" data-testid="select-hv-segment"><SelectValue placeholder="All reactivatable" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reactivatable</SelectItem>
            <SelectItem value="at_risk">At Risk Only</SelectItem>
            <SelectItem value="lapsed">Lapsed Only</SelectItem>
            <SelectItem value="dormant">Dormant Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 animate-pulse bg-muted rounded" />)}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="table-high-value">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-2">Customer</th>
                <th className="p-2">Contact</th>
                <th className="p-2 text-right">Visits</th>
                <th className="p-2 text-right">Lifetime</th>
                <th className="p-2 text-right">Avg/Visit</th>
                <th className="p-2 text-right">Days Inactive</th>
                <th className="p-2">Segment</th>
              </tr>
            </thead>
            <tbody>
              {data?.customers?.map((c) => (
                <tr key={c.id} className="border-b hover-elevate" data-testid={`row-hv-customer-${c.id}`}>
                  <td className="p-2 font-medium">{c.firstName} {c.lastName}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-1">
                      {c.email && <Mail className="w-3 h-3 text-muted-foreground" />}
                      {c.phone && <Phone className="w-3 h-3 text-muted-foreground" />}
                      {c.emailOptIn && <Badge variant="outline" className="text-xs py-0">Opt-in</Badge>}
                    </div>
                  </td>
                  <td className="p-2 text-right">{c.totalVisits}</td>
                  <td className="p-2 text-right font-semibold">{formatCurrency(c.lifetimeSpend)}</td>
                  <td className="p-2 text-right">{formatCurrency(c.averageSpend)}</td>
                  <td className="p-2 text-right">{c.daysSinceLastVisit ?? "N/A"}</td>
                  <td className="p-2"><SegmentBadge segment={c.segment} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ==========================================
// TOAST INTEGRATION TAB
// ==========================================
export function ToastIntegrationTab() {
  const { toast } = useToast();
  const [syncStartDate, setSyncStartDate] = useState("");
  const [syncEndDate, setSyncEndDate] = useState("");
  const [selectedRestaurant, setSelectedRestaurant] = useState("");

  const statusQuery = useQuery<any>({
    queryKey: ["/api/toast/status"],
    refetchInterval: 30000,
  });

  const syncOrdersMutation = useMutation({
    mutationFn: async (data: { restaurantGuid: string; startDate: string; endDate: string }) => {
      const res = await apiRequest("POST", "/api/toast/sync/orders", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Sync Complete", description: `Processed ${data.synced} guests (${data.created} new, ${data.updated} updated)` });
      queryClient.invalidateQueries({ queryKey: ["/api/toast/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reactivation"] });
    },
    onError: (err: any) => {
      toast({ title: "Sync Failed", description: err.message, variant: "destructive" });
    },
  });

  const refreshSegmentsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/toast/sync/segments");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Segments Refreshed", description: `${data.updated} guest segments updated` });
      queryClient.invalidateQueries({ queryKey: ["/api/reactivation"] });
    },
    onError: (err: any) => {
      toast({ title: "Refresh Failed", description: err.message, variant: "destructive" });
    },
  });

  const status = statusQuery.data;
  const restaurants = status?.restaurants || [];

  const handleSync = () => {
    if (!selectedRestaurant || !syncStartDate || !syncEndDate) {
      toast({ title: "Missing Info", description: "Select a restaurant and date range", variant: "destructive" });
      return;
    }
    syncOrdersMutation.mutate({
      restaurantGuid: selectedRestaurant,
      startDate: new Date(syncStartDate).toISOString(),
      endDate: new Date(syncEndDate).toISOString(),
    });
  };

  const setQuickRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setSyncStartDate(start.toISOString().split("T")[0]);
    setSyncEndDate(end.toISOString().split("T")[0]);
  };

  if (statusQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Connection</CardTitle>
            {status?.authenticated ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : status?.configured ? (
              <XCircle className="h-5 w-5 text-red-500" />
            ) : (
              <XCircle className="h-5 w-5 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold" data-testid="text-toast-status">
              {status?.authenticated ? "Connected" : status?.configured ? "Auth Failed" : "Not Configured"}
            </div>
            <p className="text-xs text-muted-foreground">
              {status?.authenticated
                ? `${restaurants.length} location(s) found`
                : "Check API credentials"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Guests</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold" data-testid="text-toast-total-guests">
              {(status?.stats?.totalGuests || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {(status?.stats?.withEmail || 0).toLocaleString()} with email
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Synced</CardTitle>
            <RefreshCw className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold" data-testid="text-toast-api-synced">
              {(status?.stats?.apiSynced || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {status?.lastSync ? `Last: ${new Date(status.lastSync).toLocaleDateString()}` : "No syncs yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      {status?.authenticated && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" /> Locations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {restaurants.map((r: any) => (
                  <div
                    key={r.guid}
                    className={`flex items-center justify-between gap-2 p-3 rounded-md border cursor-pointer hover-elevate ${
                      selectedRestaurant === r.guid ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => setSelectedRestaurant(r.guid)}
                    data-testid={`card-restaurant-${r.guid}`}
                  >
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{r.name || r.guid}</span>
                    </div>
                    {selectedRestaurant === r.guid && (
                      <Badge>Selected</Badge>
                    )}
                  </div>
                ))}
                {restaurants.length === 0 && (
                  <p className="text-sm text-muted-foreground">No restaurants found. Check your API permissions.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" /> Sync Orders
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => setQuickRange(1)} data-testid="button-sync-1day">
                  Last 24h
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickRange(7)} data-testid="button-sync-7day">
                  Last 7 days
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickRange(30)} data-testid="button-sync-30day">
                  Last 30 days
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickRange(90)} data-testid="button-sync-90day">
                  Last 90 days
                </Button>
              </div>

              <div className="flex items-end gap-3 flex-wrap">
                <div className="space-y-1">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={syncStartDate}
                    onChange={(e) => setSyncStartDate(e.target.value)}
                    data-testid="input-sync-start"
                  />
                </div>
                <div className="space-y-1">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={syncEndDate}
                    onChange={(e) => setSyncEndDate(e.target.value)}
                    data-testid="input-sync-end"
                  />
                </div>
                <Button
                  onClick={handleSync}
                  disabled={syncOrdersMutation.isPending || !selectedRestaurant || !syncStartDate || !syncEndDate}
                  data-testid="button-sync-orders"
                >
                  {syncOrdersMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-1" />
                  )}
                  Sync Orders
                </Button>
              </div>

              {!selectedRestaurant && (
                <p className="text-sm text-muted-foreground">Select a location above before syncing.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>Maintenance</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refreshSegmentsMutation.mutate()}
                disabled={refreshSegmentsMutation.isPending}
                data-testid="button-refresh-segments"
              >
                {refreshSegmentsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1" />
                )}
                Refresh Segments
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Recalculates days since last visit and reactivation segments for all guests based on current date.
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {!status?.authenticated && status?.configured && (
        <Card>
          <CardContent className="py-8 text-center">
            <XCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Authentication Failed</h3>
            <p className="text-sm text-muted-foreground">
              Your Toast API credentials were found but authentication failed. Please verify your Client ID and Secret are correct.
            </p>
          </CardContent>
        </Card>
      )}

      {!status?.configured && (
        <Card>
          <CardContent className="py-8 text-center">
            <Plug className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Toast API Not Configured</h3>
            <p className="text-sm text-muted-foreground">
              Add your Toast Client ID and Client Secret to connect to the Toast POS API for real-time guest data sync.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Webhook Endpoint</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Register this URL with Toast Support to receive real-time order events:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-2 bg-muted rounded text-sm break-all" data-testid="text-webhook-url">
              {window.location.origin}/api/toast/webhook
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/api/toast/webhook`);
                toast({ title: "Copied", description: "Webhook URL copied to clipboard" });
              }}
              data-testid="button-copy-webhook"
            >
              Copy
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            When registered, Toast will automatically send order events to this endpoint, keeping guest data in sync in real time.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ==========================================
// MAIN DASHBOARD
// ==========================================
export default function BoomerangDashboard() {
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold" data-testid="text-page-title">Boomerang Reactivation Engine</h1>
          <p className="text-sm text-muted-foreground">Customer loyalty, retention & reactivation platform</p>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <Users className="h-4 w-4 mr-1" /> Overview
          </TabsTrigger>
          <TabsTrigger value="rfm" data-testid="tab-rfm">
            <Target className="h-4 w-4 mr-1" /> RFM
          </TabsTrigger>
          <TabsTrigger value="loyalty" data-testid="tab-loyalty">
            <Award className="h-4 w-4 mr-1" /> Loyalty
          </TabsTrigger>
          <TabsTrigger value="campaigns" data-testid="tab-campaigns">
            <Gift className="h-4 w-4 mr-1" /> Campaigns
          </TabsTrigger>
          <TabsTrigger value="automations" data-testid="tab-automations">
            <Zap className="h-4 w-4 mr-1" /> Automations
          </TabsTrigger>
          <TabsTrigger value="referrals" data-testid="tab-referrals">
            <Share2 className="h-4 w-4 mr-1" /> Referrals
          </TabsTrigger>
          <TabsTrigger value="high-value" data-testid="tab-high-value">
            <DollarSign className="h-4 w-4 mr-1" /> High Value
          </TabsTrigger>
          <TabsTrigger value="customers" data-testid="tab-customers">
            <Search className="h-4 w-4 mr-1" /> Customers
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            <BarChart3 className="h-4 w-4 mr-1" /> Analytics
          </TabsTrigger>
          <TabsTrigger value="toast" data-testid="tab-toast">
            <Plug className="h-4 w-4 mr-1" /> Toast API
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><SegmentOverview /></TabsContent>
        <TabsContent value="rfm"><RfmTab /></TabsContent>
        <TabsContent value="loyalty"><LoyaltyTab /></TabsContent>
        <TabsContent value="campaigns"><CampaignsTab /></TabsContent>
        <TabsContent value="automations"><AutomationsTab /></TabsContent>
        <TabsContent value="referrals"><ReferralsTab /></TabsContent>
        <TabsContent value="high-value"><HighValueTargets /></TabsContent>
        <TabsContent value="customers"><CustomerBrowser /></TabsContent>
        <TabsContent value="analytics"><AnalyticsTab /></TabsContent>
        <TabsContent value="toast"><ToastIntegrationTab /></TabsContent>
      </Tabs>
    </div>
  );
}
