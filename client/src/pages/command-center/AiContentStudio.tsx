import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Sparkles, Copy, Check, Trash2, ChevronDown, ChevronRight,
  Loader2, FileText, Mail, Megaphone, Calendar, MessageSquare,
} from "lucide-react";
import type { CcContentAsset } from "@shared/schema";

const CONTENT_TYPES = [
  { value: "social_post", label: "Social Post", icon: FileText },
  { value: "email_subject", label: "Email Subject", icon: Mail },
  { value: "ad_copy", label: "Ad Copy", icon: Megaphone },
  { value: "event_promo", label: "Event Promo", icon: Calendar },
  { value: "sms_blast", label: "SMS Blast", icon: MessageSquare },
];

const SEGMENTS = [
  { value: "active", label: "Active" },
  { value: "at_risk", label: "At Risk" },
  { value: "lapsed", label: "Lapsed" },
  { value: "dormant", label: "Dormant" },
  { value: "lost", label: "Lost" },
];

const CHANNELS = [
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "social", label: "Social" },
  { value: "on_site", label: "On-Site" },
];

function statusBadge(status: string) {
  switch (status) {
    case "draft":
      return <Badge variant="secondary" data-testid={`badge-status-${status}`}>Draft</Badge>;
    case "saved":
      return <Badge variant="outline" data-testid={`badge-status-${status}`}>Saved</Badge>;
    case "published":
      return <Badge variant="default" data-testid={`badge-status-${status}`}>Published</Badge>;
    case "archived":
      return <Badge variant="outline" className="opacity-60" data-testid={`badge-status-${status}`}>Archived</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function typeBadge(type: string) {
  const found = CONTENT_TYPES.find(t => t.value === type);
  return (
    <Badge variant="outline" data-testid={`badge-type-${type}`}>
      {found?.label || type}
    </Badge>
  );
}

export function AiContentStudio() {
  const { toast } = useToast();
  const [contentType, setContentType] = useState("social_post");
  const [context, setContext] = useState("");
  const [targetSegment, setTargetSegment] = useState("");
  const [channel, setChannel] = useState("");
  const [generatedResult, setGeneratedResult] = useState<CcContentAsset | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const { data: contentHistory, isLoading: historyLoading } = useQuery<CcContentAsset[]>({
    queryKey: ["/api/growth-studio/content"],
  });

  const generateMutation = useMutation({
    mutationFn: async (data: { type: string; context: string; targetSegment?: string; channel?: string }) => {
      const res = await apiRequest("POST", "/api/growth-studio/content/generate", data);
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedResult(data);
      setSelectedVariation(null);
      queryClient.invalidateQueries({ queryKey: ["/api/growth-studio/content"] });
      toast({ title: "Content generated", description: "4 variations created successfully." });
    },
    onError: (err: Error) => {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/growth-studio/content/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/growth-studio/content"] });
      setDeleteConfirmId(null);
      toast({ title: "Content deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  const handleGenerate = () => {
    if (!context.trim()) {
      toast({ title: "Context required", description: "Please describe what the content is about.", variant: "destructive" });
      return;
    }
    generateMutation.mutate({
      type: contentType,
      context: context.trim(),
      ...(targetSegment && targetSegment !== "none" ? { targetSegment } : {}),
      ...(channel && channel !== "none" ? { channel } : {}),
    });
  };

  const handleCopy = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast({ title: "Copied to clipboard" });
  };

  const selectMutation = useMutation({
    mutationFn: async ({ id, index }: { id: number; index: number }) => {
      const res = await apiRequest("PATCH", `/api/growth-studio/content/${id}`, { selectedVariation: index, status: "saved" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/growth-studio/content"] });
    },
  });

  const handleSelect = (index: number) => {
    setSelectedVariation(index);
    if (generatedResult?.id) {
      selectMutation.mutate({ id: generatedResult.id, index });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold" data-testid="text-content-studio-title">AI Content Studio</h2>
        <p className="text-sm text-muted-foreground">Generate AI-powered marketing content for Nashoba Valley Winery</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Generate Content
          </CardTitle>
          <CardDescription>Choose a content type and describe what you want to create</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="content-type">Content Type</Label>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger data-testid="select-content-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value} data-testid={`option-type-${t.value}`}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target-segment">Target Segment (optional)</Label>
              <Select value={targetSegment} onValueChange={setTargetSegment}>
                <SelectTrigger data-testid="select-target-segment">
                  <SelectValue placeholder="All segments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All segments</SelectItem>
                  {SEGMENTS.map(s => (
                    <SelectItem key={s.value} value={s.value} data-testid={`option-segment-${s.value}`}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel">Channel (optional)</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger data-testid="select-channel">
                <SelectValue placeholder="Any channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Any channel</SelectItem>
                {CHANNELS.map(c => (
                  <SelectItem key={c.value} value={c.value} data-testid={`option-channel-${c.value}`}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="context">Context / Topic</Label>
            <Textarea
              id="context"
              placeholder="Describe what the content is about, e.g. 'Weekend wine tasting event featuring our new Cabernet Sauvignon release'"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={3}
              data-testid="textarea-context"
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending || !context.trim()}
            data-testid="button-generate-content"
          >
            {generateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {generateMutation.isPending ? "Generating..." : "Generate Content"}
          </Button>
        </CardContent>
      </Card>

      {generateMutation.isPending && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {generatedResult && generatedResult.variations && !generateMutation.isPending && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-lg font-semibold" data-testid="text-variations-heading">Generated Variations</h3>
            <div className="flex items-center gap-2 flex-wrap">
              {typeBadge(generatedResult.type)}
              {statusBadge(generatedResult.status)}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {generatedResult.variations.map((variation, index) => (
              <Card
                key={index}
                className={selectedVariation === index ? "border-primary border-2" : ""}
                data-testid={`card-variation-${index}`}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="text-sm font-medium text-muted-foreground">Variation {index + 1}</span>
                    {selectedVariation === index && (
                      <Badge variant="default" data-testid={`badge-selected-${index}`}>Selected</Badge>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-wrap" data-testid={`text-variation-${index}`}>{variation}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelect(index)}
                      data-testid={`button-select-variation-${index}`}
                    >
                      {selectedVariation === index ? (
                        <Check className="h-3.5 w-3.5 mr-1" />
                      ) : null}
                      {selectedVariation === index ? "Selected" : "Select"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopy(variation, index)}
                      data-testid={`button-copy-variation-${index}`}
                    >
                      {copiedIndex === index ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-lg font-semibold" data-testid="text-history-heading">Content History</h3>

        {historyLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : !contentHistory || contentHistory.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-semibold mb-1" data-testid="text-no-content">No content generated yet</h3>
              <p className="text-sm text-muted-foreground">Use the generator above to create your first AI-powered content.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {contentHistory.map((item) => (
              <Card key={item.id} data-testid={`card-history-${item.id}`}>
                <CardContent className="p-4">
                  <div
                    className="flex items-center justify-between cursor-pointer flex-wrap gap-2"
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    data-testid={`button-expand-${item.id}`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      {expandedId === item.id ? (
                        <ChevronDown className="h-4 w-4 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      )}
                      <span className="font-medium truncate" data-testid={`text-history-title-${item.id}`}>{item.title}</span>
                      {typeBadge(item.type)}
                      {statusBadge(item.status)}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground" data-testid={`text-history-date-${item.id}`}>
                        {new Date(item.createdAt).toLocaleDateString('en-US')}
                      </span>
                      {deleteConfirmId === item.id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteMutation.mutate(item.id);
                            }}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-confirm-delete-${item.id}`}
                          >
                            {deleteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirm"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(null);
                            }}
                            data-testid={`button-cancel-delete-${item.id}`}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(item.id);
                          }}
                          data-testid={`button-delete-${item.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {expandedId === item.id && item.variations && (
                    <div className="mt-4 space-y-2 pl-6">
                      {item.variations.map((v, vi) => (
                        <div
                          key={vi}
                          className={`p-3 rounded-md border text-sm ${
                            item.selectedVariation === vi ? "border-primary bg-primary/5" : ""
                          }`}
                          data-testid={`text-history-variation-${item.id}-${vi}`}
                        >
                          <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                            <span className="text-xs font-medium text-muted-foreground">Variation {vi + 1}</span>
                            {item.selectedVariation === vi && (
                              <Badge variant="default" className="text-xs">Selected</Badge>
                            )}
                          </div>
                          <p className="whitespace-pre-wrap">{v}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
