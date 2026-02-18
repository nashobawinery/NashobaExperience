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
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  RefreshCw, UtensilsCrossed, Loader2, Search,
  Code, Printer, Eye, EyeOff, Copy, Check, ChevronLeft,
  ExternalLink, CalendarDays, ArrowLeft, FileText, ListFilter, Wine
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, Link } from "wouter";

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

function formatPrice(price: string | null): string {
  if (!price) return "";
  const num = parseFloat(price);
  if (isNaN(num)) return "";
  return `$${num.toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

interface AvailableMenu {
  guid: string;
  name: string;
  groupCount: number;
  itemCount: number;
}

type ActiveSection = "menus" | "embed" | "print" | "reservations" | "docs";

function ToastConnectContent() {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<ActiveSection>("menus");
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("");
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [embedTemplate, setEmbedTemplate] = useState("fine-dining");
  const [printTemplate, setPrintTemplate] = useState("fine-dining");
  const [printScale, setPrintScale] = useState(100);
  const [printPages, setPrintPages] = useState(0);
  const [printFooter, setPrintFooter] = useState("");
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [selectedMenuGuids, setSelectedMenuGuids] = useState<string[]>([]);
  const [selectedEmbedGroups, setSelectedEmbedGroups] = useState<string[]>([]);
  const [selectedPrintGroups, setSelectedPrintGroups] = useState<string[]>([]);

  const { data: statusData, isLoading: statusLoading } = useQuery<{
    configured: boolean;
    authenticated: boolean;
    restaurants: ToastRestaurant[];
  }>({
    queryKey: ["/api/toast/status"],
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

  const syncSingleMenu = useMutation({
    mutationFn: async (menuGuid: string) => {
      const res = await apiRequest("POST", "/api/toast/menus/sync", { restaurantGuid: restaurantGuid, menuGuids: [menuGuid] });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => {
        const key = query.queryKey[0] as string;
        return key?.startsWith?.("/api/toast/");
      }});
      toast({ title: "Menu synced", description: "Menu data refreshed from Toast" });
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

  const handleOpenSyncDialog = async () => {
    setShowSyncDialog(true);
    setSelectedMenuGuids([]);
    fetchAvailableMenus();
  };

  const toggleMenuGuid = (guid: string) => {
    setSelectedMenuGuids(prev =>
      prev.includes(guid) ? prev.filter(g => g !== guid) : [...prev, guid]
    );
  };

  const getEmbedUrl = (menuGuid: string, template: string, groupGuids?: string[], scale?: number, useNames = false, pages?: number, footer?: string) => {
    const base = window.location.origin;
    let menuId = menuGuid;
    let groupIds = groupGuids;

    if (useNames && menuDetail) {
      menuId = menuDetail.menu.name;
      if (groupGuids && groupGuids.length > 0) {
        groupIds = groupGuids.map(guid => {
          const group = menuDetail.groups.find(g => g.groupGuid === guid);
          return group ? group.name : guid;
        });
      }
    }

    let url = `${base}/api/toast/public/menu/${encodeURIComponent(menuId)}/embed?template=${template}`;
    if (groupIds && groupIds.length > 0) url += `&groupGuid=${encodeURIComponent(groupIds.join(","))}`;
    if (scale && scale !== 100) url += `&scale=${scale}`;
    if (pages && pages > 0) url += `&pages=${pages}`;
    if (footer && footer.trim()) url += `&footer=${encodeURIComponent(footer.trim())}`;
    return url;
  };

  const getEmbedCode = (menuGuid: string, template: string, groupGuids?: string[]) => {
    const url = getEmbedUrl(menuGuid, template, groupGuids, 100, true);
    return `<iframe src="${url}" width="100%" height="800" frameborder="0" style="border:none; max-width:900px; margin:0 auto; display:block;"></iframe>`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2000);
    toast({ title: "Copied to clipboard" });
  };

  const openPrintView = (menuGuid: string, template: string, groupGuids?: string[], scale?: number, pages?: number, footer?: string) => {
    const url = getEmbedUrl(menuGuid, template, groupGuids, scale, false, pages, footer);
    const printWindow = window.open(url, "_blank");
    if (printWindow) {
      printWindow.addEventListener("load", () => {
        setTimeout(() => printWindow.print(), 500);
      });
    }
  };

  const sidebarStyle = {
    "--sidebar-width": "14rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  const renderSidebar = () => (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Toast Connect</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeSection === "menus"}
                  onClick={() => { setActiveSection("menus"); setSelectedMenu(null); }}
                  data-testid="nav-menus"
                >
                  <UtensilsCrossed className="w-4 h-4" />
                  <span>Menus</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeSection === "embed"}
                  onClick={() => setActiveSection("embed")}
                  data-testid="nav-embed"
                >
                  <Code className="w-4 h-4" />
                  <span>Embed / Widget</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeSection === "print"}
                  onClick={() => setActiveSection("print")}
                  data-testid="nav-print"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Menus</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeSection === "docs"}
                  onClick={() => setActiveSection("docs")}
                  data-testid="nav-docs"
                >
                  <FileText className="w-4 h-4" />
                  <span>Documentation</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );

  if (statusLoading) {
    return (
      <SidebarProvider style={sidebarStyle}>
        <div className="flex h-screen w-full">
          {renderSidebar()}
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </div>
      </SidebarProvider>
    );
  }

  if (!isConfigured) {
    return (
      <SidebarProvider style={sidebarStyle}>
        <div className="flex h-screen w-full">
          {renderSidebar()}
          <div className="flex-1 p-6">
            <header className="flex items-center gap-2 mb-6">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <h1 className="text-xl font-semibold">Toast Connect</h1>
            </header>
            <Card>
              <CardContent className="py-12 text-center">
                <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium mb-1">Toast API Not Connected</p>
                <p className="text-sm text-muted-foreground">
                  Configure your Toast API credentials in Settings to get started.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  const renderMenuList = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold" data-testid="text-menus-title">Your Toast Menus</h2>
          <p className="text-sm text-muted-foreground">{menus.length} menus available</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {restaurants.length > 1 && (
            <Select value={restaurantGuid} onValueChange={setSelectedRestaurant}>
              <SelectTrigger className="w-48" data-testid="select-restaurant">
                <SelectValue placeholder="Select restaurant" />
              </SelectTrigger>
              <SelectContent>
                {restaurants.map((r) => (
                  <SelectItem key={r.guid} value={r.guid}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            onClick={handleOpenSyncDialog}
            disabled={!restaurantGuid || syncMutation.isPending}
            data-testid="button-sync-menus"
          >
            {syncMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Sync from Toast
          </Button>
        </div>
      </div>

      {menusLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3].map(i => <Card key={i}><CardContent className="py-8"><div className="h-6 bg-muted animate-pulse rounded" /></CardContent></Card>)}
        </div>
      ) : menus.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UtensilsCrossed className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium mb-1">No menus synced yet</p>
            <p className="text-sm text-muted-foreground">Click "Sync from Toast" to choose which menus to import.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {menus.map((menu) => (
            <Card
              key={menu.id}
              className="cursor-pointer hover-elevate transition-all"
              onClick={() => setSelectedMenu(menu.menuGuid)}
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
                  <ChevronLeft className="w-4 h-4 text-muted-foreground rotate-180 shrink-0 mt-1" />
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Synced {formatDate(menu.syncedAt)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
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
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => setSelectedMenu(null)} data-testid="button-back-menus">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold truncate" data-testid="text-menu-detail-name">{menu.name}</h2>
            <p className="text-sm text-muted-foreground">
              {groups.length} groups, {totalItems} items
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => syncSingleMenu.mutate(menu.menuGuid)}
              disabled={syncSingleMenu.isPending}
              data-testid="button-sync-menu"
            >
              {syncSingleMenu.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Sync
            </Button>
            <Button
              variant="outline"
              onClick={() => { setActiveSection("embed"); }}
              data-testid="button-get-embed"
            >
              <Code className="w-4 h-4 mr-2" />
              Embed
            </Button>
            <Button
              variant="outline"
              onClick={() => openPrintView(menu.menuGuid, "fine-dining")}
              data-testid="button-print-menu"
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
                        <p className="text-sm text-muted-foreground mt-0.5 italic">{item.description}</p>
                      )}
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
      </div>
    );
  };

  const renderMenusSection = () => (
    <div>
      {selectedMenu ? renderMenuDetail() : renderMenuList()}
    </div>
  );

  const toggleGroupSelection = (guid: string, selected: string[], setSelected: (v: string[]) => void) => {
    setSelected(selected.includes(guid) ? selected.filter(g => g !== guid) : [...selected, guid]);
  };

  const getGroupLabel = (selected: string[], groups?: { groupGuid: string; name: string }[]) => {
    if (selected.length === 0) return "All courses (full menu)";
    if (!groups) return `${selected.length} selected`;
    const names = selected.map(g => groups.find(gr => gr.groupGuid === g)?.name).filter(Boolean);
    if (names.length <= 2) return names.join(", ");
    return `${names.length} courses selected`;
  };

  const renderGroupMultiSelect = (selected: string[], setSelected: (v: string[]) => void, testIdPrefix: string) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between text-left font-normal" data-testid={`${testIdPrefix}-trigger`}>
          <span className="truncate">{getGroupLabel(selected, menuDetail?.groups)}</span>
          <ListFilter className="w-4 h-4 ml-2 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
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
          {menuDetail?.groups.map((g) => (
            <label
              key={g.groupGuid}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover-elevate"
              data-testid={`${testIdPrefix}-${g.groupGuid}`}
            >
              <Checkbox
                checked={selected.includes(g.groupGuid)}
                onCheckedChange={() => toggleGroupSelection(g.groupGuid, selected, setSelected)}
              />
              <span className="text-sm">{g.name}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );

  const renderEmbedSection = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold" data-testid="text-embed-title">Embed Menu on Website</h2>
        <p className="text-sm text-muted-foreground">
          Generate an embed code to display your Toast menu on any website. The menu updates automatically when you sync.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Menu</label>
          <Select value={selectedMenu || ""} onValueChange={(v) => { setSelectedMenu(v); setSelectedEmbedGroups([]); }}>
            <SelectTrigger data-testid="select-embed-menu">
              <SelectValue placeholder="Choose a menu..." />
            </SelectTrigger>
            <SelectContent>
              {menus.map((m) => (
                <SelectItem key={m.menuGuid} value={m.menuGuid}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
          {renderGroupMultiSelect(selectedEmbedGroups, setSelectedEmbedGroups, "select-embed-group")}
        </div>
      </div>

      {selectedMenu && (() => {
        const embedGroups = selectedEmbedGroups.length > 0 ? selectedEmbedGroups : undefined;
        return (
        <>
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-sm">Embed Code (iframe)</h3>
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">Permanent (by Name)</span>
                </div>
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
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-sm">Direct Link</h3>
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">Permanent (by Name)</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(getEmbedUrl(selectedMenu, embedTemplate, embedGroups, 100, true))}
                  data-testid="button-copy-link"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy URL
                </Button>
              </div>
              <Input
                readOnly
                value={getEmbedUrl(selectedMenu, embedTemplate, embedGroups, 100, true)}
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
      })()}
    </div>
  );

  const renderPrintSection = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold" data-testid="text-print-title">Print Menus</h2>
        <p className="text-sm text-muted-foreground">
          Select a menu and template to generate a print-ready version. Opens in a new tab for printing.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Menu</label>
          <Select value={selectedMenu || ""} onValueChange={(v) => { setSelectedMenu(v); setSelectedPrintGroups([]); }}>
            <SelectTrigger data-testid="select-print-menu">
              <SelectValue placeholder="Choose a menu..." />
            </SelectTrigger>
            <SelectContent>
              {menus.map((m) => (
                <SelectItem key={m.menuGuid} value={m.menuGuid}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
          <label className="text-sm font-medium">Courses / Groups</label>
          {renderGroupMultiSelect(selectedPrintGroups, setSelectedPrintGroups, "select-print-group")}
        </div>
      </div>

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

      <div className="space-y-2">
        <label className="text-sm font-medium">Custom Footer</label>
        <p className="text-xs text-muted-foreground">Add a custom message at the bottom of the last page (e.g., website URL, phone number, or special message).</p>
        <input
          type="text"
          value={printFooter}
          onChange={(e) => setPrintFooter(e.target.value)}
          placeholder="e.g., Visit us at nashobawinery.com or call (978) 779-5521"
          className="w-full max-w-lg px-3 py-2 rounded-md border border-input bg-background text-sm"
          data-testid="input-print-footer"
        />
      </div>

      {(() => {
        const printGroups = selectedPrintGroups.length > 0 ? selectedPrintGroups : undefined;
        return (
        <>
      <div className="grid gap-4 sm:grid-cols-2">
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
              {selectedMenu && (
                <Button
                  size="sm"
                  onClick={() => openPrintView(selectedMenu, "fine-dining", printGroups, printScale, printPages, printFooter)}
                  data-testid="button-print-fine-dining"
                >
                  <Printer className="w-4 h-4 mr-1" />
                  Print
                </Button>
              )}
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
              {selectedMenu && (
                <Button
                  size="sm"
                  onClick={() => openPrintView(selectedMenu, "modern", printGroups, printScale, printPages, printFooter)}
                  data-testid="button-print-modern"
                >
                  <Printer className="w-4 h-4 mr-1" />
                  Print
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedMenu && (
        <Card>
          <CardContent className="p-0 overflow-hidden rounded-md">
            <div className="bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground border-b flex items-center justify-between gap-2 flex-wrap">
              <span>Print Preview</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openPrintView(selectedMenu, printTemplate, printGroups, printScale, printPages, printFooter)}
                data-testid="button-open-print"
              >
                <Printer className="w-4 h-4 mr-1" />
                Open & Print
              </Button>
            </div>
            <iframe
              src={getEmbedUrl(selectedMenu, printTemplate, printGroups, printScale, false, printPages, printFooter)}
              className="w-full border-0"
              style={{ height: "600px" }}
              title="Print Preview"
              data-testid="iframe-print-preview"
            />
          </CardContent>
        </Card>
      )}
        </>
        );
      })()}
    </div>
  );

  const renderDocsSection = () => (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold mb-2">Toast Connect Documentation</h2>
        <p className="text-muted-foreground">Learn how to manage your menus, generate embed codes, and use permanent links.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <RefreshCw className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">Menu Syncing</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Updates in your Toast POS are not automatic. To see changes:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
              <li>Go to the <strong>Menus</strong> tab.</li>
              <li>Click <strong>Sync from Toast</strong>.</li>
              <li>Select the menus you want to refresh.</li>
              <li>Item names, prices, and descriptions will update instantly.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Code className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">Permanent Links</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Our embed codes and direct links are "frozen" by name.
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
              <li>Links use names like <code>/Evening Appetizer/</code> instead of IDs.</li>
              <li>This means if you swap out items or groups in Toast, your website doesn't need a new code.</li>
              <li>As long as the <strong>Menu Name</strong> stays the same, the link stays the same.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Printer className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">Print & Font Scaling</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Generate beautiful, print-ready PDF menus.
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
              <li>Use the <strong>Font Size</strong> slider (60%–120%) to fit more on a page.</li>
              <li>Pro Tip: 85%–95% is usually best for dense dinner menus.</li>
              <li>In your browser's print dialog, uncheck <strong>"Headers and footers"</strong> for a professional look.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Wine className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">Wine Pairings</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Add suggested wine pairings to any item.
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
              <li>The system automatically extracts "Suggested Pairing" from Toast descriptions.</li>
              <li>You can manually override or add pairings in the <strong>Menus</strong> detail view.</li>
              <li>Pairings appear beautifully styled on both print and online menus.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderReservationsSection = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Reservations</h2>
      <Card>
        <CardContent className="py-12 text-center">
          <CalendarDays className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <p className="font-medium mb-1">Coming Soon</p>
          <p className="text-sm text-muted-foreground">
            Toast reservations integration is planned for a future release.
          </p>
        </CardContent>
      </Card>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "menus": return renderMenusSection();
      case "embed": return renderEmbedSection();
      case "print": return renderPrintSection();
      case "reservations": return renderReservationsSection();
      case "docs": return renderDocsSection();
      default: return renderMenusSection();
    }
  };

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full">
        {renderSidebar()}
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="flex items-center justify-between gap-2 px-4 py-2 border-b shrink-0">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4 inline mr-1" />
                Back to Admin
              </Link>
            </div>
            <h1 className="text-sm font-medium" data-testid="text-toast-connect-title">Toast Connect</h1>
          </header>
          <main className="flex-1 overflow-y-auto p-6">
            {renderContent()}
          </main>
        </div>
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
    </SidebarProvider>
  );
}

export default function ToastConnect() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="font-medium mb-2">Authentication Required</p>
            <p className="text-sm text-muted-foreground mb-4">Please log in to access Toast Connect.</p>
            <Button onClick={() => window.location.href = "/api/login"} data-testid="button-login">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <ToastConnectContent />;
}
