import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  BarChart3, Download, RefreshCw, Wine, Beer, Beaker,
  AlertTriangle, CheckCircle, Settings, Plus, Trash2, Save, Search,
  GlassWater, X
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose
} from "@/components/ui/dialog";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const BEVERAGE_TYPES = [
  { value: "wine", label: "Wine", icon: Wine, color: "text-purple-600 dark:text-purple-400" },
  { value: "spirits", label: "Spirits", icon: Beaker, color: "text-amber-600 dark:text-amber-400" },
  { value: "beer", label: "Beer", icon: Beer, color: "text-yellow-600 dark:text-yellow-400" },
  { value: "cider", label: "Cider", icon: GlassWater, color: "text-green-600 dark:text-green-400" },
  { value: "non_alcoholic", label: "Non-Alcoholic", icon: GlassWater, color: "text-blue-600 dark:text-blue-400" },
];

const CONTAINER_TYPES = [
  { value: "glass", label: "Glass" },
  { value: "bottle", label: "Bottle" },
  { value: "can", label: "Can" },
  { value: "pint", label: "Pint" },
  { value: "shot", label: "Shot" },
  { value: "cocktail", label: "Cocktail" },
  { value: "tasting", label: "Tasting Pour" },
  { value: "growler", label: "Growler" },
  { value: "keg", label: "Keg" },
];

function getBeverageIcon(type: string) {
  const found = BEVERAGE_TYPES.find(b => b.value === type);
  if (found) {
    const Icon = found.icon;
    return <Icon className={`h-4 w-4 ${found.color}`} />;
  }
  return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
}

function getBeverageLabel(type: string) {
  return BEVERAGE_TYPES.find(b => b.value === type)?.label || type;
}

