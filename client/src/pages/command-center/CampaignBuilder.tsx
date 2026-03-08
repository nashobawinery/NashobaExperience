import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, Trash2, ChevronDown, ChevronRight, Target, Users,
  Mail, MessageSquare, Share2, MapPin, Sparkles, Loader2,
  Calendar, ArrowRight, ArrowLeft, Eye
} from "lucide-react";
import type { CcCampaignBuilder } from "@shared/schema";

const GOALS = [
  { value: "traffic", label: "Drive Traffic" },
  { value: "reactivation", label: "Reactivation" },
  { value: "event_promotion", label: "Event Promotion" },
  { value: "new_product", label: "New Product" },
  { value: "seasonal", label: "Seasonal" },
];

const SEGMENTS = [
  { value: "all", label: "All Customers" },
  { value: "active", label: "Active" },
  { value: "at_risk", label: "At Risk" },
  { value: "lapsed", label: "Lapsed" },
  { value: "dormant", label: "Dormant" },
  { value: "lost", label: "Lost" },
];

const CHANNELS = [
  { value: "email", label: "Email", icon: Mail },
  { value: "sms", label: "SMS", icon: MessageSquare },
  { value: "social", label: "Social", icon: Share2 },
  { value: "on_site", label: "On-Site", icon: MapPin },
];

const STATUS_ORDER = ["draft", "ready", "launched", "completed"] as const;

function getGoalLabel(goal: string) {
  return GOALS.find((g) => g.value === goal)?.label || goal;
}

function getSegmentLabel(segment: string) {
  return SEGMENTS.find((s) => s.value === segment)?.label || segment;
}

function getStatusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "draft": return "secondary";
    case "ready": return "outline";
    case "launched": return "default";
    case "completed": return "default";
    default: return "secondary";
  }
}

