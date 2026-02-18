import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CcMarketingScorecard } from "@shared/schema";
import {
  RefreshCw, TrendingUp, TrendingDown, Minus,
  BarChart3, Mail, MessageSquare, Share2, Monitor,
  Lightbulb, ListChecks,
} from "lucide-react";

interface ParsedMetrics {
  overallScore?: number;
  channelScores?: {
    email?: number;
    sms?: number;
    social?: number;
    onSite?: number;
  };
  topMetrics?: Array<{
    label: string;
    value: string | number;
    trend: "up" | "down" | "stable";
  }>;
}

function parseMetrics(metricsStr: string | null | undefined): ParsedMetrics {
  if (!metricsStr) return {};
  try {
    return JSON.parse(metricsStr);
  } catch {
    return {};
  }
}

function getScoreColor(score: number): string {
  if (score >= 70) return "text-green-600 dark:text-green-400";
  if (score >= 40) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function getScoreBg(score: number): string {
  if (score >= 70) return "bg-green-500";
  if (score >= 40) return "bg-yellow-500";
  return "bg-red-500";
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "up") return <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />;
  if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

const channelIcons: Record<string, typeof Mail> = {
  email: Mail,
  sms: MessageSquare,
  social: Share2,
  onSite: Monitor,
};

const channelLabels: Record<string, string> = {
  email: "Email",
  sms: "SMS",
  social: "Social",
  onSite: "On-Site",
};

export function MarketingScorecard() {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: scorecards, isLoading } = useQuery<CcMarketingScorecard[]>({
    queryKey: ["/api/growth-studio/scorecard"],
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/growth-studio/scorecard/generate");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/growth-studio/scorecard"] });
      toast({ title: "Scorecard generated", description: "New marketing scorecard has been created." });
    },
    onError: (err: Error) => {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="scorecard-loading">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const activeScorecard = selectedId
    ? scorecards?.find(s => s.id === selectedId)
    : scorecards?.[0];

  const metrics = parseMetrics(activeScorecard?.metrics);

  return (
    <div className="space-y-6" data-testid="marketing-scorecard">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold" data-testid="text-scorecard-title">AI Marketing Scorecard</h2>
          <p className="text-sm text-muted-foreground">Performance analysis for Nashoba Valley Winery</p>
        </div>
        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          data-testid="button-generate-scorecard"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${generateMutation.isPending ? "animate-spin" : ""}`} />
          {generateMutation.isPending ? "Generating..." : "Generate New Scorecard"}
        </Button>
      </div>

      {scorecards && scorecards.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap" data-testid="scorecard-history">
          {scorecards.map(sc => (
            <Badge
              key={sc.id}
              variant={activeScorecard?.id === sc.id ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedId(sc.id)}
              data-testid={`badge-scorecard-${sc.id}`}
            >
              {sc.periodLabel} — {new Date(sc.createdAt).toLocaleDateString()}
            </Badge>
          ))}
        </div>
      )}

      {!activeScorecard && (
        <Card>
          <CardContent className="p-8 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-base font-medium mb-1" data-testid="text-no-scorecard">No scorecards yet</h3>
            <p className="text-sm text-muted-foreground">Generate your first marketing scorecard to see performance insights.</p>
          </CardContent>
        </Card>
      )}

      {activeScorecard && (
        <>
          {metrics.overallScore !== undefined && (
            <Card data-testid="card-overall-score">
              <CardContent className="p-6 flex items-center gap-6 flex-wrap">
                <div className="text-center">
                  <div className={`text-5xl font-bold ${getScoreColor(metrics.overallScore)}`} data-testid="text-overall-score">
                    {metrics.overallScore}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Overall Score</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="w-full bg-muted rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${getScoreBg(metrics.overallScore)}`}
                      style={{ width: `${Math.min(100, metrics.overallScore)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {metrics.channelScores && (
            <div data-testid="channel-scores">
              <h3 className="text-sm font-semibold mb-3">Channel Scores</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(Object.entries(metrics.channelScores) as [string, number][]).map(([channel, score]) => {
                  const Icon = channelIcons[channel] || Monitor;
                  return (
                    <Card key={channel} data-testid={`card-channel-${channel}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{channelLabels[channel] || channel}</span>
                        </div>
                        <div className={`text-2xl font-bold mb-1 ${getScoreColor(score)}`} data-testid={`text-channel-score-${channel}`}>
                          {score}
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${getScoreBg(score)}`}
                            style={{ width: `${Math.min(100, score)}%` }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {metrics.topMetrics && metrics.topMetrics.length > 0 && (
            <div data-testid="top-metrics">
              <h3 className="text-sm font-semibold mb-3">Top Metrics</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {metrics.topMetrics.map((metric, idx) => (
                  <Card key={idx} data-testid={`card-metric-${idx}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs text-muted-foreground truncate">{metric.label}</span>
                        <TrendIcon trend={metric.trend} />
                      </div>
                      <div className="text-xl font-bold" data-testid={`text-metric-value-${idx}`}>
                        {metric.value}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeScorecard.insights && (
            <Card data-testid="card-insights">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Key Insights</h3>
                </div>
                <ul className="space-y-2">
                  {activeScorecard.insights.split("\n").filter(Boolean).map((insight, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm" data-testid={`text-insight-${idx}`}>
                      <span className="text-muted-foreground mt-0.5">&#8226;</span>
                      <span>{insight.replace(/^[-•*]\s*/, "")}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {activeScorecard.recommendations && (
            <Card data-testid="card-recommendations">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ListChecks className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Recommendations</h3>
                </div>
                <ol className="space-y-2">
                  {activeScorecard.recommendations.split("\n").filter(Boolean).map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm" data-testid={`text-recommendation-${idx}`}>
                      <span className="font-medium text-muted-foreground min-w-[1.5rem]">{idx + 1}.</span>
                      <span>{rec.replace(/^\d+[.)]\s*/, "")}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
