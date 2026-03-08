import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Target, Users, DollarSign, TrendingUp, Zap, Brain,
  ChevronDown, ChevronRight, Mail, MessageSquare, RefreshCw,
  BarChart3, ArrowUpRight, ArrowDownRight, Loader2, Trash2,
  CheckCircle, Clock, Send, Eye, MousePointer, Award
} from "lucide-react";

interface TargetingCampaign {
  id: number;
  name: string;
  weekStart: string;
  status: string;
  targetCount: number;
  segments: string[];
  offerTypes: string[];
  channel: string;
  projectedConversionRate: string | null;
  projectedRevenue: string | null;
  projectedRoi: string | null;
  actualConversions: number;
  actualRevenue: string;
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  aiInsights: string | null;
  createdAt: string;
}

interface TargetMember {
  id: number;
  campaign_id: number;
  toast_guest_id: number;
  reactivation_score: string;
  expected_value: string;
  recency_score: number;
  frequency_score: number;
  monetary_score: number;
  segment: string;
  assigned_offer_type: string;
  assigned_offer_detail: string;
  ai_reason: string | null;
  status: string;
  sent_at: string | null;
  converted_at: string | null;
  conversion_revenue: string | null;
  first_name: string;
  last_name: string;
  email1: string;
  phone1: string;
  total_visits: number;
  average_spend: string;
  lifetime_spend: string;
  days_since_last_visit: number;
  last_visit_date: string;
  last_dining_behavior: string;
  reactivation_segment: string;
}

interface RoiSummary {
  overview: {
    total_campaigns: string;
    total_targeted: string;
    total_sent: string;
    total_conversions: string;
    total_revenue: string;
    avg_projected_conv: string;
    actual_conv_rate: string;
    avg_projected_roi: string;
  };
  offerPerformance: Array<{
    offer_type: string;
    segment: string;
    total_sent: number;
    total_converted: number;
    total_revenue: string;
    avg_conversion_rate: string;
    avg_order_value: string;
  }>;
  segmentPerformance: Array<{
    segment: string;
    total_targeted: string;
    conversions: string;
    revenue: string;
    avg_expected_value: string;
    conversion_rate: string;
  }>;
}

const OFFER_LABELS: Record<string, string> = {
  percentage_discount_10: "10% Off",
  percentage_discount_15: "15% Off",
  percentage_discount_20: "20% Off",
  free_tasting: "Free Tasting",
  bogo: "BOGO",
  loyalty_bonus: "2x Points",
  seasonal_special: "Seasonal Special",
  free_appetizer: "Free Appetizer",
};

const SEGMENT_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  at_risk: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  lapsed: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  dormant: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  lost: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

const STATUS_ICONS: Record<string, typeof Clock> = {
  pending: Clock,
  sent: Send,
  opened: Eye,
  clicked: MousePointer,
  converted: CheckCircle,
};