export function AbccGallonsReport() {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ completed: number; totalDates: number } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const { data: reportData, isLoading } = useQuery<{
    monthly: { month: string; beverage_type: string; total_units: string; total_sales: string; total_gallons: string; unique_items: string }[];
    summary: { beverage_type: string; total_units: string; total_sales: string; total_gallons: string }[];
    year: number;
    month: number | null;
  }>({
    queryKey: ["/api/abcc/monthly-report", year, selectedMonth],
    queryFn: async () => {
      const params = new URLSearchParams({ year: year.toString() });
      if (selectedMonth) params.set("month", selectedMonth.toString());
      const res = await fetch(`/api/abcc/monthly-report?${params}`);
      if (!res.ok) throw new Error("Failed to load report");
      return res.json();
    },
  });

  const { data: stats } = useQuery<{
    byType: { beverage_type: string; item_count: string; auto_count: string; manual_count: string }[];
    totalSoldItems: number;
    totalClassified: number;
  }>({
    queryKey: ["/api/abcc/classification-stats"],
  });

  const autoClassifyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/abcc/auto-classify");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Auto-Classification Complete", description: `${data.classified} items classified, ${data.skipped} already classified.` });
      queryClient.invalidateQueries({ predicate: (query) => (query.queryKey[0] as string)?.toString().startsWith("/api/abcc") });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const monthlyByType: Record<string, Record<string, { units: number; sales: number; gallons: number }>> = {};
  reportData?.monthly?.forEach(row => {
    if (!monthlyByType[row.month]) monthlyByType[row.month] = {};
    monthlyByType[row.month][row.beverage_type] = {
      units: parseInt(row.total_units || "0"),
      sales: parseFloat(row.total_sales || "0"),
      gallons: parseFloat(row.total_gallons || "0"),
    };
  });

  const exportCsv = () => {
    if (!reportData?.monthly?.length) return;
    const headers = ["Month", "Beverage Type", "Units Sold", "Gallons", "Net Sales"];
    const rows = reportData.monthly.map(r => [
      r.month, getBeverageLabel(r.beverage_type),
      r.total_units, parseFloat(r.total_gallons || "0").toFixed(4),
      parseFloat(r.total_sales || "0").toFixed(2),
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `abcc_gallons_report_${year}${selectedMonth ? '_' + selectedMonth : ''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const startBulkSync = async () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const startDate = `${year}-01-01`;
    const endDate = year === currentYear ? todayStr : `${year}-12-31`;

    if (pollRef.current) clearInterval(pollRef.current);
    setIsSyncing(true);
    setSyncProgress({ completed: 0, totalDates: 0 });

    try {
      const res = await apiRequest("POST", "/api/revenue-detail/bulk-sync-detail", {
        startDate,
        endDate,
        source: "toast",
      });
      const data = await res.json();
      const jobId = data.jobId;
      setSyncProgress({ completed: 0, totalDates: data.totalDates });
      toast({
        title: "Sync Started",
        description: `Syncing ${data.totalDates} days of Toast item sales data. This runs in the background and may take a few minutes.`,
      });

      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/revenue-detail/bulk-sync-status?jobId=${encodeURIComponent(jobId)}`);
          const status = await statusRes.json();
          setSyncProgress({ completed: status.completed, totalDates: status.totalDates });
          if (status.done) {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            setIsSyncing(false);
            setSyncProgress(null);
            queryClient.invalidateQueries({ predicate: (query) => (query.queryKey[0] as string)?.toString().startsWith("/api/abcc") });
            toast({ title: "Sync Complete", description: `${status.completed - status.errors} days synced successfully${status.errors > 0 ? `, ${status.errors} errors` : ""}.` });
          }
        } catch (_e) {}
      }, 5000);
    } catch (err: any) {
      setIsSyncing(false);
      setSyncProgress(null);
      toast({ title: "Sync Error", description: err.message, variant: "destructive" });
    }
  };

  const classificationRate = stats ? (stats.totalSoldItems > 0 ? Math.round((stats.totalClassified / Math.max(stats.totalSoldItems, 1)) * 100) : 0) : 0;

  return (
    <div className="space-y-6" data-testid="abcc-report-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2" data-testid="text-abcc-title">
            <BarChart3 className="h-5 w-5" />
            ABCC Gallons Report
          </h2>
          <p className="text-sm text-muted-foreground">Monthly beverage volume tracking for Massachusetts ABCC reporting</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
            <SelectTrigger className="w-24" data-testid="select-abcc-year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[currentYear - 2, currentYear - 1, currentYear].map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedMonth?.toString() || "all"} onValueChange={(v) => setSelectedMonth(v === "all" ? null : parseInt(v))}>
            <SelectTrigger className="w-28" data-testid="select-abcc-month">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={startBulkSync} disabled={isSyncing} data-testid="btn-resync-data">
            {isSyncing ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            {isSyncing ? (syncProgress && syncProgress.totalDates > 0 ? `Syncing (${syncProgress.completed}/${syncProgress.totalDates})` : "Starting...") : `Sync ${year} Data`}
          </Button>
          <Button variant="outline" size="sm" onClick={() => autoClassifyMutation.mutate()} disabled={autoClassifyMutation.isPending} data-testid="btn-auto-classify">
            {autoClassifyMutation.isPending ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Auto-Classify
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!reportData?.monthly?.length} data-testid="btn-export-csv">
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
        </div>
      </div>

      {stats && (
        <div className="flex items-center gap-4 flex-wrap text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Classified:</span>
            <span className="font-medium">{stats.totalClassified} items</span>
          </div>
          {stats.byType.map(t => (
            <div key={t.beverage_type} className="flex items-center gap-1">
              {getBeverageIcon(t.beverage_type)}
              <span className="text-muted-foreground">{getBeverageLabel(t.beverage_type)}:</span>
              <span>{t.item_count}</span>
            </div>
          ))}
          {classificationRate < 100 && stats.totalSoldItems > 0 && (
            <Badge variant="outline" className="text-[10px]">
              <AlertTriangle className="h-3 w-3 mr-0.5" />
              {stats.totalSoldItems - stats.totalClassified} unclassified items sold
            </Badge>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {BEVERAGE_TYPES.filter(b => b.value !== "non_alcoholic").map(bev => {
          const summaryRow = reportData?.summary?.find(s => s.beverage_type === bev.value);
          const gallons = parseFloat(summaryRow?.total_gallons || "0");
          const units = parseInt(summaryRow?.total_units || "0");
          return (
            <Card key={bev.value} data-testid={`card-abcc-summary-${bev.value}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <bev.icon className={`h-5 w-5 ${bev.color}`} />
                  <span className="font-medium text-sm">{bev.label}</span>
                </div>
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <p className="text-2xl font-bold" data-testid={`text-gallons-${bev.value}`}>
                      {gallons.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">gallons ({units.toLocaleString()} units)</p>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
        <Card data-testid="card-abcc-summary-total">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-5 w-5" />
              <span className="font-medium text-sm">Total</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <p className="text-2xl font-bold" data-testid="text-gallons-total">
                  {reportData?.summary
                    ?.filter(s => s.beverage_type !== "non_alcoholic" && s.beverage_type !== "unclassified")
                    .reduce((sum, s) => sum + parseFloat(s.total_gallons || "0"), 0)
                    .toFixed(2) || "0.00"}
                </p>
                <p className="text-xs text-muted-foreground">
                  total gallons ({reportData?.summary
                    ?.filter(s => s.beverage_type !== "non_alcoholic" && s.beverage_type !== "unclassified")
                    .reduce((sum, s) => sum + parseInt(s.total_units || "0"), 0)
                    .toLocaleString() || 0} units)
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Monthly Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : Object.keys(monthlyByType).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No item sales data found for {year}.</p>
              <p className="text-xs mt-1">Run a Toast detail sync from Daily Revenue to populate item-level data.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-4 font-medium">Month</th>
                    {BEVERAGE_TYPES.filter(b => b.value !== "non_alcoholic").map(bev => (
                      <th key={bev.value} className="py-2 px-3 font-medium text-right">
                        <div className="flex items-center justify-end gap-1">
                          <bev.icon className={`h-3.5 w-3.5 ${bev.color}`} />
                          {bev.label}
                        </div>
                      </th>
                    ))}
                    <th className="py-2 pl-3 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(monthlyByType).sort(([a], [b]) => a.localeCompare(b)).map(([month, types]) => {
                    const totalGal = Object.entries(types)
                      .filter(([t]) => t !== "non_alcoholic" && t !== "unclassified")
                      .reduce((sum, [, v]) => sum + v.gallons, 0);
                    return (
                      <tr key={month} className="border-b last:border-0 hover-elevate" data-testid={`row-month-${month}`}>
                        <td className="py-2 pr-4 font-medium">
                          {MONTHS[parseInt(month.split("-")[1]) - 1]} {month.split("-")[0]}
                        </td>
                        {BEVERAGE_TYPES.filter(b => b.value !== "non_alcoholic").map(bev => {
                          const val = types[bev.value];
                          return (
                            <td key={bev.value} className="py-2 px-3 text-right tabular-nums">
                              {val ? (
                                <div>
                                  <span className="font-medium">{val.gallons.toFixed(2)}</span>
                                  <span className="text-xs text-muted-foreground ml-1">({val.units})</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-2 pl-3 text-right font-bold tabular-nums">
                          {totalGal.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {reportData?.summary?.find(s => s.beverage_type === "unclassified") && (
        <Card className="border-dashed">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="font-medium">Unclassified Items:</span>
              <span>
                {parseInt(reportData.summary.find(s => s.beverage_type === "unclassified")?.total_units || "0").toLocaleString()} units
                (${parseFloat(reportData.summary.find(s => s.beverage_type === "unclassified")?.total_sales || "0").toLocaleString()} in sales)
              </span>
              <span className="text-muted-foreground">- These items need beverage type and serving size classification</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function AbccClassifications() {
  const { toast } = useToast();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ beverageType: "", servingSizeOz: "", containerType: "" });

  const { data: classifications, isLoading } = useQuery<any[]>({
    queryKey: ["/api/abcc/classifications", filter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("beverageType", filter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/abcc/classifications?${params}`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const { data: unclassified } = useQuery<any[]>({
    queryKey: ["/api/abcc/unclassified-items"],
    queryFn: async () => {
      const res = await fetch(`/api/abcc/unclassified-items?year=${new Date().getFullYear()}`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/abcc/classifications/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Updated" });
      setEditingId(null);
      queryClient.invalidateQueries({ predicate: (query) => (query.queryKey[0] as string)?.toString().startsWith("/api/abcc") });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/abcc/classifications", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Classification Added" });
      queryClient.invalidateQueries({ predicate: (query) => (query.queryKey[0] as string)?.toString().startsWith("/api/abcc") });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/abcc/classifications/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Deleted" });
      queryClient.invalidateQueries({ predicate: (query) => (query.queryKey[0] as string)?.toString().startsWith("/api/abcc") });
    },
  });

  const autoClassifyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/abcc/auto-classify");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Auto-Classification Complete", description: `${data.classified} new items classified.` });
      queryClient.invalidateQueries({ predicate: (query) => (query.queryKey[0] as string)?.toString().startsWith("/api/abcc") });
    },
  });

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setEditForm({
      beverageType: item.beverage_type,
      servingSizeOz: item.serving_size_oz,
      containerType: item.container_type || "",
    });
  };

  const saveEdit = () => {
    if (!editingId) return;
    updateMutation.mutate({
      id: editingId,
      data: {
        beverageType: editForm.beverageType,
        servingSizeOz: parseFloat(editForm.servingSizeOz),
        containerType: editForm.containerType,
        isActive: true,
      },
    });
  };

  const classifyUnclassified = (item: any, beverageType: string, servingSizeOz: number, containerType: string) => {
    createMutation.mutate({
      itemName: item.item_name,
      itemGuid: item.item_guid,
      beverageType,
      servingSizeOz,
      containerType,
    });
  };

  return (
    <div className="space-y-6" data-testid="abcc-classifications-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2" data-testid="text-classifications-title">
            <Settings className="h-5 w-5" />
            Product Classifications
          </h2>
          <p className="text-sm text-muted-foreground">Map items to beverage types and serving sizes for ABCC reporting</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => autoClassifyMutation.mutate()} disabled={autoClassifyMutation.isPending} data-testid="btn-auto-classify-2">
            {autoClassifyMutation.isPending ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Auto-Classify from Menus
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-classifications"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-36" data-testid="select-filter-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {BEVERAGE_TYPES.map(b => (
              <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between gap-2 flex-wrap">
            <span>Classified Items ({classifications?.length || 0})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : !classifications?.length ? (
            <p className="text-center py-6 text-muted-foreground">No classified items yet. Click "Auto-Classify from Menus" to get started.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-3 font-medium">Item</th>
                    <th className="py-2 px-3 font-medium">Menu Group</th>
                    <th className="py-2 px-3 font-medium">Type</th>
                    <th className="py-2 px-3 font-medium text-right">Size (oz)</th>
                    <th className="py-2 px-3 font-medium">Container</th>
                    <th className="py-2 px-3 font-medium">Source</th>
                    <th className="py-2 pl-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {classifications.map((item: any) => (
                    <tr key={item.id} className="border-b last:border-0" data-testid={`row-classification-${item.id}`}>
                      {editingId === item.id ? (
                        <>
                          <td className="py-1.5 pr-3 font-medium">{item.item_name}</td>
                          <td className="py-1.5 px-3 text-muted-foreground text-xs">{item.menu_group_name || "-"}</td>
                          <td className="py-1.5 px-3">
                            <Select value={editForm.beverageType} onValueChange={(v) => setEditForm(p => ({ ...p, beverageType: v }))}>
                              <SelectTrigger className="h-8 w-28" data-testid="select-edit-type">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {BEVERAGE_TYPES.map(b => (
                                  <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-1.5 px-3">
                            <Input
                              type="number"
                              step="0.1"
                              value={editForm.servingSizeOz}
                              onChange={(e) => setEditForm(p => ({ ...p, servingSizeOz: e.target.value }))}
                              className="h-8 w-20 text-right"
                              data-testid="input-edit-size"
                            />
                          </td>
                          <td className="py-1.5 px-3">
                            <Select value={editForm.containerType} onValueChange={(v) => setEditForm(p => ({ ...p, containerType: v }))}>
                              <SelectTrigger className="h-8 w-28" data-testid="select-edit-container">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CONTAINER_TYPES.map(c => (
                                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-1.5 px-3"></td>
                          <td className="py-1.5 pl-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button size="icon" variant="ghost" onClick={saveEdit} disabled={updateMutation.isPending} data-testid="btn-save-edit">
                                <Save className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => setEditingId(null)} data-testid="btn-cancel-edit">
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-1.5 pr-3 font-medium">{item.item_name}</td>
                          <td className="py-1.5 px-3 text-muted-foreground text-xs">{item.menu_group_name || "-"}</td>
                          <td className="py-1.5 px-3">
                            <div className="flex items-center gap-1">
                              {getBeverageIcon(item.beverage_type)}
                              <span>{getBeverageLabel(item.beverage_type)}</span>
                            </div>
                          </td>
                          <td className="py-1.5 px-3 text-right tabular-nums">{parseFloat(item.serving_size_oz).toFixed(1)}</td>
                          <td className="py-1.5 px-3 text-muted-foreground">{item.container_type || "-"}</td>
                          <td className="py-1.5 px-3">
                            <Badge variant={item.auto_classified ? "secondary" : "outline"} className="text-[10px]">
                              {item.auto_classified ? "Auto" : "Manual"}
                            </Badge>
                          </td>
                          <td className="py-1.5 pl-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button size="icon" variant="ghost" onClick={() => startEdit(item)} data-testid={`btn-edit-${item.id}`}>
                                <Settings className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(item.id)} data-testid={`btn-delete-${item.id}`}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {unclassified && unclassified.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Unclassified Items ({unclassified.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">These items were sold but don't have a beverage classification. Click to classify them.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-3 font-medium">Item</th>
                    <th className="py-2 px-3 font-medium">Sales Category</th>
                    <th className="py-2 px-3 font-medium text-right">Qty Sold</th>
                    <th className="py-2 px-3 font-medium text-right">Sales</th>
                    <th className="py-2 px-3 font-medium text-right">Days</th>
                    <th className="py-2 pl-3 font-medium">Classify</th>
                  </tr>
                </thead>
                <tbody>
                  {unclassified.slice(0, 50).map((item: any, idx: number) => (
                    <UnclassifiedRow key={idx} item={item} onClassify={classifyUnclassified} />
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

function UnclassifiedRow({ item, onClassify }: { item: any; onClassify: (item: any, type: string, size: number, container: string) => void }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("wine");
  const [size, setSize] = useState("6");
  const [container, setContainer] = useState("glass");

  return (
    <tr className="border-b last:border-0" data-testid={`row-unclassified-${item.item_name}`}>
      <td className="py-1.5 pr-3 font-medium">{item.item_name}</td>
      <td className="py-1.5 px-3 text-muted-foreground text-xs">{item.sales_category_name || "-"}</td>
      <td className="py-1.5 px-3 text-right tabular-nums">{parseInt(item.total_qty).toLocaleString()}</td>
      <td className="py-1.5 px-3 text-right tabular-nums">${parseFloat(item.total_sales).toFixed(2)}</td>
      <td className="py-1.5 px-3 text-right">{item.days_sold}</td>
      <td className="py-1.5 pl-3">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" data-testid={`btn-classify-${item.item_name}`}>
              <Plus className="h-3 w-3 mr-1" /> Classify
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Classify: {item.item_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Beverage Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger data-testid="select-classify-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BEVERAGE_TYPES.map(b => (
                      <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Serving Size (oz)</Label>
                <Input type="number" step="0.1" value={size} onChange={e => setSize(e.target.value)} data-testid="input-classify-size" />
              </div>
              <div>
                <Label>Container Type</Label>
                <Select value={container} onValueChange={setContainer}>
                  <SelectTrigger data-testid="select-classify-container">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTAINER_TYPES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={() => { onClassify(item, type, parseFloat(size), container); setOpen(false); }} data-testid="btn-confirm-classify">
                  <CheckCircle className="h-4 w-4 mr-1" /> Save Classification
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </td>
    </tr>
  );
}
