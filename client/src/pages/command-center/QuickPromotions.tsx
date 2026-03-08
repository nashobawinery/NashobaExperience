import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CcQuickPromotion } from "@shared/schema";
import {
  Snowflake, Sparkles, Cloud, Calendar, Award, Zap,
  Copy, Trash2, Check, X,
} from "lucide-react";

type PromoType = "seasonal_special" | "new_release" | "weather_deal" | "event_promo" | "loyalty_reward" | "flash_sale";

interface PromoTemplate {
  type: PromoType;
  label: string;
  icon: typeof Snowflake;
}

const PROMO_TEMPLATES: PromoTemplate[] = [
  { type: "seasonal_special", label: "Seasonal Special", icon: Snowflake },
  { type: "new_release", label: "New Release", icon: Sparkles },
  { type: "weather_deal", label: "Weather Deal", icon: Cloud },
  { type: "event_promo", label: "Event Promo", icon: Calendar },
  { type: "loyalty_reward", label: "Loyalty Reward", icon: Award },
  { type: "flash_sale", label: "Flash Sale", icon: Zap },
];

const CHANNELS = [
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "social", label: "Social" },
  { value: "on_site", label: "On-Site" },
];

const SEGMENTS = [
  { value: "all", label: "All Customers" },
  { value: "vip", label: "VIP Members" },
  { value: "new", label: "New Customers" },
  { value: "at_risk", label: "At Risk" },
  { value: "lapsed", label: "Lapsed" },
  { value: "wine_club", label: "Wine Club" },
];

