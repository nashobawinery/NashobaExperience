import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw, UtensilsCrossed, Loader2,
  ExternalLink, Eye, EyeOff,
  ArrowLeft, Code, Printer, Copy, Check, Wine
} from "lucide-react";
import { Link } from "wouter";

interface ToastRestaurant {
  guid: string;
  name: string;
  location: string | null;
}

interface ToastMenuData {
  id: number;
  menuGuid: string;
  restaurantGuid: string;
  name: string;
  description: string | null;
  orderable: boolean;
  visibility: string | null;
  syncedAt: string;
}

interface ToastMenuGroupData {
  id: number;
  groupGuid: string;
  menuGuid: string;
  restaurantGuid: string;
  name: string;
  description: string | null;
  displayOrder: number | null;
  visibility: string | null;
  syncedAt: string;
  items: ToastMenuItemData[];
}

interface ToastMenuItemData {
  id: number;
  itemGuid: string;
  groupGuid: string | null;
  menuGuid: string | null;
  restaurantGuid: string;
  name: string;
  description: string | null;
  price: string | null;
  posName: string | null;
  sku: string | null;
  plu: string | null;
  type: string | null;
  visibility: string | null;
  imageUrl: string | null;
  hidden: boolean | null;
  suggestedPairing: string | null;
  displayOrder: number | null;
  syncedAt: string;
}

interface MenuDetailData {
  menu: ToastMenuData;
  groups: ToastMenuGroupData[];
  totalItems: number;
}

interface SyncStatus {
  [restaurantGuid: string]: {
    menuCount: number;
    groupCount: number;
    itemCount: number;
    lastSynced: string;
  };
}

