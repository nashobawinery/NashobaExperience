import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  RefreshCw, Search, Eye, EyeOff, Link2, Unlink, Store, ShoppingBag, Package,
  CheckCircle2, AlertCircle, ArrowUpDown, Filter, Upload
} from "lucide-react";

interface ProductOption {
  id: string;
  name: string;
  category: string;
  bottleSize?: string | null;
}

interface ToastMapping {
  id: number;
  itemGuid: string;
  itemName: string;
  menuGuid: string | null;
  menuName: string | null;
  menuGroupGuid: string | null;
  menuGroupName: string | null;
  restaurantGuid: string | null;
  restaurantName: string | null;
  productId: string | null;
  isAutoMatched: boolean;
  isIgnored: boolean;
}

interface ShopifyMapping {
  id: number;
  shopifyProductId: string;
  shopifyTitle: string;
  shopifyProductType: string | null;
  shopifyVendor: string | null;
  productId: string | null;
  isAutoMatched: boolean;
  isIgnored: boolean;
}

interface WholesaleMapping {
  id: number;
  qbItemId: string;
  qbItemName: string;
  productId: string | null;
  isAutoMatched: boolean;
  isIgnored: boolean;
}

interface ChannelSummary {
  toast: { total: number; mapped: number; unmapped: number; ignored: number };
  shopify: { total: number; mapped: number; unmapped: number; ignored: number };
  wholesale: { total: number; mapped: number; unmapped: number; ignored: number };
  productsWithMappings: number;
  totalProducts: number;
}

