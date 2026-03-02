import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  RefreshCw, UtensilsCrossed, Loader2,
  ExternalLink, Eye, EyeOff, ListFilter,
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
  hidden: boolean;
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

interface AvailableMenu {
  guid: string;
  name: string;
  groupCount: number;
  itemCount: number;
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
  const [printScale, setPrintScale] = useState(100);
  const [printPages, setPrintPages] = useState(0);
  const [printFooter, setPrintFooter] = useState("");
  const [printHideDescriptions, setPrintHideDescriptions] = useState(false);
  const [printPageBreaks, setPrintPageBreaks] = useState<string[]>([]);
  const [selectedEmbedGroups, setSelectedEmbedGroups] = useState<string[]>([]);
  const [selectedPrintGroups, setSelectedPrintGroups] = useState<string[]>([]);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [selectedMenuGuids, setSelectedMenuGuids] = useState<string[]>([]);
  const [additionalMenuGuids, setAdditionalMenuGuids] = useState<string[]>([]);
  const [printHeader, setPrintHeader] = useState("");
  const [printHidePricing, setPrintHidePricing] = useState(false);
  const [printHideWinePairing, setPrintHideWinePairing] = useState(false);

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

  const { data: availableMenus = [], isLoading: availableLoading, refetch: fetchAvailableMenus } = useQuery<AvailableMenu[]>({
    queryKey: ["/api/toast/menus/available", { restaurantGuid }],
    enabled: false,
  });

  const additionalGuidsKey = additionalMenuGuids.join(",");
  const { data: additionalMenuDetailsList = [] } = useQuery<MenuDetailData[]>({
    queryKey: ["/api/toast/public/menus-combined", additionalGuidsKey],
    queryFn: async () => {
      if (!additionalGuidsKey) return [];
      const res = await fetch(`/api/toast/public/menus-combined?guids=${encodeURIComponent(additionalGuidsKey)}&includeHidden=true`);
      if (!res.ok) throw new Error("Failed to load additional menus");
      return res.json();
    },
    enabled: additionalMenuGuids.length > 0,
  });

  const allPrintGroups = useMemo(() => {
    const primary = (menuDetail?.groups || []).map(g => ({ ...g, sourceName: menuDetail?.menu?.name || "" }));
    const additional = additionalMenuDetailsList.flatMap(md =>
      (md.groups || []).map(g => ({ ...g, sourceName: md.menu?.name || "" }))
    );
    return [...primary, ...additional];
  }, [menuDetail, additionalMenuDetailsList]);

  const syncMutation = useMutation({
    mutationFn: async ({ guid, menuGuids }: { guid: string; menuGuids?: string[] }) => {
      const body: any = { restaurantGuid: guid };
      if (menuGuids && menuGuids.length > 0) body.menuGuids = menuGuids;
      const res = await apiRequest("POST", "/api/toast/menus/sync", body);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ predicate: (query) => {
        const key = query.queryKey[0] as string;
        return key?.startsWith?.("/api/toast/");
      }});
      setShowSyncDialog(false);
      setSelectedMenuGuids([]);
      toast({
        title: "Menu sync complete",
        description: `Synced ${data.menuCount} menus, ${data.groupCount} groups, ${data.itemCount} items`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    },
  });

  const handleOpenSyncDialog = () => {
    setShowSyncDialog(true);
    setSelectedMenuGuids([]);
    fetchAvailableMenus();
  };

  const toggleMenuGuid = (guid: string) => {
    setSelectedMenuGuids(prev =>
      prev.includes(guid) ? prev.filter(g => g !== guid) : [...prev, guid]
    );
  };

