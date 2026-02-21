import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  Ban,
  Tag,
  CheckCircle,
  Save,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format } from "date-fns";

interface VoidDiscountRecord {
  id: number;
  date: string;
  record_type: "void" | "discount";
  level: string;
  order_guid: string | null;
  order_number: string | null;
  check_guid: string | null;
  item_name: string | null;
  item_guid: string | null;
  amount: string;
  discount_name: string | null;
  discount_type: string | null;
  discount_reason_name: string | null;
  discount_reason_comment: string | null;
  void_reason_guid: string | null;
  approver_guid: string | null;
  server_guid: string | null;
  revenue_center_name: string | null;
  restaurant_name: string | null;
  occurred_at: string | null;
  explanation_id: number | null;
  explanation: string | null;
  explained_by_name: string | null;
  explanation_report_id: string | null;
}

interface ToastVoidsDiscountsPanelProps {
  date: string;
  reportId?: string;
  explainedByName?: string;
  explainedById?: string;
  mode?: "view" | "edit";
  showDiscounts?: boolean;
  onExplanationsChanged?: (allVoidsExplained: boolean) => void;
}

export default function ToastVoidsDiscountsPanel({
  date,
  reportId,
  explainedByName,
  explainedById,
  mode = "view",
  showDiscounts = true,
  onExplanationsChanged,
}: ToastVoidsDiscountsPanelProps) {
  const { toast } = useToast();
  const [explanations, setExplanations] = useState<Record<number, string>>({});
  const [expandedDiscounts, setExpandedDiscounts] = useState(false);

  const { data: records = [], isLoading } = useQuery<VoidDiscountRecord[]>({
    queryKey: ["/api/revenue-detail/voids-discounts", date],
    queryFn: async () => {
      const res = await fetch(`/api/revenue-detail/voids-discounts?date=${date}`);
      if (!res.ok) throw new Error("Failed to fetch void/discount data");
      return res.json();
    },
    enabled: !!date,
  });

  const voids = records.filter((r) => r.record_type === "void");
  const discounts = records.filter((r) => r.record_type === "discount");

  useEffect(() => {
    const initial: Record<number, string> = {};
    for (const r of records) {
      if (r.explanation) {
        initial[r.id] = r.explanation;
      }
    }
    setExplanations(initial);
  }, [records]);

  useEffect(() => {
    if (onExplanationsChanged && voids.length > 0) {
      const allExplained = voids.every(
        (v) => (explanations[v.id] || "").trim().length > 0
      );
      onExplanationsChanged(allExplained);
    } else if (onExplanationsChanged && voids.length === 0) {
      onExplanationsChanged(true);
    }
  }, [explanations, voids, onExplanationsChanged]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const items = Object.entries(explanations)
        .filter(([, exp]) => exp.trim().length > 0)
        .map(([id, explanation]) => ({
          voidDetailId: parseInt(id),
          explanation,
        }));
      if (items.length === 0) return;
      await apiRequest(
        "POST",
        "/api/revenue-detail/void-explanations-batch",
        {
          explanations: items,
          explainedById: explainedById || null,
          explainedByName: explainedByName || null,
          reportId: reportId || null,
        }
      );
    },
    onSuccess: () => {
      toast({ title: "Explanations saved" });
      queryClient.invalidateQueries({
        queryKey: ["/api/revenue-detail/voids-discounts", date],
      });
    },
    onError: (err: any) => {
      toast({
        title: "Save failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const totalVoidAmount = voids.reduce(
    (sum, v) => sum + parseFloat(v.amount || "0"),
    0
  );
  const totalDiscountAmount = discounts.reduce(
    (sum, d) => sum + parseFloat(d.amount || "0"),
    0
  );
  const unexplainedVoids = voids.filter(
    (v) => !(explanations[v.id] || "").trim()
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (voids.length === 0 && discounts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {voids.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-destructive" />
                <CardTitle className="text-base">
                  Voids ({voids.length})
                </CardTitle>
                <Badge variant="destructive">
                  ${totalVoidAmount.toFixed(2)}
                </Badge>
              </div>
              {mode === "edit" && unexplainedVoids.length > 0 && (
                <Badge variant="outline" className="text-amber-600 border-amber-300">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {unexplainedVoids.length} need explanation
                </Badge>
              )}
              {mode === "edit" && unexplainedVoids.length === 0 && voids.length > 0 && (
                <Badge variant="outline" className="text-green-600 border-green-300">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  All explained
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {voids.map((v) => (
              <div
                key={v.id}
                className="border rounded-md p-3 space-y-2"
                data-testid={`void-record-${v.id}`}
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="destructive" className="text-xs">
                        {v.level === "order"
                          ? "Order Void"
                          : v.level === "check"
                          ? "Check Void"
                          : "Item Void"}
                      </Badge>
                      {v.order_number && (
                        <span className="text-xs text-muted-foreground">
                          Order #{v.order_number}
                        </span>
                      )}
                      {v.revenue_center_name && v.revenue_center_name !== "Uncategorized" && (
                        <span className="text-xs text-muted-foreground">
                          {v.revenue_center_name}
                        </span>
                      )}
                    </div>
                    {v.item_name && (
                      <p className="text-sm font-medium">{v.item_name}</p>
                    )}
                    {v.occurred_at && (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(v.occurred_at), "h:mm a")}
                      </p>
                    )}
                  </div>
                  <span className="font-semibold text-destructive whitespace-nowrap">
                    ${parseFloat(v.amount).toFixed(2)}
                  </span>
                </div>

                {mode === "edit" ? (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Explanation {!(explanations[v.id] || "").trim() && (
                        <span className="text-amber-600">*required</span>
                      )}
                    </label>
                    <Textarea
                      placeholder="Explain why this was voided..."
                      value={explanations[v.id] || ""}
                      onChange={(e) =>
                        setExplanations((prev) => ({
                          ...prev,
                          [v.id]: e.target.value,
                        }))
                      }
                      className="text-sm min-h-[60px]"
                      data-testid={`void-explanation-input-${v.id}`}
                    />
                  </div>
                ) : v.explanation ? (
                  <div className="bg-muted/50 rounded-md p-2">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Explanation
                      {v.explained_by_name && (
                        <span> by {v.explained_by_name}</span>
                      )}
                    </p>
                    <p className="text-sm">{v.explanation}</p>
                  </div>
                ) : (
                  <div className="bg-amber-50 dark:bg-amber-950/30 rounded-md p-2">
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      No explanation provided
                    </p>
                  </div>
                )}
              </div>
            ))}

            {mode === "edit" && (
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="w-full"
                data-testid="btn-save-void-explanations"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Void Explanations
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {showDiscounts && discounts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <button
              className="flex items-center justify-between gap-2 w-full text-left"
              onClick={() => setExpandedDiscounts(!expandedDiscounts)}
              data-testid="btn-toggle-discounts"
            >
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-base">
                  Discounts ({discounts.length})
                </CardTitle>
                <Badge variant="secondary">
                  ${totalDiscountAmount.toFixed(2)}
                </Badge>
              </div>
              {expandedDiscounts ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </CardHeader>
          {expandedDiscounts && (
            <CardContent className="space-y-2">
              {discounts.map((d) => (
                <div
                  key={d.id}
                  className="flex items-start justify-between gap-2 p-2 border rounded-md"
                  data-testid={`discount-record-${d.id}`}
                >
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {d.level === "check" ? "Check Discount" : "Item Discount"}
                      </Badge>
                      {d.order_number && (
                        <span className="text-xs text-muted-foreground">
                          Order #{d.order_number}
                        </span>
                      )}
                    </div>
                    {d.discount_name && (
                      <p className="text-sm font-medium">{d.discount_name}</p>
                    )}
                    {d.item_name && (
                      <p className="text-xs text-muted-foreground">
                        {d.item_name}
                      </p>
                    )}
                    {d.discount_reason_name && (
                      <p className="text-xs text-muted-foreground">
                        Reason: {d.discount_reason_name}
                        {d.discount_reason_comment && ` - ${d.discount_reason_comment}`}
                      </p>
                    )}
                  </div>
                  <span className="font-semibold text-blue-600 whitespace-nowrap">
                    ${parseFloat(d.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