function formatCurrency(val: number | string): string {
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "$0";
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatPercent(val: number | string): string {
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "0%";
  return `${num.toFixed(1)}%`;
}

export function TargetingOverview() {
  const { toast } = useToast();
  const [selectedCampaign, setSelectedCampaign] = useState<number | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);

  const { data: campaigns, isLoading: loadingCampaigns } = useQuery<TargetingCampaign[]>({
    queryKey: ["/api/targeting/campaigns"],
  });

  const { data: roiSummary, isLoading: loadingRoi } = useQuery<RoiSummary>({
    queryKey: ["/api/targeting/roi-summary"],
  });

  if (selectedCampaign) {
    return <CampaignDetail campaignId={selectedCampaign} onBack={() => setSelectedCampaign(null)} />;
  }

  if (showGenerator) {
    return <CampaignGenerator onBack={() => setShowGenerator(false)} onCreated={(id) => {
      setShowGenerator(false);
      setSelectedCampaign(id);
    }} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold" data-testid="text-targeting-heading">AI Targeting Engine</h2>
          <p className="text-sm text-muted-foreground">Smart customer targeting with projected ROI</p>
        </div>
        <Button onClick={() => setShowGenerator(true)} data-testid="button-generate-targets">
          <Zap className="h-4 w-4 mr-2" />
          Generate Weekly Targets
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Campaigns</span>
            </div>
            <p className="text-xl font-bold" data-testid="text-total-campaigns">
              {loadingRoi ? <Skeleton className="h-7 w-12" /> : roiSummary?.overview?.total_campaigns || "0"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Total Targeted</span>
            </div>
            <p className="text-xl font-bold" data-testid="text-total-targeted">
              {loadingRoi ? <Skeleton className="h-7 w-12" /> : parseInt(roiSummary?.overview?.total_targeted || "0").toLocaleString('en-US')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Conversions</span>
            </div>
            <p className="text-xl font-bold" data-testid="text-total-conversions">
              {loadingRoi ? <Skeleton className="h-7 w-12" /> : parseInt(roiSummary?.overview?.total_conversions || "0").toLocaleString('en-US')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Revenue Recovered</span>
            </div>
            <p className="text-xl font-bold" data-testid="text-total-revenue">
              {loadingRoi ? <Skeleton className="h-7 w-12" /> : formatCurrency(roiSummary?.overview?.total_revenue || "0")}
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">Recent Campaigns</h3>
        {loadingCampaigns ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : campaigns && campaigns.length > 0 ? (
          <div className="space-y-2">
            {campaigns.map(c => (
              <Card key={c.id} className="hover-elevate cursor-pointer" onClick={() => setSelectedCampaign(c.id)} data-testid={`card-campaign-${c.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{c.name}</span>
                        <Badge variant={c.status === "active" || c.status === "sent" ? "default" : "secondary"}>
                          {c.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span>{c.targetCount} targets</span>
                        <span>{c.channel === "email" ? "Email" : "SMS"}</span>
                        <span>{new Date(c.weekStart).toLocaleDateString('en-US')}</span>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="font-medium">{formatCurrency(c.projectedRevenue || "0")}</span>
                        <span className="text-xs text-muted-foreground">projected</span>
                      </div>
                      {c.actualConversions > 0 && (
                        <div className="flex items-center gap-1 text-sm">
                          <CheckCircle className="h-3.5 w-3.5 text-blue-600" />
                          <span className="font-medium">{c.actualConversions} converted</span>
                          <span className="text-xs text-muted-foreground">({formatCurrency(c.actualRevenue)})</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {c.segments && c.segments.length > 0 && (
                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                      {c.segments.map((s: string) => (
                        <Badge key={s} variant="outline" className="text-xs">{s.replace("_", " ")}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-medium mb-1">No targeting campaigns yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Generate your first weekly target list to start reactivating customers with smart, data-driven outreach.
              </p>
              <Button onClick={() => setShowGenerator(true)} data-testid="button-first-campaign">
                <Zap className="h-4 w-4 mr-2" />
                Generate First Targets
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {roiSummary && roiSummary.segmentPerformance && roiSummary.segmentPerformance.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Performance by Segment</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {roiSummary.segmentPerformance.map(sp => (
              <Card key={sp.segment}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={SEGMENT_COLORS[sp.segment] || ""}>
                      {sp.segment?.replace("_", " ")}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{parseInt(sp.total_targeted).toLocaleString('en-US')} targeted</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Conv. Rate</p>
                      <p className="font-medium">{formatPercent(sp.conversion_rate)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Conversions</p>
                      <p className="font-medium">{sp.conversions}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Revenue</p>
                      <p className="font-medium">{formatCurrency(sp.revenue)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CampaignGenerator({ onBack, onCreated }: { onBack: () => void; onCreated: (id: number) => void }) {
  const { toast } = useToast();
  const [name, setName] = useState(`Weekly Targets - ${new Date().toLocaleDateString('en-US')}`);
  const [targetCount, setTargetCount] = useState(500);
  const [segments, setSegments] = useState<string[]>(["at_risk", "lapsed", "dormant"]);
  const [channel, setChannel] = useState("email");

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/targeting/generate", {
        name,
        targetCount,
        segments,
        channel,
        weekStart: new Date().toISOString(),
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/targeting/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/targeting/roi-summary"] });
      toast({ title: "Targets Generated", description: `${data.summary.totalTargets} customers scored and ranked by ROI potential.` });
      onCreated(data.campaign.id);
    },
    onError: (err: Error) => {
      toast({ title: "Generation Failed", description: err.message, variant: "destructive" });
    },
  });

  const toggleSegment = (seg: string) => {
    setSegments(prev => prev.includes(seg) ? prev.filter(s => s !== seg) : [...prev, seg]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back-from-generator">
          <ChevronDown className="h-4 w-4 rotate-90" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold">Generate Weekly Targets</h2>
          <p className="text-sm text-muted-foreground">AI scores customers and recommends the best offers for each</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Campaign Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Campaign Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} data-testid="input-campaign-name" />
            </div>
            <div className="space-y-2">
              <Label>Target Count</Label>
              <Select value={String(targetCount)} onValueChange={v => setTargetCount(parseInt(v))}>
                <SelectTrigger data-testid="select-target-count">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100">100 customers</SelectItem>
                  <SelectItem value="250">250 customers</SelectItem>
                  <SelectItem value="500">500 customers</SelectItem>
                  <SelectItem value="1000">1,000 customers</SelectItem>
                  <SelectItem value="2000">2,000 customers</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger data-testid="select-channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </div>
                  </SelectItem>
                  <SelectItem value="sms">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      SMS
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Target Segments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Select which customer segments to include in targeting</p>
            {[
              { id: "at_risk", label: "At Risk", desc: "31-60 days inactive, highest conversion potential", color: "amber" },
              { id: "lapsed", label: "Lapsed", desc: "61-120 days inactive, moderate win-back potential", color: "orange" },
              { id: "dormant", label: "Dormant", desc: "121-365 days inactive, needs strong incentive", color: "red" },
              { id: "lost", label: "Lost", desc: "365+ days inactive, long-shot but high-value if converted", color: "gray" },
            ].map(seg => (
              <div
                key={seg.id}
                className={`flex items-center gap-3 p-3 rounded-md cursor-pointer border transition-colors ${
                  segments.includes(seg.id) ? "border-primary bg-primary/5" : "border-transparent"
                }`}
                onClick={() => toggleSegment(seg.id)}
                data-testid={`toggle-segment-${seg.id}`}
              >
                <div className={`w-3 h-3 rounded-full ${segments.includes(seg.id) ? "bg-primary" : "bg-muted"}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{seg.label}</p>
                  <p className="text-xs text-muted-foreground">{seg.desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Ready to generate?</p>
              <p className="text-xs text-muted-foreground">
                The AI will score {targetCount.toLocaleString('en-US')} customers from {segments.length} segments, 
                assign optimal offers, and project conversion rates and revenue.
              </p>
            </div>
            <Button 
              onClick={() => generateMutation.mutate()} 
              disabled={generateMutation.isPending || segments.length === 0}
              data-testid="button-run-generate"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scoring Customers...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Generate {targetCount.toLocaleString('en-US')} Targets
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CampaignDetail({ campaignId, onBack }: { campaignId: number; onBack: () => void }) {
  const { toast } = useToast();
  const [sortBy, setSortBy] = useState("expected_value");

  const { data: campaign, isLoading: loadingCampaign } = useQuery<TargetingCampaign>({
    queryKey: ["/api/targeting/campaigns", campaignId],
  });

  const { data: memberData, isLoading: loadingMembers } = useQuery<{
    members: TargetMember[];
    total: number;
    stats: {
      total_sent: string;
      total_converted: string;
      total_revenue: string;
      avg_score: string;
      avg_expected_value: string;
    };
  }>({
    queryKey: ["/api/targeting/campaigns", campaignId, "members", sortBy],
    queryFn: async () => {
      const res = await fetch(`/api/targeting/campaigns/${campaignId}/members?sortBy=${sortBy}&limit=100`);
      if (!res.ok) throw new Error("Failed to load members");
      return res.json();
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await apiRequest("PATCH", `/api/targeting/campaigns/${campaignId}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/targeting/campaigns"] });
      toast({ title: "Status Updated" });
    },
  });

  const aiInsightsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/targeting/campaigns/${campaignId}/ai-insights`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/targeting/campaigns", campaignId] });
      toast({ title: "AI Insights Generated" });
    },
    onError: (err: Error) => {
      toast({ title: "AI Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/targeting/campaigns/${campaignId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/targeting/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/targeting/roi-summary"] });
      toast({ title: "Campaign Deleted" });
      onBack();
    },
  });

  if (loadingCampaign) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-48 w-full" /></div>;
  }

  if (!campaign) {
    return <p>Campaign not found</p>;
  }

  const projRevenue = parseFloat(campaign.projectedRevenue || "0");
  const projConvRate = parseFloat(campaign.projectedConversionRate || "0");
  const projRoi = parseFloat(campaign.projectedRoi || "0");

  const offerBreakdown = memberData?.members ? memberData.members.reduce((acc, m) => {
    const type = m.assigned_offer_type;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) : {};

  const segmentBreakdown = memberData?.members ? memberData.members.reduce((acc, m) => {
    const seg = m.segment || "unknown";
    acc[seg] = (acc[seg] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) : {};

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back-from-detail">
            <ChevronDown className="h-4 w-4 rotate-90" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold">{campaign.name}</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={campaign.status === "sent" ? "default" : "secondary"}>{campaign.status}</Badge>
              <span className="text-xs text-muted-foreground">{campaign.targetCount} targets</span>
              <span className="text-xs text-muted-foreground">{campaign.channel}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {campaign.status === "draft" && (
            <Button variant="outline" onClick={() => statusMutation.mutate("active")} data-testid="button-activate-campaign">
              <CheckCircle className="h-4 w-4 mr-2" />
              Activate
            </Button>
          )}
          {campaign.status === "active" && (
            <Button onClick={() => statusMutation.mutate("sent")} data-testid="button-send-campaign">
              <Send className="h-4 w-4 mr-2" />
              Mark as Sent
            </Button>
          )}
          <Button variant="outline" onClick={() => aiInsightsMutation.mutate()} disabled={aiInsightsMutation.isPending} data-testid="button-ai-insights">
            {aiInsightsMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
            AI Insights
          </Button>
          <Button variant="ghost" size="icon" onClick={() => {
            if (confirm("Delete this campaign and all its members?")) deleteMutation.mutate();
          }} data-testid="button-delete-campaign">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Projected Revenue</p>
            <p className="text-lg font-bold text-emerald-600" data-testid="text-proj-revenue">{formatCurrency(projRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Conv. Rate</p>
            <p className="text-lg font-bold" data-testid="text-proj-conv-rate">{formatPercent(projConvRate * 100)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Projected ROI</p>
            <p className="text-lg font-bold text-blue-600" data-testid="text-proj-roi">{formatPercent(projRoi)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Actual Conversions</p>
            <p className="text-lg font-bold">{campaign.actualConversions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Actual Revenue</p>
            <p className="text-lg font-bold text-emerald-600">{formatCurrency(campaign.actualRevenue)}</p>
          </CardContent>
        </Card>
      </div>

      {campaign.aiInsights && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI Strategy Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm whitespace-pre-wrap leading-relaxed" data-testid="text-ai-insights">{campaign.aiInsights}</div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Offer Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(offerBreakdown).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm">{OFFER_LABELS[type] || type}</span>
                  <div className="flex items-center gap-2">
                    <Progress value={(count / (memberData?.total || 1)) * 100} className="w-24 h-2" />
                    <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Segment Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(segmentBreakdown).sort((a, b) => b[1] - a[1]).map(([seg, count]) => (
                <div key={seg} className="flex items-center justify-between">
                  <Badge className={SEGMENT_COLORS[seg] || ""}>{seg.replace("_", " ")}</Badge>
                  <div className="flex items-center gap-2">
                    <Progress value={(count / (memberData?.total || 1)) * 100} className="w-24 h-2" />
                    <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-sm font-semibold">Target List ({memberData?.total || 0} customers)</h3>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-44" data-testid="select-sort-members">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expected_value">Expected Value</SelectItem>
              <SelectItem value="reactivation_score">Reactivation Score</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loadingMembers ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : memberData?.members && memberData.members.length > 0 ? (
          <div className="space-y-2">
            {memberData.members.map((m, idx) => (
              <MemberCard key={m.id} member={m} rank={idx + 1} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No members in this campaign</p>
        )}
      </div>
    </div>
  );
}

function MemberCard({ member, rank }: { member: TargetMember; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const score = parseFloat(member.reactivation_score);
  const ev = parseFloat(member.expected_value);
  const StatusIcon = STATUS_ICONS[member.status] || Clock;

  return (
    <Card className="hover-elevate cursor-pointer" onClick={() => setExpanded(!expanded)} data-testid={`card-member-${member.id}`}>
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold">#{rank}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium truncate">
                {member.first_name} {member.last_name}
              </span>
              <Badge className={SEGMENT_COLORS[member.segment] || ""} variant="outline">
                {member.segment?.replace("_", " ")}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {OFFER_LABELS[member.assigned_offer_type] || member.assigned_offer_type}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
              <span>{member.total_visits} visits</span>
              <span>{formatCurrency(member.average_spend)}/visit</span>
              <span>{member.days_since_last_visit}d inactive</span>
              {member.email1 && <span className="truncate max-w-32">{member.email1}</span>}
            </div>
          </div>
          <div className="text-right shrink-0 space-y-0.5">
            <div className="flex items-center gap-1 justify-end">
              <span className="text-xs text-muted-foreground">EV:</span>
              <span className="font-bold text-emerald-600">{formatCurrency(ev)}</span>
            </div>
            <div className="flex items-center gap-1 justify-end">
              <span className="text-xs text-muted-foreground">Score:</span>
              <span className="text-sm font-medium">{score.toFixed(0)}</span>
            </div>
          </div>
          <StatusIcon className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t space-y-2">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Recency</p>
                <div className="flex items-center gap-1">
                  <Progress value={member.recency_score * 20} className="h-1.5 flex-1" />
                  <span className="text-xs font-medium">{member.recency_score}/5</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Frequency</p>
                <div className="flex items-center gap-1">
                  <Progress value={member.frequency_score * 20} className="h-1.5 flex-1" />
                  <span className="text-xs font-medium">{member.frequency_score}/5</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Monetary</p>
                <div className="flex items-center gap-1">
                  <Progress value={member.monetary_score * 20} className="h-1.5 flex-1" />
                  <span className="text-xs font-medium">{member.monetary_score}/5</span>
                </div>
              </div>
            </div>
            <div className="text-sm">
              <p className="text-xs text-muted-foreground">Recommended Offer</p>
              <p className="font-medium">{OFFER_LABELS[member.assigned_offer_type] || member.assigned_offer_type}</p>
              <p className="text-xs text-muted-foreground">{member.assigned_offer_detail}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground">Lifetime Spend:</span> {formatCurrency(member.lifetime_spend)}
              </div>
              <div>
                <span className="text-muted-foreground">Last Visit:</span> {member.last_visit_date ? new Date(member.last_visit_date).toLocaleDateString('en-US') : "N/A"}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function RoiProjections() {
  const { data: roiSummary, isLoading } = useQuery<RoiSummary>({
    queryKey: ["/api/targeting/roi-summary"],
  });

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-48 w-full" /><Skeleton className="h-48 w-full" /></div>;
  }

  const overview = roiSummary?.overview;
  const totalRevenue = parseFloat(overview?.total_revenue || "0");
  const totalSent = parseInt(overview?.total_sent || "0");
  const totalConversions = parseInt(overview?.total_conversions || "0");
  const actualConvRate = parseFloat(overview?.actual_conv_rate || "0");
  const projConvRate = parseFloat(overview?.avg_projected_conv || "0");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" data-testid="text-roi-heading">ROI Projections & Performance</h2>
        <p className="text-sm text-muted-foreground">Track projected vs actual performance across all targeting campaigns</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total Revenue Recovered</p>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total Conversions</p>
            <p className="text-2xl font-bold">{totalConversions.toLocaleString('en-US')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Actual Conv. Rate</p>
            <p className="text-2xl font-bold">{formatPercent(actualConvRate)}</p>
            <p className="text-xs text-muted-foreground">projected: {formatPercent(projConvRate)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Avg Revenue/Conversion</p>
            <p className="text-2xl font-bold">{totalConversions > 0 ? formatCurrency(totalRevenue / totalConversions) : "$0"}</p>
          </CardContent>
        </Card>
      </div>

      {roiSummary?.offerPerformance && roiSummary.offerPerformance.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Offer Type Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium">Offer Type</th>
                    <th className="text-left py-2 px-2 font-medium">Segment</th>
                    <th className="text-right py-2 px-2 font-medium">Sent</th>
                    <th className="text-right py-2 px-2 font-medium">Converted</th>
                    <th className="text-right py-2 px-2 font-medium">Conv. Rate</th>
                    <th className="text-right py-2 px-2 font-medium">Revenue</th>
                    <th className="text-right py-2 px-2 font-medium">Avg Order</th>
                  </tr>
                </thead>
                <tbody>
                  {roiSummary.offerPerformance.map((op, i) => (
                    <tr key={i} className="border-b last:border-b-0">
                      <td className="py-2 px-2">{OFFER_LABELS[op.offer_type] || op.offer_type}</td>
                      <td className="py-2 px-2">
                        <Badge className={SEGMENT_COLORS[op.segment] || ""} variant="outline">
                          {op.segment?.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="text-right py-2 px-2">{op.total_sent}</td>
                      <td className="text-right py-2 px-2">{op.total_converted}</td>
                      <td className="text-right py-2 px-2">{formatPercent(op.avg_conversion_rate)}</td>
                      <td className="text-right py-2 px-2">{formatCurrency(op.total_revenue)}</td>
                      <td className="text-right py-2 px-2">{formatCurrency(op.avg_order_value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {roiSummary?.segmentPerformance && roiSummary.segmentPerformance.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Segment Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {roiSummary.segmentPerformance.map(sp => {
                const convRate = parseFloat(sp.conversion_rate || "0");
                return (
                  <div key={sp.segment} className="flex items-center gap-3">
                    <Badge className={`${SEGMENT_COLORS[sp.segment] || ""} w-20 justify-center`}>
                      {sp.segment?.replace("_", " ")}
                    </Badge>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">{parseInt(sp.total_targeted).toLocaleString('en-US')} targeted</span>
                        <span className="text-xs font-medium">{formatPercent(convRate)} conv.</span>
                      </div>
                      <Progress value={Math.min(convRate * 4, 100)} className="h-2" />
                    </div>
                    <div className="text-right w-20">
                      <p className="text-sm font-medium">{formatCurrency(sp.revenue)}</p>
                      <p className="text-xs text-muted-foreground">{sp.conversions} conv.</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {(!roiSummary?.offerPerformance || roiSummary.offerPerformance.length === 0) && (
        <Card>
          <CardContent className="p-8 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-medium mb-1">No performance data yet</h3>
            <p className="text-sm text-muted-foreground">
              Generate your first targeting campaign and record conversions to start seeing ROI data here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