export function QuickPromotions() {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<PromoTemplate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [channel, setChannel] = useState("email");
  const [targetSegment, setTargetSegment] = useState("");
  const [customContext, setCustomContext] = useState("");
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [generatedTitle, setGeneratedTitle] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const { data: promos, isLoading } = useQuery<CcQuickPromotion[]>({
    queryKey: ["/api/growth-studio/quick-promos"],
  });

  const generateMutation = useMutation({
    mutationFn: async (payload: { type: string; channel: string; targetSegment?: string; customContext?: string }) => {
      const res = await apiRequest("POST", "/api/growth-studio/quick-promos/generate", payload);
      return await res.json();
    },
    onSuccess: (data: { title?: string; generatedContent?: string; content?: string }) => {
      setGeneratedContent(data.generatedContent || data.content || "");
      setGeneratedTitle(data.title || "");
      queryClient.invalidateQueries({ queryKey: ["/api/growth-studio/quick-promos"] });
      toast({ title: "Promotion generated", description: "Your promotional content is ready." });
    },
    onError: (err: Error) => {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/growth-studio/quick-promos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/growth-studio/quick-promos"] });
      setDeleteConfirmId(null);
      toast({ title: "Promotion deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  const openDialog = (template: PromoTemplate) => {
    setSelectedTemplate(template);
    setChannel("email");
    setTargetSegment("");
    setCustomContext("");
    setGeneratedContent(null);
    setGeneratedTitle(null);
    setCopied(false);
    setDialogOpen(true);
  };

  const handleGenerate = () => {
    if (!selectedTemplate) return;
    generateMutation.mutate({
      type: selectedTemplate.type,
      channel,
      targetSegment: targetSegment || undefined,
      customContext: customContext || undefined,
    });
  };

  const handleCopy = async () => {
    if (!generatedContent) return;
    try {
      await navigator.clipboard.writeText(generatedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Copied to clipboard" });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const handleDismiss = () => {
    setDialogOpen(false);
    setGeneratedContent(null);
    setGeneratedTitle(null);
  };

  const getTemplateIcon = (type: string) => {
    const template = PROMO_TEMPLATES.find(t => t.type === type);
    return template?.icon || Zap;
  };

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="quick-promos-loading">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="quick-promotions">
      <div>
        <h2 className="text-lg font-semibold" data-testid="text-quick-promos-title">Quick Promotions</h2>
        <p className="text-sm text-muted-foreground">One-click promotional content for Nashoba Valley Winery</p>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">Choose a Template</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3" data-testid="promo-templates-grid">
          {PROMO_TEMPLATES.map(template => {
            const Icon = template.icon;
            return (
              <Card
                key={template.type}
                className="cursor-pointer hover-elevate"
                onClick={() => openDialog(template)}
                data-testid={`card-template-${template.type}`}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-md bg-muted">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium">{template.label}</span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-testid="dialog-generate-promo">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {generatedContent ? (generatedTitle || "Generated Content") : `Generate ${selectedTemplate?.label || ""}`}
            </DialogTitle>
          </DialogHeader>

          {!generatedContent ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label data-testid="label-channel">Channel</Label>
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger data-testid="select-channel">
                    <SelectValue placeholder="Select channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map(ch => (
                      <SelectItem key={ch.value} value={ch.value} data-testid={`option-channel-${ch.value}`}>
                        {ch.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label data-testid="label-segment">Target Segment (optional)</Label>
                <Select value={targetSegment} onValueChange={setTargetSegment}>
                  <SelectTrigger data-testid="select-segment">
                    <SelectValue placeholder="All customers" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEGMENTS.map(seg => (
                      <SelectItem key={seg.value} value={seg.value} data-testid={`option-segment-${seg.value}`}>
                        {seg.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label data-testid="label-context">Additional Details (optional)</Label>
                <Textarea
                  value={customContext}
                  onChange={e => setCustomContext(e.target.value)}
                  placeholder="Any specific details or context for this promotion..."
                  data-testid="textarea-context"
                />
              </div>
            </div>
          ) : (
            <Card data-testid="card-generated-content">
              <CardContent className="p-4">
                <pre className="whitespace-pre-wrap text-sm font-sans" data-testid="text-generated-content">
                  {generatedContent}
                </pre>
              </CardContent>
            </Card>
          )}

          <DialogFooter className="gap-2">
            {!generatedContent ? (
              <>
                <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-generate">
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending}
                  data-testid="button-generate"
                >
                  {generateMutation.isPending ? "Generating..." : "Generate"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleDismiss} data-testid="button-dismiss">
                  <X className="h-4 w-4 mr-2" />
                  Dismiss
                </Button>
                <Button onClick={handleCopy} data-testid="button-copy">
                  {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {promos && promos.length > 0 && (
        <div data-testid="promo-history">
          <h3 className="text-sm font-semibold mb-3">History</h3>
          <div className="space-y-2">
            {promos.map(promo => {
              const Icon = getTemplateIcon(promo.type);
              return (
                <Card key={promo.id} data-testid={`card-promo-${promo.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="p-1.5 rounded-md bg-muted mt-0.5">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-sm font-medium truncate" data-testid={`text-promo-title-${promo.id}`}>
                              {promo.title}
                            </span>
                            <Badge variant="outline" className="text-xs" data-testid={`badge-promo-type-${promo.id}`}>
                              {promo.type.replace(/_/g, " ")}
                            </Badge>
                            {promo.channel && (
                              <Badge variant="secondary" className="text-xs" data-testid={`badge-promo-channel-${promo.id}`}>
                                {promo.channel}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground" data-testid={`text-promo-date-${promo.id}`}>
                            {new Date(promo.createdAt).toLocaleString('en-US')}
                          </p>
                          {promo.generatedContent && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2" data-testid={`text-promo-preview-${promo.id}`}>
                              {promo.generatedContent.substring(0, 150)}
                              {promo.generatedContent.length > 150 ? "..." : ""}
                            </p>
                          )}
                        </div>
                      </div>
                      <div>
                        {deleteConfirmId === promo.id ? (
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="destructive"
                              onClick={() => deleteMutation.mutate(promo.id)}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-confirm-delete-${promo.id}`}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => setDeleteConfirmId(null)}
                              data-testid={`button-cancel-delete-${promo.id}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteConfirmId(promo.id)}
                            data-testid={`button-delete-${promo.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