export function ProductChannelMapping() {
  const [activeTab, setActiveTab] = useState("toast");
  const { toast } = useToast();

  const { data: summary } = useQuery<ChannelSummary>({
    queryKey: ["/api/cellartraks/product-channel-mapping/summary"],
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold" data-testid="text-channel-mapping-title">Product Channel Mapping</h2>
          <p className="text-sm text-muted-foreground">
            Map menu items from each sales channel to your master product catalog for unified reporting
          </p>
        </div>
        {summary && (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" data-testid="badge-products-mapped">
              {summary.productsWithMappings}/{summary.totalProducts} Products Linked
            </Badge>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-channel-list">
          <TabsTrigger value="toast" className="gap-1.5" data-testid="tab-toast">
            <Store className="h-3.5 w-3.5" />
            Toast POS
            {summary && (
              <Badge variant={summary.toast.unmapped > 0 ? "destructive" : "secondary"} className="ml-1 text-xs">
                {summary.toast.mapped}/{summary.toast.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="shopify" className="gap-1.5" data-testid="tab-shopify">
            <ShoppingBag className="h-3.5 w-3.5" />
            Shopify
            {summary && (
              <Badge variant={summary.shopify.unmapped > 0 ? "destructive" : "secondary"} className="ml-1 text-xs">
                {summary.shopify.mapped}/{summary.shopify.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="wholesale" className="gap-1.5" data-testid="tab-wholesale">
            <Package className="h-3.5 w-3.5" />
            Wholesale (QB)
            {summary && (
              <Badge variant={summary.wholesale.unmapped > 0 ? "destructive" : "secondary"} className="ml-1 text-xs">
                {summary.wholesale.mapped}/{summary.wholesale.total}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="toast">
          <ToastMappingTab />
        </TabsContent>
        <TabsContent value="shopify">
          <ShopifyMappingTab />
        </TabsContent>
        <TabsContent value="wholesale">
          <WholesaleMappingTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type SortField = "name" | "menu" | "status";
type FilterStatus = "all" | "mapped" | "unmapped";

function ToastMappingTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showIgnored, setShowIgnored] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterMenu, setFilterMenu] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("name");

  const { data, isLoading } = useQuery<{ mappings: ToastMapping[]; products: ProductOption[] }>({
    queryKey: ["/api/cellartraks/product-channel-mapping/toast"],
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/cellartraks/product-channel-mapping/toast/sync");
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Toast Items Synced", description: `${data.added} new items added, ${data.autoMatched} auto-matched` });
      queryClient.invalidateQueries({ queryKey: ["/api/cellartraks/product-channel-mapping/toast"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cellartraks/product-channel-mapping/summary"] });
    },
    onError: (err: any) => toast({ title: "Sync Failed", description: err.message, variant: "destructive" }),
  });

  const pushDescriptionsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/toast/descriptions/push");
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.error) {
        toast({ title: "Push Failed", description: data.error, variant: "destructive" });
        return;
      }
      const total = (data.pushed || 0) + (data.failed || 0) + (data.skipped || 0);
      if (data.pushed > 0) {
        toast({
          title: "Descriptions Pushed",
          description: `${data.pushed} of ${total} items updated in Toast${data.failed > 0 ? `, ${data.failed} failed` : ""}${data.skipped > 0 ? `, ${data.skipped} skipped (no description)` : ""}`,
        });
      } else if (data.failed > 0) {
        toast({
          title: "Push Failed",
          description: `Toast API returned an error — your API credentials may not have menu write permission. Check with your Toast account team.`,
          variant: "destructive",
        });
      } else {
        toast({ title: "Nothing to Push", description: data.message || "No mapped items with descriptions found." });
      }
    },
    onError: (err: any) => toast({ title: "Push Failed", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, productId, isIgnored }: { id: number; productId?: string | null; isIgnored?: boolean }) => {
      const res = await apiRequest("PATCH", `/api/cellartraks/product-channel-mapping/toast/${id}`, { productId, isIgnored });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cellartraks/product-channel-mapping/toast"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cellartraks/product-channel-mapping/summary"] });
    },
    onError: (err: any) => toast({ title: "Update Failed", description: err.message, variant: "destructive" }),
  });

  const menuNames = useMemo(() => {
    if (!data?.mappings) return [];
    const names = new Set(data.mappings.map(m => m.menuName).filter(Boolean) as string[]);
    return Array.from(names).sort();
  }, [data?.mappings]);

  const filteredMappings = useMemo(() => {
    if (!data?.mappings) return [];
    let items = data.mappings;
    if (!showIgnored) items = items.filter(m => !m.isIgnored);
    if (search) {
      const s = search.toLowerCase();
      items = items.filter(m => m.itemName.toLowerCase().includes(s) || (m.menuGroupName || "").toLowerCase().includes(s));
    }
    if (filterStatus === "mapped") items = items.filter(m => m.productId);
    if (filterStatus === "unmapped") items = items.filter(m => !m.productId && !m.isIgnored);
    if (filterMenu !== "all") items = items.filter(m => m.menuName === filterMenu);

    items.sort((a, b) => {
      if (sortField === "name") return a.itemName.localeCompare(b.itemName);
      if (sortField === "menu") return (a.menuName || "").localeCompare(b.menuName || "");
      const aStatus = a.isIgnored ? 2 : a.productId ? 1 : 0;
      const bStatus = b.isIgnored ? 2 : b.productId ? 1 : 0;
      return aStatus - bStatus;
    });
    return items;
  }, [data?.mappings, search, showIgnored, filterStatus, filterMenu, sortField]);

  const ignoredCount = data?.mappings?.filter(m => m.isIgnored).length || 0;

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Loading Toast items...</div>;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base">Toast POS Menu Items</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {data?.mappings && data.mappings.length === 0 && (
              <p className="text-sm text-muted-foreground">No items yet - sync from Toast first</p>
            )}
            <Button
              variant="outline"
              onClick={() => pushDescriptionsMutation.mutate()}
              disabled={pushDescriptionsMutation.isPending}
              data-testid="button-push-descriptions"
            >
              <Upload className={`h-3.5 w-3.5 mr-1.5 ${pushDescriptionsMutation.isPending ? "animate-bounce" : ""}`} />
              {pushDescriptionsMutation.isPending ? "Pushing..." : "Push Descriptions to Toast"}
            </Button>
            <Button
              variant="outline"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              data-testid="button-sync-toast"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />
              {syncMutation.isPending ? "Syncing..." : "Sync from Toast"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8"
              data-testid="input-search-toast"
            />
          </div>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
            <SelectTrigger className="w-[130px]" data-testid="select-filter-status-toast">
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="mapped">Mapped</SelectItem>
              <SelectItem value="unmapped">Unmapped</SelectItem>
            </SelectContent>
          </Select>
          {menuNames.length > 0 && (
            <Select value={filterMenu} onValueChange={setFilterMenu}>
              <SelectTrigger className="w-[180px]" data-testid="select-filter-menu-toast">
                <SelectValue placeholder="All Menus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Menus</SelectItem>
                {menuNames.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant="ghost"
            onClick={() => setShowIgnored(!showIgnored)}
            data-testid="button-toggle-ignored-toast"
          >
            {showIgnored ? <EyeOff className="h-3.5 w-3.5 mr-1.5" /> : <Eye className="h-3.5 w-3.5 mr-1.5" />}
            {showIgnored ? "Hide" : "Show"} Ignored
            {ignoredCount > 0 && <Badge variant="secondary" className="ml-1.5">{ignoredCount}</Badge>}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
          <span>{filteredMappings.length} items shown</span>
          <span className="text-muted-foreground">Sort:</span>
          <Button variant="ghost" size="sm" onClick={() => setSortField("name")} data-testid="button-sort-name" className={sortField === "name" ? "font-semibold" : ""}>
            <ArrowUpDown className="h-3 w-3 mr-1" /> Name
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSortField("menu")} data-testid="button-sort-menu" className={sortField === "menu" ? "font-semibold" : ""}>
            <ArrowUpDown className="h-3 w-3 mr-1" /> Menu
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSortField("status")} data-testid="button-sort-status" className={sortField === "status" ? "font-semibold" : ""}>
            <ArrowUpDown className="h-3 w-3 mr-1" /> Status
          </Button>
        </div>

        <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
          {filteredMappings.map(mapping => (
            <MappingRow
              key={mapping.id}
              id={mapping.id}
              itemName={mapping.itemName}
              source={[mapping.menuName, mapping.menuGroupName].filter(Boolean).join(" > ") || "Unknown Menu"}
              productId={mapping.productId}
              isAutoMatched={mapping.isAutoMatched}
              isIgnored={mapping.isIgnored}
              products={data?.products || []}
              onUpdate={(productId, isIgnored) => updateMutation.mutate({ id: mapping.id, productId, isIgnored })}
            />
          ))}
          {filteredMappings.length === 0 && (
            <p className="text-center py-6 text-muted-foreground text-sm">
              {data?.mappings?.length === 0 ? "No Toast items synced yet. Click 'Sync from Toast' to get started." : "No items match your filters."}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ShopifyMappingTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showIgnored, setShowIgnored] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  const { data, isLoading } = useQuery<{ mappings: ShopifyMapping[]; products: ProductOption[] }>({
    queryKey: ["/api/cellartraks/product-channel-mapping/shopify"],
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/cellartraks/product-channel-mapping/shopify/sync");
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Shopify Products Synced", description: `${data.added} new products added, ${data.autoMatched} auto-matched` });
      queryClient.invalidateQueries({ queryKey: ["/api/cellartraks/product-channel-mapping/shopify"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cellartraks/product-channel-mapping/summary"] });
    },
    onError: (err: any) => toast({ title: "Sync Failed", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, productId, isIgnored }: { id: number; productId?: string | null; isIgnored?: boolean }) => {
      const res = await apiRequest("PATCH", `/api/cellartraks/product-channel-mapping/shopify/${id}`, { productId, isIgnored });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cellartraks/product-channel-mapping/shopify"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cellartraks/product-channel-mapping/summary"] });
    },
    onError: (err: any) => toast({ title: "Update Failed", description: err.message, variant: "destructive" }),
  });

  const filteredMappings = useMemo(() => {
    if (!data?.mappings) return [];
    let items = data.mappings;
    if (!showIgnored) items = items.filter(m => !m.isIgnored);
    if (search) {
      const s = search.toLowerCase();
      items = items.filter(m => m.shopifyTitle.toLowerCase().includes(s) || (m.shopifyProductType || "").toLowerCase().includes(s));
    }
    if (filterStatus === "mapped") items = items.filter(m => m.productId);
    if (filterStatus === "unmapped") items = items.filter(m => !m.productId && !m.isIgnored);
    items.sort((a, b) => a.shopifyTitle.localeCompare(b.shopifyTitle));
    return items;
  }, [data?.mappings, search, showIgnored, filterStatus]);

  const ignoredCount = data?.mappings?.filter(m => m.isIgnored).length || 0;

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Loading Shopify products...</div>;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base">Shopify Products</CardTitle>
          <Button
            variant="outline"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            data-testid="button-sync-shopify"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />
            {syncMutation.isPending ? "Syncing..." : "Sync from Shopify"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" data-testid="input-search-shopify" />
          </div>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
            <SelectTrigger className="w-[130px]" data-testid="select-filter-status-shopify">
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="mapped">Mapped</SelectItem>
              <SelectItem value="unmapped">Unmapped</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" onClick={() => setShowIgnored(!showIgnored)} data-testid="button-toggle-ignored-shopify">
            {showIgnored ? <EyeOff className="h-3.5 w-3.5 mr-1.5" /> : <Eye className="h-3.5 w-3.5 mr-1.5" />}
            {showIgnored ? "Hide" : "Show"} Ignored
            {ignoredCount > 0 && <Badge variant="secondary" className="ml-1.5">{ignoredCount}</Badge>}
          </Button>
        </div>

        <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
          {filteredMappings.map(mapping => (
            <MappingRow
              key={mapping.id}
              id={mapping.id}
              itemName={mapping.shopifyTitle}
              source={[mapping.shopifyProductType, mapping.shopifyVendor].filter(Boolean).join(" | ") || "Shopify"}
              productId={mapping.productId}
              isAutoMatched={mapping.isAutoMatched}
              isIgnored={mapping.isIgnored}
              products={data?.products || []}
              onUpdate={(productId, isIgnored) => updateMutation.mutate({ id: mapping.id, productId, isIgnored })}
            />
          ))}
          {filteredMappings.length === 0 && (
            <p className="text-center py-6 text-muted-foreground text-sm">
              {data?.mappings?.length === 0 ? "No Shopify products synced yet. Click 'Sync from Shopify' to get started." : "No products match your filters."}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function WholesaleMappingTab() {
  const { toast: toastHook } = useToast();
  const [search, setSearch] = useState("");
  const [showIgnored, setShowIgnored] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  const { data, isLoading } = useQuery<{ mappings: WholesaleMapping[]; products: ProductOption[] }>({
    queryKey: ["/api/cellartraks/product-channel-mapping/wholesale"],
  });

  const filteredMappings = useMemo(() => {
    if (!data?.mappings) return [];
    let items = data.mappings;
    if (!showIgnored) items = items.filter(m => !m.isIgnored);
    if (search) {
      const s = search.toLowerCase();
      items = items.filter(m => m.qbItemName.toLowerCase().includes(s));
    }
    if (filterStatus === "mapped") items = items.filter(m => m.productId);
    if (filterStatus === "unmapped") items = items.filter(m => !m.productId && !m.isIgnored);
    items.sort((a, b) => a.qbItemName.localeCompare(b.qbItemName));
    return items;
  }, [data?.mappings, search, showIgnored, filterStatus]);

  const ignoredCount = data?.mappings?.filter(m => m.isIgnored).length || 0;

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Loading wholesale items...</div>;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base">Wholesale Items (QuickBooks / EKOS)</CardTitle>
          <p className="text-sm text-muted-foreground">Managed in QuickBooks Sync &rarr; Item Mapping</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" data-testid="input-search-wholesale" />
          </div>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
            <SelectTrigger className="w-[130px]" data-testid="select-filter-status-wholesale">
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="mapped">Mapped</SelectItem>
              <SelectItem value="unmapped">Unmapped</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" onClick={() => setShowIgnored(!showIgnored)} data-testid="button-toggle-ignored-wholesale">
            {showIgnored ? <EyeOff className="h-3.5 w-3.5 mr-1.5" /> : <Eye className="h-3.5 w-3.5 mr-1.5" />}
            {showIgnored ? "Hide" : "Show"} Ignored
            {ignoredCount > 0 && <Badge variant="secondary" className="ml-1.5">{ignoredCount}</Badge>}
          </Button>
        </div>

        <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
          {filteredMappings.map(mapping => (
            <MappingRow
              key={mapping.id}
              id={mapping.id}
              itemName={mapping.qbItemName}
              source="QuickBooks / EKOS"
              productId={mapping.productId}
              isAutoMatched={mapping.isAutoMatched}
              isIgnored={mapping.isIgnored}
              products={data?.products || []}
              onUpdate={() => {}}
              readonly
            />
          ))}
          {filteredMappings.length === 0 && (
            <p className="text-center py-6 text-muted-foreground text-sm">
              {data?.mappings?.length === 0 ? "No wholesale items mapped yet. Use QuickBooks Sync to map items." : "No items match your filters."}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MappingRow({
  id,
  itemName,
  source,
  productId,
  isAutoMatched,
  isIgnored,
  products,
  onUpdate,
  readonly = false,
}: {
  id: number;
  itemName: string;
  source: string;
  productId: string | null;
  isAutoMatched: boolean;
  isIgnored: boolean;
  products: ProductOption[];
  onUpdate: (productId?: string | null, isIgnored?: boolean) => void;
  readonly?: boolean;
}) {
  const matchedProduct = productId ? products.find(p => p.id === productId) : null;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm ${
        isIgnored ? "opacity-50 bg-muted/30" : productId ? "bg-background" : "bg-muted/10 border-dashed"
      }`}
      data-testid={`row-mapping-${id}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-medium truncate" data-testid={`text-item-name-${id}`}>{itemName}</span>
          {isAutoMatched && productId && (
            <Badge variant="secondary" className="text-[10px]">Auto</Badge>
          )}
          {isIgnored && (
            <Badge variant="outline" className="text-[10px]">Ignored</Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground truncate" data-testid={`text-item-source-${id}`}>{source}</div>
      </div>

      <div className="flex items-center gap-1.5">
        {productId ? (
          <Link2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0" />
        ) : (
          <Unlink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
      </div>

      {readonly ? (
        <div className="w-[200px] text-sm truncate">
          {matchedProduct ? (
            <span className="text-green-700 dark:text-green-400">{matchedProduct.name}</span>
          ) : (
            <span className="text-muted-foreground">Not mapped</span>
          )}
        </div>
      ) : (
        <Select
          value={productId || "unmatched"}
          onValueChange={(val) => onUpdate(val === "unmatched" ? null : val)}
        >
          <SelectTrigger className="w-[220px]" data-testid={`select-product-${id}`}>
            <SelectValue placeholder="Select Product" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unmatched">-- Not Mapped --</SelectItem>
            {products.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} ({p.category}{p.bottleSize ? `, ${p.bottleSize}` : ""})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {!readonly && (
        <Button
          variant={isIgnored ? "default" : "ghost"}
          onClick={() => onUpdate(undefined, !isIgnored)}
          data-testid={`button-ignore-${id}`}
        >
          {isIgnored ? "Restore" : "Ignore"}
        </Button>
      )}
    </div>
  );
}
