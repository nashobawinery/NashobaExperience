import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Ban,
  Tag,
  AlertTriangle,
  CheckCircle,
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

interface VoidDiscountDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  displayDate: string;
  initialTab?: "voids" | "discounts";
}

function formatCurrency(val: string | number): string {
  const n = typeof val === "string" ? parseFloat(val) : val;
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function VoidDiscountDetailDialog({
  open,
  onOpenChange,
  date,
  displayDate,
  initialTab = "voids",
}: VoidDiscountDetailDialogProps) {
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [initialTab, open]);

  const { data: records = [], isLoading } = useQuery<VoidDiscountRecord[]>({
    queryKey: ["/api/revenue-detail/voids-discounts", date],
    queryFn: async () => {
      const res = await fetch(`/api/revenue-detail/voids-discounts?date=${date}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: open && !!date,
  });

  const voids = records.filter((r) => r.record_type === "void");
  const discounts = records.filter((r) => r.record_type === "discount");

  const totalVoidAmount = voids.reduce((sum, v) => sum + parseFloat(v.amount || "0"), 0);
  const totalDiscountAmount = discounts.reduce((sum, d) => sum + parseFloat(d.amount || "0"), 0);
  const explainedVoids = voids.filter((v) => v.explanation);

  const discountsByName = discounts.reduce((acc, d) => {
    const name = d.discount_name || "Other";
    if (!acc[name]) acc[name] = { items: [], total: 0 };
    acc[name].items.push(d);
    acc[name].total += parseFloat(d.amount || "0");
    return acc;
  }, {} as Record<string, { items: VoidDiscountRecord[]; total: number }>);

  const sortedDiscountGroups = Object.entries(discountsByName).sort(
    ([, a], [, b]) => b.total - a.total
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="dialog-title-void-discount-detail">
            <span>Voids & Discounts — {displayDate}</span>
          </DialogTitle>
          <DialogDescription>
            Individual void and discount detail from Toast POS
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : voids.length === 0 && discounts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No void or discount detail available for this date. Sync revenue detail first.
          </p>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "voids" | "discounts")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="voids" className="gap-1.5" data-testid="tab-voids">
                <Ban className="h-3.5 w-3.5" />
                Voids ({voids.length})
                {totalVoidAmount > 0 && (
                  <Badge variant="destructive" className="ml-1 text-[10px] px-1.5">
                    {formatCurrency(totalVoidAmount)}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="discounts" className="gap-1.5" data-testid="tab-discounts">
                <Tag className="h-3.5 w-3.5" />
                Discounts ({discounts.length})
                {totalDiscountAmount > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">
                    {formatCurrency(totalDiscountAmount)}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="voids" className="mt-4 space-y-3">
              {voids.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No voids for this date</p>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2 text-sm flex-wrap">
                    <span className="text-muted-foreground">
                      {voids.length} void{voids.length !== 1 ? "s" : ""} totaling{" "}
                      <span className="font-medium text-destructive">{formatCurrency(totalVoidAmount)}</span>
                    </span>
                    <Badge
                      variant="outline"
                      className={explainedVoids.length === voids.length
                        ? "text-green-600 border-green-300"
                        : "text-amber-600 border-amber-300"}
                    >
                      {explainedVoids.length === voids.length ? (
                        <><CheckCircle className="h-3 w-3 mr-1" />All explained</>
                      ) : (
                        <><AlertTriangle className="h-3 w-3 mr-1" />{voids.length - explainedVoids.length} unexplained</>
                      )}
                    </Badge>
                  </div>
                  {voids.map((v) => (
                    <Card key={v.id} data-testid={`void-detail-${v.id}`}>
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="destructive" className="text-xs">
                                {v.level === "order" ? "Order Void" : v.level === "check" ? "Check Void" : "Item Void"}
                              </Badge>
                              {v.order_number && (
                                <span className="text-xs text-muted-foreground">Order #{v.order_number}</span>
                              )}
                              {v.revenue_center_name && v.revenue_center_name !== "Uncategorized" && (
                                <span className="text-xs text-muted-foreground">{v.revenue_center_name}</span>
                              )}
                            </div>
                            {v.item_name && <p className="text-sm font-medium">{v.item_name}</p>}
                            {v.occurred_at && (
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(v.occurred_at), "h:mm a")}
                              </p>
                            )}
                          </div>
                          <span className="font-semibold text-destructive whitespace-nowrap">
                            {formatCurrency(v.amount)}
                          </span>
                        </div>
                        {v.explanation ? (
                          <div className="bg-muted/50 rounded-md p-2">
                            <p className="text-xs font-medium text-muted-foreground mb-0.5">
                              Explanation{v.explained_by_name ? ` by ${v.explained_by_name}` : ""}
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
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
            </TabsContent>

            <TabsContent value="discounts" className="mt-4 space-y-3">
              {discounts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No discounts for this date</p>
              ) : (
                <>
                  <div className="text-sm text-muted-foreground">
                    {discounts.length} discount{discounts.length !== 1 ? "s" : ""} totaling{" "}
                    <span className="font-medium">{formatCurrency(totalDiscountAmount)}</span>
                    {sortedDiscountGroups.length > 0 && (
                      <span> across {sortedDiscountGroups.length} type{sortedDiscountGroups.length !== 1 ? "s" : ""}</span>
                    )}
                  </div>

                  {sortedDiscountGroups.map(([name, group]) => (
                    <Card key={name} data-testid={`discount-group-${name}`}>
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Tag className="h-4 w-4 text-blue-500" />
                            <span className="font-medium text-sm">{name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {group.items.length}x
                            </Badge>
                          </div>
                          <span className="font-semibold whitespace-nowrap">
                            {formatCurrency(group.total)}
                          </span>
                        </div>
                        <div className="space-y-1.5 pl-6">
                          {group.items.map((d) => (
                            <div
                              key={d.id}
                              className="flex items-start justify-between gap-2 text-sm"
                              data-testid={`discount-item-${d.id}`}
                            >
                              <div className="space-y-0.5 min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {d.order_number && (
                                    <span className="text-xs text-muted-foreground">#{d.order_number}</span>
                                  )}
                                  {d.item_name && (
                                    <span className="text-xs">{d.item_name}</span>
                                  )}
                                  {d.revenue_center_name && d.revenue_center_name !== "Uncategorized" && (
                                    <span className="text-xs text-muted-foreground">{d.revenue_center_name}</span>
                                  )}
                                </div>
                                {d.discount_reason_name && (
                                  <p className="text-xs text-muted-foreground">
                                    Reason: {d.discount_reason_name}
                                    {d.discount_reason_comment ? ` — ${d.discount_reason_comment}` : ""}
                                  </p>
                                )}
                                {d.occurred_at && (
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(d.occurred_at), "h:mm a")}
                                  </p>
                                )}
                              </div>
                              <span className="text-muted-foreground whitespace-nowrap">
                                {formatCurrency(d.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
