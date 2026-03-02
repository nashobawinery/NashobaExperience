import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Printer, ListFilter, Scissors,
  ChevronUp, ChevronDown, GripVertical, RefreshCw, Loader2, Check
} from "lucide-react";

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
  items: any[];
}

interface MenuDetailData {
  menu: ToastMenuData;
  groups: ToastMenuGroupData[];
  totalItems: number;
}

interface AvailableMenu {
  guid: string;
  name: string;
  groupCount: number;
  itemCount: number;
}

interface SyncStatus {
  [restaurantGuid: string]: {
    menuCount: number;
    groupCount: number;
    itemCount: number;
    lastSynced: string;
  };
}

interface ToastMenuPrinterProps {
  testIdPrefix?: string;
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

export default function ToastMenuPrinter({ testIdPrefix = "mc" }: ToastMenuPrinterProps) {
  const { toast } = useToast();
  const [printTemplate, setPrintTemplate] = useState("fine-dining");
  const [printScale, setPrintScale] = useState(100);
  const [printPages, setPrintPages] = useState(0);
  const [printFooter, setPrintFooter] = useState("");
  const [printHideDescriptions, setPrintHideDescriptions] = useState(false);
  const [selectedPrintGroups, setSelectedPrintGroups] = useState<string[]>([]);
  const [printPageBreaks, setPrintPageBreaks] = useState<string[]>([]);
  const [selectedPrintMenus, setSelectedPrintMenus] = useState<string[]>([]);
  const [printMenuTitle, setPrintMenuTitle] = useState("");
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [selectedMenuGuids, setSelectedMenuGuids] = useState<string[]>([]);

  const { data: statusData, isLoading: statusLoading } = useQuery<{
    configured: boolean;
    authenticated: boolean;
    restaurants: { guid: string; name: string; location: string | null }[];
  }>({
    queryKey: ["/api/toast/status"],
  });

  const { data: syncStatus } = useQuery<SyncStatus>({
    queryKey: ["/api/toast/menus/sync-status"],
  });

  const restaurants = statusData?.restaurants || [];
  const isConfigured = statusData?.configured && statusData?.authenticated;
  const defaultRestaurant = restaurants.find(r => r.name.toLowerCase().includes("nashoba valley")) || restaurants[0];
  const restaurantGuid = defaultRestaurant?.guid || "";

  const currentRestaurantStatus = restaurantGuid && syncStatus ? syncStatus[restaurantGuid] : null;

  const { data: menus = [], isLoading: menusLoading } = useQuery<ToastMenuData[]>({
    queryKey: ["/api/toast/menus", { restaurantGuid }],
    enabled: !!restaurantGuid,
  });

  const singleMenuGuid = selectedPrintMenus.length === 1 ? selectedPrintMenus[0] : null;

  const { data: menuDetail } = useQuery<MenuDetailData>({
    queryKey: ["/api/toast/public/menu", singleMenuGuid],
    queryFn: async () => {
      const res = await fetch(`/api/toast/public/menu/${singleMenuGuid}?includeHidden=true`);
      if (!res.ok) throw new Error("Failed to load menu detail");
      return res.json();
    },
    enabled: !!singleMenuGuid,
  });

  const { data: printMenusDetail = [] } = useQuery<{ menuGuid: string; menuName: string; groups: ToastMenuGroupData[] }[]>({
    queryKey: ["/api/toast/print-menus-detail", selectedPrintMenus],
    queryFn: async () => {
      const results = [];
      for (const menuGuid of selectedPrintMenus) {
        const res = await fetch(`/api/toast/public/menu/${menuGuid}?includeHidden=true`);
        if (res.ok) {
          const data = await res.json();
          results.push({ menuGuid, menuName: data.menu.name, groups: data.groups });
        }
      }
      return results;
    },
    enabled: selectedPrintMenus.length > 0,
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

  const allPrintGroups = useMemo(() => {
    const groups: { groupGuid: string; name: string; menuName: string }[] = [];
    for (const detail of printMenusDetail) {
      for (const group of detail.groups) {
        groups.push({ groupGuid: group.groupGuid, name: group.name, menuName: detail.menuName });
      }
    }
    return groups;
  }, [printMenusDetail]);

  const getEmbedUrl = (menuGuid: string, template: string, groupGuids?: string[], scale?: number, pages?: number, footer?: string, pageBreaks?: string[], hideDescriptions?: boolean) => {
    const base = window.location.origin;
    let url = `${base}/api/toast/public/menu/${encodeURIComponent(menuGuid)}/embed?template=${template}`;
    if (groupGuids && groupGuids.length > 0) url += `&groupGuid=${encodeURIComponent(groupGuids.join(","))}`;
    if (scale && scale !== 100) url += `&scale=${scale}`;
    if (pages && pages > 0) url += `&pages=${pages}`;
    if (footer && footer.trim()) url += `&footer=${encodeURIComponent(footer.trim())}`;
    if (pageBreaks && pageBreaks.length > 0) url += `&pagebreaks=${encodeURIComponent(pageBreaks.join(","))}`;
    if (hideDescriptions) url += `&hidedesc=1`;
    return url;
  };

  const getMultiMenuEmbedUrl = (menuGuids: string[], template: string, scale?: number, pages?: number, footer?: string, pageBreaks?: string[], hideDescriptions?: boolean, title?: string) => {
    const base = window.location.origin;
    let url = `${base}/api/toast/public/menus/embed?menus=${encodeURIComponent(menuGuids.join(","))}&template=${template}`;
    if (scale && scale !== 100) url += `&scale=${scale}`;
    if (pages && pages > 0) url += `&pages=${pages}`;
    if (footer && footer.trim()) url += `&footer=${encodeURIComponent(footer.trim())}`;
    if (pageBreaks && pageBreaks.length > 0) url += `&pagebreaks=${encodeURIComponent(pageBreaks.join(","))}`;
    if (hideDescriptions) url += `&hidedesc=1`;
    if (title && title.trim()) url += `&title=${encodeURIComponent(title.trim())}`;
    return url;
  };

  const openPrintView = (menuGuid: string, template: string, groupGuids?: string[], scale?: number, pages?: number, footer?: string, pageBreaks?: string[], hideDescriptions?: boolean) => {
    const url = getEmbedUrl(menuGuid, template, groupGuids, scale, pages, footer, pageBreaks, hideDescriptions);
    const printWindow = window.open(url, "_blank");
    if (printWindow) {
      printWindow.addEventListener("load", () => {
        setTimeout(() => printWindow.print(), 500);
      });
    }
  };

  const openMultiMenuPrintView = (menuGuids: string[], template: string, scale?: number, pages?: number, footer?: string, pageBreaks?: string[], hideDescriptions?: boolean, title?: string) => {
    const url = getMultiMenuEmbedUrl(menuGuids, template, scale, pages, footer, pageBreaks, hideDescriptions, title);
    const printWindow = window.open(url, "_blank");
    if (printWindow) {
      printWindow.addEventListener("load", () => {
        setTimeout(() => printWindow.print(), 500);
      });
    }
  };

  const togglePrintMenu = (menuGuid: string) => {
    setSelectedPrintMenus(prev => {
      const newSelection = prev.includes(menuGuid)
        ? prev.filter(g => g !== menuGuid)
        : [...prev, menuGuid];
      if (newSelection.length !== 1) {
        setSelectedPrintGroups([]);
      }
      return newSelection;
    });
    setPrintPageBreaks([]);
  };

  const movePrintMenu = (index: number, direction: "up" | "down") => {
    setSelectedPrintMenus(prev => {
      const newArr = [...prev];
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= newArr.length) return prev;
      [newArr[index], newArr[swapIndex]] = [newArr[swapIndex], newArr[index]];
      return newArr;
    });
  };

  const toggleGroupSelection = (guid: string, selected: string[], setSelected: (v: string[]) => void) => {
    setSelected(selected.includes(guid) ? selected.filter(g => g !== guid) : [...selected, guid]);
  };

  const getGroupLabel = (selected: string[], groups?: { groupGuid: string; name: string }[]) => {
    if (!selected.length) return "All courses (full menu)";
    if (!groups) return `${selected.length} selected`;
    const names = selected.map(g => groups.find(gr => gr.groupGuid === g)?.name || g);
    return names.join(", ");
  };

  const isMultiMenu = selectedPrintMenus.length > 1;
  const isSingleMenu = selectedPrintMenus.length === 1;
  const hasSelection = selectedPrintMenus.length > 0;

  const getPrintPreviewUrl = () => {
    if (isMultiMenu) {
      return getMultiMenuEmbedUrl(selectedPrintMenus, printTemplate, printScale, printPages, printFooter, printPageBreaks, printHideDescriptions, printMenuTitle);
    } else if (isSingleMenu) {
      const groups = selectedPrintGroups.length > 0 ? selectedPrintGroups : undefined;
      return getEmbedUrl(selectedPrintMenus[0], printTemplate, groups, printScale, printPages, printFooter, printPageBreaks, printHideDescriptions);
    }
    return "";
  };

  const handlePrint = (template: string) => {
    if (isMultiMenu) {
      openMultiMenuPrintView(selectedPrintMenus, template, printScale, printPages, printFooter, printPageBreaks, printHideDescriptions, printMenuTitle);
    } else if (isSingleMenu) {
      const groups = selectedPrintGroups.length > 0 ? selectedPrintGroups : undefined;
      openPrintView(selectedPrintMenus[0], template, groups, printScale, printPages, printFooter, printPageBreaks, printHideDescriptions);
    }
  };

  const renderGroupMultiSelect = (selected: string[], setSelected: (v: string[]) => void, testId: string) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between text-left font-normal" data-testid={`${testId}-trigger`}>
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
            data-testid={`${testId}-all`}
          >
            All courses (full menu)
          </Button>
          {menuDetail?.groups.map((g) => (
            <label
              key={g.groupGuid}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover-elevate"
              data-testid={`${testId}-${g.groupGuid}`}
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

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="text-center py-12 space-y-2">
        <Printer className="h-10 w-10 mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Toast POS is not configured. Menu printing requires an active Toast connection.</p>
      </div>
    );
  }

  if (menusLoading || syncMutation.isPending) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">
          {syncMutation.isPending ? "Syncing menus from Toast..." : "Loading menus..."}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold" data-testid={`text-${testIdPrefix}-print-title`}>Toast Menu Printer</h2>
          <p className="text-sm text-muted-foreground">
            Select one or more menus to combine into a single printable document.
          </p>
        </div>
        <Button
          onClick={handleOpenSyncDialog}
          disabled={syncMutation.isPending || !restaurantGuid}
          data-testid={`${testIdPrefix}-button-sync-menus`}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Sync Menus from Toast
        </Button>
      </div>

      {currentRestaurantStatus && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
          <span>Last synced: {formatDate(currentRestaurantStatus.lastSynced)}</span>
          <Badge variant="secondary">{currentRestaurantStatus.menuCount} menus</Badge>
          <Badge variant="secondary">{currentRestaurantStatus.groupCount} groups</Badge>
          <Badge variant="secondary">{currentRestaurantStatus.itemCount} items</Badge>
        </div>
      )}

      {menus.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center space-y-2">
            <Printer className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="font-medium">No menus synced yet</p>
            <p className="text-sm text-muted-foreground">Click "Sync Menus from Toast" to pull in your menu items.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="text-sm font-medium">Select Menus</label>
              {hasSelection && (
                <span className="text-xs text-muted-foreground">{selectedPrintMenus.length} selected</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Click a menu to select it for printing. Select multiple to combine them into one document.</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid={`${testIdPrefix}-print-menu-list`}>
              {menus.map((m) => {
                const isSelected = selectedPrintMenus.includes(m.menuGuid);
                return (
                  <Card
                    key={m.menuGuid}
                    className={`cursor-pointer hover-elevate transition-all ${isSelected ? "ring-2 ring-primary" : ""}`}
                    onClick={() => togglePrintMenu(m.menuGuid)}
                    data-testid={`${testIdPrefix}-print-menu-option-${m.menuGuid}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-medium text-sm truncate">{m.name}</h3>
                          {m.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.description}</p>
                          )}
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${isSelected ? "bg-primary border-primary" : "border-muted-foreground/40"}`}>
                          {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">
                        Synced {formatDate(m.syncedAt)}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {hasSelection && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Print Order ({selectedPrintMenus.length} selected)</label>
              {isMultiMenu && (
                <p className="text-xs text-muted-foreground">Use the arrows to control the order menus appear in the printed document.</p>
              )}
              <div className="space-y-1 border rounded-md p-2" data-testid={`${testIdPrefix}-print-menu-order`}>
                {selectedPrintMenus.map((guid, index) => {
                  const menu = menus.find(m => m.menuGuid === guid);
                  return (
                    <div
                      key={guid}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/50"
                      data-testid={`${testIdPrefix}-print-order-item-${index}`}
                    >
                      <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm flex-1 truncate">{menu?.name || guid}</span>
                      <div className="flex items-center gap-0.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={index === 0}
                          onClick={(e) => { e.stopPropagation(); movePrintMenu(index, "up"); }}
                          data-testid={`${testIdPrefix}-button-move-up-${index}`}
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={index === selectedPrintMenus.length - 1}
                          onClick={(e) => { e.stopPropagation(); movePrintMenu(index, "down"); }}
                          data-testid={`${testIdPrefix}-button-move-down-${index}`}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Print Template</label>
          <Select value={printTemplate} onValueChange={setPrintTemplate}>
            <SelectTrigger data-testid={`${testIdPrefix}-select-print-template`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fine-dining">Fine Dining</SelectItem>
              <SelectItem value="modern">Modern Clean</SelectItem>
              <SelectItem value="beverage">Beverage Menu</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isSingleMenu && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Courses / Groups</label>
            {renderGroupMultiSelect(selectedPrintGroups, setSelectedPrintGroups, `${testIdPrefix}-select-print-group`)}
          </div>
        )}
      </div>

      {isMultiMenu && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Menu Title</label>
          <p className="text-xs text-muted-foreground">Custom title for the combined menu. Leave blank to use "Menu" as the default.</p>
          <input
            type="text"
            value={printMenuTitle}
            onChange={(e) => setPrintMenuTitle(e.target.value)}
            placeholder="e.g., Beverage Menu, Full Bar Menu, Nashoba Valley Spirits"
            className="w-full max-w-lg px-3 py-2 rounded-md border border-input bg-background text-sm"
            data-testid={`${testIdPrefix}-input-print-title`}
          />
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
            data-testid={`${testIdPrefix}-slider-print-scale`}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Target Pages: {printPages === 0 ? "Auto" : printPages}</label>
          <p className="text-xs text-muted-foreground">Set the number of pages the menu should print on. Use with font size to fit content.</p>
          <Select value={String(printPages)} onValueChange={(v) => setPrintPages(Number(v))}>
            <SelectTrigger data-testid={`${testIdPrefix}-select-print-pages`}>
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
          data-testid={`${testIdPrefix}-input-print-footer`}
        />
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox
            checked={printHideDescriptions}
            onCheckedChange={(checked) => setPrintHideDescriptions(!!checked)}
            data-testid={`${testIdPrefix}-checkbox-hide-descriptions`}
          />
          <span className="font-medium">Hide Descriptions</span>
          <span className="text-muted-foreground">- Show only item names and prices (ideal for wine lists or beverage menus)</span>
        </label>
      </div>

      {hasSelection && allPrintGroups.length > 1 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-muted-foreground" />
            <label className="text-sm font-medium">Page Breaks</label>
          </div>
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
                    data-testid={`${testIdPrefix}-checkbox-pagebreak-${g.groupGuid}`}
                  />
                  <span>Before "{g.name}"{isMultiMenu ? ` (${g.menuName})` : ""}</span>
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
              {hasSelection && (
                <Button
                  size="sm"
                  onClick={() => handlePrint("fine-dining")}
                  data-testid={`${testIdPrefix}-button-print-fine-dining`}
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
              {hasSelection && (
                <Button
                  size="sm"
                  onClick={() => handlePrint("modern")}
                  data-testid={`${testIdPrefix}-button-print-modern`}
                >
                  <Printer className="w-4 h-4 mr-1" />
                  Print
                </Button>
              )}
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
              {hasSelection && (
                <Button
                  size="sm"
                  onClick={() => handlePrint("beverage")}
                  data-testid={`${testIdPrefix}-button-print-beverage`}
                >
                  <Printer className="w-4 h-4 mr-1" />
                  Print
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {hasSelection && (
        <Card>
          <CardContent className="p-0 overflow-hidden rounded-md">
            <div className="bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground border-b flex items-center justify-between gap-2 flex-wrap">
              <span>Print Preview {isMultiMenu ? `(${selectedPrintMenus.length} menus combined)` : ""}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePrint(printTemplate)}
                data-testid={`${testIdPrefix}-button-open-print`}
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
              data-testid={`${testIdPrefix}-iframe-print-preview`}
            />
          </CardContent>
        </Card>
      )}

      <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Sync Menus from Toast</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose which menus to sync, or sync all at once.
            </p>
            {availableLoading ? (
              <div className="flex items-center gap-2 py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Loading available menus from Toast...</span>
              </div>
            ) : availableMenus.length > 0 ? (
              <div className="space-y-1 max-h-64 overflow-y-auto border rounded-md p-2">
                {availableMenus.map((m) => (
                  <label
                    key={m.guid}
                    className="flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer hover-elevate"
                  >
                    <Checkbox
                      checked={selectedMenuGuids.includes(m.guid)}
                      onCheckedChange={() => toggleMenuGuid(m.guid)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.groupCount} groups · {m.itemCount} items</p>
                    </div>
                  </label>
                ))}
              </div>
            ) : null}
            <div className="flex gap-2 justify-end flex-wrap">
              <Button
                variant="outline"
                onClick={() => setShowSyncDialog(false)}
                data-testid={`${testIdPrefix}-button-cancel-sync`}
              >
                Cancel
              </Button>
              {availableMenus.length > 0 && selectedMenuGuids.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => syncMutation.mutate({ guid: restaurantGuid, menuGuids: selectedMenuGuids })}
                  disabled={syncMutation.isPending}
                  data-testid={`${testIdPrefix}-button-sync-selected`}
                >
                  {syncMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Sync Selected ({selectedMenuGuids.length})
                </Button>
              )}
              <Button
                onClick={() => syncMutation.mutate({ guid: restaurantGuid })}
                disabled={syncMutation.isPending}
                data-testid={`${testIdPrefix}-button-sync-all`}
              >
                {syncMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Sync All Menus
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