function renderStrategy(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <br key={i} />;
    if (trimmed.startsWith("###")) {
      return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{trimmed.replace(/^###\s*/, "")}</h4>;
    }
    if (trimmed.startsWith("##")) {
      return <h3 key={i} className="font-semibold mt-4 mb-1">{trimmed.replace(/^##\s*/, "")}</h3>;
    }
    if (trimmed.startsWith("#")) {
      return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{trimmed.replace(/^#\s*/, "")}</h2>;
    }
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      return <li key={i} className="ml-4 text-sm text-muted-foreground list-disc">{trimmed.slice(2)}</li>;
    }
    if (/^\*\*(.+)\*\*$/.test(trimmed)) {
      return <p key={i} className="font-semibold text-sm mt-2">{trimmed.replace(/\*\*/g, "")}</p>;
    }
    return <p key={i} className="text-sm text-muted-foreground">{trimmed}</p>;
  });
}

export function CampaignBuilder() {
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [targetSegment, setTargetSegment] = useState("");
  const [channels, setChannels] = useState<string[]>([]);

  const { data: campaigns, isLoading } = useQuery<CcCampaignBuilder[]>({
    queryKey: ["/api/growth-studio/campaigns"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/growth-studio/campaigns", {
        name,
        goal,
        targetSegment,
        channels,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/growth-studio/campaigns"] });
      toast({ title: "Campaign created" });
      generateMutation.mutate(data.id);
    },
    onError: (err: Error) => {
      toast({ title: "Error creating campaign", description: err.message, variant: "destructive" });
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/growth-studio/campaigns/${id}/generate`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/growth-studio/campaigns"] });
      toast({ title: "AI strategy generated" });
      resetWizard();
    },
    onError: (err: Error) => {
      toast({ title: "Error generating strategy", description: err.message, variant: "destructive" });
      resetWizard();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/growth-studio/campaigns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/growth-studio/campaigns"] });
      toast({ title: "Campaign deleted" });
      setDeleteConfirmId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error deleting campaign", description: err.message, variant: "destructive" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/growth-studio/campaigns/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/growth-studio/campaigns"] });
      toast({ title: "Status updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error updating status", description: err.message, variant: "destructive" });
    },
  });

  function resetWizard() {
    setWizardOpen(false);
    setWizardStep(1);
    setName("");
    setGoal("");
    setTargetSegment("");
    setChannels([]);
  }

  function toggleChannel(ch: string) {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  }

  function getNextStatus(current: string) {
    const idx = STATUS_ORDER.indexOf(current as typeof STATUS_ORDER[number]);
    if (idx >= 0 && idx < STATUS_ORDER.length - 1) {
      return STATUS_ORDER[idx + 1];
    }
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="loading-campaigns">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="campaign-builder">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold" data-testid="text-campaign-builder-title">Campaign Builder</h2>
          <p className="text-sm text-muted-foreground">Create AI-powered marketing campaigns for Nashoba Valley Winery</p>
        </div>
        <Button onClick={() => setWizardOpen(true)} data-testid="button-create-campaign">
          <Plus className="h-4 w-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      {(!campaigns || campaigns.length === 0) && (
        <Card>
          <CardContent className="p-8 text-center">
            <Target className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground" data-testid="text-no-campaigns">No campaigns yet. Create your first campaign to get started.</p>
          </CardContent>
        </Card>
      )}

      {campaigns?.map((campaign) => {
        const isExpanded = expandedId === campaign.id;
        const nextStatus = getNextStatus(campaign.status);
        return (
          <Card key={campaign.id} data-testid={`card-campaign-${campaign.id}`}>
            <CardHeader
              className="cursor-pointer flex flex-row items-start justify-between gap-4"
              onClick={() => setExpandedId(isExpanded ? null : campaign.id)}
              data-testid={`button-expand-campaign-${campaign.id}`}
            >
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-base" data-testid={`text-campaign-name-${campaign.id}`}>
                    {campaign.name}
                  </CardTitle>
                  <Badge variant={getStatusVariant(campaign.status)} data-testid={`badge-status-${campaign.id}`}>
                    {campaign.status}
                  </Badge>
                  <Badge variant="outline" data-testid={`badge-goal-${campaign.id}`}>
                    {getGoalLabel(campaign.goal)}
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-3 flex-wrap">
                  {campaign.targetSegment && (
                    <span className="flex items-center gap-1" data-testid={`text-segment-${campaign.id}`}>
                      <Users className="h-3 w-3" />
                      {getSegmentLabel(campaign.targetSegment)}
                    </span>
                  )}
                  {campaign.channels && campaign.channels.length > 0 && (
                    <span className="flex items-center gap-1" data-testid={`text-channels-${campaign.id}`}>
                      {campaign.channels.map((ch) => {
                        const found = CHANNELS.find((c) => c.value === ch);
                        return found ? <found.icon key={ch} className="h-3 w-3" /> : null;
                      })}
                    </span>
                  )}
                  {campaign.estimatedReach && (
                    <span className="flex items-center gap-1" data-testid={`text-reach-${campaign.id}`}>
                      <Eye className="h-3 w-3" />
                      ~{campaign.estimatedReach.toLocaleString('en-US')} reach
                    </span>
                  )}
                  <span className="flex items-center gap-1" data-testid={`text-date-${campaign.id}`}>
                    <Calendar className="h-3 w-3" />
                    {new Date(campaign.createdAt).toLocaleDateString('en-US')}
                  </span>
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirmId(campaign.id);
                  }}
                  data-testid={`button-delete-campaign-${campaign.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </div>
            </CardHeader>
            {isExpanded && (
              <CardContent className="space-y-4" data-testid={`content-campaign-${campaign.id}`}>
                {nextStatus && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => statusMutation.mutate({ id: campaign.id, status: nextStatus })}
                      disabled={statusMutation.isPending}
                      data-testid={`button-status-${campaign.id}`}
                    >
                      Move to {nextStatus}
                    </Button>
                  </div>
                )}
                {campaign.strategy && (
                  <div data-testid={`text-strategy-${campaign.id}`}>
                    {renderStrategy(campaign.strategy)}
                  </div>
                )}
                {campaign.generatedContent && !campaign.strategy && (
                  <div data-testid={`text-generated-${campaign.id}`}>
                    {renderStrategy(campaign.generatedContent)}
                  </div>
                )}
                {!campaign.strategy && !campaign.generatedContent && (
                  <p className="text-sm text-muted-foreground">No strategy generated yet.</p>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}

      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent data-testid="dialog-delete-confirm">
          <DialogHeader>
            <DialogTitle>Delete Campaign</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this campaign? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={wizardOpen} onOpenChange={(open) => { if (!open) resetWizard(); }}>
        <DialogContent className="sm:max-w-lg" data-testid="dialog-create-campaign">
          <DialogHeader>
            <DialogTitle>
              {wizardStep === 1 && "Campaign Details"}
              {wizardStep === 2 && "Targeting & Channels"}
              {wizardStep === 3 && "Review & Generate"}
            </DialogTitle>
          </DialogHeader>

          {wizardStep === 1 && (
            <div className="space-y-4" data-testid="wizard-step-1">
              <div className="space-y-2">
                <Label htmlFor="campaign-name">Campaign Name</Label>
                <Input
                  id="campaign-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Spring Wine Release"
                  data-testid="input-campaign-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Goal</Label>
                <Select value={goal} onValueChange={setGoal}>
                  <SelectTrigger data-testid="select-goal">
                    <SelectValue placeholder="Select a goal" />
                  </SelectTrigger>
                  <SelectContent>
                    {GOALS.map((g) => (
                      <SelectItem key={g.value} value={g.value} data-testid={`option-goal-${g.value}`}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-4" data-testid="wizard-step-2">
              <div className="space-y-2">
                <Label>Target Segment</Label>
                <Select value={targetSegment} onValueChange={setTargetSegment}>
                  <SelectTrigger data-testid="select-segment">
                    <SelectValue placeholder="Select target segment" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEGMENTS.map((s) => (
                      <SelectItem key={s.value} value={s.value} data-testid={`option-segment-${s.value}`}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Channels</Label>
                <div className="grid grid-cols-2 gap-3">
                  {CHANNELS.map((ch) => (
                    <label
                      key={ch.value}
                      className="flex items-center gap-2 p-2 rounded-md border cursor-pointer hover-elevate"
                      data-testid={`checkbox-channel-${ch.value}`}
                    >
                      <Checkbox
                        checked={channels.includes(ch.value)}
                        onCheckedChange={() => toggleChannel(ch.value)}
                      />
                      <ch.icon className="h-4 w-4" />
                      <span className="text-sm">{ch.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {wizardStep === 3 && (
            <div className="space-y-4" data-testid="wizard-step-3">
              {(createMutation.isPending || generateMutation.isPending) ? (
                <div className="flex flex-col items-center gap-3 py-6" data-testid="loading-generate">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {createMutation.isPending ? "Creating campaign..." : "Generating AI strategy..."}
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 rounded-md border p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-muted-foreground">Name</span>
                      <span className="text-sm font-medium" data-testid="text-review-name">{name}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-muted-foreground">Goal</span>
                      <Badge variant="outline" data-testid="badge-review-goal">{getGoalLabel(goal)}</Badge>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-muted-foreground">Target</span>
                      <span className="text-sm font-medium" data-testid="text-review-segment">{getSegmentLabel(targetSegment)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-muted-foreground">Channels</span>
                      <div className="flex items-center gap-1" data-testid="text-review-channels">
                        {channels.map((ch) => (
                          <Badge key={ch} variant="secondary">{ch}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter className="flex items-center justify-between gap-2">
            {wizardStep > 1 && !(createMutation.isPending || generateMutation.isPending) && (
              <Button
                variant="outline"
                onClick={() => setWizardStep((s) => s - 1)}
                data-testid="button-wizard-back"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            <div className="flex-1" />
            {wizardStep < 3 && (
              <Button
                onClick={() => setWizardStep((s) => s + 1)}
                disabled={(wizardStep === 1 && (!name || !goal)) || (wizardStep === 2 && (!targetSegment || channels.length === 0))}
                data-testid="button-wizard-next"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
            {wizardStep === 3 && !(createMutation.isPending || generateMutation.isPending) && (
              <Button
                onClick={() => createMutation.mutate()}
                data-testid="button-generate-strategy"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate AI Strategy
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
