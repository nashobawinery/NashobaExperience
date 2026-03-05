import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ToastMenuPrinter from "@/components/ToastMenuPrinter";
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
  ExternalLink, CalendarDays, ArrowLeft, FileText, ListFilter, Wine, Scissors,
  ChevronUp, ChevronDown, GripVertical, BookMarked, Monitor, Share2, BookOpen,
  Save, LayoutDashboard, Lightbulb, AlertCircle
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
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [selectedMenuGuids, setSelectedMenuGuids] = useState<string[]>([]);
  const [selectedEmbedGroups, setSelectedEmbedGroups] = useState<string[]>([]);

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

  const getEmbedUrl = (menuGuid: string, template: string, groupGuids?: string[], scale?: number, useNames = false, pages?: number, footer?: string, pageBreaks?: string[], hideDescriptions?: boolean) => {
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
    if (pageBreaks && pageBreaks.length > 0) url += `&pagebreaks=${encodeURIComponent(pageBreaks.join(","))}`;
    if (hideDescriptions) url += `&hidedesc=1`;
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


  const openPrintView = (menuGuid: string, template: string, groupGuids?: string[], scale?: number, pages?: number, footer?: string, pageBreaks?: string[], hideDescriptions?: boolean) => {
    const url = getEmbedUrl(menuGuid, template, groupGuids, scale, false, pages, footer, pageBreaks, hideDescriptions);
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
      </div>
    );
  };

  const renderMenusSection = () => (
    <div className="space-y-4">
      {!selectedMenu && (
        <div className="rounded-md border bg-muted/30 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <UtensilsCrossed className="w-5 h-5 text-muted-foreground shrink-0 hidden sm:block" />
          <div className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Toast Connect</span> syncs your Toast POS menus into this platform so you can prepare them for print and the web.
            Start by syncing your menus from Toast, then open any menu to select courses, adjust formatting, and save a named configuration.
            Saved menus can be printed, shared via a permanent link, or pinned to the Staff Print Board — all without touching Toast again.{" "}
            <button
              onClick={() => setActiveSection("docs")}
              className="text-primary underline-offset-2 hover:underline font-medium"
              data-testid="link-view-docs"
            >
              View documentation
            </button>
          </div>
        </div>
      )}
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
    <ToastMenuPrinter testIdPrefix="tc" />
  );

  const renderDocsSection = () => (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold mb-2">Toast Connect Documentation</h2>
        <p className="text-muted-foreground">How to keep your menus accurate and looking great across web and print.</p>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <ListFilter className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">Recommended Workflow</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            Follow these steps in order whenever you need to update your menus. This ensures your descriptions stay consistent across all platforms — Toast POS, your website, and printed menus.
          </p>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">1</div>
              <div>
                <p className="text-sm font-semibold">Make all changes in Toast first</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Always update item names, prices, and descriptions directly in your Toast POS system. Toast is the single source of truth for your menu content. Making changes there first ensures consistency across every place your menu appears — your POS terminals, your website, and your printed menus.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">2</div>
              <div>
                <p className="text-sm font-semibold">Sync your menus</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  After making changes in Toast, come here and click <strong>Sync from Toast</strong> to pull in the latest data. Select only the menus you changed to keep things fast. This brings over updated names, prices, descriptions, and item ordering.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">3</div>
              <div>
                <p className="text-sm font-semibold">Review and format for presentation</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Open the synced menu and review each item. Use the description fields to add formatting codes like <code className="bg-muted px-1.5 py-0.5 rounded text-xs">&lt;br&gt;</code> for line breaks to control how text appears on your website and printed menus. Add suggested wine pairings for each item as desired.
                </p>
                <div className="mt-2 p-3 bg-muted/50 rounded-md">
                  <p className="text-xs font-medium mb-1">Important note about editing descriptions:</p>
                  <p className="text-xs text-muted-foreground">
                    While you can change the actual wording of a description here, it is <strong>not recommended</strong>. If you change the text here but not in Toast, your menu descriptions will be different in Toast vs. your website/print. Instead, use this editing feature only for <strong>presentation formatting</strong> — adding line breaks, spacing, and HTML codes to make items look their best on web and print.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">4</div>
              <div>
                <p className="text-sm font-semibold">Preview and print</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Use the <strong>Preview</strong> button to see how your menu looks, then go to <strong>Print Menus</strong> to generate print-ready versions. Adjust font size, target page count, and add a custom footer as needed.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
              <li>Item names, prices, and descriptions will update from Toast.</li>
              <li>Any formatting (line breaks, HTML) you previously added will be preserved.</li>
              <li>Items will appear in the same order as they are in Toast.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Code className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">Formatting Descriptions</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Use simple HTML codes in the description fields to control how text appears on web and print:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
              <li><code className="bg-muted px-1 rounded text-xs">&lt;br&gt;</code> — inserts a line break</li>
              <li><code className="bg-muted px-1 rounded text-xs">&lt;br&gt;&lt;br&gt;</code> — inserts a blank line</li>
              <li>Example: <em>Roasted chicken&lt;br&gt;with seasonal vegetables</em></li>
              <li>Only use formatting codes — avoid changing the actual wording here.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Printer className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">Print Options</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Generate beautiful, print-ready menus with full control:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
              <li><strong>Font Size</strong> slider (60%–120%) to fit more or less on a page.</li>
              <li><strong>Target Pages</strong> selector to choose how many pages to print on.</li>
              <li><strong>Custom Footer</strong> to add a message on the last page (website, phone, etc.).</li>
              <li><strong>Course Filter</strong> to print only specific courses/groups.</li>
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

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Code className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">Permanent Links</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Embed codes and direct links are "frozen" by name.
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
              <li>Links use menu names instead of IDs.</li>
              <li>If you swap items or groups in Toast, your website link stays the same.</li>
              <li>As long as the <strong>Menu Name</strong> stays the same, the link stays the same.</li>
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
      case "docs": return <ToastConnectDocs />;
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

export function ToastConnectDocs() {
  return (
    <div className="space-y-8 max-w-4xl" data-testid="section-toast-docs">
      <div>
        <h2 className="text-2xl font-bold mb-1" data-testid="text-toast-docs-title">Toast Connect Documentation</h2>
        <p className="text-muted-foreground">Everything you need to know to manage menus for print, web, and staff.</p>
      </div>

      {/* Overview */}
      <div className="rounded-md border bg-muted/30 p-4 flex gap-3">
        <BookOpen className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground leading-relaxed space-y-1">
          <p><span className="font-medium text-foreground">What is Toast Connect?</span></p>
          <p>
            Toast Connect is a menu management hub that bridges your Toast POS system with your print operations, website, and staff portal.
            You sync menus from Toast, select which courses to include, fine-tune formatting, and save named configurations — called <strong className="text-foreground">Saved Menus</strong>.
            From a saved menu you can generate a print-ready PDF, share a permanent link for your website, or pin it to the Staff Print Board so front-of-house staff can print it with one click.
          </p>
        </div>
      </div>

      {/* Recommended Workflow */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <ListFilter className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">Recommended Workflow</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-5">
            Follow these steps in order whenever you need to update or create a menu for print or the web.
          </p>
          <div className="space-y-5">
            {[
              {
                n: "1",
                title: "Update in Toast first",
                body: "Always make changes to item names, prices, and descriptions inside your Toast POS system. Toast is the single source of truth. Keeping changes there first ensures your POS terminals, website, and printed menus all match.",
              },
              {
                n: "2",
                title: "Sync from Toast",
                body: "After updating Toast, click Sync from Toast in the Menus tab. Select only the menus you changed to keep things fast. Names, prices, descriptions, and item order all update from Toast. Any presentation formatting you previously added (line breaks, etc.) is preserved.",
              },
              {
                n: "3",
                title: "Open a menu and select courses",
                body: "Click on any synced menu to open its detail view. Use the course checkboxes to include only the sections you want (e.g., a single brunch course, or the full dinner menu). You can also hide individual items or prices at this stage.",
              },
              {
                n: "4",
                title: "Adjust formatting and pairings",
                body: "Review item descriptions and add HTML formatting codes like <br> for line breaks to control how text wraps on print and web. Add or override wine/beverage pairings for any item. These presentation edits are stored separately from Toast — your Toast data stays clean.",
              },
              {
                n: "5",
                title: "Save as a named menu",
                body: "Click Save Menu in the top action bar. Give the configuration a name (e.g., \"2026 Easter Brunch — No Pricing\"). The saved menu remembers every setting: which courses are included, font sizes, header/footer text, visibility toggles, and more.",
              },
              {
                n: "6",
                title: "Print, share, or pin to Staff Board",
                body: "From Saved Menus, you can print with one click, copy a permanent share link for your website, or toggle a menu visible on the Staff Print Board so front-of-house staff can access it from the Staff Portal.",
              },
            ].map(({ n, title, body }) => (
              <div key={n} className="flex gap-3">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">{n}</div>
                <div>
                  <p className="text-sm font-semibold mb-0.5">{title}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Feature sections grid */}
      <div className="grid gap-6 md:grid-cols-2">

        {/* Syncing */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-base">Syncing Menus from Toast</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Changes you make in Toast POS are not reflected here automatically. You must trigger a sync.
            </p>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">→</span>Go to <strong className="text-foreground">Menus</strong> and click <strong className="text-foreground">Sync from Toast</strong>.</li>
              <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">→</span>Select individual menus to sync or use <strong className="text-foreground">Sync All</strong>.</li>
              <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">→</span>Item names, prices, descriptions, and sort order all update from Toast.</li>
              <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">→</span>Your local formatting overrides (<code className="bg-muted px-1 rounded text-xs">&lt;br&gt;</code> tags, wine pairings) are <strong className="text-foreground">preserved</strong> across syncs.</li>
              <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">→</span>Hidden items stay hidden after a sync.</li>
            </ul>
          </CardContent>
        </Card>

        {/* Menu Detail & Overrides */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-base">Menu Detail & Item Overrides</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Open any menu to access per-item controls that let you fine-tune presentation without modifying Toast.
            </p>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">→</span><strong className="text-foreground">Hide item</strong> — removes an item from web and print without deleting it from Toast.</li>
              <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">→</span><strong className="text-foreground">Hide price</strong> — shows the item but omits its price (useful for prix fixe or event menus).</li>
              <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">→</span><strong className="text-foreground">Mark as Special</strong> — flags the item visually on print and web menus.</li>
              <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">→</span><strong className="text-foreground">Description override</strong> — use only for adding <code className="bg-muted px-1 rounded text-xs">&lt;br&gt;</code> line breaks; avoid rewriting content here.</li>
              <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">→</span><strong className="text-foreground">Suggested Pairing</strong> — add a wine or beverage pairing that appears styled below the item description.</li>
            </ul>
          </CardContent>
        </Card>

        {/* Saved Menus */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2">
              <BookMarked className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-base">Saved Menus</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A saved menu is a named snapshot of your current selections and settings — the menu, which courses to include, font sizes, header/footer text, and visibility options.
            </p>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">→</span>Click <strong className="text-foreground">Save Menu</strong> in the detail view after configuring your menu and courses.</li>
              <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">→</span>Give it a descriptive name like <em>"Easter Brunch — No Pricing"</em> or <em>"Dinner — Dining Room"</em>.</li>
              <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">→</span>From <strong className="text-foreground">Saved Menus</strong>, you can print, share, or load any saved menu back into the editor.</li>
              <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">→</span><strong className="text-foreground">Load as starting point</strong> — open a saved menu, make changes, then save again. Choose to <em>Update</em> the original or <em>Save as New</em> to create a variation.</li>
              <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">→</span>Saved menus are independent of Toast syncs — loading a saved config restores all your layout choices.</li>
            </ul>
          </CardContent>
        </Card>

        {/* Staff Print Board */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2">
              <Monitor className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-base">Staff Print Board</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The Staff Print Board is a curated list of menus visible to front-of-house staff from the Staff Portal. Staff can open and print any pinned menu with one click — no login or configuration needed.
            </p>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">→</span>Go to <strong className="text-foreground">Saved Menus</strong> and use the eye toggle on any saved menu to show or hide it on the Staff Board.</li>
              <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">→</span>Only menus with the toggle <strong className="text-foreground">on</strong> appear in the Staff Portal's Print Board.</li>
              <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">→</span>Use this to curate exactly what staff see — for example, show today's specials, hide off-season menus.</li>
              <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">→</span>Toggling visibility is instant — no page refresh needed.</li>
            </ul>
          </CardContent>
        </Card>

        {/* Print */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-base">Printing Menus</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The Print view gives you full control over the appearance of your printed menu before sending it to the printer.
            </p>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">→</span><strong className="text-foreground">Template</strong> — choose Fine Dining, Beverage, or Modern layout.</li>
              <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">→</span><strong className="text-foreground">Font Size</strong> slider (60%–120%) — scale everything up or down to fit the page.</li>
              <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">→</span><strong className="text-foreground">Target Pages</strong> — tell the system how many pages to aim for (Auto, 1, 2, etc.).</li>
              <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">→</span><strong className="text-foreground">Header / Footer</strong> — add a restaurant name, tagline, date, or contact info.</li>
              <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">→</span><strong className="text-foreground">Merge menus</strong> — combine groups from multiple Toast menus into one printed document.</li>
              <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">→</span>In your browser's print dialog, uncheck <strong className="text-foreground">Headers and footers</strong> for a clean professional look.</li>
            </ul>
          </CardContent>
        </Card>

        {/* Share / Embed */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-base">Share & Embed on Website</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Every saved menu gets a permanent link that can be shared directly or embedded as an iframe on your website.
            </p>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">→</span>From <strong className="text-foreground">Saved Menus</strong>, click the link icon to copy the permanent URL.</li>
              <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">→</span>The URL uses a name-based slug — it stays the same as long as the menu name doesn't change.</li>
              <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">→</span>Use the <strong className="text-foreground">Embed / Widget</strong> tab to generate iframe code for your website.</li>
              <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">→</span>When you update and resave the menu, the live link automatically reflects the latest content.</li>
              <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">→</span>Guests see a styled, mobile-friendly menu without any login.</li>
            </ul>
          </CardContent>
        </Card>

        {/* Formatting */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2">
              <Code className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-base">Formatting Descriptions</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Use simple HTML in item descriptions to control how text wraps and displays on print and web.
            </p>
            <div className="bg-muted/50 rounded-md p-3 space-y-1.5 text-sm text-muted-foreground">
              <p><code className="bg-background px-1.5 py-0.5 rounded text-xs border">&lt;br&gt;</code> — line break (starts a new line)</p>
              <p><code className="bg-background px-1.5 py-0.5 rounded text-xs border">&lt;br&gt;&lt;br&gt;</code> — blank line between paragraphs</p>
              <p className="pt-1 text-xs"><em>Example:</em> <code className="bg-background px-1 rounded text-xs border">Pan-seared salmon&lt;br&gt;lemon beurre blanc, seasonal vegetables</code></p>
            </div>
            <div className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Use description overrides <strong className="text-foreground">only for formatting</strong> — not for rewriting content. If you change wording here, it will differ from what's in Toast POS, which can cause confusion during future syncs.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Wine Pairings */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2">
              <Wine className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-base">Wine & Beverage Pairings</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Pairings appear as a styled line beneath any item's description on both print and web menus.
            </p>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">→</span>If your Toast description contains <strong className="text-foreground">Suggested Pairing:</strong>, it is automatically extracted and stored as a pairing.</li>
              <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">→</span>You can manually add or override a pairing for any item in the menu detail view.</li>
              <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">→</span>Pairings survive syncs — they are only overwritten if Toast sends a new "Suggested Pairing" in the description.</li>
              <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">→</span>Use the <strong className="text-foreground">Hide wine pairing</strong> toggle in print settings to suppress pairings for a specific print job.</li>
            </ul>
          </CardContent>
        </Card>

      </div>

      {/* Tips callout */}
      <Card className="border-muted">
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-base">Tips & Common Scenarios</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground mb-1">Seasonal / event menus</p>
              <p className="leading-relaxed">Create a saved menu for each event (e.g., "2026 Easter Brunch Children's"). When the event is over, toggle it off the Staff Board — it stays in Saved Menus in case you want to reuse it next year as a starting point.</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Multi-location menus</p>
              <p className="leading-relaxed">If your Toast account includes multiple locations, use the location selector in the Menus tab to switch between them and sync their menus independently.</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Menu with and without pricing</p>
              <p className="leading-relaxed">Load a saved menu, enable "Hide Pricing" in the print settings, then save it as a new menu (e.g., "Dinner — No Pricing"). Both versions live in Saved Menus independently.</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Merging Toast menus</p>
              <p className="leading-relaxed">If related courses were imported as separate menus in Toast, use the "Merge Groups" option in the Print view to combine them into one printed document without modifying Toast.</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Something changed unexpectedly after a sync</p>
              <p className="leading-relaxed">A sync replaces item names, prices, descriptions, and order from Toast. If an item moved or a description changed, it changed in Toast first. Check your Toast POS to confirm, then re-apply any formatting overrides you need.</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Print looks cramped or spills onto extra pages</p>
              <p className="leading-relaxed">Use the Font Size slider (try 85–90%) and set a Target Pages value. Fine Dining template gives the most whitespace; Beverage template is the most compact. Adjusting both usually gets the right fit.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ToastPrintMenus() {
  return <ToastMenuPrinter testIdPrefix="cc" />;
}
