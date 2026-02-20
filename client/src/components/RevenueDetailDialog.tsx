import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  RefreshCw,
  Store,
  Tag,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  BarChart3,
  Package,
} from "lucide-react";

interface RevenueDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  displayDate: string;
  toastRevenue?: string | null;
  shopifyRevenue?: string | null;
}

interface CenterRow {
  guid: string | null;
  name: string;
  source: string;
  net_sales: string;
  order_count: string;
}

interface CategoryRow {
  guid: string | null;
  name: string;
  source: string;
  net_sales: string;
  item_count: string;
}

interface ItemRow {
  item_name: string;
  source: string;
  sales_category_name: string | null;
  revenue_center_name: string | null;
  product_type: string | null;
  vendor: string | null;
  quantity: string;
  net_sales: string;
  total_qty?: string;
  total_sales?: string;
}

function formatCurrency(val: string | number): string {
  const n = typeof val === "string" ? parseFloat(val) : val;
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function SourceBadge({ source }: { source: string }) {
  if (source === "toast") return <Badge variant="outline" className="text-[10px] px-1.5 py-0">Toast</Badge>;
  if (source === "shopify") return <Badge variant="outline" className="text-[10px] px-1.5 py-0">Shopify</Badge>;
  return <Badge variant="outline" className="text-[10px] px-1.5 py-0">{source}</Badge>;
}

export function RevenueDetailDialog({
  open,
  onOpenChange,
  date,
  displayDate,
  toastRevenue,
  shopifyRevenue,
}: RevenueDetailDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: breakdown, isLoading, refetch } = useQuery<{
    revenueCenters: CenterRow[];
    salesCategories: CategoryRow[];
    topItems: ItemRow[];
  }>({
    queryKey: ["/api/revenue-detail/daily-breakdown", { date }],
    enabled: open,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/revenue-detail/sync-detail", { date });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Revenue detail synced", description: `Toast: ${data.toast?.items || 0} items, Shopify: ${data.shopify?.items || 0} items` });
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/rcc/weeks"] });
    },
    onError: (err: any) => {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    },
  });

  const totalToast = parseFloat(toastRevenue || "0");
  const totalShopify = parseFloat(shopifyRevenue || "0");
  const grandTotal = totalToast + totalShopify;

  const hasData = breakdown && (
    breakdown.revenueCenters.length > 0 ||
    breakdown.salesCategories.length > 0 ||
    breakdown.topItems.length > 0
  );

  const toastCenters = breakdown?.revenueCenters?.filter(r => r.source === "toast") || [];
  const toastCategories = breakdown?.salesCategories?.filter(r => r.source === "toast") || [];
  const shopifyCategories = breakdown?.salesCategories?.filter(r => r.source === "shopify") || [];
  const toastItems = breakdown?.topItems?.filter(r => r.source === "toast") || [];
  const shopifyItems = breakdown?.topItems?.filter(r => r.source === "shopify") || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2 flex-wrap" data-testid="dialog-title-revenue-detail">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <span>Revenue Detail — {displayDate}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              data-testid="btn-sync-revenue-detail"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />
              {syncMutation.isPending ? "Syncing..." : "Sync Detail"}
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Toast POS</p>
              <p className="text-lg font-bold" data-testid="text-toast-total">{formatCurrency(totalToast)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Shopify</p>
              <p className="text-lg font-bold" data-testid="text-shopify-total">{formatCurrency(totalShopify)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Combined</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400" data-testid="text-combined-total">{formatCurrency(grandTotal)}</p>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : !hasData ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No detail data yet</p>
            <p className="text-sm mt-1">Click "Sync Detail" to pull item-level breakdowns from Toast and Shopify.</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full" data-testid="tabs-revenue-detail">
              <TabsTrigger value="overview" className="flex-1" data-testid="tab-overview">
                <TrendingUp className="h-3.5 w-3.5 mr-1.5" />Overview
              </TabsTrigger>
              <TabsTrigger value="centers" className="flex-1" data-testid="tab-centers">
                <Store className="h-3.5 w-3.5 mr-1.5" />Centers
              </TabsTrigger>
              <TabsTrigger value="categories" className="flex-1" data-testid="tab-categories">
                <Tag className="h-3.5 w-3.5 mr-1.5" />Categories
              </TabsTrigger>
              <TabsTrigger value="items" className="flex-1" data-testid="tab-items">
                <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />Top Items
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
              {toastCenters.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                    <Store className="h-4 w-4 text-muted-foreground" />
                    Revenue Centers (Toast)
                  </h4>
                  <div className="space-y-1.5">
                    {toastCenters.map((rc, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate">{rc.name}</span>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-muted-foreground text-xs">{rc.order_count} orders</span>
                          <span className="font-medium">{formatCurrency(rc.net_sales)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(toastCategories.length > 0 || shopifyCategories.length > 0) && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    Top Categories
                  </h4>
                  <div className="space-y-1.5">
                    {[...toastCategories, ...shopifyCategories]
                      .sort((a, b) => parseFloat(b.net_sales) - parseFloat(a.net_sales))
                      .slice(0, 8)
                      .map((cat, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 text-sm">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="truncate">{cat.name}</span>
                            <SourceBadge source={cat.source} />
                          </div>
                          <span className="font-medium shrink-0">{formatCurrency(cat.net_sales)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="centers" className="mt-4">
              {toastCenters.length > 0 ? (
                <div className="space-y-2">
                  {toastCenters.map((rc, i) => {
                    const pct = grandTotal > 0 ? (parseFloat(rc.net_sales) / grandTotal) * 100 : 0;
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="font-medium truncate">{rc.name}</span>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-muted-foreground text-xs">{rc.order_count} orders</span>
                            <span className="font-bold">{formatCurrency(rc.net_sales)}</span>
                          </div>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/70 rounded-full transition-all"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground">{pct.toFixed(1)}% of total revenue</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No revenue center data. Revenue centers come from Toast POS only.</p>
              )}
            </TabsContent>

            <TabsContent value="categories" className="mt-4 space-y-4">
              {toastCategories.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Toast Sales Categories</h4>
                  <div className="space-y-1.5">
                    {toastCategories.map((cat, i) => {
                      const pct = totalToast > 0 ? (parseFloat(cat.net_sales) / totalToast) * 100 : 0;
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <span className="truncate">{cat.name}</span>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-muted-foreground text-xs">{cat.item_count} items</span>
                              <span className="font-medium">{formatCurrency(cat.net_sales)}</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-0.5">
                            <div className="h-full bg-orange-500/70 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {shopifyCategories.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Shopify Product Types</h4>
                  <div className="space-y-1.5">
                    {shopifyCategories.map((cat, i) => {
                      const pct = totalShopify > 0 ? (parseFloat(cat.net_sales) / totalShopify) * 100 : 0;
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <span className="truncate">{cat.name}</span>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-muted-foreground text-xs">{cat.item_count} items</span>
                              <span className="font-medium">{formatCurrency(cat.net_sales)}</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-0.5">
                            <div className="h-full bg-green-500/70 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {toastCategories.length === 0 && shopifyCategories.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No category data available.</p>
              )}
            </TabsContent>

            <TabsContent value="items" className="mt-4 space-y-4">
              {toastItems.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Toast Items</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-1.5 font-medium">Item</th>
                          <th className="pb-1.5 font-medium text-right">Qty</th>
                          <th className="pb-1.5 font-medium text-right">Sales</th>
                        </tr>
                      </thead>
                      <tbody>
                        {toastItems.slice(0, 30).map((item, i) => (
                          <tr key={i} className="border-b border-muted/50 last:border-0">
                            <td className="py-1.5">
                              <span className="truncate block max-w-[250px]">{item.item_name}</span>
                              {item.sales_category_name && (
                                <span className="text-[11px] text-muted-foreground">{item.sales_category_name}</span>
                              )}
                            </td>
                            <td className="py-1.5 text-right">{item.quantity}</td>
                            <td className="py-1.5 text-right font-medium">{formatCurrency(item.net_sales)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {shopifyItems.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Shopify Items</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-1.5 font-medium">Item</th>
                          <th className="pb-1.5 font-medium text-right">Qty</th>
                          <th className="pb-1.5 font-medium text-right">Sales</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shopifyItems.slice(0, 30).map((item, i) => (
                          <tr key={i} className="border-b border-muted/50 last:border-0">
                            <td className="py-1.5">
                              <span className="truncate block max-w-[250px]">{item.item_name}</span>
                              {item.product_type && (
                                <span className="text-[11px] text-muted-foreground">{item.product_type}</span>
                              )}
                            </td>
                            <td className="py-1.5 text-right">{item.quantity}</td>
                            <td className="py-1.5 text-right font-medium">{formatCurrency(item.net_sales)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {toastItems.length === 0 && shopifyItems.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No item data available.</p>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
