import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format, startOfWeek, endOfWeek, addWeeks, addDays, parseISO } from "date-fns";
import Holidays from 'date-holidays';
import { RevenueDetailDialog } from "@/components/RevenueDetailDialog";
import { 
  Target, 
  Lightbulb, 
  Megaphone, 
  DollarSign, 
  Brain, 
  Plus, 
  Check, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Calendar,
  User,
  Clock,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  AlertTriangle,
  Ban,
  Tag,
  History,
  CloudRain,
  Cloud,
  Sun,
  CloudSnow,
  CloudLightning,
  CloudFog,
  Thermometer,
  RefreshCw,
  Download,
  Upload,
  BookOpen,
  Gift
} from "lucide-react";
import type { 
  RccWeek, 
  RccTask, 
  RccCampaign, 
  RccRevenue, 
  RccAiRecommendation,
  RccTeam,
  RccDailyRevenue
} from "@shared/schema";

export default function RccDashboard() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("focus");
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

  // Calculate weekly totals from daily entries
  const dailyTotals = {
    toast: dailyRevenue?.reduce((sum, d) => sum + parseFloat(d.toastRevenue || '0'), 0) || 0,
    shopify: dailyRevenue?.reduce((sum, d) => sum + parseFloat(d.shopifyRevenue || '0'), 0) || 0,
    wholesale: dailyRevenue?.reduce((sum, d) => sum + parseFloat(d.wholesaleRevenue || '0'), 0) || 0,
    other: dailyRevenue?.reduce((sum, d) => sum + parseFloat(d.otherRevenue || '0'), 0) || 0,
  };
  const dailyGrandTotal = dailyTotals.toast + dailyTotals.shopify + dailyTotals.wholesale + dailyTotals.other;

  const { data: aiRecs } = useQuery<RccAiRecommendation[]>({
    queryKey: ["/api/rcc/ai-recommendations", activeWeekId],
    queryFn: () => activeWeekId 
      ? fetch(`/api/rcc/ai-recommendations/${activeWeekId}`).then(r => r.json())
      : Promise.resolve([]),
    enabled: !!activeWeekId,
  });

  const activeWeek = weeks?.find(w => w.id === activeWeekId) || currentWeek;

  if (weeksLoading || currentWeekLoading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-12 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} data-testid="button-return-hub">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Return to Hub
        </Button>
      </div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="rcc-title">Revenue Command Center</h1>
          <p className="text-muted-foreground">Weekly planning and execution hub</p>
        </div>
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

      <WeekSelector 
        weeks={weeks || []}
        activeWeekId={activeWeekId}
        onSelectWeek={setSelectedWeekId}
      />

      {!activeWeek ? (
        <InitializeWeeksCard onSuccess={() => queryClient.invalidateQueries({ queryKey: ["/api/rcc/weeks"] })} />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6 mb-6">
            <StatCard 
              label="Focus" 
              value={activeWeek.focusStatement ? "Set" : "Not set"} 
              icon={<Target className="h-4 w-4" />} 
              active={!!activeWeek.focusStatement}
            />
            <StatCard 
              label="Tasks" 
              value={`${tasks?.filter(t => t.status === 'done').length || 0}/${tasks?.length || 0}`} 
              icon={<Check className="h-4 w-4" />}
              active={(tasks?.filter(t => t.status === 'done').length || 0) > 0}
            />
            <StatCard 
              label="Campaigns" 
              value={`${campaigns?.length || 0}`} 
              icon={<Megaphone className="h-4 w-4" />}
              active={(campaigns?.length || 0) > 0}
            />
            <StatCard 
              label="Revenue" 
              value={dailyGrandTotal > 0 ? `$${dailyGrandTotal.toLocaleString('en-US')}` : 'Not entered'} 
              icon={<DollarSign className="h-4 w-4" />}
              active={dailyGrandTotal > 0}
            />
            <StatCard 
              label="Learnings" 
              value={`${ideas?.length || 0} logged`} 
              icon={<Lightbulb className="h-4 w-4" />}
              active={(ideas?.length || 0) > 0}
            />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid grid-cols-6 w-full">
              <TabsTrigger value="focus" className="flex items-center gap-2" data-testid="tab-focus">
                <Target className="h-4 w-4" /> Focus
              </TabsTrigger>
              <TabsTrigger value="tasks" className="flex items-center gap-2" data-testid="tab-tasks">
                <Lightbulb className="h-4 w-4" /> Tasks
              </TabsTrigger>
              <TabsTrigger value="campaigns" className="flex items-center gap-2" data-testid="tab-campaigns">
                <Megaphone className="h-4 w-4" /> Campaigns
              </TabsTrigger>
              <TabsTrigger value="revenue" className="flex items-center gap-2" data-testid="tab-revenue">
                <DollarSign className="h-4 w-4" /> Revenue
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex items-center gap-2" data-testid="tab-ai">
                <Brain className="h-4 w-4" /> AI
              </TabsTrigger>
              <TabsTrigger value="docs" className="flex items-center gap-2" data-testid="tab-docs">
                <BookOpen className="h-4 w-4" /> Docs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="focus" className="mt-6">
              <WeeklyFocusPanel week={activeWeek} />
            </TabsContent>

            <TabsContent value="tasks" className="mt-6">
              <TasksPanel 
                weekId={activeWeekId!}
                tasks={tasks || []}
                ideas={ideas || []}
                teams={teams || []}
                campaigns={campaigns || []}
              />
            </TabsContent>

            <TabsContent value="campaigns" className="mt-6">
              <CampaignsPanel 
                weekId={activeWeekId!}
                campaigns={campaigns || []}
                allTasks={[...(tasks || []), ...(ideas || [])]}
              />
            </TabsContent>

            <TabsContent value="revenue" className="mt-6">
              <RevenuePanel 
                weekId={activeWeekId!}
                week={activeWeek!}
                revenue={revenue ?? null}
              />
            </TabsContent>

            <TabsContent value="ai" className="mt-6">
              <AiAdvisorPanel 
                weekId={activeWeekId!}
                recommendations={aiRecs || []}
              />
            </TabsContent>

            <TabsContent value="docs" className="mt-6">
              <RccDocsPanel />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

export function ExportImportButtons({ 
  weekId, 
  weeks,
  onImportComplete 
}: { 
  weekId: number; 
  weeks: RccWeek[];
  onImportComplete: (targetWeekId: number) => void;
}) {
  const { toast } = useToast();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState<string>("");
  const [targetWeekId, setTargetWeekId] = useState<string>(weekId.toString());
  const [clearExisting, setClearExisting] = useState(false);

  // Keep target week in sync with active week
  useEffect(() => {
    setTargetWeekId(weekId.toString());
  }, [weekId]);

  const [importFile, setImportFile] = useState<File | null>(null);

  const handleExport = async () => {
    try {
      const res = await fetch(`/api/rcc/weeks/${weekId}/export`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const week = weeks.find(w => w.id === weekId);
      const weekLabel = week ? format(parseISO(week.weekStart), "yyyy-MM-dd") : weekId;
      a.download = `rcc-week-${weekLabel}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Export successful", description: "Excel file downloaded" });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/rcc/template');
      if (!res.ok) throw new Error("Failed to download template");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'rcc-import-template.xlsx';
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Template downloaded", description: "Fill it out and import" });
    } catch {
      toast({ title: "Failed to download template", variant: "destructive" });
    }
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      let body: any = { clearExisting };
      
      if (importFile) {
        // Read file as base64 for Excel
        const buffer = await importFile.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        body.excelData = base64;
      } else if (importData) {
        body.data = JSON.parse(importData);
      }
      
      const res = await apiRequest("POST", `/api/rcc/weeks/${targetWeekId}/import`, body);
      if (!res.ok) throw new Error("Import failed");
      return res.json();
    },
    onSuccess: (result) => {
      toast({ 
        title: "Import successful", 
        description: `Created ${result.tasksCreated} tasks and ${result.campaignsCreated} campaigns` 
      });
      setImportDialogOpen(false);
      setImportData("");
      setImportFile(null);
      onImportComplete(parseInt(targetWeekId));
    },
    onError: (error: any) => {
      toast({ 
        title: "Import failed", 
        description: error.message || "Check your file format",
        variant: "destructive" 
      });
    }
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportData(""); // Clear JSON if file selected
  };

  const [repairing, setRepairing] = useState(false);
  const handleRepairData = async () => {
    setRepairing(true);
    try {
      const res = await apiRequest("POST", "/api/rcc/admin/repair-daily-revenue");
      if (!res.ok) throw new Error("Repair failed");
      const result = await res.json();
      toast({ 
        title: "Revenue data repaired", 
        description: `Fixed ${result.fixedCount} week mappings, synced ${result.syncedCount} Toast entries across ${result.totalEntries} records` 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rcc/daily-revenue"] });
      if (weekId) {
        queryClient.invalidateQueries({ queryKey: ["/api/rcc/daily-revenue", weekId] });
      }
    } catch {
      toast({ title: "Repair failed", variant: "destructive" });
    } finally {
      setRepairing(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button 
        variant="outline" 
        size="sm"
        onClick={handleRepairData}
        disabled={repairing}
        data-testid="btn-repair-revenue"
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${repairing ? 'animate-spin' : ''}`} />
        {repairing ? "Repairing..." : "Repair Data"}
      </Button>
      <Button 
        variant="outline" 
        size="sm"
        onClick={handleExport}
        data-testid="btn-export-week"
      >
        <Download className="h-4 w-4 mr-2" />
        Export
      </Button>
      
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" data-testid="btn-import-week">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Week Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Need a template?</Label>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleDownloadTemplate}
                data-testid="btn-download-template"
              >
                <Download className="h-3 w-3 mr-1" />
                Download Template
              </Button>
            </div>
            
            <div>
              <Label>Upload Excel file (.xlsx)</Label>
              <Input 
                type="file" 
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="mt-1"
                data-testid="input-import-file"
              />
              {importFile && (
                <p className="text-sm text-muted-foreground mt-1">
                  Selected: {importFile.name}
                </p>
              )}
            </div>

            <div>
              <Label>Target Week</Label>
              <Select value={targetWeekId} onValueChange={setTargetWeekId}>
                <SelectTrigger className="mt-1" data-testid="select-target-week">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {weeks.map(week => (
                    <SelectItem key={week.id} value={week.id.toString()}>
                      {format(parseISO(week.weekStart), "MMM d")} - {format(parseISO(week.weekEnd), "MMM d, yyyy")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="clearExisting"
                checked={clearExisting}
                onChange={(e) => setClearExisting(e.target.checked)}
                className="rounded"
                data-testid="checkbox-clear-existing"
              />
              <Label htmlFor="clearExisting" className="text-sm font-normal">
                Clear existing tasks and campaigns before import
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)} data-testid="btn-cancel-import">
              Cancel
            </Button>
            <Button 
              onClick={() => importMutation.mutate()}
              disabled={(!importData && !importFile) || importMutation.isPending}
              data-testid="btn-confirm-import"
            >
              {importMutation.isPending ? "Importing..." : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function StatCard({ label, value, icon, active }: { 
  label: string; 
  value: string; 
  icon: React.ReactNode;
  active: boolean;
}) {
  return (
    <Card className={active ? "border-primary/50" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          {icon}
        </div>
        <p className="text-lg font-semibold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

export function WeekSelector({ 
  weeks, 
  activeWeekId, 
  onSelectWeek
}: { 
  weeks: RccWeek[]; 
  activeWeekId: number | undefined;
  onSelectWeek: (id: number | null) => void;
}) {
  const activeWeek = weeks.find(w => w.id === activeWeekId);
  const activeIndex = weeks.findIndex(w => w.id === activeWeekId);

  // Weeks are sorted by weekStart descending, so:
  // - activeIndex 0 = most recent week (can't go "next" / newer)
  // - activeIndex last = oldest week (can't go "prev" / older)
  const canGoNext = activeIndex > 0;
  const canGoPrev = activeIndex < weeks.length - 1;

  const goNext = () => {
    if (canGoNext) {
      onSelectWeek(weeks[activeIndex - 1].id);
    }
  };

  const goPrev = () => {
    if (canGoPrev) {
      onSelectWeek(weeks[activeIndex + 1].id);
    }
  };

  if (!activeWeek) return null;

  return (
    <div className="flex items-center justify-center gap-4">
      <Button 
        variant="outline" 
        size="icon" 
        onClick={goPrev}
        disabled={!canGoPrev}
        data-testid="btn-prev-week"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="text-center min-w-[200px]">
        <p className="text-lg font-semibold">
          {format(parseISO(activeWeek.weekStart), "MMM d")} - {format(parseISO(activeWeek.weekEnd), "MMM d, yyyy")}
        </p>
        <Badge variant={activeWeek.status === 'approved' ? 'default' : 'secondary'}>
          {activeWeek.status}
        </Badge>
      </div>
      <Button 
        variant="outline" 
        size="icon" 
        onClick={goNext}
        disabled={!canGoNext}
        data-testid="btn-next-week"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function InitializeWeeksCard({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  
  const initializeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/rcc/weeks/initialize", {});
    },
    onSuccess: async (res) => {
      const data = await res.json();
      toast({ title: "Weeks initialized", description: data.message });
      onSuccess();
    },
    onError: (error: any) => {
      toast({ title: "Error initializing weeks", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Card className="mt-6">
      <CardContent className="py-12 text-center">
        <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No Weeks Set Up</h3>
        <p className="text-muted-foreground mb-4">
          Initialize weeks for the year to start planning. This creates all weeks from January through next February.
        </p>
        <Button 
          onClick={() => initializeMutation.mutate()}
          disabled={initializeMutation.isPending}
          data-testid="btn-initialize-weeks"
        >
          {initializeMutation.isPending ? (
            <>Initializing...</>
          ) : (
            <>
              <Calendar className="h-4 w-4 mr-2" /> Initialize Weeks
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

interface AiFocusSuggestions {
  focusOptions: string[];
  hookOptions: string[];
  goalSuggestion: string;
  reasoning: string;
}

export function WeeklyFocusPanel({ week }: { week: RccWeek }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [focus, setFocus] = useState(week.focusStatement || "");
  const [hook, setHook] = useState(week.hookAngle || "");
  const [goal, setGoal] = useState(week.weeklyGoal || "");
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AiFocusSuggestions | null>(null);
  const [stagedFocus, setStagedFocus] = useState<string | null>(null);
  const [stagedHook, setStagedHook] = useState<string | null>(null);
  const [stagedGoal, setStagedGoal] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<RccWeek>) => {
      return apiRequest("PUT", `/api/rcc/weeks/${week.id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Focus updated" });
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/rcc/weeks"] });
    },
    onError: (error: any) => {
      toast({ title: "Error updating focus", description: error.message, variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/rcc/weeks/${week.id}/approve`);
    },
    onSuccess: () => {
      toast({ title: "Week approved" });
      queryClient.invalidateQueries({ queryKey: ["/api/rcc/weeks"] });
    },
    onError: (error: any) => {
      toast({ title: "Error approving week", description: error.message, variant: "destructive" });
    },
  });

  const aiMutation = useMutation({
    mutationFn: async () => {
      const resp = await apiRequest("POST", `/api/rcc/weeks/${week.id}/ai-focus-suggestions`, {});
      return resp.json() as Promise<AiFocusSuggestions>;
    },
    onSuccess: (data) => {
      setAiSuggestions(data);
      setStagedFocus(null);
      setStagedHook(null);
      setStagedGoal(null);
      setShowAiDialog(true);
    },
    onError: (error: any) => {
      toast({ title: "AI suggestion failed", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      focusStatement: focus,
      hookAngle: hook,
      weeklyGoal: goal,
    });
  };

  const applyAiSelections = () => {
    if (stagedFocus) setFocus(stagedFocus);
    if (stagedHook) setHook(stagedHook);
    if (stagedGoal) setGoal(stagedGoal);
    setEditing(true);
    setShowAiDialog(false);
    toast({ title: "AI suggestions applied", description: "Review and save when ready." });
  };

  const stagedCount = [stagedFocus, stagedHook, stagedGoal].filter(Boolean).length;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="md:col-span-2 border-primary/50">
        <CardHeader>
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Weekly Focus
              </CardTitle>
              <CardDescription className="mt-1">The heart of the week - what are we focusing on?</CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => aiMutation.mutate()}
              disabled={aiMutation.isPending}
              data-testid="btn-ai-focus-suggestions"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {aiMutation.isPending ? "Thinking..." : "AI Suggestions"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="focus">Focus Statement</Label>
                <Textarea 
                  id="focus"
                  placeholder="What is the one thing we're focusing on this week?"
                  value={focus}
                  onChange={(e) => setFocus(e.target.value)}
                  className="mt-1"
                  data-testid="input-focus"
                />
              </div>
              <div>
                <Label htmlFor="hook">Hook / Angle</Label>
                <Textarea 
                  id="hook"
                  placeholder="What's the hook or angle for this week's marketing?"
                  value={hook}
                  onChange={(e) => setHook(e.target.value)}
                  className="mt-1"
                  data-testid="input-hook"
                />
              </div>
              <div>
                <Label htmlFor="goal">Weekly Goal</Label>
                <Textarea 
                  id="goal"
                  placeholder="What specific outcome do we want to achieve?"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="mt-1"
                  data-testid="input-goal"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={updateMutation.isPending} data-testid="btn-save-focus">
                  Save
                </Button>
                <Button variant="outline" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Focus Statement</p>
                <p className="text-lg font-medium">{week.focusStatement || <span className="text-muted-foreground italic">Not set</span>}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hook / Angle</p>
                <p className="text-lg">{week.hookAngle || <span className="text-muted-foreground italic">Not set</span>}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Weekly Goal</p>
                <p className="text-lg">{week.weeklyGoal || <span className="text-muted-foreground italic">Not set</span>}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={() => setEditing(true)} data-testid="btn-edit-focus">
                  Edit Focus
                </Button>
                {week.status !== 'approved' && (
                  <Button 
                    onClick={() => approveMutation.mutate()} 
                    disabled={approveMutation.isPending}
                    data-testid="btn-approve-week"
                  >
                    <Check className="h-4 w-4 mr-2" /> Approve Week
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAiDialog} onOpenChange={setShowAiDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Weekly Focus Suggestions
            </DialogTitle>
          </DialogHeader>

          {aiSuggestions && (
            <div className="space-y-6">
              {aiSuggestions.reasoning && (
                <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Why these suggestions?</p>
                  <p>{aiSuggestions.reasoning}</p>
                </div>
              )}

              <div className="space-y-2">
                <p className="font-semibold text-sm flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" /> Focus Statement
                  {stagedFocus && <Badge variant="secondary" className="ml-auto text-xs">Selected</Badge>}
                </p>
                {(aiSuggestions.focusOptions || []).map((opt, i) => {
                  const isSelected = stagedFocus === opt;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setStagedFocus(isSelected ? null : opt)}
                      data-testid={`btn-select-focus-${i}`}
                      className={`w-full text-left rounded-md border p-3 text-sm leading-relaxed transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border hover-elevate"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`mt-0.5 flex-shrink-0 h-4 w-4 rounded-full border-2 flex items-center justify-center ${isSelected ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                          {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                        </div>
                        <span>{opt}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2">
                <p className="font-semibold text-sm flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-primary" /> Hook / Angle
                  {stagedHook && <Badge variant="secondary" className="ml-auto text-xs">Selected</Badge>}
                </p>
                {(aiSuggestions.hookOptions || []).map((opt, i) => {
                  const isSelected = stagedHook === opt;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setStagedHook(isSelected ? null : opt)}
                      data-testid={`btn-select-hook-${i}`}
                      className={`w-full text-left rounded-md border p-3 text-sm leading-relaxed transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border hover-elevate"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`mt-0.5 flex-shrink-0 h-4 w-4 rounded-full border-2 flex items-center justify-center ${isSelected ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                          {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                        </div>
                        <span>{opt}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2">
                <p className="font-semibold text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" /> Weekly Goal
                  {stagedGoal && <Badge variant="secondary" className="ml-auto text-xs">Selected</Badge>}
                </p>
                {[aiSuggestions.goalSuggestion].filter(Boolean).map((opt, i) => {
                  const isSelected = stagedGoal === opt;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setStagedGoal(isSelected ? null : opt)}
                      data-testid="btn-select-goal"
                      className={`w-full text-left rounded-md border p-3 text-sm leading-relaxed transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border hover-elevate"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`mt-0.5 flex-shrink-0 h-4 w-4 rounded-full border-2 flex items-center justify-center ${isSelected ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                          {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                        </div>
                        <span>{opt}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <DialogFooter className="flex-wrap gap-2 sm:justify-between">
            <Button
              variant="outline"
              onClick={() => { setStagedFocus(null); setStagedHook(null); setStagedGoal(null); aiMutation.mutate(); }}
              disabled={aiMutation.isPending}
              data-testid="btn-regenerate"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {aiMutation.isPending ? "Thinking..." : "Regenerate"}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAiDialog(false)}>Cancel</Button>
              <Button
                onClick={applyAiSelections}
                disabled={stagedCount === 0}
                data-testid="btn-apply-selections"
              >
                <Check className="h-4 w-4 mr-2" />
                Apply {stagedCount > 0 ? `${stagedCount} Selection${stagedCount > 1 ? "s" : ""}` : "Selections"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function TasksPanel({ 
  weekId, 
  tasks, 
  ideas,
  teams,
  campaigns,
}: { 
  weekId: number;
  tasks: RccTask[];
  ideas: RccTask[];
  teams: RccTeam[];
  campaigns: RccCampaign[];
}) {
  const { toast } = useToast();
  const [newIdea, setNewIdea] = useState("");
  const [trackingTask, setTrackingTask] = useState<RccTask | null>(null);
  const [trackChannel, setTrackChannel] = useState("");
  const [trackMessage, setTrackMessage] = useState("");

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; weekId?: number; status: string }) => {
      return apiRequest("POST", "/api/rcc/tasks", data);
    },
    onSuccess: () => {
      toast({ title: "Task created" });
      setNewIdea("");
      queryClient.invalidateQueries({ queryKey: ["/api/rcc/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rcc/ideas"] });
    },
    onError: (error: any) => {
      toast({ title: "Error creating task", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<RccTask> }) => {
      return apiRequest("PUT", `/api/rcc/tasks/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rcc/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rcc/ideas"] });
    },
    onError: (error: any) => {
      toast({ title: "Error updating task", description: error.message, variant: "destructive" });
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: { weekId: number; channel: string; message: string; taskId: number }) => {
      const resp = await apiRequest("POST", "/api/rcc/campaigns", data);
      return resp.json();
    },
    onSuccess: () => {
      toast({ title: "Campaign created", description: "This task is now tracked in the Campaign Tracker." });
      setTrackingTask(null);
      setTrackChannel("");
      setTrackMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/rcc/campaigns"] });
    },
    onError: (error: any) => {
      toast({ title: "Error creating campaign", description: error.message, variant: "destructive" });
    },
  });

  const handleAddIdea = () => {
    if (!newIdea.trim()) return;
    createMutation.mutate({ title: newIdea, status: "idea" });
  };

  const handlePromoteIdea = (idea: RccTask) => {
    updateMutation.mutate({ id: idea.id, data: { weekId, status: "open" } });
  };

  const handleStatusChange = (task: RccTask, status: string) => {
    updateMutation.mutate({ id: task.id, data: { status: status as any } });
  };

  const openTrackDialog = (task: RccTask) => {
    setTrackingTask(task);
    setTrackMessage(task.title);
    setTrackChannel("");
  };

  const handleCreateCampaign = () => {
    if (!trackingTask || !trackChannel) return;
    createCampaignMutation.mutate({ weekId, channel: trackChannel, message: trackMessage, taskId: trackingTask.id });
  };

  const linkedTaskIds = new Set(campaigns.filter(c => c.taskId).map(c => c.taskId!));

  const openTasks = tasks.filter(t => t.status === 'open');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const doneTasks = tasks.filter(t => t.status === 'done');
  const channels = ["Email", "Instagram", "Facebook", "SMS", "In-store", "Newsletter", "Other"];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Learnings
          </CardTitle>
          <CardDescription>What we observed this week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input 
              placeholder="What happened? (e.g., 'Rain reduced Saturday traffic despite promotion')" 
              value={newIdea}
              onChange={(e) => setNewIdea(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddIdea()}
              data-testid="input-new-idea"
            />
            <Button onClick={handleAddIdea} disabled={createMutation.isPending} data-testid="btn-add-idea">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {ideas.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No learnings logged yet</p>
            ) : (
              ideas.map(idea => (
                <div key={idea.id} className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-md">
                  <span className="text-sm flex-1 min-w-0">{idea.title}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {linkedTaskIds.has(idea.id) && (
                      <Badge variant="secondary" className="text-xs">Campaign</Badge>
                    )}
                    <Button 
                      size="icon"
                      variant="ghost"
                      title="Track as Campaign"
                      onClick={() => openTrackDialog(idea)}
                      data-testid={`btn-idea-campaign-${idea.id}`}
                    >
                      <Megaphone className="h-4 w-4 text-blue-500" />
                    </Button>
                    <Button 
                      size="icon"
                      variant="ghost"
                      title="Promote to Task"
                      onClick={() => handlePromoteIdea(idea)}
                      data-testid={`btn-promote-idea-${idea.id}`}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>This Week's Tasks</CardTitle>
          <CardDescription>Turn learnings into action</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No tasks yet. Promote learnings to tasks!
              </p>
            ) : (
              <>
                {openTasks.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">OPEN</p>
                    {openTasks.map(task => (
                      <TaskRow key={task.id} task={task} onStatusChange={handleStatusChange} isLinked={linkedTaskIds.has(task.id)} onTrackAsCampaign={openTrackDialog} />
                    ))}
                  </div>
                )}
                {inProgressTasks.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">IN PROGRESS</p>
                    {inProgressTasks.map(task => (
                      <TaskRow key={task.id} task={task} onStatusChange={handleStatusChange} isLinked={linkedTaskIds.has(task.id)} onTrackAsCampaign={openTrackDialog} />
                    ))}
                  </div>
                )}
                {doneTasks.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">DONE</p>
                    {doneTasks.map(task => (
                      <TaskRow key={task.id} task={task} onStatusChange={handleStatusChange} isLinked={linkedTaskIds.has(task.id)} onTrackAsCampaign={openTrackDialog} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!trackingTask} onOpenChange={(open) => { if (!open) setTrackingTask(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-blue-500" />
              Track as Campaign
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">From task: </span>{trackingTask?.title}
            </div>
            <div>
              <Label>Channel</Label>
              <Select value={trackChannel} onValueChange={setTrackChannel}>
                <SelectTrigger data-testid="select-track-channel" className="mt-1">
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  {channels.map(ch => (
                    <SelectItem key={ch} value={ch}>{ch}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Message / Description</Label>
              <Textarea
                value={trackMessage}
                onChange={(e) => setTrackMessage(e.target.value)}
                className="mt-1"
                data-testid="input-track-message"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrackingTask(null)}>Cancel</Button>
            <Button
              onClick={handleCreateCampaign}
              disabled={!trackChannel || createCampaignMutation.isPending}
              data-testid="btn-confirm-track-campaign"
            >
              <Megaphone className="h-4 w-4 mr-2" />
              Add to Campaign Tracker
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TaskRow({ task, onStatusChange, isLinked, onTrackAsCampaign }: { 
  task: RccTask; 
  onStatusChange: (task: RccTask, status: string) => void;
  isLinked: boolean;
  onTrackAsCampaign: (task: RccTask) => void;
}) {
  return (
    <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md mb-2">
      <span className={`text-sm flex-1 min-w-0 ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
        {task.title}
      </span>
      {isLinked && <Badge variant="secondary" className="text-xs flex-shrink-0">Campaign</Badge>}
      <Button
        size="icon"
        variant="ghost"
        title="Track as Campaign"
        onClick={() => onTrackAsCampaign(task)}
        data-testid={`btn-task-campaign-${task.id}`}
        className="flex-shrink-0"
      >
        <Megaphone className={`h-4 w-4 ${isLinked ? 'text-blue-500' : 'text-muted-foreground'}`} />
      </Button>
      <Select 
        value={task.status} 
        onValueChange={(value) => onStatusChange(task, value)}
      >
        <SelectTrigger className="w-28 h-8 flex-shrink-0" data-testid={`select-task-status-${task.id}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="open">Open</SelectItem>
          <SelectItem value="in_progress">In Progress</SelectItem>
          <SelectItem value="done">Done</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function CampaignsPanel({ weekId, campaigns, allTasks = [] }: { weekId: number; campaigns: RccCampaign[]; allTasks?: RccTask[] }) {
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [channel, setChannel] = useState("");
  const [message, setMessage] = useState("");

  const createMutation = useMutation({
    mutationFn: async (data: { weekId: number; channel: string; message: string }) => {
      return apiRequest("POST", "/api/rcc/campaigns", data);
    },
    onSuccess: () => {
      toast({ title: "Campaign created" });
      setShowAdd(false);
      setChannel("");
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/rcc/campaigns"] });
    },
    onError: (error: any) => {
      toast({ title: "Error creating campaign", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<RccCampaign> }) => {
      return apiRequest("PUT", `/api/rcc/campaigns/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rcc/campaigns"] });
    },
    onError: (error: any) => {
      toast({ title: "Error updating campaign", description: error.message, variant: "destructive" });
    },
  });

  const handleAdd = () => {
    if (!channel.trim()) return;
    createMutation.mutate({ weekId, channel, message });
  };

  const handleStatusChange = (campaign: RccCampaign, status: string) => {
    updateMutation.mutate({ 
      id: campaign.id, 
      data: { 
        status: status as any,
        sentAt: status === 'sent' ? new Date() : campaign.sentAt 
      } 
    });
  };

  const channels = ["Email", "Instagram", "Facebook", "SMS", "In-store", "Newsletter", "Other"];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-blue-500" />
          Campaign Tracker
        </CardTitle>
        <CardDescription>Track marketing efforts and results</CardDescription>
      </CardHeader>
      <CardContent>
        {showAdd ? (
          <div className="space-y-4 mb-4 p-4 border rounded-md">
            <div>
              <Label>Channel</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger data-testid="select-campaign-channel">
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  {channels.map(ch => (
                    <SelectItem key={ch} value={ch}>{ch}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Message / Description</Label>
              <Textarea 
                placeholder="What's the campaign about?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                data-testid="input-campaign-message"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={createMutation.isPending} data-testid="btn-save-campaign">
                Save Campaign
              </Button>
              <Button variant="outline" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setShowAdd(true)} className="mb-4" data-testid="btn-add-campaign">
            <Plus className="h-4 w-4 mr-2" /> Add Campaign
          </Button>
        )}

        <div className="space-y-2">
          {campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No campaigns yet</p>
          ) : (
            campaigns.map(campaign => {
              const linkedTask = campaign.taskId ? allTasks.find(t => t.id === campaign.taskId) : null;
              return (
              <div key={campaign.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{campaign.channel}</Badge>
                    <Badge variant={
                      campaign.status === 'completed' ? 'default' : 
                      campaign.status === 'sent' ? 'secondary' : 
                      'outline'
                    }>
                      {campaign.status}
                    </Badge>
                    {linkedTask && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Tag className="h-3 w-3" /> {linkedTask.title.length > 30 ? linkedTask.title.substring(0, 30) + '…' : linkedTask.title}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm mt-1">{campaign.message?.substring(0, 60)}{campaign.message && campaign.message.length > 60 ? '...' : ''}</p>
                </div>
                <Select 
                  value={campaign.status} 
                  onValueChange={(value) => handleStatusChange(campaign, value)}
                >
                  <SelectTrigger className="w-32 h-8" data-testid={`select-campaign-status-${campaign.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}

type ToastHistoricalData = {
  currentDates: { date: string; dayOfWeek: number; priorYearDate: string }[];
  priorYearData: { revenueDate: string; netRevenue: string; shopifyRevenue: string | null }[];
  priorYearTotal: number;
  priorYearWholesale: Record<string, string>;
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getWeatherIcon(condition: string | null) {
  if (!condition) return <Cloud className="h-4 w-4 text-muted-foreground" />;
  const c = condition.toLowerCase();
  if (c.includes('clear') || c.includes('sunny')) return <Sun className="h-4 w-4 text-yellow-500" />;
  if (c.includes('rain') || c.includes('drizzle')) return <CloudRain className="h-4 w-4 text-blue-500" />;
  if (c.includes('snow')) return <CloudSnow className="h-4 w-4 text-blue-200" />;
  if (c.includes('thunder') || c.includes('storm')) return <CloudLightning className="h-4 w-4 text-purple-500" />;
  if (c.includes('fog')) return <CloudFog className="h-4 w-4 text-gray-400" />;
  if (c.includes('cloud') || c.includes('partly')) return <Cloud className="h-4 w-4 text-gray-500" />;
  return <Cloud className="h-4 w-4 text-muted-foreground" />;
}

export function RevenuePanel({ weekId, week, revenue }: { weekId: number; week: RccWeek; revenue: RccRevenue | null }) {
  const { toast } = useToast();
  const [whatWorked, setWhatWorked] = useState(revenue?.whatWorked || "");
  const [whatFlopped, setWhatFlopped] = useState(revenue?.whatFlopped || "");
  const [weekNotes, setWeekNotes] = useState(revenue?.notes || "");
  const [analysisDetailOpen, setAnalysisDetailOpen] = useState(false);
  const [analysisDetailDate, setAnalysisDetailDate] = useState<string | null>(null);
  const [analysisDetailSource, setAnalysisDetailSource] = useState<"all" | "toast" | "shopify" | "wholesale">("toast");

  // Fetch daily revenue entries for the week
  const { data: dailyRevenue, isLoading: dailyLoading, dataUpdatedAt } = useQuery<RccDailyRevenue[]>({
    queryKey: ["/api/rcc/daily-revenue", weekId],
    queryFn: () => fetch(`/api/rcc/daily-revenue/${weekId}`).then(r => r.json()),
    enabled: !!weekId,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: historicalData } = useQuery<ToastHistoricalData>({
    queryKey: ["/api/rcc/toast-historical/week", weekId],
    queryFn: () => fetch(`/api/rcc/toast-historical/week/${weekId}`).then(r => r.json()),
    enabled: !!weekId,
  });

  const saveWeeklyMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/rcc/revenue", data);
    },
    onSuccess: () => {
      toast({ title: "Week notes saved" });
      queryClient.invalidateQueries({ queryKey: ["/api/rcc/revenue"] });
    },
    onError: (error: any) => {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    },
  });

  const saveDailyMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/rcc/daily-revenue", data);
    },
    onSuccess: () => {
      toast({ title: "Daily entry saved" });
      queryClient.invalidateQueries({ queryKey: ["/api/rcc/daily-revenue", weekId] });
    },
    onError: (error: any) => {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    },
  });

  const fetchWeatherMutation = useMutation({
    mutationFn: async (dateStr: string) => {
      return apiRequest("POST", `/api/rcc/daily-revenue/${dateStr}/fetch-weather`, {});
    },
    onSuccess: () => {
      toast({ title: "Weather fetched" });
      queryClient.invalidateQueries({ queryKey: ["/api/rcc/daily-revenue", weekId] });
    },
    onError: (error: any) => {
      toast({ title: "Error fetching weather", description: error.message, variant: "destructive" });
    },
  });

  const syncToastWeekMutation = useMutation({
    mutationFn: async (data: { weekId: number }) => {
      const res = await apiRequest("POST", "/api/rcc/daily-revenue/sync-toast", data);
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Toast revenue synced", description: data?.message || "Revenue updated from Toast POS" });
      queryClient.invalidateQueries({ queryKey: ["/api/rcc/daily-revenue", weekId] });
      queryClient.invalidateQueries({ queryKey: ["/api/rcc/toast-historical"] });
    },
    onError: (error: any) => {
      toast({ title: "Error syncing Toast revenue", description: error.message, variant: "destructive" });
    },
  });

  const syncToastDayMutation = useMutation({
    mutationFn: async (data: { date: string; weekId: number }) => {
      const res = await apiRequest("POST", "/api/rcc/daily-revenue/sync-toast-date", data);
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Toast revenue synced", description: `$${parseFloat(data?.netSales || 0).toLocaleString('en-US')} from ${data?.orderCount || 0} orders` });
      queryClient.invalidateQueries({ queryKey: ["/api/rcc/daily-revenue", weekId] });
    },
    onError: (error: any) => {
      toast({ title: "Error syncing Toast", description: error.message, variant: "destructive" });
    },
  });

  const syncShopifyWeekMutation = useMutation({
    mutationFn: async (data: { weekId: number }) => {
      const res = await apiRequest("POST", "/api/rcc/daily-revenue/sync-shopify", data);
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Shopify revenue synced", description: data?.message || "Revenue updated from Shopify" });
      queryClient.invalidateQueries({ queryKey: ["/api/rcc/daily-revenue", weekId] });
      queryClient.invalidateQueries({ queryKey: ["/api/rcc/toast-historical"] });
    },
    onError: (error: any) => {
      const isUnavailable = error.message?.includes("503") || error.message?.includes("not available") || error.message?.includes("not installed");
      toast({ 
        title: isUnavailable ? "Shopify not connected" : "Error syncing Shopify revenue", 
        description: isUnavailable ? "Shopify app needs to be installed on your store first. Shopify data can be entered manually." : error.message, 
        variant: isUnavailable ? "default" : "destructive" 
      });
    },
  });

  const syncShopifyDayMutation = useMutation({
    mutationFn: async (data: { date: string; weekId: number }) => {
      const res = await apiRequest("POST", "/api/rcc/daily-revenue/sync-shopify-date", data);
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Shopify revenue synced", description: `$${parseFloat(data?.netSales || 0).toLocaleString('en-US')} from ${data?.orderCount || 0} orders` });
      queryClient.invalidateQueries({ queryKey: ["/api/rcc/daily-revenue", weekId] });
    },
    onError: (error: any) => {
      const isUnavailable = error.message?.includes("503") || error.message?.includes("not available") || error.message?.includes("not installed");
      toast({ 
        title: isUnavailable ? "Shopify not connected" : "Error syncing Shopify", 
        description: isUnavailable ? "Shopify app needs to be installed on your store first. You can enter Shopify revenue manually." : error.message, 
        variant: isUnavailable ? "default" : "destructive" 
      });
    },
  });

  const syncWholesaleDayMutation = useMutation({
    mutationFn: async (data: { date: string; weekId: number }) => {
      const res = await apiRequest("POST", "/api/rcc/daily-revenue/sync-wholesale-date", data);
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Wholesale revenue synced", description: `$${parseFloat(data?.wholesaleRevenue || 0).toLocaleString('en-US')} from B2B orders` });
      queryClient.invalidateQueries({ queryKey: ["/api/rcc/daily-revenue", weekId] });
    },
    onError: () => toast({ title: "Error syncing wholesale", description: "Failed to sync B2B wholesale revenue", variant: "destructive" }),
  });

  // Auto-sync Toast revenue on page open when stale data is detected (once per weekId)
  const hasAutoSyncedRef = useRef(false);
  useEffect(() => { hasAutoSyncedRef.current = false; }, [weekId]);
  useEffect(() => {
    if (hasAutoSyncedRef.current) return;
    if (!dailyRevenue || dailyRevenue.length === 0) return;
    const today = new Date().toISOString().split('T')[0];
    const hasStaleDays = dailyRevenue.some(d =>
      d.date <= today && (!d.toastRevenue || d.toastRevenue === '0' || d.toastRevenue === '0.00')
    );
    if (!hasStaleDays) return;
    hasAutoSyncedRef.current = true;
    syncToastWeekMutation.mutate({ weekId });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyRevenue, weekId]);

  // Auto-refetch if stale days are detected (background server sync may still be running)
  const autoRefetchCountRef = useRef(0);
  const autoRefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    autoRefetchCountRef.current = 0;
    if (autoRefetchTimerRef.current) {
      clearTimeout(autoRefetchTimerRef.current);
      autoRefetchTimerRef.current = null;
    }
  }, [weekId]);

  useEffect(() => {
    if (!dailyRevenue || autoRefetchCountRef.current >= 3) return;
    const today = new Date().toISOString().split('T')[0];
    const hasStaleDays = dailyRevenue.some(d =>
      d.date <= today && (!d.toastRevenue || d.toastRevenue === '0' || d.toastRevenue === '0.00')
    );
    if (!hasStaleDays) return;
    if (autoRefetchTimerRef.current) return;
    autoRefetchTimerRef.current = setTimeout(() => {
      autoRefetchTimerRef.current = null;
      autoRefetchCountRef.current += 1;
      queryClient.invalidateQueries({ queryKey: ["/api/rcc/daily-revenue", weekId] });
    }, 10000);
    return () => {
      if (autoRefetchTimerRef.current) {
        clearTimeout(autoRefetchTimerRef.current);
        autoRefetchTimerRef.current = null;
      }
    };
  }, [dataUpdatedAt, weekId]);

  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    try {
      await syncToastWeekMutation.mutateAsync({ weekId });
      await syncShopifyWeekMutation.mutateAsync({ weekId });
    } catch {
      // individual mutations already show error toasts
    } finally {
      setIsSyncingAll(false);
    }
  };

  const lastUpdatedLabel = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : null;

  // Guard against missing week data (after all hooks)
  if (!week?.weekStart) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No week selected</p>
      </div>
    );
  }

  // Generate days of the week from week start/end
  const weekDays: { date: string; dayOfWeek: number; displayDate: string }[] = [];
  const startDate = parseISO(week.weekStart);
  for (let i = 0; i < 7; i++) {
    const day = addDays(startDate, i);
    weekDays.push({
      date: format(day, 'yyyy-MM-dd'),
      dayOfWeek: day.getDay(),
      displayDate: format(day, 'EEE, MMM d'),
    });
  }

  // Map daily revenue by date
  const dailyMap = new Map<string, RccDailyRevenue>();
  dailyRevenue?.forEach(d => dailyMap.set(d.date, d));

  const handleSaveWeekNotes = () => {
    saveWeeklyMutation.mutate({
      weekId,
      toastTotal: null,
      shopifyTotal: null,
      otherTotal: null,
      notes: weekNotes,
      whatWorked,
      whatFlopped,
    });
  };

  // Calculate weekly totals from daily entries
  const weeklyTotals = {
    toast: dailyRevenue?.reduce((sum, d) => sum + parseFloat(d.toastRevenue || '0'), 0) || 0,
    shopify: dailyRevenue?.reduce((sum, d) => sum + parseFloat(d.shopifyRevenue || '0'), 0) || 0,
    wholesale: dailyRevenue?.reduce((sum, d) => sum + parseFloat(d.wholesaleRevenue || '0'), 0) || 0,
    other: dailyRevenue?.reduce((sum, d) => sum + parseFloat(d.otherRevenue || '0'), 0) || 0,
  };
  const grandTotal = weeklyTotals.toast + weeklyTotals.shopify + weeklyTotals.wholesale + weeklyTotals.other;

  const weeklyDiscountVoidSummary = {
    grossSales: dailyRevenue?.reduce((sum, d) => sum + parseFloat(d.toastGrossSales || '0'), 0) || 0,
    discounts: dailyRevenue?.reduce((sum, d) => sum + parseFloat(d.toastDiscountAmount || '0'), 0) || 0,
    voids: dailyRevenue?.reduce((sum, d) => sum + parseFloat(d.toastVoidAmount || '0'), 0) || 0,
    voidCount: dailyRevenue?.reduce((sum, d) => sum + (d.toastVoidCount || 0), 0) || 0,
    serviceCharges: dailyRevenue?.reduce((sum, d) => sum + parseFloat(d.toastServiceCharges || '0'), 0) || 0,
    flaggedDays: dailyRevenue?.filter(d => parseFloat(d.toastDiscountPct || '0') > 10 || parseFloat(d.toastVoidAmount || '0') > 50).length || 0,
  };
  const weeklyDiscountPct = weeklyDiscountVoidSummary.grossSales > 0 
    ? (weeklyDiscountVoidSummary.discounts / weeklyDiscountVoidSummary.grossSales) * 100 
    : 0;
  const weeklyVoidPct = weeklyDiscountVoidSummary.grossSales > 0
    ? (weeklyDiscountVoidSummary.voids / weeklyDiscountVoidSummary.grossSales) * 100
    : 0;
  const todayDateStr = new Date().toISOString().split('T')[0];

  const analysisDate = weekDays
    .map(d => d.date)
    .filter(date => date <= todayDateStr)
    .sort()
    .slice(-1)[0] || weekDays[0]?.date;

  const analysisEntry = analysisDate ? dailyMap.get(analysisDate) : undefined;
  const analysisDateLabel = analysisDate
    ? weekDays.find(d => d.date === analysisDate)?.displayDate || analysisDate
    : null;
  const todayDiscountPct = parseFloat(analysisEntry?.toastDiscountPct || '0');
  const todayGrossSales = parseFloat(analysisEntry?.toastGrossSales || '0');
  const todayVoidAmount = parseFloat(analysisEntry?.toastVoidAmount || '0');
  const todayVoidPct = todayGrossSales > 0 ? (todayVoidAmount / todayGrossSales) * 100 : 0;

  const { data: ytdDiscountVoidStats } = useQuery<{
    throughDate: string;
    daysWithSales: number;
    totalGross: number;
    totalDiscountAmount: number;
    totalVoidAmount: number;
    discountPctWeighted: number;
    voidPctWeighted: number;
    discountPctStdDev: number;
    voidPctStdDev: number;
  }>({
    queryKey: ["/api/rcc/daily-revenue/ytd-discount-void", { date: analysisDate }],
    queryFn: async () => {
      const res = await fetch(`/api/rcc/daily-revenue/ytd-discount-void?date=${analysisDate}`);
      if (!res.ok) throw new Error("Failed to load YTD discount/void analysis");
      return res.json();
    },
    enabled: !!analysisDate,
  });

  const weekRiskRows = weekDays
    .map(day => {
      const row = dailyMap.get(day.date);
      const gross = parseFloat(row?.toastGrossSales || '0');
      const discountPct = parseFloat(row?.toastDiscountPct || '0');
      const voidPct = gross > 0 ? (parseFloat(row?.toastVoidAmount || '0') / gross) * 100 : 0;
      return { day, gross, discountPct, voidPct };
    })
    .filter(row => row.gross > 0);

  const findLargestOutlier = (
    values: Array<{ day: { date: string; displayDate: string }; value: number }>,
    baseline: number
  ) => {
    if (values.length === 0) return null;
    return [...values]
      .sort((a, b) => Math.abs(b.value - baseline) - Math.abs(a.value - baseline))[0];
  };

  const topDiscountOutlier = ytdDiscountVoidStats
    ? findLargestOutlier(
        weekRiskRows.map(row => ({ day: row.day, value: row.discountPct })),
        ytdDiscountVoidStats.discountPctWeighted
      )
    : null;
  const topVoidOutlier = ytdDiscountVoidStats
    ? findLargestOutlier(
        weekRiskRows.map(row => ({ day: row.day, value: row.voidPct })),
        ytdDiscountVoidStats.voidPctWeighted
      )
    : null;

  const isTodayVoidUnusual = ytdDiscountVoidStats
    ? Math.abs(todayVoidPct - ytdDiscountVoidStats.voidPctWeighted) > Math.max(0.25, ytdDiscountVoidStats.voidPctStdDev * 2)
    : false;
  const isTodayDiscountUnusual = ytdDiscountVoidStats
    ? Math.abs(todayDiscountPct - ytdDiscountVoidStats.discountPctWeighted) > Math.max(0.5, ytdDiscountVoidStats.discountPctStdDev * 1.5)
    : false;

  const openAnalysisDetail = (date: string, source: "all" | "toast" | "shopify" | "wholesale") => {
    setAnalysisDetailDate(date);
    setAnalysisDetailSource(source);
    setAnalysisDetailOpen(true);
  };

  const priorYearMap = new Map<string, { toast: number; shopify: number; wholesale: number; other: number; total: number }>();
  historicalData?.priorYearData?.forEach(d => {
    const toast = parseFloat(d.netRevenue || '0');
    const shopify = parseFloat(d.shopifyRevenue || '0');
    const other = parseFloat((d as any).otherRevenue || '0');
    const wholesale = parseFloat(historicalData?.priorYearWholesale?.[d.revenueDate] || '0');
    priorYearMap.set(d.revenueDate, { toast, shopify, wholesale, other, total: toast + shopify + wholesale + other });
  });
  if (historicalData?.priorYearWholesale) {
    Object.entries(historicalData.priorYearWholesale).forEach(([date, amount]) => {
      if (!priorYearMap.has(date)) {
        const wholesale = parseFloat(amount || '0');
        priorYearMap.set(date, { toast: 0, shopify: 0, wholesale, other: 0, total: wholesale });
      }
    });
  }

  const hasStaleDays = dailyRevenue?.some(d =>
    d.date <= todayDateStr && (!d.toastRevenue || d.toastRevenue === '0' || d.toastRevenue === '0.00')
  ) ?? false;
  const isAutoRefetchPending = hasStaleDays && autoRefetchCountRef.current < 3;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            Daily Revenue Tracking
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm text-muted-foreground">Track revenue and weather for each day of the week</p>
            {isAutoRefetchPending && (
              <Badge variant="outline" className="text-[10px] gap-1" data-testid="badge-syncing-background">
                <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                Syncing...
              </Badge>
            )}
            {lastUpdatedLabel && !isAutoRefetchPending && (
              <span className="text-xs text-muted-foreground" data-testid="text-last-synced">
                Updated {lastUpdatedLabel}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="default"
            size="sm"
            onClick={handleSyncAll}
            disabled={isSyncingAll || syncToastWeekMutation.isPending || syncShopifyWeekMutation.isPending}
            data-testid="btn-sync-all-week"
          >
            {isSyncingAll ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncToastWeekMutation.mutate({ weekId })}
            disabled={syncToastWeekMutation.isPending || isSyncingAll}
            data-testid="btn-sync-toast-week"
          >
            {syncToastWeekMutation.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Toast
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncShopifyWeekMutation.mutate({ weekId })}
            disabled={syncShopifyWeekMutation.isPending || isSyncingAll}
            data-testid="btn-sync-shopify-week"
          >
            {syncShopifyWeekMutation.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Shopify
          </Button>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Weekly Total</p>
            <p className="text-2xl font-bold text-green-600">${grandTotal.toLocaleString('en-US')}</p>
          </div>
          {historicalData && historicalData.priorYearTotal > 0 && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">vs Prior Year</p>
              {(() => {
                const pctChange = ((grandTotal - historicalData.priorYearTotal) / historicalData.priorYearTotal) * 100;
                const isPositive = pctChange >= 0;
                return (
                  <>
                    <p className={`text-lg font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {isPositive ? '+' : ''}{pctChange.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">PY: ${historicalData.priorYearTotal.toLocaleString('en-US')}</p>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {(weeklyDiscountVoidSummary.discounts > 0 || weeklyDiscountVoidSummary.voids > 0) && (
        <div className="flex items-center gap-4 flex-wrap text-sm" data-testid="weekly-discount-void-summary">
          {weeklyDiscountVoidSummary.discounts > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Wk Discounts:</span>
              <span className={weeklyDiscountPct > 10 ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                ${weeklyDiscountVoidSummary.discounts.toLocaleString('en-US')} ({weeklyDiscountPct.toFixed(1)}%)
              </span>
            </div>
          )}
          {weeklyDiscountVoidSummary.voids > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Wk Voids:</span>
              <span className={weeklyDiscountVoidSummary.voids > 200 ? 'text-orange-600 dark:text-orange-400 font-medium' : ''}>
                ${weeklyDiscountVoidSummary.voids.toLocaleString('en-US')} ({weeklyDiscountVoidSummary.voidCount})
              </span>
            </div>
          )}
          {weeklyDiscountVoidSummary.serviceCharges > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Svc Charges:</span>
              <span>${weeklyDiscountVoidSummary.serviceCharges.toLocaleString('en-US')}</span>
            </div>
          )}
          {weeklyDiscountVoidSummary.flaggedDays > 0 && (
            <Badge variant="destructive" className="text-[10px]" data-testid="flagged-days-count">
              <AlertCircle className="h-3 w-3 mr-0.5" />
              {weeklyDiscountVoidSummary.flaggedDays} day{weeklyDiscountVoidSummary.flaggedDays > 1 ? 's' : ''} flagged
            </Badge>
          )}
        </div>
      )}

      {ytdDiscountVoidStats && analysisDateLabel && (
        <Card data-testid="card-weekly-discount-void-analysis">
          <CardContent className="pt-4 pb-4 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-sm font-medium">Discount & Void Analysis (YTD Baseline vs {analysisDateLabel})</p>
              <Badge variant={isTodayVoidUnusual ? "destructive" : "outline"}>
                {isTodayVoidUnusual ? "Void anomaly detected" : "Within expected range"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              YTD discount rate is <span className="font-medium text-foreground">{ytdDiscountVoidStats.discountPctWeighted.toFixed(2)}%</span> and
              this week is <span className="font-medium text-foreground">{weeklyDiscountPct.toFixed(2)}%</span>. {analysisDateLabel} is
              <span className={`font-medium ${isTodayDiscountUnusual ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}> {todayDiscountPct.toFixed(2)}%</span>
              {isTodayDiscountUnusual ? " which is unusual versus YTD." : " which tracks close to YTD."}
            </p>
            <p className="text-sm text-muted-foreground">
              YTD void rate is <span className="font-medium text-foreground">{ytdDiscountVoidStats.voidPctWeighted.toFixed(2)}%</span> and
              this week is <span className="font-medium text-foreground">{weeklyVoidPct.toFixed(2)}%</span>. {analysisDateLabel} is
              <span className={`font-medium ${isTodayVoidUnusual ? "text-red-600 dark:text-red-400" : "text-foreground"}`}> {todayVoidPct.toFixed(2)}%</span>
              {isTodayVoidUnusual ? " and should be reviewed for unusual void activity." : " and is not showing an unusual spike."}
            </p>
            {(topVoidOutlier || topDiscountOutlier) && (
              <p className="text-xs text-muted-foreground">
                Biggest weekly outlier:
                {topVoidOutlier && ` voids on ${topVoidOutlier.day.displayDate} (${topVoidOutlier.value.toFixed(2)}%)`}
                {topVoidOutlier && topDiscountOutlier && ","}
                {topDiscountOutlier && ` discounts on ${topDiscountOutlier.day.displayDate} (${topDiscountOutlier.value.toFixed(2)}%)`}.
              </p>
            )}
            {(isTodayVoidUnusual || topVoidOutlier || topDiscountOutlier) && (
              <div className="flex items-center gap-2 flex-wrap">
                {isTodayVoidUnusual && analysisDate && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => openAnalysisDetail(analysisDate, "toast")}
                    data-testid="button-open-void-anomaly-detail"
                  >
                    Review Void Anomaly
                  </Button>
                )}
                {topVoidOutlier && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openAnalysisDetail(topVoidOutlier.day.date, "toast")}
                    data-testid="button-open-top-void-outlier"
                  >
                    Open {topVoidOutlier.day.displayDate} Void Detail
                  </Button>
                )}
                {topDiscountOutlier && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openAnalysisDetail(topDiscountOutlier.day.date, "toast")}
                    data-testid="button-open-top-discount-outlier"
                  >
                    Open {topDiscountOutlier.day.displayDate} Discount Detail
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {weekDays.map((day) => {
          const entry = dailyMap.get(day.date);
          return (
            <DailyRevenueRow
              key={day.date}
              day={day}
              entry={entry}
              weekId={weekId}
              priorYearRevenue={priorYearMap.get(historicalData?.currentDates?.find(c => c.date === day.date)?.priorYearDate || '') || null}
              priorYearDate={historicalData?.currentDates?.find(c => c.date === day.date)?.priorYearDate || null}
              onSave={(data) => saveDailyMutation.mutate(data)}
              onFetchWeather={() => fetchWeatherMutation.mutate(day.date)}
              onSyncToast={() => syncToastDayMutation.mutate({ date: day.date, weekId })}
              onSyncShopify={() => syncShopifyDayMutation.mutate({ date: day.date, weekId })}
              onSyncWholesale={() => syncWholesaleDayMutation.mutate({ date: day.date, weekId })}
              isSaving={saveDailyMutation.isPending}
              isFetchingWeather={fetchWeatherMutation.isPending}
              isSyncingToast={syncToastDayMutation.isPending}
              isSyncingShopify={syncShopifyDayMutation.isPending}
              isSyncingWholesale={syncWholesaleDayMutation.isPending}
            />
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Summary</CardTitle>
          <CardDescription>Overall notes for the week</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="worked" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" /> What Worked
              </Label>
              <Textarea 
                id="worked"
                placeholder="What drove revenue this week?"
                value={whatWorked}
                onChange={(e) => setWhatWorked(e.target.value)}
                data-testid="input-what-worked"
              />
            </div>
            <div>
              <Label htmlFor="flopped" className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" /> What Flopped
              </Label>
              <Textarea 
                id="flopped"
                placeholder="What didn't work as expected?"
                value={whatFlopped}
                onChange={(e) => setWhatFlopped(e.target.value)}
                data-testid="input-what-flopped"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="weekNotes">Additional Notes</Label>
            <Textarea 
              id="weekNotes"
              placeholder="Other observations..."
              value={weekNotes}
              onChange={(e) => setWeekNotes(e.target.value)}
              data-testid="input-week-notes"
            />
          </div>
          <Button onClick={handleSaveWeekNotes} disabled={saveWeeklyMutation.isPending} className="w-full" data-testid="btn-save-week-notes">
            Save Weekly Notes
          </Button>
        </CardContent>
      </Card>

      {analysisDetailDate && (
        <RevenueDetailDialog
          open={analysisDetailOpen}
          onOpenChange={setAnalysisDetailOpen}
          date={analysisDetailDate}
          displayDate={weekDays.find(d => d.date === analysisDetailDate)?.displayDate || analysisDetailDate}
          toastRevenue={dailyMap.get(analysisDetailDate)?.toastRevenue || null}
          shopifyRevenue={dailyMap.get(analysisDetailDate)?.shopifyRevenue || null}
          wholesaleRevenue={dailyMap.get(analysisDetailDate)?.wholesaleRevenue || null}
          sourceFilter={analysisDetailSource}
        />
      )}
    </div>
  );
}

function DailyRevenueRow({
  day,
  entry,
  weekId,
  priorYearRevenue,
  priorYearDate,
  onSave,
  onFetchWeather,
  onSyncToast,
  onSyncShopify,
  onSyncWholesale,
  isSaving,
  isFetchingWeather,
  isSyncingToast,
  isSyncingShopify,
  isSyncingWholesale,
}: {
  day: { date: string; dayOfWeek: number; displayDate: string };
  entry: RccDailyRevenue | undefined;
  weekId: number;
  priorYearRevenue: { toast: number; shopify: number; wholesale: number; other: number; total: number } | null;
  priorYearDate: string | null;
  onSave: (data: any) => void;
  onFetchWeather: () => void;
  onSyncToast: () => void;
  onSyncShopify: () => void;
  onSyncWholesale: () => void;
  isSaving: boolean;
  isFetchingWeather: boolean;
  isSyncingToast: boolean;
  isSyncingShopify: boolean;
  isSyncingWholesale: boolean;
}) {
  const { toast } = useToast();
  const [toastRev, setToastRev] = useState(entry?.toastRevenue || "");
  const [shopifyRev, setShopifyRev] = useState(entry?.shopifyRevenue || "");
  const [otherRev, setOtherRev] = useState(entry?.otherRevenue || "");
  const [otherSource, setOtherSource] = useState(entry?.otherRevenueSource || "");
  const [notes, setNotes] = useState(entry?.notes || "");
  const [expanded, setExpanded] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailSourceFilter, setDetailSourceFilter] = useState<"all" | "toast" | "shopify" | "wholesale">("all");
  const [expandedDiscounts, setExpandedDiscounts] = useState(false);
  const [expandedVoids, setExpandedVoids] = useState(false);

  interface VDRecord {
    id: number;
    record_type: "void" | "discount";
    level: string;
    order_number: string | null;
    item_name: string | null;
    amount: string;
    discount_name: string | null;
    discount_reason_name: string | null;
    discount_reason_comment: string | null;
    revenue_center_name: string | null;
    occurred_at: string | null;
    explanation: string | null;
    explained_by_name: string | null;
  }

  const { data: voidDiscountRecords = [], isLoading: vdLoading } = useQuery<VDRecord[]>({
    queryKey: ["/api/revenue-detail/voids-discounts", day.date],
    queryFn: async () => {
      const res = await fetch(`/api/revenue-detail/voids-discounts?date=${day.date}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: expandedDiscounts || expandedVoids,
  });

  const voidRecords = voidDiscountRecords.filter(r => r.record_type === "void");
  const discountRecords = voidDiscountRecords.filter(r => r.record_type === "discount");

  const discountsByName = discountRecords.reduce((acc, d) => {
    const name = d.discount_name || "Other";
    if (!acc[name]) acc[name] = { items: [] as VDRecord[], total: 0 };
    acc[name].items.push(d);
    acc[name].total += parseFloat(d.amount || "0");
    return acc;
  }, {} as Record<string, { items: VDRecord[]; total: number }>);

  const sortedDiscountGroups = Object.entries(discountsByName).sort(
    ([, a], [, b]) => b.total - a.total
  );

  const syncDetailMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/revenue-detail/sync-detail", { date: day.date, source: "toast" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/revenue-detail/voids-discounts", day.date] });
      queryClient.invalidateQueries({ queryKey: ["/api/rcc/daily-revenue"] });
      toast({ title: "Detail synced", description: `Discount & void details refreshed for ${day.date}` });
    },
    onError: () => {
      toast({ title: "Sync failed", description: "Could not fetch discount details from Toast", variant: "destructive" });
    },
  });

  const hd = new Holidays('US');
  const holidays = hd.isHoliday(new Date(day.date + 'T12:00:00'));
  const holidayName = Array.isArray(holidays) ? holidays.map(h => h.name).join(', ') : null;

  // Sync local state when entry changes (after save or weather fetch)
  useEffect(() => {
    setToastRev(entry?.toastRevenue || "");
    setShopifyRev(entry?.shopifyRevenue || "");
    setOtherRev(entry?.otherRevenue || "");
    setOtherSource(entry?.otherRevenueSource || "");
    setNotes(entry?.notes || "");
  }, [entry?.id, entry?.toastRevenue, entry?.shopifyRevenue, entry?.otherRevenue, entry?.otherRevenueSource, entry?.notes]);

  const wholesaleRev = entry?.wholesaleRevenue || "";
  const dayTotal = parseFloat(toastRev || '0') + parseFloat(shopifyRev || '0') + parseFloat(wholesaleRev || '0') + parseFloat(otherRev || '0');
  const hasWeather = entry?.weatherHigh !== null && entry?.weatherHigh !== undefined;

  const handleSave = () => {
    onSave({
      weekId,
      date: day.date,
      dayOfWeek: day.dayOfWeek,
      toastRevenue: toastRev || null,
      shopifyRevenue: shopifyRev || null,
      otherRevenue: otherRev || null,
      otherRevenueSource: otherSource || null,
      wholesaleRevenue: entry?.wholesaleRevenue || null,
      notes,
    });
  };

  return (
    <Card className={expanded ? "ring-1 ring-primary/20" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="text-muted-foreground"
              data-testid={`btn-expand-${day.date}`}
            >
              {expanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
            <div>
              <p className="font-medium">{day.displayDate}</p>
              {hasWeather && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {getWeatherIcon(entry?.weatherCondition || null)}
                  <span>{entry?.weatherHigh}°/{entry?.weatherLow}°F</span>
                  {entry?.weatherCondition && <span>• {entry.weatherCondition}</span>}
                  {entry?.weatherPrecipitation && parseFloat(entry.weatherPrecipitation) > 0 && (
                    <span>• {entry.weatherPrecipitation}mm</span>
                  )}
                </div>
              )}
              {holidayName && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Gift className="h-3 w-3 text-orange-500" />
                  <span className="text-[10px] font-medium text-orange-600 uppercase tracking-wider">{holidayName}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {!expanded && (
              <>
                <div
                  className="text-right cursor-pointer hover-elevate rounded-md px-2 py-1"
                  onClick={() => { setDetailSourceFilter("toast"); setDetailDialogOpen(true); }}
                  title="Click for Toast POS breakdown"
                  data-testid={`btn-detail-toast-${day.date}`}
                >
                  <p className="text-xs text-muted-foreground">Toast</p>
                  <p className="font-medium">${parseFloat(toastRev || '0').toLocaleString('en-US')}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setDetailSourceFilter("toast"); setDetailDialogOpen(true); }}
                  data-testid={`btn-toast-detail-quick-${day.date}`}
                >
                  Toast Details
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setDetailSourceFilter("shopify"); setDetailDialogOpen(true); }}
                  data-testid={`btn-shopify-detail-quick-${day.date}`}
                >
                  Shopify Details
                </Button>
                {(() => {
                  const discPct = parseFloat(entry?.toastDiscountPct || '0');
                  const voidAmt = parseFloat(entry?.toastVoidAmount || '0');
                  const voidCount = entry?.toastVoidCount || 0;
                  const hasDiscountFlag = discPct > 10;
                  const hasVoidFlag = voidAmt > 50;
                  if (!hasDiscountFlag && !hasVoidFlag) return null;
                  return (
                    <div className="flex flex-col gap-0.5" data-testid={`flags-${day.date}`}>
                      {hasDiscountFlag && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0" data-testid={`flag-discount-${day.date}`}>
                          <AlertCircle className="h-3 w-3 mr-0.5" />
                          {discPct.toFixed(1)}% disc
                        </Badge>
                      )}
                      {hasVoidFlag && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-400 text-orange-600 dark:text-orange-400" data-testid={`flag-void-${day.date}`}>
                          <AlertCircle className="h-3 w-3 mr-0.5" />
                          ${voidAmt.toLocaleString('en-US')} void ({voidCount})
                        </Badge>
                      )}
                    </div>
                  );
                })()}
                <div
                  className="text-right cursor-pointer hover-elevate rounded-md px-2 py-1"
                  onClick={() => { setDetailSourceFilter("all"); setDetailDialogOpen(true); }}
                  title="Click for combined revenue breakdown"
                  data-testid={`btn-detail-total-${day.date}`}
                >
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-bold text-green-600">${dayTotal.toLocaleString('en-US')}</p>
                </div>
              </>
            )}
            {!hasWeather && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onFetchWeather}
                disabled={isFetchingWeather}
                title="Fetch weather"
                data-testid={`btn-fetch-weather-${day.date}`}
              >
                {isFetchingWeather ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Thermometer className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-testid={`py-comparison-${day.date}`}>
              <div className="space-y-1">
                <Label className="flex items-center gap-1">
                  Toast POS
                  <Badge variant="secondary" className="text-[10px] px-1 py-0">Auto</Badge>
                </Label>
                <div className="flex gap-1">
                  <div
                    className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm cursor-pointer hover-elevate items-center"
                    onClick={() => { setDetailSourceFilter("toast"); setDetailDialogOpen(true); }}
                    title="Click for Toast POS breakdown"
                    data-testid={`input-toast-${day.date}`}
                  >
                    {toastRev ? parseFloat(toastRev).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "Auto-synced"}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onSyncToast}
                    disabled={isSyncingToast}
                    title="Refresh from Toast POS"
                    data-testid={`btn-sync-toast-${day.date}`}
                  >
                    {isSyncingToast ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  </Button>
                </div>
                {priorYearRevenue !== null && priorYearRevenue.total > 0 && (
                  <div className="pt-1">
                    <p className="text-xs text-muted-foreground">PY Toast{priorYearDate ? ` (${priorYearDate})` : ''}</p>
                    <p className="text-xs font-medium">${priorYearRevenue.toast.toLocaleString('en-US')}</p>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1"
                  onClick={() => { setDetailSourceFilter("toast"); setDetailDialogOpen(true); }}
                  data-testid={`btn-toast-detail-${day.date}`}
                >
                  View Toast Categories & Items
                </Button>
                {(parseFloat(entry?.toastDiscountPct || '0') > 0 || (entry?.toastVoidCount || 0) > 0) && (
                  <div className="pt-1 space-y-0.5" data-testid={`detail-flags-${day.date}`}>
                    {parseFloat(entry?.toastGrossSales || '0') > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Gross: ${parseFloat(entry?.toastGrossSales || '0').toLocaleString('en-US')}
                      </p>
                    )}
                    {parseFloat(entry?.toastDiscountAmount || '0') > 0 && (
                      <button
                        className={`flex items-center gap-1 text-xs cursor-pointer ${parseFloat(entry?.toastDiscountPct || '0') > 10 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground'}`}
                        onClick={() => setExpandedDiscounts(!expandedDiscounts)}
                        data-testid={`link-discount-detail-${day.date}`}
                      >
                        <Tag className="h-3 w-3" />
                        Discounts: ${parseFloat(entry?.toastDiscountAmount || '0').toLocaleString('en-US')} ({parseFloat(entry?.toastDiscountPct || '0').toFixed(1)}%)
                        {expandedDiscounts ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    )}
                    {expandedDiscounts && (
                      <div className="pl-1 pt-1 pb-1 space-y-1.5 border-l-2 border-blue-200 dark:border-blue-800 ml-1">
                        {vdLoading ? (
                          <p className="text-[11px] text-muted-foreground pl-2">Loading...</p>
                        ) : sortedDiscountGroups.length > 0 ? sortedDiscountGroups.map(([name, group]) => (
                          <div key={name} className="space-y-0.5">
                            <div className="flex items-center justify-between gap-2 flex-wrap pl-2">
                              <span className="text-xs font-medium">{name} <span className="text-muted-foreground">({group.items.length}x)</span></span>
                              <span className="text-xs font-semibold">${group.total.toFixed(2)}</span>
                            </div>
                            <div className="space-y-0.5 pl-4">
                              {group.items.map(d => (
                                <div key={d.id} className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground" data-testid={`discount-inline-${d.id}`}>
                                  <span className="truncate">
                                    {d.order_number ? `#${d.order_number}` : ""}{d.item_name ? ` ${d.item_name}` : ""}
                                    {d.discount_reason_name ? ` — ${d.discount_reason_name}` : ""}
                                  </span>
                                  <span className="whitespace-nowrap">${parseFloat(d.amount).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )) : (
                          <div className="flex items-center gap-2 pl-2 flex-wrap">
                            <p className="text-[11px] text-muted-foreground">No discount details available</p>
                            <button
                              className="text-[11px] text-primary hover-elevate px-1.5 py-0.5 rounded-md flex items-center gap-1"
                              onClick={() => syncDetailMutation.mutate()}
                              disabled={syncDetailMutation.isPending}
                              data-testid={`button-sync-discount-detail-${day.date}`}
                            >
                              <RefreshCw className={`h-3 w-3 ${syncDetailMutation.isPending ? 'animate-spin' : ''}`} />
                              {syncDetailMutation.isPending ? "Syncing..." : "Sync from Toast"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    {parseFloat(entry?.toastServiceCharges || '0') > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Svc Charges: ${parseFloat(entry?.toastServiceCharges || '0').toLocaleString('en-US')}
                      </p>
                    )}
                    {(entry?.toastVoidCount || 0) > 0 && (
                      <button
                        className={`flex items-center gap-1 text-xs cursor-pointer ${parseFloat(entry?.toastVoidAmount || '0') > 50 ? 'text-orange-600 dark:text-orange-400 font-medium' : 'text-muted-foreground'}`}
                        onClick={() => setExpandedVoids(!expandedVoids)}
                        data-testid={`link-void-detail-${day.date}`}
                      >
                        <Ban className="h-3 w-3" />
                        Voids: ${parseFloat(entry?.toastVoidAmount || '0').toLocaleString('en-US')} ({entry?.toastVoidCount} items)
                        {expandedVoids ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    )}
                    {expandedVoids && (
                      <div className="pl-1 pt-1 pb-1 space-y-1.5 border-l-2 border-orange-200 dark:border-orange-800 ml-1">
                        {vdLoading ? (
                          <p className="text-[11px] text-muted-foreground pl-2">Loading...</p>
                        ) : voidRecords.length > 0 ? voidRecords.map(v => (
                          <div key={v.id} className="space-y-0.5 pl-2" data-testid={`void-inline-${v.id}`}>
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge variant="destructive" className="text-[10px] px-1 py-0">
                                  {v.level === "order" ? "Order" : v.level === "check" ? "Check" : "Item"}
                                </Badge>
                                {v.order_number && <span className="text-[11px] text-muted-foreground">#{v.order_number}</span>}
                                {v.revenue_center_name && v.revenue_center_name !== "Uncategorized" && (
                                  <span className="text-[11px] text-muted-foreground">{v.revenue_center_name}</span>
                                )}
                              </div>
                              <span className="text-xs font-semibold text-destructive">${parseFloat(v.amount).toFixed(2)}</span>
                            </div>
                            {v.item_name && <p className="text-[11px]">{v.item_name}</p>}
                            {v.occurred_at && (
                              <p className="text-[11px] text-muted-foreground">{format(new Date(v.occurred_at), "h:mm a")}</p>
                            )}
                            {v.explanation ? (
                              <p className="text-[11px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">
                                {v.explanation}
                              </p>
                            ) : (
                              <p className="text-[11px] text-amber-600 flex items-center gap-0.5">
                                <AlertTriangle className="h-2.5 w-2.5" /> No explanation
                              </p>
                            )}
                          </div>
                        )) : (
                          <div className="flex items-center gap-2 pl-2 flex-wrap">
                            <p className="text-[11px] text-muted-foreground">No void details available</p>
                            <button
                              className="text-[11px] text-primary hover-elevate px-1.5 py-0.5 rounded-md flex items-center gap-1"
                              onClick={() => syncDetailMutation.mutate()}
                              disabled={syncDetailMutation.isPending}
                              data-testid={`button-sync-void-detail-${day.date}`}
                            >
                              <RefreshCw className={`h-3 w-3 ${syncDetailMutation.isPending ? 'animate-spin' : ''}`} />
                              {syncDetailMutation.isPending ? "Syncing..." : "Sync from Toast"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label>Shopify</Label>
                <div className="flex gap-1">
                  <div
                    className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm cursor-pointer hover-elevate items-center"
                    onClick={() => { setDetailSourceFilter("shopify"); setDetailDialogOpen(true); }}
                    title="Click for Shopify breakdown"
                    data-testid={`input-shopify-${day.date}`}
                  >
                    {shopifyRev ? parseFloat(shopifyRev).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "Auto-synced"}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onSyncShopify}
                    disabled={isSyncingShopify}
                    title="Refresh from Shopify"
                    data-testid={`btn-sync-shopify-${day.date}`}
                  >
                    {isSyncingShopify ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  </Button>
                </div>
                {priorYearRevenue !== null && priorYearRevenue.total > 0 && (
                  <div className="pt-1">
                    <p className="text-xs text-muted-foreground">PY Shopify</p>
                    <p className="text-xs font-medium">${priorYearRevenue.shopify.toLocaleString('en-US')}</p>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1"
                  onClick={() => { setDetailSourceFilter("shopify"); setDetailDialogOpen(true); }}
                  data-testid={`btn-shopify-detail-${day.date}`}
                >
                  View Shopify Categories & Items
                </Button>
              </div>
              <div className="space-y-1">
                <Label className="flex items-center gap-1">
                  Wholesale (B2B)
                  <Badge variant="secondary" className="text-[10px] px-1 py-0">Auto</Badge>
                </Label>
                <div className="flex gap-1">
                  <div
                    className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm cursor-pointer hover-elevate items-center"
                    onClick={() => { setDetailSourceFilter("wholesale"); setDetailDialogOpen(true); }}
                    title="Click for wholesale order breakdown"
                    data-testid={`input-wholesale-${day.date}`}
                  >
                    {wholesaleRev ? parseFloat(wholesaleRev).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "Auto-synced"}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onSyncWholesale}
                    disabled={isSyncingWholesale}
                    title="Refresh from B2B orders"
                    data-testid={`btn-sync-wholesale-${day.date}`}
                  >
                    {isSyncingWholesale ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  </Button>
                </div>
                {priorYearRevenue !== null && priorYearRevenue.total > 0 && (
                  <div className="pt-1">
                    <p className="text-xs text-muted-foreground">PY Wholesale</p>
                    <p className="text-xs font-medium">${(priorYearRevenue.wholesale || 0).toLocaleString('en-US')}</p>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label>Other</Label>
                <div className="flex gap-2">
                  <Input 
                    type="number"
                    placeholder="0.00"
                    value={otherRev}
                    onChange={(e) => setOtherRev(e.target.value)}
                    className="w-28 flex-shrink-0"
                    data-testid={`input-other-${day.date}`}
                  />
                  <Input 
                    type="text"
                    placeholder="Source (e.g. event, catering)"
                    value={otherSource}
                    onChange={(e) => setOtherSource(e.target.value)}
                    data-testid={`input-other-source-${day.date}`}
                  />
                </div>
                {priorYearRevenue !== null && priorYearRevenue.total > 0 && (
                  <div className="pt-1">
                    <p className="text-xs text-muted-foreground">PY Other</p>
                    <p className="text-xs font-medium">${(priorYearRevenue.other || 0).toLocaleString('en-US')}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="text-sm font-medium">
                Day Total for {day.displayDate}: <span className="text-green-600">${dayTotal.toLocaleString('en-US')}</span>
              </div>
            </div>
            <div>
              <Label>Daily Notes</Label>
              <Textarea
                placeholder="Notes about this day (events, weather impact, etc.)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-20"
                data-testid={`input-notes-${day.date}`}
              />
            </div>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                {hasWeather ? (
                  <div className="flex items-center gap-2 text-sm">
                    {getWeatherIcon(entry?.weatherCondition || null)}
                    <span>{entry?.weatherHigh}°/{entry?.weatherLow}°F</span>
                    <span className="text-muted-foreground">• {entry?.weatherCondition}</span>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={onFetchWeather}
                    disabled={isFetchingWeather}
                    data-testid={`btn-fetch-weather-expanded-${day.date}`}
                  >
                    {isFetchingWeather ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Thermometer className="h-4 w-4 mr-2" />}
                    Fetch Weather
                  </Button>
                )}
              </div>
              <Button onClick={handleSave} disabled={isSaving} data-testid={`btn-save-${day.date}`}>
                Save Day
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <RevenueDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        date={day.date}
        displayDate={day.displayDate}
        toastRevenue={toastRev}
        shopifyRevenue={shopifyRev}
        wholesaleRevenue={wholesaleRev}
        sourceFilter={detailSourceFilter}
      />
    </Card>
  );
}

export function AiAdvisorPanel({ weekId, recommendations }: { weekId: number; recommendations: RccAiRecommendation[] }) {
  const { toast } = useToast();
  const [customPrompt, setCustomPrompt] = useState("");

  const generateMutation = useMutation({
    mutationFn: async (data: { weekId: number; customPrompt?: string }) => {
      return apiRequest("POST", "/api/rcc/ai-recommendations", data);
    },
    onSuccess: () => {
      toast({ title: "Recommendation generated" });
      setCustomPrompt("");
      queryClient.invalidateQueries({ queryKey: ["/api/rcc/ai-recommendations"] });
    },
    onError: (error: any) => {
      toast({ title: "Error generating recommendation", description: error.message, variant: "destructive" });
    },
  });

  const handleGenerate = () => {
    generateMutation.mutate({ weekId, customPrompt: customPrompt || undefined });
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            AI Advisor
          </CardTitle>
          <CardDescription>Get AI-powered recommendations based on your week's data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Custom Question (optional)</Label>
            <Textarea 
              placeholder="Ask a specific question, or leave blank for general recommendations..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              data-testid="input-ai-prompt"
            />
          </div>
          <Button 
            onClick={handleGenerate} 
            disabled={generateMutation.isPending}
            className="w-full"
            data-testid="btn-generate-ai"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {generateMutation.isPending ? "Generating..." : "Generate Recommendations"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Previous Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          {recommendations.length === 0 ? (
            <div className="text-center py-8">
              <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No recommendations yet</p>
              <p className="text-sm text-muted-foreground">Generate your first AI recommendation!</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {recommendations.map(rec => (
                <div key={rec.id} className="p-4 bg-muted/30 rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">{rec.model}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(rec.createdAt), "MMM d, h:mm a")}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{rec.recommendation}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function RccDocsPanel() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Revenue Command Center Guide
          </CardTitle>
          <CardDescription>
            How to use the RCC to track sales, manage marketing, and leverage AI insights
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <section>
            <h3 className="text-lg font-semibold mb-2">What is the RCC?</h3>
            <p className="text-sm text-muted-foreground">
              The Revenue Command Center is Nashoba Valley's weekly operating system for driving revenue. It tracks daily sales from Toast POS and Shopify, manages marketing campaigns, and uses AI to help you understand how your marketing efforts are impacting sales performance.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">The Weekly Rhythm</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-muted/30 rounded-md">
                <p className="font-medium text-sm">Monday - Plan the Week</p>
                <p className="text-xs text-muted-foreground mt-1">Set theme, hook, and goal. Assign 3-7 tasks with owners. Create 1-3 campaign drafts.</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-md">
                <p className="font-medium text-sm">Tue-Sun - Execute</p>
                <p className="text-xs text-muted-foreground mt-1">Update task statuses, send campaigns, track progress.</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-md">
                <p className="font-medium text-sm">Daily - Log Revenue</p>
                <p className="text-xs text-muted-foreground mt-1">Enter Toast and Shopify totals. Toast emails are captured automatically.</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-md">
                <p className="font-medium text-sm">Fri-Sun - Record Learnings</p>
                <p className="text-xs text-muted-foreground mt-1">Log wins, losses, ideas, and customer feedback.</p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">Tab Guide</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-md">
                <Target className="h-5 w-5 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Focus</p>
                  <p className="text-xs text-muted-foreground">Set the weekly theme, primary hook (the "why now" headline), and measurable goal. Keep the hook consistent across all marketing channels.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-md">
                <Lightbulb className="h-5 w-5 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Tasks</p>
                  <p className="text-xs text-muted-foreground">The execution engine. Every task has an owner, due date, and status (To Do, Doing, Blocked, Done). Keep tasks small (1-2 hours) and use "Blocked" early.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-md">
                <Megaphone className="h-5 w-5 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Campaigns</p>
                  <p className="text-xs text-muted-foreground">Track marketing messages across channels: email, website, social, on-site signage, ads. Record the copy, audience, offer, and results for future reference.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-md">
                <DollarSign className="h-5 w-5 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Revenue</p>
                  <p className="text-xs text-muted-foreground">Daily scoreboard showing Toast POS and Shopify sales. Toast emails are auto-captured. Compare against prior year (same day of week, 52-week offset). Weather data is pulled automatically.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-md">
                <Brain className="h-5 w-5 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">AI Advisor</p>
                  <p className="text-xs text-muted-foreground">AI-powered recommendations based on your weekly focus, campaigns, revenue trends, and learnings. Use it to spot patterns and get suggestions on what to try next.</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">Revenue Data Sources</h3>
            <div className="space-y-2">
              <div className="p-3 bg-muted/30 rounded-md">
                <p className="font-medium text-sm">Toast POS (Automatic)</p>
                <p className="text-xs text-muted-foreground">Daily summary emails from Toast are automatically parsed and entered. If an email is missed, you can manually enter the amount.</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-md">
                <p className="font-medium text-sm">Shopify (Manual / PDF Import)</p>
                <p className="text-xs text-muted-foreground">Enter Shopify revenue manually or upload Report Pundit PDF exports for bulk import.</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-md">
                <p className="font-medium text-sm">Prior Year Comparison</p>
                <p className="text-xs text-muted-foreground">Each day is compared to the same day of the week from last year (52-week / 364-day offset) for accurate day-of-week alignment.</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-md">
                <p className="font-medium text-sm">Weather Data</p>
                <p className="text-xs text-muted-foreground">High/low temps, conditions, and precipitation are automatically pulled from Open-Meteo for Bolton, MA to help correlate weather with sales.</p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">Tips for Success</h3>
            <ul className="space-y-2 text-sm text-muted-foreground list-none p-0">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
                <span>Keep the weekly hook simple and consistent across all channels</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
                <span>Assign fewer tasks but finish them - completion beats volume</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
                <span>Track campaigns even if results are unknown - you'll improve over time</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
                <span>Treat learnings as mandatory - they make the whole system smarter</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
                <span>Consistency beats perfection - enter revenue numbers the same way every time</span>
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">Troubleshooting</h3>
            <div className="space-y-2">
              <div className="p-3 bg-muted/30 rounded-md">
                <p className="font-medium text-sm">"I'm not sure what to do this week."</p>
                <p className="text-xs text-muted-foreground">Go to the Focus tab and read the Primary Hook and Primary Goal, then check Tasks for your assignments.</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-md">
                <p className="font-medium text-sm">"A task is blocked."</p>
                <p className="text-xs text-muted-foreground">Set status to Blocked and add a comment explaining what you need (approval, copy, image, decision).</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-md">
                <p className="font-medium text-sm">"Revenue looks wrong."</p>
                <p className="text-xs text-muted-foreground">Check the date, source (Toast vs Shopify), and add a note explaining any mismatch.</p>
              </div>
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
