import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, Users, DollarSign, TrendingDown, Mail, Phone, Search,
  ChevronLeft, ChevronRight, AlertTriangle, Clock, UserX, UserCheck,
  BarChart3, Filter, Eye, X
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
}

interface CustomerDetail extends Customer {
  emails: { email: string; preference: string }[];
  phones: { phone: string; preference: string }[];
  averageTipPercentage: number | null;
}

const SEGMENT_CONFIG: Record<string, { label: string; color: string; icon: typeof UserCheck; description: string }> = {
  active: { label: "Active", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", icon: UserCheck, description: "Visited within 30 days" },
  at_risk: { label: "At Risk", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", icon: AlertTriangle, description: "31-60 days since last visit" },
  lapsed: { label: "Lapsed", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200", icon: Clock, description: "61-120 days since last visit" },
  dormant: { label: "Dormant", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", icon: TrendingDown, description: "121-365 days since last visit" },
  lost: { label: "Lost", color: "bg-muted text-muted-foreground", icon: UserX, description: "365+ days since last visit" },
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

function SegmentOverview() {
  const { data, isLoading } = useQuery<{ segments: SegmentData[]; totalCustomers: number }>({
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

function HighValueTargets() {
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
          <SelectTrigger className="w-[180px]" data-testid="select-hv-segment">
            <SelectValue placeholder="All reactivatable" />
          </SelectTrigger>
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

function CustomerBrowser() {
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

  const handleSearch = (val: string) => {
    setSearch(val);
    const timeout = setTimeout(() => { setDebouncedSearch(val); setPage(1); }, 300);
    return () => clearTimeout(timeout);
  };

  const { data, isLoading } = useQuery<{ customers: Customer[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>({
    queryKey: ["/api/reactivation/customers", segment, debouncedSearch, sortBy, sortDir, page, hasEmail, marketingOptIn],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: "25",
        sortBy,
        sortDir,
      });
      if (segment !== "all") params.set("segment", segment);
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (hasEmail) params.set("hasEmail", "true");
      if (marketingOptIn) params.set("marketingOptIn", "true");
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

  const pagination = data?.pagination;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, email, or phone..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-8"
            data-testid="input-customer-search"
          />
        </div>
        <Select value={segment} onValueChange={(v) => { setSegment(v); setPage(1); }}>
          <SelectTrigger className="w-[150px]" data-testid="select-segment-filter">
            <SelectValue placeholder="All segments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Segments</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="at_risk">At Risk</SelectItem>
            <SelectItem value="lapsed">Lapsed</SelectItem>
            <SelectItem value="dormant">Dormant</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
            <SelectItem value="unknown">Unknown</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[150px]" data-testid="select-sort">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lifetime_spend">Lifetime Spend</SelectItem>
            <SelectItem value="total_visits">Total Visits</SelectItem>
            <SelectItem value="last_visit">Last Visit</SelectItem>
            <SelectItem value="average_spend">Avg Spend</SelectItem>
            <SelectItem value="days_inactive">Days Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="icon"
          variant={sortDir === "desc" ? "default" : "outline"}
          onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}
          data-testid="button-sort-dir"
        >
          <BarChart3 className="h-4 w-4" />
        </Button>
        <Button
          variant={filtersOpen ? "default" : "outline"}
          onClick={() => setFiltersOpen(!filtersOpen)}
          data-testid="button-filters"
        >
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
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {data?.customers?.map((c) => (
                  <tr key={c.id} className="border-b hover-elevate cursor-pointer" onClick={() => setSelectedCustomer(c.id)} data-testid={`row-customer-${c.id}`}>
                    <td className="p-2 font-medium">{c.firstName || ""} {c.lastName || ""}</td>
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
              <div className="flex items-center gap-2">
                <SegmentBadge segment={customerDetail.segment} />
                {customerDetail.daysSinceLastVisit != null && (
                  <span className="text-sm text-muted-foreground">{customerDetail.daysSinceLastVisit} days since last visit</span>
                )}
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AnalyticsTab() {
  const { data, isLoading } = useQuery<{
    spendDistribution: { range: string; count: number }[];
    visitDistribution: { range: string; count: number }[];
    reachability: { emailOptIn: number; emailOptOut: number; emailUnknown: number; noEmail: number; hasPhone: number; total: number };
    atRiskRevenue: { segment: string; totalRevenue: number; count: number }[];
  }>({
    queryKey: ["/api/reactivation/analytics"],
  });

  if (isLoading) {
    return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 animate-pulse bg-muted rounded" />)}</div>;
  }

  const reachability = data?.reachability;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Spend Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {data?.spendDistribution?.map(d => {
              const maxCount = Math.max(...(data.spendDistribution?.map(x => x.count) || [1]));
              return (
                <div key={d.range} className="flex items-center gap-2 text-sm" data-testid={`bar-spend-${d.range}`}>
                  <span className="w-20 text-muted-foreground text-xs">{d.range}</span>
                  <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                    <div className="h-full bg-primary/60 rounded" style={{ width: `${(d.count / maxCount) * 100}%` }} />
                  </div>
                  <span className="w-16 text-right text-xs font-medium">{d.count.toLocaleString()}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Visit Frequency</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {data?.visitDistribution?.map(d => {
              const maxCount = Math.max(...(data.visitDistribution?.map(x => x.count) || [1]));
              return (
                <div key={d.range} className="flex items-center gap-2 text-sm" data-testid={`bar-visit-${d.range}`}>
                  <span className="w-20 text-muted-foreground text-xs">{d.range}</span>
                  <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                    <div className="h-full bg-primary/60 rounded" style={{ width: `${(d.count / maxCount) * 100}%` }} />
                  </div>
                  <span className="w-16 text-right text-xs font-medium">{d.count.toLocaleString()}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Email Reachability</CardTitle>
          </CardHeader>
          <CardContent>
            {reachability && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Marketing Opt-In</span>
                  <span className="font-medium text-green-600 dark:text-green-400">{reachability.emailOptIn.toLocaleString()} ({Math.round(reachability.emailOptIn / reachability.total * 100)}%)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Opted Out</span>
                  <span className="font-medium text-red-600 dark:text-red-400">{reachability.emailOptOut.toLocaleString()} ({Math.round(reachability.emailOptOut / reachability.total * 100)}%)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Unknown Preference</span>
                  <span className="font-medium">{reachability.emailUnknown.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">No Email</span>
                  <span className="font-medium">{reachability.noEmail.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Has Phone</span>
                  <span className="font-medium">{reachability.hasPhone.toLocaleString()} ({Math.round(reachability.hasPhone / reachability.total * 100)}%)</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Revenue at Risk</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.atRiskRevenue?.map(r => {
              const config = SEGMENT_CONFIG[r.segment];
              return (
                <div key={r.segment} className="flex justify-between items-center text-sm py-1" data-testid={`risk-revenue-${r.segment}`}>
                  <div className="flex items-center gap-2">
                    <SegmentBadge segment={r.segment} />
                    <span className="text-muted-foreground">{r.count.toLocaleString()} customers</span>
                  </div>
                  <span className="font-semibold">{formatCurrency(r.totalRevenue)}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function BoomerangDashboard() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-hub">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold" data-testid="text-page-title">Boomerang Reactivation Engine</h1>
            <p className="text-sm text-muted-foreground">Customer reactivation powered by Toast POS data</p>
          </div>
        </div>

        <Tabs defaultValue="overview" data-testid="tabs-boomerang">
          <TabsList>
            <TabsTrigger value="overview" data-testid="tab-overview">
              <Users className="h-4 w-4 mr-1" /> Overview
            </TabsTrigger>
            <TabsTrigger value="high-value" data-testid="tab-high-value">
              <DollarSign className="h-4 w-4 mr-1" /> High Value Targets
            </TabsTrigger>
            <TabsTrigger value="customers" data-testid="tab-customers">
              <Search className="h-4 w-4 mr-1" /> Customer Browser
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">
              <BarChart3 className="h-4 w-4 mr-1" /> Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <SegmentOverview />
          </TabsContent>

          <TabsContent value="high-value" className="mt-4">
            <HighValueTargets />
          </TabsContent>

          <TabsContent value="customers" className="mt-4">
            <CustomerBrowser />
          </TabsContent>

          <TabsContent value="analytics" className="mt-4">
            <AnalyticsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
