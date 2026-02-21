import { useState, useEffect } from "react";
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

type SourceFilter = "all" | "toast" | "shopify" | "wholesale";

interface RevenueDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  displayDate: string;
  toastRevenue?: string | null;
  shopifyRevenue?: string | null;
  wholesaleRevenue?: string | null;
  sourceFilter?: SourceFilter;
}

interface CenterRow {
  guid: string | null;
  name: string;
  source: string;
  net_sales: string;
  gross_sales?: string;
  discount_amount?: string;
  service_charge_amount?: string;
  order_count: string;
}

interface CategoryRow {
  guid: string | null;
  name: string;
  source: string;
  net_sales: string;
  gross_sales?: string;
  discount_amount?: string;
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

const SOURCE_LABELS: Record<SourceFilter, string> = {
  all: "Revenue Detail",
  toast: "Toast POS Detail",
  shopify: "Shopify Detail",
  wholesale: "Wholesale (B2B) Detail",
};

interface WholesaleOrderRow {
  orderNumber: string;
  customerName: string;
  status: string;
  totalAmount: string;
  itemCount: number;
  items: Array<{ name: string; quantity: number; price: string; total: string }>;
}

export function RevenueDetailDialog({
  open,
  onOpenChange,
  date,
  displayDate,
  toastRevenue,
  shopifyRevenue,
  wholesaleRevenue,
  sourceFilter = "all",
}: RevenueDetailDialogProps) {
  const { toast } = useToast();
  const defaultTab = sourceFilter === "shopify" ? "categories" : "overview";
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    if (open) {
      setActiveTab(sourceFilter === "shopify" ? "categories" : "overview");
    }
  }, [sourceFilter, open]);

  const showToast = sourceFilter === "all" || sourceFilter === "toast";
  const showShopify = sourceFilter === "all" || sourceFilter === "shopify";
  const showWholesale = sourceFilter === "wholesale";

  const { data: breakdown, isLoading, refetch } = useQuery<{
    revenueCenters: CenterRow[];
    salesCategories: CategoryRow[];
    topItems: ItemRow[];
  }>({
    queryKey: ["/api/revenue-detail/daily-breakdown", { date }],
    enabled: open && (showToast || showShopify),
  });

  const { data: wholesaleBreakdown, isLoading: isLoadingWholesale } = useQuery<{
    orders: WholesaleOrderRow[];
    totalAmount: number;
    orderCount: number;
  }>({
    queryKey: ["/api/revenue-detail/wholesale-breakdown", { date }],
    enabled: open && showWholesale,
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
  const totalWholesale = parseFloat(wholesaleRevenue || "0");
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
              <span>{SOURCE_LABELS[sourceFilter]} — {displayDate}</span>
            </div>
            {(showToast || showShopify) && (
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
            )}
          </DialogTitle>
        </DialogHeader>

        {sourceFilter === "all" ? (
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
        ) : (
          <div className="mb-4">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">{SOURCE_LABELS[sourceFilter].replace(" Detail", "")}</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-source-total">
                  {formatCurrency(sourceFilter === "toast" ? totalToast : sourceFilter === "shopify" ? totalShopify : totalWholesale)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {showWholesale && (
          isLoadingWholesale ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : wholesaleBreakdown && wholesaleBreakdown.orders.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">{wholesaleBreakdown.orderCount} order{wholesaleBreakdown.orderCount !== 1 ? "s" : ""}</span>
                <span className="font-bold">{formatCurrency(wholesaleBreakdown.totalAmount)}</span>
              </div>
              {wholesaleBreakdown.orders.map((order, i) => (
                <Card key={i}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <p className="font-medium text-sm" data-testid={`text-wholesale-order-${i}`}>Order #{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">{order.customerName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">{formatCurrency(order.totalAmount)}</p>
                        <Badge variant="outline" className="text-[10px]" data-testid={`badge-wholesale-status-${i}`}>{order.status}</Badge>
                      </div>
                    </div>
                    {order.items.length > 0 && (
                      <div className="border-t pt-2">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left text-muted-foreground">
                              <th className="pb-1 font-medium">Item</th>
                              <th className="pb-1 font-medium text-right">Qty</th>
                              <th className="pb-1 font-medium text-right">Price</th>
                              <th className="pb-1 font-medium text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {order.items.map((item, j) => (
                              <tr key={j} className="border-b border-muted/30 last:border-0">
                                <td className="py-1 truncate max-w-[200px]">{item.name}</td>
                                <td className="py-1 text-right">{item.quantity}</td>
                                <td className="py-1 text-right">{formatCurrency(item.price)}</td>
                                <td className="py-1 text-right font-medium">{formatCurrency(item.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No wholesale orders for this date</p>
              <p className="text-sm mt-1">B2B orders that were delivered on this date will appear here.</p>
            </div>
          )
        )}

        {(showToast || showShopify) && !showWholesale && (isLoading ? (
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
              {sourceFilter !== "shopify" && (
                <>
                  <TabsTrigger value="overview" className="flex-1" data-testid="tab-overview">
                    <TrendingUp className="h-3.5 w-3.5 mr-1.5" />Overview
                  </TabsTrigger>
                  {showToast && (
                    <TabsTrigger value="centers" className="flex-1" data-testid="tab-centers">
                      <Store className="h-3.5 w-3.5 mr-1.5" />Centers
                    </TabsTrigger>
                  )}
                </>
              )}
              <TabsTrigger value="categories" className="flex-1" data-testid="tab-categories">
                <Tag className="h-3.5 w-3.5 mr-1.5" />Categories
              </TabsTrigger>
              <TabsTrigger value="items" className="flex-1" data-testid="tab-items">
                <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />Top Items
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
              {showToast && toastCenters.length > 0 && (
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

              {((showToast && toastCategories.length > 0) || (showShopify && shopifyCategories.length > 0)) && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    Top Categories
                  </h4>
                  <div className="space-y-1.5">
                    {[...(showToast ? toastCategories : []), ...(showShopify ? shopifyCategories : [])]
                      .sort((a, b) => parseFloat(b.net_sales) - parseFloat(a.net_sales))
                      .slice(0, 8)
                      .map((cat, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 text-sm">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="truncate">{cat.name}</span>
                            {sourceFilter === "all" && <SourceBadge source={cat.source} />}
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
                    const discount = parseFloat(rc.discount_amount || "0");
                    const svcCharge = parseFloat(rc.service_charge_amount || "0");
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
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] text-muted-foreground">{pct.toFixed(1)}% of total revenue</p>
                          {(discount > 0 || svcCharge > 0) && (
                            <p className="text-[11px] text-muted-foreground">
                              {discount > 0 && <span className="text-red-500 dark:text-red-400">-{formatCurrency(discount)} disc</span>}
                              {discount > 0 && svcCharge > 0 && " / "}
                              {svcCharge > 0 && <span className="text-blue-500 dark:text-blue-400">+{formatCurrency(svcCharge)} svc</span>}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No revenue center data. Revenue centers come from Toast POS only.</p>
              )}
            </TabsContent>

            <TabsContent value="categories" className="mt-4 space-y-4">
              {showToast && toastCategories.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Toast Sales Categories</h4>
                  <div className="space-y-1.5">
                    {toastCategories.map((cat, i) => {
                      const pct = totalToast > 0 ? (parseFloat(cat.net_sales) / totalToast) * 100 : 0;
                      const discount = parseFloat(cat.discount_amount || "0");
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <span className="truncate">{cat.name}</span>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-muted-foreground text-xs">{cat.item_count} items</span>
                              {discount > 0 && <span className="text-red-500 dark:text-red-400 text-xs">-{formatCurrency(discount)}</span>}
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

              {showShopify && shopifyCategories.length > 0 && (
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
              {showToast && toastItems.length > 0 && (
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

              {showShopify && shopifyItems.length > 0 && (
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
        ))}
      </DialogContent>
    </Dialog>
  );
}