  const updateItemOverride = useMutation({
    mutationFn: async ({ itemId, ...data }: { itemId: number; hidden?: boolean; suggestedPairing?: string; description?: string }) => {
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

  const updateGroupOverride = useMutation({
    mutationFn: async ({ groupId, hidden }: { groupId: number; hidden: boolean }) => {
      const res = await apiRequest("PATCH", `/api/toast/menu-groups/${groupId}/overrides`, { hidden });
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

  const getEmbedUrl = (menuGuid: string, template: string, groupGuids?: string[], scale?: number, pages?: number, footer?: string, pageBreaks?: string[], hideDescriptions?: boolean, header?: string, hidePricing?: boolean, hideWinePairing?: boolean) => {
    const base = window.location.origin;
    let url = `${base}/api/toast/public/menu/${encodeURIComponent(menuGuid)}/embed?template=${template}`;
    if (groupGuids && groupGuids.length > 0) url += `&groupGuid=${encodeURIComponent(groupGuids.join(","))}`;
    if (scale && scale !== 100) url += `&scale=${scale}`;
    if (pages && pages > 0) url += `&pages=${pages}`;
    if (footer && footer.trim()) url += `&footer=${encodeURIComponent(footer.trim())}`;
    if (pageBreaks && pageBreaks.length > 0) url += `&pagebreaks=${encodeURIComponent(pageBreaks.join(","))}`;
    if (hideDescriptions) url += `&hidedesc=1`;
    if (header && header.trim()) url += `&header=${encodeURIComponent(header.trim())}`;
    if (hidePricing) url += `&hideprice=1`;
    if (hideWinePairing) url += `&hidepairing=1`;
    return url;
  };

  const getMultiMenuEmbedUrl = (menuGuids: string[], template: string, groupGuids?: string[], scale?: number, pages?: number, footer?: string, pageBreaks?: string[], hideDescriptions?: boolean, header?: string, hidePricing?: boolean, hideWinePairing?: boolean) => {
    const base = window.location.origin;
    let url = `${base}/api/toast/public/menus/embed?menus=${encodeURIComponent(menuGuids.join(","))}&template=${template}`;
    if (groupGuids && groupGuids.length > 0) url += `&groupGuid=${encodeURIComponent(groupGuids.join(","))}`;
    if (scale && scale !== 100) url += `&scale=${scale}`;
    if (pages && pages > 0) url += `&pages=${pages}`;
    if (footer && footer.trim()) url += `&footer=${encodeURIComponent(footer.trim())}`;
    if (pageBreaks && pageBreaks.length > 0) url += `&pagebreaks=${encodeURIComponent(pageBreaks.join(","))}`;
    if (hideDescriptions) url += `&hidedesc=1`;
    if (header && header.trim()) url += `&header=${encodeURIComponent(header.trim())}`;
    if (hidePricing) url += `&hideprice=1`;
    if (hideWinePairing) url += `&hidepairing=1`;
    return url;
  };

  const buildPrintUrl = (template: string) => {
    const printGroups = selectedPrintGroups.length > 0 ? selectedPrintGroups : undefined;
    if (additionalMenuGuids.length > 0 && selectedMenu) {
      return getMultiMenuEmbedUrl([selectedMenu, ...additionalMenuGuids], template, printGroups, printScale, printPages, printFooter, printPageBreaks, printHideDescriptions, printHeader, printHidePricing, printHideWinePairing);
    }
    return getEmbedUrl(selectedMenu!, template, printGroups, printScale, printPages, printFooter, printPageBreaks, printHideDescriptions, printHeader, printHidePricing, printHideWinePairing);
  };

  const getEmbedCode = (menuGuid: string, template: string, groupGuids?: string[]) => {
    const url = getEmbedUrl(menuGuid, template, groupGuids);
    return `<iframe src="${url}" width="100%" height="800" frameborder="0" style="border:none; max-width:900px; margin:0 auto; display:block;"></iframe>`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2000);
    toast({ title: "Copied to clipboard" });
  };

  const openPrintView = (url: string) => {
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
    setAdditionalMenuGuids([]);
    setSelectedPrintGroups([]);
    setSelectedEmbedGroups([]);
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
            onClick={handleOpenSyncDialog}
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

        <Card className="bg-muted/30">
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-medium">HTML Formatting Guide for Descriptions</p>
            <p className="text-xs text-muted-foreground">You can use these codes in the description fields below to control how text appears on printed and embedded menus:</p>
            <div className="grid gap-1 text-xs font-mono">
              <div className="flex items-baseline gap-3 flex-wrap">
                <code className="bg-background px-2 py-0.5 rounded border text-xs whitespace-nowrap">&lt;br&gt;</code>
                <span className="text-muted-foreground font-sans">Line break — starts a new line</span>
              </div>
              <div className="flex items-baseline gap-3 flex-wrap">
                <code className="bg-background px-2 py-0.5 rounded border text-xs whitespace-nowrap">&lt;br&gt;&lt;br&gt;</code>
                <span className="text-muted-foreground font-sans">Double line break — adds a blank line between text</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground italic">Example: Roasted chicken with herbs&lt;br&gt;Served with seasonal vegetables</p>
          </CardContent>
        </Card>

        {groups.map((group) => (
          <div key={group.id} className={`space-y-1 ${group.hidden ? "opacity-50" : ""}`}>
            <div className="flex items-center justify-between gap-2 pt-2 border-b pb-1">
              <div className="flex items-center gap-2 min-w-0">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => updateGroupOverride.mutate({ groupId: group.id, hidden: !group.hidden })}
                  data-testid={`button-toggle-group-visibility-${group.id}`}
                  title={group.hidden ? "Show group" : "Hide group"}
                >
                  {group.hidden ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4" />}
                </Button>
                <h3 className={`font-semibold text-base ${group.hidden ? "line-through text-muted-foreground" : ""}`} data-testid={`text-group-name-${group.id}`}>
                  {group.name}
                </h3>
              </div>
              <Badge variant="secondary" className="no-default-active-elevate">
                {group.hidden ? "hidden" : `${group.items.filter(i => !i.hidden).length}/${group.items.length} visible`}
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
                      <div className="mt-1">
                        <Textarea
                          key={`desc-${item.id}-${item.description || ""}`}
                          placeholder="Item description (use <br> for line breaks)..."
                          defaultValue={item.description || ""}
                          className="text-xs resize-none"
                          rows={2}
                          onBlur={(e) => {
                            const val = e.target.value.trim();
                            if (val !== (item.description || "")) {
                              updateItemOverride.mutate({ itemId: item.id, description: val });
                            }
                          }}
                          data-testid={`input-description-${item.id}`}
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Wine className="w-3 h-3 text-muted-foreground shrink-0" />
                        <Input
                          key={`pairing-${item.id}-${item.suggestedPairing || ""}`}
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

  const toggleGroupSelection = (guid: string, selected: string[], setSelected: (v: string[]) => void) => {
    setSelected(selected.includes(guid) ? selected.filter(g => g !== guid) : [...selected, guid]);
  };

  const getGroupLabel = (selected: string[], groups: { groupGuid: string; name: string }[]) => {
    if (selected.length === 0) return "All courses (full menu)";
    if (!groups.length) return `${selected.length} selected`;
    const names = selected.map(g => groups.find(gr => gr.groupGuid === g)?.name).filter(Boolean);
    if (names.length <= 2) return names.join(", ");
    return `${names.length} courses selected`;
  };

  const renderGroupMultiSelect = (selected: string[], setSelected: (v: string[]) => void, testIdPrefix: string, groups: { groupGuid: string; name: string; sourceName?: string }[]) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between text-left font-normal" data-testid={`${testIdPrefix}-trigger`}>
          <span className="truncate">{getGroupLabel(selected, groups)}</span>
          <ListFilter className="w-4 h-4 ml-2 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <div className="space-y-1">
          <Button
            variant={selected.length === 0 ? "secondary" : "ghost"}
            size="sm"
            className="w-full justify-start"
            onClick={() => setSelected([])}
            data-testid={`${testIdPrefix}-all`}
          >
            All courses (full menu)
          </Button>
          {groups.map((g) => (
            <label
              key={g.groupGuid}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover-elevate"
              data-testid={`${testIdPrefix}-${g.groupGuid}`}
            >
              <Checkbox
                checked={selected.includes(g.groupGuid)}
                onCheckedChange={() => toggleGroupSelection(g.groupGuid, selected, setSelected)}
              />
              <div className="min-w-0">
                <span className="text-sm">{g.name}</span>
                {g.sourceName && <p className="text-xs text-muted-foreground truncate">{g.sourceName}</p>}
              </div>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );

  const renderEmbedView = () => {
    if (!selectedMenu) return null;
    const embedGroups = selectedEmbedGroups.length > 0 ? selectedEmbedGroups : undefined;

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
            <label className="text-sm font-medium">Courses / Groups</label>
            {renderGroupMultiSelect(selectedEmbedGroups, setSelectedEmbedGroups, "select-embed-group", menuDetail?.groups || [])}
          </div>
        </div>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="font-medium text-sm">Embed Code (iframe)</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(getEmbedCode(selectedMenu, embedTemplate, embedGroups))}
                data-testid="button-copy-embed"
              >
                {copiedEmbed ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                {copiedEmbed ? "Copied" : "Copy Code"}
              </Button>
            </div>
            <Textarea
              readOnly
              value={getEmbedCode(selectedMenu, embedTemplate, embedGroups)}
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
                onClick={() => copyToClipboard(getEmbedUrl(selectedMenu, embedTemplate, embedGroups))}
                data-testid="button-copy-link"
              >
                <Copy className="w-4 h-4 mr-1" />
                Copy URL
              </Button>
            </div>
            <Input
              readOnly
              value={getEmbedUrl(selectedMenu, embedTemplate, embedGroups)}
              className="font-mono text-xs"
              data-testid="input-embed-url"
            />
          </CardContent>
        </Card>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => window.open(getEmbedUrl(selectedMenu, embedTemplate, embedGroups), "_blank")}
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
              src={getEmbedUrl(selectedMenu, embedTemplate, embedGroups)}
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

    const handlePrint = (template: string) => {
      openPrintView(buildPrintUrl(template));
    };

    const getPrintPreviewUrl = () => buildPrintUrl(printTemplate);

    const primaryMenuName = menuDetail?.menu?.name || "";
    const baseMenuName = primaryMenuName.replace(/\s*\(copy\)(\s+\d+)?$/i, "").trim();
    const otherMenus = menus.filter(m => m.menuGuid !== selectedMenu);
    const suggestedMenus = otherMenus.filter(m =>
      baseMenuName && m.name.toLowerCase().includes(baseMenuName.toLowerCase())
    );
    const restMenus = otherMenus.filter(m => !suggestedMenus.includes(m));
    const sortedOtherMenus = [...suggestedMenus, ...restMenus];

    return (
      <>
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => setViewMode("detail")} data-testid="button-back-detail-print">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold" data-testid="text-print-title">Print Menu</h2>
            <p className="text-sm text-muted-foreground">
              Configure your print options, then click Print on a template below.
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
                <SelectItem value="beverage">Beverage Menu</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Courses / Groups</label>
            {renderGroupMultiSelect(selectedPrintGroups, setSelectedPrintGroups, "select-print-group", allPrintGroups)}
          </div>
        </div>

        {sortedOtherMenus.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Merge Groups From Another Menu</label>
            <p className="text-xs text-muted-foreground">
              Include groups from additional menus in this print job. Useful when related groups were imported as separate menus in Toast.
            </p>
            <div className="border rounded-md p-3 space-y-1 max-h-48 overflow-y-auto">
              {suggestedMenus.length > 0 && (
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pb-1">Related menus</p>
              )}
              {suggestedMenus.map(m => (
                <label key={m.menuGuid} className="flex items-center gap-2 px-1 py-1.5 rounded-md cursor-pointer hover-elevate" data-testid={`checkbox-merge-menu-${m.menuGuid}`}>
                  <Checkbox
                    checked={additionalMenuGuids.includes(m.menuGuid)}
                    onCheckedChange={(checked) => {
                      setAdditionalMenuGuids(prev =>
                        checked ? [...prev, m.menuGuid] : prev.filter(g => g !== m.menuGuid)
                      );
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium">{m.name}</p>
                  </div>
                </label>
              ))}
              {restMenus.length > 0 && suggestedMenus.length > 0 && (
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 pb-1">Other menus</p>
              )}
              {restMenus.map(m => (
                <label key={m.menuGuid} className="flex items-center gap-2 px-1 py-1.5 rounded-md cursor-pointer hover-elevate" data-testid={`checkbox-merge-menu-${m.menuGuid}`}>
                  <Checkbox
                    checked={additionalMenuGuids.includes(m.menuGuid)}
                    onCheckedChange={(checked) => {
                      setAdditionalMenuGuids(prev =>
                        checked ? [...prev, m.menuGuid] : prev.filter(g => g !== m.menuGuid)
                      );
                    }}
                  />
                  <div>
                    <p className="text-sm">{m.name}</p>
                  </div>
                </label>
              ))}
            </div>
            {additionalMenuGuids.length > 0 && (
              <p className="text-xs text-primary font-medium">
                {additionalMenuGuids.length} additional menu{additionalMenuGuids.length > 1 ? "s" : ""} merged — {allPrintGroups.length} total groups available
              </p>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Font Size: {printScale}%</label>
            <p className="text-xs text-muted-foreground">Reduce to fit more content per page. Try 85-90% if items spill onto an extra page.</p>
            <input
              type="range"
              min={60}
              max={120}
              step={5}
              value={printScale}
              onChange={(e) => setPrintScale(Number(e.target.value))}
              className="w-full max-w-xs accent-primary"
              data-testid="slider-print-scale"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Target Pages: {printPages === 0 ? "Auto" : printPages}</label>
            <p className="text-xs text-muted-foreground">Set the number of pages the menu should print on. Use with font size to fit content.</p>
            <Select value={String(printPages)} onValueChange={(v) => setPrintPages(Number(v))}>
              <SelectTrigger data-testid="select-print-pages">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Auto</SelectItem>
                <SelectItem value="1">1 Page</SelectItem>
                <SelectItem value="2">2 Pages</SelectItem>
                <SelectItem value="3">3 Pages</SelectItem>
                <SelectItem value="4">4 Pages</SelectItem>
                <SelectItem value="5">5 Pages</SelectItem>
                <SelectItem value="6">6 Pages</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Custom Header</label>
            <p className="text-xs text-muted-foreground">Add a subtitle or tagline above the menu title (e.g., "Est. 1978" or "Spring 2026").</p>
            <input
              type="text"
              value={printHeader}
              onChange={(e) => setPrintHeader(e.target.value)}
              placeholder="e.g., Spring 2026 Season"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
              data-testid="input-print-header"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Custom Footer</label>
            <p className="text-xs text-muted-foreground">Add a custom message at the bottom (e.g., website URL, phone number).</p>
            <input
              type="text"
              value={printFooter}
              onChange={(e) => setPrintFooter(e.target.value)}
              placeholder="e.g., nashobawinery.com · (978) 779-5521"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
              data-testid="input-print-footer"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={printHideDescriptions}
              onCheckedChange={(checked) => setPrintHideDescriptions(!!checked)}
              data-testid="checkbox-hide-descriptions"
            />
            <span className="font-medium">Hide Descriptions</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={printHidePricing}
              onCheckedChange={(checked) => setPrintHidePricing(!!checked)}
              data-testid="checkbox-hide-pricing"
            />
            <span className="font-medium">Hide Pricing</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={printHideWinePairing}
              onCheckedChange={(checked) => setPrintHideWinePairing(!!checked)}
              data-testid="checkbox-hide-wine-pairing"
            />
            <span className="font-medium">Hide Wine Pairings</span>
          </label>
        </div>

        {allPrintGroups.length > 1 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Page Breaks</label>
            <p className="text-xs text-muted-foreground">Force a page break before specific courses so each starts on a new page when printing.</p>
            <div className="flex flex-wrap gap-3">
              {allPrintGroups.map((g, idx) => {
                if (idx === 0) return null;
                const isChecked = printPageBreaks.includes(g.groupGuid);
                return (
                  <label key={g.groupGuid} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        setPrintPageBreaks(prev =>
                          checked ? [...prev, g.groupGuid] : prev.filter(id => id !== g.groupGuid)
                        );
                      }}
                      data-testid={`checkbox-pagebreak-${g.groupGuid}`}
                    />
                    <span>Before "{g.name}"</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="overflow-hidden">
            <div className="aspect-[3/4] bg-[#1a1a18] flex flex-col items-center justify-center p-6 text-center">
              <p className="text-[#d4b896] font-serif text-xl tracking-widest uppercase mb-2">Fine Dining</p>
              <div className="w-8 h-px bg-[#a08c6e] mb-3" />
              <p className="text-[#e8dcc8] font-serif text-sm uppercase tracking-wider mb-1">Starters</p>
              <p className="text-[#b8a890] text-xs italic">Elegant serif typography</p>
              <p className="text-[#b8a890] text-xs italic">Dark background, gold accents</p>
              <p className="text-[#b8a890] text-xs italic">Centered layout</p>
            </div>
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">Fine Dining</p>
                  <p className="text-xs text-muted-foreground">Dark, elegant, serif fonts</p>
                </div>
                <Button size="sm" onClick={() => handlePrint("fine-dining")} data-testid="button-print-fine-dining">
                  <Printer className="w-4 h-4 mr-1" />
                  Print
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <div className="aspect-[3/4] bg-[#fafaf9] flex flex-col items-center justify-center p-6 text-center">
              <p className="text-[#1c1917] font-sans text-xl font-semibold mb-2">Modern Clean</p>
              <div className="w-full h-px bg-[#e7e5e4] mb-3" />
              <p className="text-[#44403c] font-sans text-sm font-semibold uppercase tracking-wider mb-1">Starters</p>
              <p className="text-[#78716c] text-xs">Clean sans-serif typography</p>
              <p className="text-[#78716c] text-xs">Light background, minimal</p>
              <p className="text-[#78716c] text-xs">Left-aligned with prices</p>
            </div>
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">Modern Clean</p>
                  <p className="text-xs text-muted-foreground">Light, minimal, sans-serif</p>
                </div>
                <Button size="sm" onClick={() => handlePrint("modern")} data-testid="button-print-modern">
                  <Printer className="w-4 h-4 mr-1" />
                  Print
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <div className="aspect-[3/4] bg-white flex flex-col items-center justify-center p-6 text-center">
              <p className="text-[#1c1917] font-sans text-lg font-bold uppercase tracking-wider mb-3">Beverage Menu</p>
              <div className="w-full text-left space-y-1 px-2">
                <p className="text-[#1c1917] font-sans text-xs font-bold underline">Wine</p>
                <div className="flex justify-between text-[10px] text-[#44403c]"><span>Chardonnay</span><span>$12</span></div>
                <div className="flex justify-between text-[10px] text-[#44403c]"><span>Pinot Noir</span><span>$14</span></div>
                <p className="text-[#1c1917] font-sans text-xs font-bold underline mt-2">Beer</p>
                <div className="flex justify-between text-[10px] text-[#44403c]"><span>IPA</span><span>$8</span></div>
                <div className="flex justify-between text-[10px] text-[#44403c]"><span>Lager</span><span>$7</span></div>
              </div>
              <p className="text-[#78716c] text-xs mt-3 italic">Compact list, no descriptions</p>
            </div>
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">Beverage Menu</p>
                  <p className="text-xs text-muted-foreground">Compact list, names + prices</p>
                </div>
                <Button size="sm" onClick={() => handlePrint("beverage")} data-testid="button-print-beverage">
                  <Printer className="w-4 h-4 mr-1" />
                  Print
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0 overflow-hidden rounded-md">
            <div className="bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground border-b flex items-center justify-between gap-2 flex-wrap">
              <span>Print Preview</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePrint(printTemplate)}
                data-testid="button-open-print"
              >
                <Printer className="w-4 h-4 mr-1" />
                Open & Print
              </Button>
            </div>
            <iframe
              src={getPrintPreviewUrl()}
              className="w-full border-0"
              style={{ height: "600px" }}
              title="Print Preview"
              data-testid="iframe-print-preview"
            />
          </CardContent>
        </Card>
      </>
    );
  };

  return (
    <>
      <div className="p-6 space-y-4">
        {viewMode === "list" && renderMenuList()}
        {viewMode === "detail" && renderMenuDetail()}
        {viewMode === "embed" && renderEmbedView()}
        {viewMode === "print" && renderPrintView()}
      </div>

      <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Sync Menus from Toast</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Select the menus you want to sync, or sync all at once.
          </p>

          {availableLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
              <span className="text-sm text-muted-foreground">Loading menus from Toast...</span>
            </div>
          ) : availableMenus.length === 0 ? (
            <div className="py-8 text-center">
              <UtensilsCrossed className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No menus found in your Toast account.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-sm font-medium">{availableMenus.length} menus found</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (selectedMenuGuids.length === availableMenus.length) {
                      setSelectedMenuGuids([]);
                    } else {
                      setSelectedMenuGuids(availableMenus.map(m => m.guid));
                    }
                  }}
                  data-testid="button-toggle-all-menus"
                >
                  {selectedMenuGuids.length === availableMenus.length ? "Deselect All" : "Select All"}
                </Button>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1 border rounded-md p-2">
                {availableMenus.map((m) => (
                  <label
                    key={m.guid}
                    className="flex items-center gap-3 p-2 rounded-md hover-elevate cursor-pointer"
                    data-testid={`menu-option-${m.guid}`}
                  >
                    <Checkbox
                      checked={selectedMenuGuids.includes(m.guid)}
                      onCheckedChange={() => toggleMenuGuid(m.guid)}
                      data-testid={`checkbox-menu-${m.guid}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.groupCount} groups, {m.itemCount} items
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 flex-wrap">
            <Button variant="outline" onClick={() => setShowSyncDialog(false)} data-testid="button-cancel-sync">
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => restaurantGuid && syncMutation.mutate({ guid: restaurantGuid })}
              disabled={syncMutation.isPending || availableLoading || availableMenus.length === 0}
              data-testid="button-sync-all"
            >
              {syncMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Sync All
            </Button>
            <Button
              onClick={() => restaurantGuid && syncMutation.mutate({ guid: restaurantGuid, menuGuids: selectedMenuGuids })}
              disabled={syncMutation.isPending || selectedMenuGuids.length === 0}
              data-testid="button-sync-selected"
            >
              {syncMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ListFilter className="w-4 h-4 mr-2" />}
              Sync Selected ({selectedMenuGuids.length})
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