function formatPrice(price: string | null): string {
  if (!price) return "";
  const num = parseFloat(price);
  if (isNaN(num)) return "";
  return `$${num.toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type ViewMode = "list" | "detail" | "embed" | "print";

export function ToastMenuBrowser() {
  const { toast } = useToast();
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("");
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [embedTemplate, setEmbedTemplate] = useState("fine-dining");
  const [printTemplate, setPrintTemplate] = useState("fine-dining");
  const [selectedEmbedGroup, setSelectedEmbedGroup] = useState<string>("");
  const [selectedPrintGroup, setSelectedPrintGroup] = useState<string>("");

  const { data: statusData } = useQuery<{
    configured: boolean;
    authenticated: boolean;
    restaurants: ToastRestaurant[];
  }>({
    queryKey: ["/api/toast/status"],
  });

  const { data: syncStatus } = useQuery<SyncStatus>({
    queryKey: ["/api/toast/menus/sync-status"],
  });

  const restaurants = statusData?.restaurants || [];
  const isConfigured = statusData?.configured && statusData?.authenticated;
  const defaultRestaurant = restaurants.find(r => r.name.toLowerCase().includes("nashoba valley")) || restaurants[0];
  const restaurantGuid = selectedRestaurant || (defaultRestaurant?.guid || "");

  const { data: menus = [], isLoading: menusLoading } = useQuery<ToastMenuData[]>({
    queryKey: ["/api/toast/menus", { restaurantGuid }],
    enabled: !!restaurantGuid,
  });

  const { data: menuDetail, isLoading: detailLoading } = useQuery<MenuDetailData>({
    queryKey: ["/api/toast/public/menu", selectedMenu],
    queryFn: async () => {
      const res = await fetch(`/api/toast/public/menu/${selectedMenu}?includeHidden=true`);
      if (!res.ok) throw new Error("Failed to load menu detail");
      return res.json();
    },
    enabled: !!selectedMenu,
  });

  const syncMutation = useMutation({
    mutationFn: async (guid: string) => {
      const res = await apiRequest("POST", "/api/toast/menus/sync", { restaurantGuid: guid });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ predicate: (query) => {
        const key = query.queryKey[0] as string;
        return key?.startsWith?.("/api/toast/");
      }});
      toast({
        title: "Menu sync complete",
        description: `Synced ${data.menuCount} menus, ${data.groupCount} groups, ${data.itemCount} items`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    },
  });

  const updateItemOverride = useMutation({
    mutationFn: async ({ itemId, ...data }: { itemId: number; hidden?: boolean; suggestedPairing?: string }) => {
      const res = await apiRequest("PATCH", `/api/toast/menu-items/${itemId}/overrides`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => {
        const key = query.queryKey[0] as string;
        return key?.startsWith?.("/api/toast/");
      }});
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const currentRestaurantStatus = restaurantGuid && syncStatus ? syncStatus[restaurantGuid] : null;

  const getEmbedUrl = (menuGuid: string, template: string, groupGuid?: string) => {
    const base = window.location.origin;
    let url = `${base}/api/toast/public/menu/${menuGuid}/embed?template=${template}`;
    if (groupGuid) url += `&groupGuid=${groupGuid}`;
    return url;
  };

  const getEmbedCode = (menuGuid: string, template: string, groupGuid?: string) => {
    const url = getEmbedUrl(menuGuid, template, groupGuid);
    return `<iframe src="${url}" width="100%" height="800" frameborder="0" style="border:none; max-width:900px; margin:0 auto; display:block;"></iframe>`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2000);
    toast({ title: "Copied to clipboard" });
  };

  const openPrintView = (menuGuid: string, template: string, groupGuid?: string) => {
    const url = getEmbedUrl(menuGuid, template, groupGuid);
    const printWindow = window.open(url, "_blank");
    if (printWindow) {
      printWindow.addEventListener("load", () => {
        setTimeout(() => printWindow.print(), 500);
      });
    }
  };

  const openMenuDetail = (menuGuid: string) => {
    setSelectedMenu(menuGuid);
    setViewMode("detail");
  };

  const goBack = () => {
    setSelectedMenu(null);
    setViewMode("list");
  };

  if (!isConfigured) {
    return (
      <div className="p-6 space-y-4">
        <h2 className="text-lg font-semibold" data-testid="text-toast-menus-title">Toast Menu Items</h2>
        <Card>
          <CardContent className="py-8 text-center">
            <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">
              Toast API is not configured. Please set up your Toast integration in Settings to sync menu items.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderMenuList = () => (
    <>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-lg font-semibold" data-testid="text-toast-menus-title">Toast Menu Items</h2>
          <Link href="/toast-connect">
            <Badge variant="outline" className="cursor-pointer gap-1">
              <ExternalLink className="w-3 h-3" />
              Open Toast Connect
            </Badge>
          </Link>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {restaurants.length > 1 && (
            <Select
              value={restaurantGuid}
              onValueChange={(v) => {
                setSelectedRestaurant(v);
                setSelectedMenu(null);
              }}
            >
              <SelectTrigger className="w-48" data-testid="select-restaurant">
                <SelectValue placeholder="Select restaurant" />
              </SelectTrigger>
              <SelectContent>
                {restaurants.map((r) => (
                  <SelectItem key={r.guid} value={r.guid}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            onClick={() => restaurantGuid && syncMutation.mutate(restaurantGuid)}
            disabled={syncMutation.isPending || !restaurantGuid}
            data-testid="button-sync-menus"
          >
            {syncMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Sync Menus from Toast
          </Button>
        </div>
      </div>

      {currentRestaurantStatus && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
          <span>Last synced: {formatDate(currentRestaurantStatus.lastSynced)}</span>
          <Badge variant="secondary">{currentRestaurantStatus.menuCount} menus</Badge>
          <Badge variant="secondary">{currentRestaurantStatus.groupCount} groups</Badge>
          <Badge variant="secondary">{currentRestaurantStatus.itemCount} items</Badge>
        </div>
      )}

      {menusLoading || syncMutation.isPending ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-3 animate-spin text-primary" />
            <p className="font-medium mb-1">{syncMutation.isPending ? "Syncing menus from Toast..." : "Loading menus..."}</p>
          </CardContent>
        </Card>
      ) : menus.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium mb-1">No menu items synced yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Click "Sync Menus from Toast" to pull in your menu items.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {menus.map((menu) => (
            <Card
              key={menu.id}
              className="cursor-pointer hover-elevate transition-all"
              onClick={() => openMenuDetail(menu.menuGuid)}
              data-testid={`card-menu-${menu.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-medium truncate" data-testid={`text-menu-name-${menu.id}`}>{menu.name}</h3>
                    {menu.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{menu.description}</p>
                    )}
                  </div>
                  <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180 shrink-0 mt-1" />
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Synced {formatDate(menu.syncedAt)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );

  const renderMenuDetail = () => {
    if (!selectedMenu) return null;
    if (detailLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }
    if (!menuDetail) return null;

    const { menu, groups, totalItems } = menuDetail;

    return (
      <>
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="icon" onClick={goBack} data-testid="button-back-menus">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold truncate" data-testid="text-menu-detail-name">{menu.name}</h2>
            <p className="text-sm text-muted-foreground">
              {groups.length} courses, {totalItems} items
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => { setViewMode("embed"); }}
              data-testid="button-get-embed"
            >
              <Code className="w-4 h-4 mr-2" />
              Get Website Link
            </Button>
            <Button
              variant="outline"
              onClick={() => { setViewMode("print"); }}
              data-testid="button-go-print"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(getEmbedUrl(menu.menuGuid, "fine-dining"), "_blank")}
              data-testid="button-preview-menu"
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
          </div>
        </div>

        {groups.map((group) => (
          <div key={group.id} className="space-y-1">
            <div className="flex items-center justify-between gap-2 pt-2 border-b pb-1">
              <h3 className="font-semibold text-base" data-testid={`text-group-name-${group.id}`}>
                {group.name}
              </h3>
              <Badge variant="secondary" className="no-default-active-elevate">
                {group.items.filter(i => !i.hidden).length}/{group.items.length} visible
              </Badge>
            </div>
            {group.items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No items in this group</p>
            ) : (
              <div className="space-y-0">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 py-2 border-b border-muted/50 last:border-0 ${item.hidden ? "opacity-40" : ""}`}
                    data-testid={`row-item-${item.id}`}
                  >
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => updateItemOverride.mutate({ itemId: item.id, hidden: !item.hidden })}
                      data-testid={`button-toggle-visibility-${item.id}`}
                    >
                      {item.hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 flex-wrap">
                        <span className={`font-medium text-sm ${item.hidden ? "line-through" : ""}`}>{item.name}</span>
                        {item.price && (
                          <span className="text-sm font-medium whitespace-nowrap">{formatPrice(item.price)}</span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Wine className="w-3 h-3 text-muted-foreground shrink-0" />
                        <Input
                          placeholder="Suggested wine pairing..."
                          defaultValue={item.suggestedPairing || ""}
                          className="h-7 text-xs"
                          onBlur={(e) => {
                            const val = e.target.value.trim();
                            if (val !== (item.suggestedPairing || "")) {
                              updateItemOverride.mutate({ itemId: item.id, suggestedPairing: val });
                            }
                          }}
                          data-testid={`input-pairing-${item.id}`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </>
    );
  };

  const renderEmbedView = () => {
    if (!selectedMenu) return null;
    const groupGuidVal = selectedEmbedGroup && selectedEmbedGroup !== "all" ? selectedEmbedGroup : undefined;

    return (
      <>
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => setViewMode("detail")} data-testid="button-back-detail">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold" data-testid="text-embed-title">Get Website Link / Embed Code</h2>
            <p className="text-sm text-muted-foreground">
              Generate an embed code or link to display this menu on your website.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Template Style</label>
            <Select value={embedTemplate} onValueChange={setEmbedTemplate}>
              <SelectTrigger data-testid="select-embed-template">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fine-dining">Fine Dining (Dark & Elegant)</SelectItem>
                <SelectItem value="modern">Modern (Clean & Minimal)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Course / Group</label>
            <Select value={selectedEmbedGroup || "all"} onValueChange={setSelectedEmbedGroup}>
              <SelectTrigger data-testid="select-embed-group">
                <SelectValue placeholder="All courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All courses (full menu)</SelectItem>
                {menuDetail?.groups.map((g) => (
                  <SelectItem key={g.groupGuid} value={g.groupGuid}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="font-medium text-sm">Embed Code (iframe)</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(getEmbedCode(selectedMenu, embedTemplate, groupGuidVal))}
                data-testid="button-copy-embed"
              >
                {copiedEmbed ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                {copiedEmbed ? "Copied" : "Copy Code"}
              </Button>
            </div>
            <Textarea
              readOnly
              value={getEmbedCode(selectedMenu, embedTemplate, groupGuidVal)}
              className="font-mono text-xs resize-none"
              rows={3}
              data-testid="textarea-embed-code"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="font-medium text-sm">Direct Link</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(getEmbedUrl(selectedMenu, embedTemplate, groupGuidVal))}
                data-testid="button-copy-link"
              >
                <Copy className="w-4 h-4 mr-1" />
                Copy URL
              </Button>
            </div>
            <Input
              readOnly
              value={getEmbedUrl(selectedMenu, embedTemplate, groupGuidVal)}
              className="font-mono text-xs"
              data-testid="input-embed-url"
            />
          </CardContent>
        </Card>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => window.open(getEmbedUrl(selectedMenu, embedTemplate, groupGuidVal), "_blank")}
            data-testid="button-preview-embed"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Preview in New Tab
          </Button>
        </div>

        <Card>
          <CardContent className="p-0 overflow-hidden rounded-md">
            <div className="bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground border-b">
              Live Preview
            </div>
            <iframe
              src={getEmbedUrl(selectedMenu, embedTemplate, groupGuidVal)}
              className="w-full border-0"
              style={{ height: "500px" }}
              title="Menu Preview"
              data-testid="iframe-embed-preview"
            />
          </CardContent>
        </Card>
      </>
    );
  };

  const renderPrintView = () => {
    if (!selectedMenu) return null;
    const groupGuidVal = selectedPrintGroup && selectedPrintGroup !== "all" ? selectedPrintGroup : undefined;

    return (
      <>
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => setViewMode("detail")} data-testid="button-back-detail-print">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold" data-testid="text-print-title">Print Menu</h2>
            <p className="text-sm text-muted-foreground">
              Select a template and course, then print. Opens in a new tab.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Print Template</label>
            <Select value={printTemplate} onValueChange={setPrintTemplate}>
              <SelectTrigger data-testid="select-print-template">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fine-dining">Fine Dining</SelectItem>
                <SelectItem value="modern">Modern Clean</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Course / Group</label>
            <Select value={selectedPrintGroup || "all"} onValueChange={setSelectedPrintGroup}>
              <SelectTrigger data-testid="select-print-group">
                <SelectValue placeholder="All courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All courses (full menu)</SelectItem>
                {menuDetail?.groups.map((g) => (
                  <SelectItem key={g.groupGuid} value={g.groupGuid}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => openPrintView(selectedMenu, printTemplate, groupGuidVal)}
            data-testid="button-print-now"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Menu
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open(getEmbedUrl(selectedMenu, printTemplate, groupGuidVal), "_blank")}
            data-testid="button-preview-print"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
        </div>
      </>
    );
  };

  return (
    <div className="p-6 space-y-4">
      {viewMode === "list" && renderMenuList()}
      {viewMode === "detail" && renderMenuDetail()}
      {viewMode === "embed" && renderEmbedView()}
      {viewMode === "print" && renderPrintView()}
    </div>
  );
}
