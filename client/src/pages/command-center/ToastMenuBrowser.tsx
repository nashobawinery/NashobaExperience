import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ToastSyncDialog } from "@/components/ToastSyncDialog";
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
  DialogDescription,
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
  ArrowLeft, Code, Printer, Copy, Check, Wine,
  BookMarked, Trash2, Pencil, Save, Plus, DollarSign, Sparkles,
  BookOpen, HelpCircle, AlertCircle, Lightbulb, Share2, Monitor
} from "lucide-react";


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
  hidePrice: boolean | null;
  isSpecial: boolean | null;
  sizePrices: string | null;
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

interface StaffPrintMenuData {
  id: number;
  name: string;
  description: string | null;
  printUrl: string;
  menuGuid: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

type ViewMode = "list" | "detail" | "embed" | "print" | "staff-board" | "saved-menus" | "docs";

export function ToastMenuBrowser() {
  const { toast } = useToast();
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("");
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [printTemplate, setPrintTemplate] = useState("fine-dining");
  const [printScale, setPrintScale] = useState(100);
  const [printPages, setPrintPages] = useState(0);
  const [printFooter, setPrintFooter] = useState("");
  const [printHideDescriptions, setPrintHideDescriptions] = useState(false);
  const [printPageBreaks, setPrintPageBreaks] = useState<string[]>([]);
  const [selectedPrintGroups, setSelectedPrintGroups] = useState<string[]>([]);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [additionalMenuGuids, setAdditionalMenuGuids] = useState<string[]>([]);
  const [printHeader, setPrintHeader] = useState("");
  const [printHeaderFontSize, setPrintHeaderFontSize] = useState(1.0);
  const [printFooterFontSize, setPrintFooterFontSize] = useState(1.0);
  const [printItemFontSize, setPrintItemFontSize] = useState(1.0);
  const [printDescFontSize, setPrintDescFontSize] = useState(1.0);
  const [printHidePricing, setPrintHidePricing] = useState(false);
  const [printHideWinePairing, setPrintHideWinePairing] = useState(false);
  const [printShowImages, setPrintShowImages] = useState(false);

  const HEADER_PRESETS_KEY = "toast-menu-header-presets";
  const FOOTER_PRESETS_KEY = "toast-menu-footer-presets";
  const [headerPresets, setHeaderPresets] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(HEADER_PRESETS_KEY) || "[]"); } catch { return []; }
  });
  const [footerPresets, setFooterPresets] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(FOOTER_PRESETS_KEY) || "[]"); } catch { return []; }
  });
  const savePreset = (storageKey: string, value: string, presets: string[], setPresets: (p: string[]) => void) => {
    if (!value.trim() || presets.includes(value)) return;
    const updated = [...presets, value];
    setPresets(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };
  const removePreset = (storageKey: string, value: string, presets: string[], setPresets: (p: string[]) => void) => {
    const updated = presets.filter(p => p !== value);
    setPresets(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const [activeDetailTab, setActiveDetailTab] = useState<"web" | "print">("web");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveDialogTab, setSaveDialogTab] = useState<"update" | "new">("update");
  const [loadedEmbedConfigId, setLoadedEmbedConfigId] = useState<number | null>(null);
  const [loadedEmbedConfigName, setLoadedEmbedConfigName] = useState<string>("");
  const [saveName, setSaveName] = useState("");
  const [saveDescription, setSaveDescription] = useState("");
  const [saveOverwriteId, setSaveOverwriteId] = useState<number | null>(null);
  const [editingBoardItem, setEditingBoardItem] = useState<{id: number; name: string; description: string} | null>(null);

  const [pendingItemChanges, setPendingItemChanges] = useState<Map<number, { hidden?: boolean; hidePrice?: boolean; isSpecial?: boolean; suggestedPairing?: string; description?: string }>>(new Map());
  const [pendingGroupChanges, setPendingGroupChanges] = useState<Map<number, { hidden: boolean }>>(new Map());
  const [pendingNavAction, setPendingNavAction] = useState<(() => void) | null>(null);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  const [staticUrlName, setStaticUrlName] = useState("");
  const [copiedStaticId, setCopiedStaticId] = useState<number | null>(null);
  const [editingSavedConfig, setEditingSavedConfig] = useState<{id: number; name: string; description: string} | null>(null);
  const [copiedSavedConfigId, setCopiedSavedConfigId] = useState<number | null>(null);

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

  interface EmbedConfig {
    id: number;
    slug: string;
    name: string;
    description: string | null;
    menuGuids: string;
    template: string | null;
    header: string | null;
    footer: string | null;
    headerFontSize: number | null;
    footerFontSize: number | null;
    itemFontSize: number | null;
    descFontSize: number | null;
    scale: number | null;
    groupGuids: string | null;
    hideDescriptions: boolean | null;
    hidePricing: boolean | null;
    hideWinePairing: boolean | null;
    showImages: boolean | null;
    pages: number | null;
    pageBreaks: string | null;
    printAdditionalMenuGuids: string | null;
    customTitle: string | null;
    showOnStaffBoard: boolean | null;
    createdAt: string;
    updatedAt: string;
  }

  const { data: embedConfigs = [] } = useQuery<EmbedConfig[]>({
    queryKey: ["/api/toast/embed-configs", selectedMenu],
    queryFn: async () => {
      if (!selectedMenu) return [];
      const res = await fetch(`/api/toast/embed-configs?menuGuid=${encodeURIComponent(selectedMenu)}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!selectedMenu,
  });

  const { data: allEmbedConfigs = [], isLoading: allConfigsLoading } = useQuery<EmbedConfig[]>({
    queryKey: ["/api/toast/embed-configs/all"],
    queryFn: async () => {
      const res = await fetch("/api/toast/embed-configs");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const invalidateAllConfigs = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/toast/embed-configs/all"] });
    queryClient.invalidateQueries({ queryKey: ["/api/toast/embed-configs", selectedMenu] });
    queryClient.invalidateQueries({ queryKey: ["/api/toast/staff-print-menus"] });
  };

  const getCurrentEmbedPayload = (name: string, description?: string) => ({
    name,
    description: description || null,
    menuGuids: selectedMenu || "",
    printAdditionalMenuGuids: additionalMenuGuids.length > 0 ? additionalMenuGuids.join(",") : null,
    template: printTemplate,
    header: printHeader || null,
    footer: printFooter || null,
    headerFontSize: printHeaderFontSize,
    footerFontSize: printFooterFontSize,
    itemFontSize: printItemFontSize,
    descFontSize: printDescFontSize,
    scale: printScale,
    groupGuids: selectedPrintGroups.length > 0 ? selectedPrintGroups.join(",") : null,
    hideDescriptions: printHideDescriptions,
    hidePricing: printHidePricing,
    hideWinePairing: printHideWinePairing,
    showImages: printShowImages,
    pages: printPages,
    pageBreaks: printPageBreaks.length > 0 ? printPageBreaks.join(",") : null,
    customTitle: null,
  });

  const createEmbedConfigMutation = useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const res = await apiRequest("POST", "/api/toast/embed-configs", getCurrentEmbedPayload(name, description));
      return res.json();
    },
    onSuccess: () => {
      invalidateAllConfigs();
      setShowSaveDialog(false);
      setSaveName("");
      setSaveDescription("");
      setSaveOverwriteId(null);
      toast({ title: "Menu saved", description: "Find it in Saved Menus to edit, print, or share." });
    },
    onError: () => toast({ title: "Error", description: "Failed to save menu.", variant: "destructive" }),
  });

  const updateEmbedConfigMutation = useMutation({
    mutationFn: async ({ id, name, description }: { id: number; name: string; description?: string }) => {
      const res = await apiRequest("PUT", `/api/toast/embed-configs/${id}`, getCurrentEmbedPayload(name, description));
      return res.json();
    },
    onSuccess: () => {
      invalidateAllConfigs();
      setShowSaveDialog(false);
      setSaveName("");
      setSaveDescription("");
      setSaveOverwriteId(null);
      toast({ title: "Menu updated", description: "Your changes have been saved." });
    },
    onError: () => toast({ title: "Error", description: "Failed to update saved menu.", variant: "destructive" }),
  });

  const patchEmbedConfigMutation = useMutation({
    mutationFn: async ({ id, ...fields }: { id: number; name?: string; description?: string; showOnStaffBoard?: boolean }) => {
      const res = await apiRequest("PATCH", `/api/toast/embed-configs/${id}`, fields);
      return res.json();
    },
    onSuccess: () => {
      invalidateAllConfigs();
    },
    onError: () => toast({ title: "Error", description: "Failed to update saved menu.", variant: "destructive" }),
  });

  const deleteEmbedConfigMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/toast/embed-configs/${id}`);
    },
    onSuccess: () => {
      invalidateAllConfigs();
      toast({ title: "Saved menu deleted" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete saved menu.", variant: "destructive" }),
  });

  const handleOpenSyncDialog = () => {
    setShowSyncDialog(true);
  };

  const updateItemOverride = useMutation({
    mutationFn: async ({ itemId, ...data }: { itemId: number; hidden?: boolean; hidePrice?: boolean; isSpecial?: boolean; suggestedPairing?: string; description?: string }) => {
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

  const hasPendingChanges = pendingItemChanges.size > 0 || pendingGroupChanges.size > 0;

  const applyItemChange = useCallback((itemId: number, change: { hidden?: boolean; hidePrice?: boolean; isSpecial?: boolean; suggestedPairing?: string; description?: string }) => {
    setPendingItemChanges(prev => {
      const next = new Map(prev);
      next.set(itemId, { ...(next.get(itemId) || {}), ...change });
      return next;
    });
  }, []);

  const applyGroupChange = useCallback((groupId: number, hidden: boolean) => {
    setPendingGroupChanges(prev => {
      const next = new Map(prev);
      next.set(groupId, { hidden });
      return next;
    });
  }, []);

  const getEffectiveItem = useCallback((item: ToastMenuItemData): ToastMenuItemData => {
    const pending = pendingItemChanges.get(item.id);
    if (!pending) return item;
    return { ...item, ...pending };
  }, [pendingItemChanges]);

  const getEffectiveGroup = useCallback((group: ToastMenuGroupData): ToastMenuGroupData => {
    const pendingGroup = pendingGroupChanges.get(group.id);
    return {
      ...group,
      hidden: pendingGroup !== undefined ? pendingGroup.hidden : group.hidden,
      items: group.items.map(getEffectiveItem),
    };
  }, [pendingGroupChanges, getEffectiveItem]);

  const clearPendingChanges = useCallback(() => {
    setPendingItemChanges(new Map());
    setPendingGroupChanges(new Map());
  }, []);

  const saveChangesMutation = useMutation({
    mutationFn: async () => {
      const itemPromises = Array.from(pendingItemChanges.entries()).map(([itemId, changes]) =>
        apiRequest("PATCH", `/api/toast/menu-items/${itemId}/overrides`, changes).then(r => r.json())
      );
      const groupPromises = Array.from(pendingGroupChanges.entries()).map(([groupId, changes]) =>
        apiRequest("PATCH", `/api/toast/menu-groups/${groupId}/overrides`, changes).then(r => r.json())
      );
      await Promise.all([...itemPromises, ...groupPromises]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => {
        const key = query.queryKey[0] as string;
        return key?.startsWith?.("/api/toast/");
      }});
      clearPendingChanges();
      toast({ title: "Changes saved" });
      if (pendingNavAction) {
        pendingNavAction();
        setPendingNavAction(null);
        setShowUnsavedWarning(false);
      } else {
        setStaffSaveIsDirectEntry(false);
        setShowStaffSavePrompt(true);
      }
    },
    onError: (err: Error) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  const navigateWithCheck = useCallback((action: () => void) => {
    if (pendingItemChanges.size > 0 || pendingGroupChanges.size > 0) {
      setPendingNavAction(() => action);
      setShowUnsavedWarning(true);
    } else {
      action();
    }
  }, [pendingItemChanges, pendingGroupChanges]);

  const { data: staffPrintMenuList = [] } = useQuery<StaffPrintMenuData[]>({
    queryKey: ["/api/toast/staff-print-menus"],
  });


  const deleteStaffPrintMenu = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/toast/staff-print-menus/${id}`, undefined);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/toast/staff-print-menus"] });
      toast({ title: "Removed from Staff Board" });
    },
    onError: (err: Error) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  const updateStaffPrintMenuMeta = useMutation({
    mutationFn: async ({ id, name, description }: { id: number; name: string; description: string }) => {
      const res = await apiRequest("PATCH", `/api/toast/staff-print-menus/${id}`, { name, description });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/toast/staff-print-menus"] });
      setEditingBoardItem(null);
      toast({ title: "Updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const currentRestaurantStatus = restaurantGuid && syncStatus ? syncStatus[restaurantGuid] : null;

  const getEmbedUrl = (menuGuid: string, template: string, groupGuids?: string[], scale?: number, pages?: number, footer?: string, pageBreaks?: string[], hideDescriptions?: boolean, header?: string, hidePricing?: boolean, hideWinePairing?: boolean, headerSize?: number, footerSize?: number, showImages?: boolean, itemSize?: number, descSize?: number) => {
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
    if (headerSize && headerSize !== 1) url += `&headerSize=${headerSize.toFixed(1)}`;
    if (footerSize && footerSize !== 1) url += `&footerSize=${footerSize.toFixed(1)}`;
    if (showImages) url += `&showimages=1`;
    if (itemSize && itemSize !== 1) url += `&itemSize=${itemSize.toFixed(1)}`;
    if (descSize && descSize !== 1) url += `&descSize=${descSize.toFixed(1)}`;
    return url;
  };

  const getMultiMenuEmbedUrl = (menuGuids: string[], template: string, groupGuids?: string[], scale?: number, pages?: number, footer?: string, pageBreaks?: string[], hideDescriptions?: boolean, header?: string, hidePricing?: boolean, hideWinePairing?: boolean, headerSize?: number, footerSize?: number, showImages?: boolean, itemSize?: number, descSize?: number) => {
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
    if (headerSize && headerSize !== 1) url += `&headerSize=${headerSize.toFixed(1)}`;
    if (footerSize && footerSize !== 1) url += `&footerSize=${footerSize.toFixed(1)}`;
    if (showImages) url += `&showimages=1`;
    if (itemSize && itemSize !== 1) url += `&itemSize=${itemSize.toFixed(1)}`;
    if (descSize && descSize !== 1) url += `&descSize=${descSize.toFixed(1)}`;
    return url;
  };

  const buildPrintUrl = (template: string) => {
    const printGroups = selectedPrintGroups.length > 0 ? selectedPrintGroups : undefined;
    if (additionalMenuGuids.length > 0 && selectedMenu) {
      return getMultiMenuEmbedUrl([selectedMenu, ...additionalMenuGuids], template, printGroups, printScale, printPages, printFooter, printPageBreaks, printHideDescriptions, printHeader, printHidePricing, printHideWinePairing, printHeaderFontSize, printFooterFontSize, printShowImages, printItemFontSize, printDescFontSize);
    }
    return getEmbedUrl(selectedMenu!, template, printGroups, printScale, printPages, printFooter, printPageBreaks, printHideDescriptions, printHeader, printHidePricing, printHideWinePairing, printHeaderFontSize, printFooterFontSize, printShowImages, printItemFontSize, printDescFontSize);
  };

  const getEmbedCode = (menuGuid: string, template: string, groupGuids?: string[], footer?: string, hideDescriptions?: boolean, header?: string, hidePricing?: boolean, hideWinePairing?: boolean, headerSize?: number, footerSize?: number, showImages?: boolean) => {
    const url = getEmbedUrl(menuGuid, template, groupGuids, undefined, undefined, footer, undefined, hideDescriptions, header, hidePricing, hideWinePairing, headerSize, footerSize, showImages);
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

  const loadFromBoardItem = (item: StaffPrintMenuData) => {
    try {
      const fullUrl = new URL(item.printUrl, window.location.origin);
      const params = fullUrl.searchParams;

      const menusParam = params.get("menus");
      let primaryMenuGuid: string | null = null;
      let extraMenuGuids: string[] = [];

      if (menusParam) {
        const guids = menusParam.split(",").map(g => g.trim()).filter(Boolean);
        primaryMenuGuid = guids[0] || null;
        extraMenuGuids = guids.slice(1);
      } else {
        const pathMatch = fullUrl.pathname.match(/\/menu\/([^/]+)\/embed/);
        primaryMenuGuid = pathMatch ? pathMatch[1] : (item.menuGuid || null);
      }

      if (!primaryMenuGuid) {
        toast({ title: "Cannot load settings", description: "Menu GUID not found in saved URL.", variant: "destructive" });
        return;
      }

      setPrintTemplate(params.get("template") || "fine-dining");
      setSelectedPrintGroups(params.get("groupGuid") ? params.get("groupGuid")!.split(",").map(g => g.trim()).filter(Boolean) : []);
      setPrintHeader(params.get("header") || "");
      setPrintFooter(params.get("footer") || "");
      setPrintHeaderFontSize(parseFloat(params.get("headerSize") || "1") || 1.0);
      setPrintFooterFontSize(parseFloat(params.get("footerSize") || "1") || 1.0);
      setPrintItemFontSize(parseFloat(params.get("itemSize") || "1") || 1.0);
      setPrintDescFontSize(parseFloat(params.get("descSize") || "1") || 1.0);
      setPrintScale(parseFloat(params.get("scale") || "100") || 100);
      setPrintHideDescriptions(params.get("hidedesc") === "1");
      setPrintHidePricing(params.get("hideprice") === "1");
      setPrintHideWinePairing(params.get("hidepairing") === "1");
      setPrintShowImages(params.get("showimages") === "1");
      setPrintPages(parseInt(params.get("pages") || "0") || 0);
      setPrintPageBreaks(params.get("pagebreaks") ? params.get("pagebreaks")!.split(",").map(g => g.trim()).filter(Boolean) : []);
      setAdditionalMenuGuids(extraMenuGuids);

      clearPendingChanges();
      setSelectedMenu(primaryMenuGuid);
      setViewMode("detail");
      toast({ title: `"${item.name}" loaded`, description: "All settings restored. Edit above, then resave to the Staff Print Board." });
    } catch {
      toast({ title: "Failed to load settings", description: "Could not parse the saved menu URL.", variant: "destructive" });
    }
  };

  const loadFromEmbedConfig = (config: EmbedConfig) => {
    const primaryGuid = config.menuGuids?.trim() || null;
    if (!primaryGuid) {
      toast({ title: "Cannot load", description: "No menu GUID found in saved config.", variant: "destructive" });
      return;
    }
    clearPendingChanges();
    setPrintTemplate(config.template || "fine-dining");
    setPrintHeader(config.header || "");
    setPrintFooter(config.footer || "");
    setPrintHeaderFontSize(config.headerFontSize || 1.0);
    setPrintFooterFontSize(config.footerFontSize || 1.0);
    setPrintItemFontSize(config.itemFontSize || 1.0);
    setPrintDescFontSize(config.descFontSize || 1.0);
    setPrintScale(config.scale || 100);
    setPrintHideDescriptions(config.hideDescriptions || false);
    setPrintHidePricing(config.hidePricing || false);
    setPrintHideWinePairing(config.hideWinePairing || false);
    setPrintShowImages(config.showImages || false);
    setPrintPages(config.pages || 0);
    setPrintPageBreaks(config.pageBreaks ? config.pageBreaks.split(",").filter(Boolean) : []);
    setSelectedPrintGroups(config.groupGuids ? config.groupGuids.split(",").filter(Boolean) : []);
    // Use dedicated print additional guids if available, otherwise fall back to legacy multi-guid format
    if (config.printAdditionalMenuGuids) {
      setAdditionalMenuGuids(config.printAdditionalMenuGuids.split(",").filter(Boolean));
    } else {
      const allGuids = config.menuGuids.split(",").map(g => g.trim()).filter(Boolean);
      setAdditionalMenuGuids(allGuids.slice(1));
    }
    setSaveName(config.name);
    setSaveDescription(config.description || "");
    setSaveOverwriteId(config.id);
    setLoadedEmbedConfigId(config.id);
    setLoadedEmbedConfigName(config.name);
    setActiveDetailTab("web");
    setSelectedMenu(primaryGuid);
    setViewMode("detail");
    toast({ title: `"${config.name}" loaded`, description: "All settings restored. Edit, then resave." });
  };

  const openMenuDetail = (menuGuid: string) => {
    const doOpen = () => {
      clearPendingChanges();
      setSelectedMenu(menuGuid);
      setViewMode("detail");
      setAdditionalMenuGuids([]);
      setSelectedPrintGroups([]);
      setLoadedEmbedConfigId(null);
      setLoadedEmbedConfigName("");
      setSaveName("");
      setSaveDescription("");
      setSaveOverwriteId(null);
    };
    if (viewMode === "detail" && selectedMenu !== menuGuid) {
      navigateWithCheck(doOpen);
    } else {
      doOpen();
    }
  };

  const goBack = () => {
    navigateWithCheck(() => {
      clearPendingChanges();
      setSelectedMenu(null);
      setViewMode("list");
    });
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
      <div className="rounded-md border bg-muted/30 px-4 py-3 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          <UtensilsCrossed className="w-5 h-5 text-muted-foreground shrink-0 hidden sm:block mt-0.5" />
          <div className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Toast Menu Printer</span> syncs your Toast POS menus so you can prepare them for print and the web.
            Sync from Toast, open a menu, select which courses to include, then save a named configuration.
            Saved menus can be printed instantly, shared via a permanent link, or pinned to the Staff Print Board for front-of-house staff.{" "}
            <button
              onClick={() => setViewMode("docs")}
              className="text-primary underline font-medium"
              data-testid="link-view-docs-inline"
            >
              Click here for more information.
            </button>
          </div>
        </div>
        <div className="border-t pt-2.5 flex flex-col sm:flex-row sm:items-start gap-2">
          <p className="text-xs font-medium text-foreground shrink-0">Dietary badges:</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Add a code in parentheses to an item's name in Toast POS and it will automatically display as a styled badge on the menu.
            Supported codes:{" "}
            <span className="font-medium text-foreground">(GF)</span> Gluten Free &nbsp;&middot;&nbsp;
            <span className="font-medium text-foreground">(V)</span> Vegetarian &nbsp;&middot;&nbsp;
            <span className="font-medium text-foreground">(VG)</span> Vegan &nbsp;&middot;&nbsp;
            <span className="font-medium text-foreground">(DF)</span> Dairy Free &nbsp;&middot;&nbsp;
            <span className="font-medium text-foreground">(NF)</span> Nut Free.
            The code is removed from the displayed item name automatically.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-lg font-semibold" data-testid="text-toast-menus-title">Toast Menu Items</h2>
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
            variant="outline"
            onClick={() => setViewMode("saved-menus")}
            data-testid="button-saved-menus"
          >
            <Save className="w-4 h-4 mr-2" />
            Saved Menus
            {allEmbedConfigs.length > 0 && (
              <Badge variant="secondary" className="ml-2 no-default-active-elevate">{allEmbedConfigs.length}</Badge>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => setViewMode("staff-board")}
            data-testid="button-staff-board"
          >
            <BookMarked className="w-4 h-4 mr-2" />
            Staff Board
          </Button>
          <Button
            variant="outline"
            onClick={() => setViewMode("docs")}
            data-testid="button-docs"
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            How It Works
          </Button>
          <Button
            onClick={handleOpenSyncDialog}
            disabled={!restaurantGuid}
            data-testid="button-sync-menus"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
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

      {menusLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-3 animate-spin text-primary" />
            <p className="font-medium mb-1">Loading menus...</p>
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

    const handlePrint = (template: string) => openPrintView(buildPrintUrl(template));

    // Web share URL — no page breaks, no columns
    const sharedGroups = selectedPrintGroups.length > 0 ? selectedPrintGroups : undefined;
    const sharedUrl = getEmbedUrl(selectedMenu, printTemplate, sharedGroups, undefined, undefined, printFooter, undefined, printHideDescriptions, printHeader, printHidePricing, printHideWinePairing, printHeaderFontSize, printFooterFontSize, printShowImages);
    const sharedEmbedCode = getEmbedCode(selectedMenu, printTemplate, sharedGroups, printFooter, printHideDescriptions, printHeader, printHidePricing, printHideWinePairing, printHeaderFontSize, printFooterFontSize, printShowImages);

    // Merge menus helpers for Print tab
    const primaryMenuName = menuDetail?.menu?.name || "";
    const baseMenuName = primaryMenuName.replace(/\s*\(copy\)(\s+\d+)?$/i, "").trim();
    const otherMenus = menus.filter(m => m.menuGuid !== selectedMenu);
    const suggestedMenus = otherMenus.filter(m => baseMenuName && m.name.toLowerCase().includes(baseMenuName.toLowerCase()));
    const restMenus = otherMenus.filter(m => !suggestedMenus.includes(m));
    const sortedOtherMenus = [...suggestedMenus, ...restMenus];

    const { menu, groups, totalItems } = menuDetail;
    const filteredGroups = selectedPrintGroups.length > 0
      ? groups.filter(g => selectedPrintGroups.includes(g.groupGuid))
      : groups;
    const effectiveGroups = filteredGroups.map(getEffectiveGroup);

    return (
      <>
        <Card className="bg-muted/40">
          <CardContent className="p-3">
            <div className="grid gap-2 sm:grid-cols-3 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <Monitor className="w-3.5 h-3.5 mt-0.5 shrink-0 text-foreground" />
                <div>
                  <p className="font-semibold text-foreground">Web tab</p>
                  <p>Customize how the menu looks as a shareable link or embedded widget — template, fonts, header/footer text, and item display options.</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Printer className="w-3.5 h-3.5 mt-0.5 shrink-0 text-foreground" />
                <div>
                  <p className="font-semibold text-foreground">Print tab</p>
                  <p>Merge menus, set item-level page breaks, adjust print scale, then choose a template to open a print-ready page in a new tab.</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <BookMarked className="w-3.5 h-3.5 mt-0.5 shrink-0 text-foreground" />
                <div>
                  <p className="font-semibold text-foreground">Saving</p>
                  <p>Click <span className="font-medium text-foreground">Save Menu</span> to store all current settings as a named configuration. Saved menus can be reloaded and pinned to the Staff Print Board.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="icon" onClick={goBack} data-testid="button-back-menus">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold truncate" data-testid="text-menu-detail-name">{menu.name}</h2>
            <p className="text-sm text-muted-foreground">
              {selectedPrintGroups.length > 0
                ? `Showing ${filteredGroups.length} of ${groups.length} courses`
                : `${groups.length} courses, ${totalItems} items`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {hasPendingChanges && (
              <Button
                onClick={() => saveChangesMutation.mutate()}
                disabled={saveChangesMutation.isPending}
                data-testid="button-save-changes"
              >
                {saveChangesMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                if (loadedEmbedConfigId) {
                  setSaveDialogTab("update");
                } else {
                  setSaveName(menu.name || "");
                  setSaveDescription("");
                  setSaveOverwriteId(null);
                }
                setShowSaveDialog(true);
              }}
              data-testid="button-save-menu"
            >
              <BookMarked className="w-4 h-4 mr-2" />
              Save Menu
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(sharedUrl, "_blank")}
              data-testid="button-preview-menu"
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview Web
            </Button>
          </div>
        </div>

        {hasPendingChanges && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardContent className="p-3 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                You have unsaved changes. Click "Save Changes" to keep them.
              </p>
              <Button
                size="sm"
                onClick={() => saveChangesMutation.mutate()}
                disabled={saveChangesMutation.isPending}
                data-testid="button-save-changes-banner"
              >
                {saveChangesMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center gap-1 border-b pb-1">
          <Button
            variant={activeDetailTab === "web" ? "default" : "ghost"}
            onClick={() => setActiveDetailTab("web")}
            className="flex items-center gap-2"
            data-testid="button-tab-web"
          >
            <Monitor className="w-4 h-4" />
            Web
          </Button>
          <Button
            variant={activeDetailTab === "print" ? "default" : "ghost"}
            onClick={() => setActiveDetailTab("print")}
            className="flex items-center gap-2"
            data-testid="button-tab-print"
          >
            <Printer className="w-4 h-4" />
            Print
          </Button>
        </div>

        {activeDetailTab === "web" && (
        <>
        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <p className="text-sm font-semibold">Web &amp; Display Options</p>
              <p className="text-xs text-muted-foreground mt-0.5">These settings control how the menu looks on the web share link and on print.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Template Style</label>
                <Select value={printTemplate} onValueChange={setPrintTemplate}>
                  <SelectTrigger data-testid="select-detail-template">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fine-dining">Fine Dining (Dark &amp; Elegant)</SelectItem>
                    <SelectItem value="modern">Modern (Clean &amp; Minimal)</SelectItem>
                    <SelectItem value="beverage">Beverage Menu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Courses / Groups</label>
                {renderGroupMultiSelect(selectedPrintGroups, setSelectedPrintGroups, "select-detail-group", menuDetail?.groups || [])}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="text-sm font-medium">Custom Header</label>
                  <div className="flex items-center gap-1">
                    {headerPresets.length > 0 && (
                      <Select
                        onValueChange={(v) => {
                          if (v === "__remove__" && printHeader) {
                            removePreset(HEADER_PRESETS_KEY, printHeader, headerPresets, setHeaderPresets);
                          } else if (v !== "__remove__") {
                            setPrintHeader(v);
                          }
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs w-36" data-testid="select-header-presets">
                          <SelectValue placeholder="Saved presets" />
                        </SelectTrigger>
                        <SelectContent>
                          {headerPresets.map((p, i) => (
                            <SelectItem key={i} value={p} data-testid={`option-header-preset-${i}`}>
                              {p.length > 38 ? p.slice(0, 38) + "…" : p}
                            </SelectItem>
                          ))}
                          {headerPresets.includes(printHeader) && (
                            <SelectItem value="__remove__" className="text-destructive">
                              Remove current from saved
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs px-2"
                      onClick={() => savePreset(HEADER_PRESETS_KEY, printHeader, headerPresets, setHeaderPresets)}
                      disabled={!printHeader.trim() || headerPresets.includes(printHeader)}
                      title="Save current value as a preset"
                      data-testid="button-save-header-preset"
                    >
                      <BookMarked className="w-3 h-3 mr-1" />Save
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Appears below the menu title. Supports HTML (e.g., <code className="text-xs">&lt;br&gt;</code>, <code className="text-xs">&lt;b&gt;</code>, <code className="text-xs">&lt;i&gt;</code>).</p>
                <div className="flex gap-1 items-center">
                  <input
                    type="text"
                    value={printHeader}
                    onChange={(e) => setPrintHeader(e.target.value)}
                    placeholder="e.g., Spring 2026 Season"
                    className="flex-1 min-w-0 px-3 py-2 rounded-md border border-input bg-background text-sm"
                    data-testid="input-detail-header"
                  />
                  <Button size="sm" variant="outline" className="shrink-0 px-2 text-xs" onClick={() => setPrintHeaderFontSize(f => Math.max(0.5, parseFloat((f - 0.1).toFixed(1))))} disabled={printHeaderFontSize <= 0.5} title="Decrease font size" data-testid="button-header-font-decrease">A−</Button>
                  <span className="text-xs text-muted-foreground shrink-0 w-8 text-center">{printHeaderFontSize.toFixed(1)}×</span>
                  <Button size="sm" variant="outline" className="shrink-0 px-2 text-xs" onClick={() => setPrintHeaderFontSize(f => Math.min(3, parseFloat((f + 0.1).toFixed(1))))} disabled={printHeaderFontSize >= 3} title="Increase font size" data-testid="button-header-font-increase">A+</Button>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="text-sm font-medium">Custom Footer</label>
                  <div className="flex items-center gap-1">
                    {footerPresets.length > 0 && (
                      <Select
                        onValueChange={(v) => {
                          if (v === "__remove__" && printFooter) {
                            removePreset(FOOTER_PRESETS_KEY, printFooter, footerPresets, setFooterPresets);
                          } else if (v !== "__remove__") {
                            setPrintFooter(v);
                          }
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs w-36" data-testid="select-footer-presets">
                          <SelectValue placeholder="Saved presets" />
                        </SelectTrigger>
                        <SelectContent>
                          {footerPresets.map((p, i) => (
                            <SelectItem key={i} value={p} data-testid={`option-footer-preset-${i}`}>
                              {p.length > 38 ? p.slice(0, 38) + "…" : p}
                            </SelectItem>
                          ))}
                          {footerPresets.includes(printFooter) && (
                            <SelectItem value="__remove__" className="text-destructive">
                              Remove current from saved
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs px-2"
                      onClick={() => savePreset(FOOTER_PRESETS_KEY, printFooter, footerPresets, setFooterPresets)}
                      disabled={!printFooter.trim() || footerPresets.includes(printFooter)}
                      title="Save current value as a preset"
                      data-testid="button-save-footer-preset"
                    >
                      <BookMarked className="w-3 h-3 mr-1" />Save
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Message at the bottom (e.g., website, phone).</p>
                <div className="flex gap-1 items-center">
                  <input
                    type="text"
                    value={printFooter}
                    onChange={(e) => setPrintFooter(e.target.value)}
                    placeholder="e.g., nashobawinery.com · (978) 779-5521"
                    className="flex-1 min-w-0 px-3 py-2 rounded-md border border-input bg-background text-sm"
                    data-testid="input-detail-footer"
                  />
                  <Button size="sm" variant="outline" className="shrink-0 px-2 text-xs" onClick={() => setPrintFooterFontSize(f => Math.max(0.5, parseFloat((f - 0.1).toFixed(1))))} disabled={printFooterFontSize <= 0.5} title="Decrease font size" data-testid="button-footer-font-decrease">A−</Button>
                  <span className="text-xs text-muted-foreground shrink-0 w-8 text-center">{printFooterFontSize.toFixed(1)}×</span>
                  <Button size="sm" variant="outline" className="shrink-0 px-2 text-xs" onClick={() => setPrintFooterFontSize(f => Math.min(3, parseFloat((f + 0.1).toFixed(1))))} disabled={printFooterFontSize >= 3} title="Increase font size" data-testid="button-footer-font-increase">A+</Button>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={printHidePricing}
                  onCheckedChange={(checked) => setPrintHidePricing(!!checked)}
                  data-testid="checkbox-detail-hide-pricing"
                />
                <span className="font-medium">Hide Pricing</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={printHideDescriptions}
                  onCheckedChange={(checked) => setPrintHideDescriptions(!!checked)}
                  data-testid="checkbox-detail-hide-descriptions"
                />
                <span className="font-medium">Hide Descriptions</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={printHideWinePairing}
                  onCheckedChange={(checked) => setPrintHideWinePairing(!!checked)}
                  data-testid="checkbox-detail-hide-wine-pairing"
                />
                <span className="font-medium">Hide Wine Pairings</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={printShowImages}
                  onCheckedChange={(checked) => setPrintShowImages(!!checked)}
                  data-testid="checkbox-detail-show-images"
                />
                <span className="font-medium">Show Images</span>
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold">Font Size</p>
              <p className="text-xs text-muted-foreground mt-0.5">Adjust the size of menu item names and description text on the printed or embedded menu.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Menu Item</label>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" className="shrink-0 px-2 text-xs" onClick={() => setPrintItemFontSize(f => Math.max(0.5, parseFloat((f - 0.1).toFixed(1))))} disabled={printItemFontSize <= 0.5} title="Decrease item font size" data-testid="button-item-font-decrease">A−</Button>
                  <span className="text-xs text-muted-foreground shrink-0 w-8 text-center">{printItemFontSize.toFixed(1)}×</span>
                  <Button size="sm" variant="outline" className="shrink-0 px-2 text-xs" onClick={() => setPrintItemFontSize(f => Math.min(3, parseFloat((f + 0.1).toFixed(1))))} disabled={printItemFontSize >= 3} title="Increase item font size" data-testid="button-item-font-increase">A+</Button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Description</label>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" className="shrink-0 px-2 text-xs" onClick={() => setPrintDescFontSize(f => Math.max(0.5, parseFloat((f - 0.1).toFixed(1))))} disabled={printDescFontSize <= 0.5} title="Decrease description font size" data-testid="button-desc-font-decrease">A−</Button>
                  <span className="text-xs text-muted-foreground shrink-0 w-8 text-center">{printDescFontSize.toFixed(1)}×</span>
                  <Button size="sm" variant="outline" className="shrink-0 px-2 text-xs" onClick={() => setPrintDescFontSize(f => Math.min(3, parseFloat((f + 0.1).toFixed(1))))} disabled={printDescFontSize >= 3} title="Increase description font size" data-testid="button-desc-font-increase">A+</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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

        {effectiveGroups.map((group) => (
          <div key={group.id} className={`space-y-1 ${group.hidden ? "opacity-50" : ""}`}>
            <div className="flex items-center justify-between gap-2 pt-2 border-b pb-1">
              <div className="flex items-center gap-2 min-w-0">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => applyGroupChange(group.id, !group.hidden)}
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
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => applyItemChange(item.id, { hidden: !item.hidden })}
                        data-testid={`button-toggle-visibility-${item.id}`}
                        title={item.hidden ? "Show item" : "Hide item"}
                      >
                        {item.hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      {item.price && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => applyItemChange(item.id, { hidePrice: !item.hidePrice })}
                          data-testid={`button-toggle-price-${item.id}`}
                          title={item.hidePrice ? "Show price" : "Hide price"}
                          className={item.hidePrice ? "toggle-elevate toggle-elevated" : "toggle-elevate"}
                        >
                          <DollarSign className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => applyItemChange(item.id, { isSpecial: !item.isSpecial })}
                        data-testid={`button-toggle-special-${item.id}`}
                        title={item.isSpecial ? "Remove special designation" : "Mark as today's special"}
                        className={item.isSpecial ? "toggle-elevate toggle-elevated text-amber-600" : "toggle-elevate"}
                      >
                        <Sparkles className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 flex-wrap">
                        <span className={`font-medium text-sm ${item.hidden ? "line-through" : ""}`}>
                          {item.name}
                          {item.isSpecial && (
                            <Badge variant="outline" className="ml-2 text-amber-600 border-amber-400/50 bg-amber-50 dark:bg-amber-950/30 text-[10px] py-0 px-1.5 font-semibold tracking-wide uppercase no-default-active-elevate" style={{verticalAlign: "middle"}}>
                              Special
                            </Badge>
                          )}
                        </span>
                        {item.sizePrices ? (() => {
                          try {
                            const sizes: { name: string; price: string }[] = JSON.parse(item.sizePrices);
                            if (sizes.length > 1) {
                              return (
                                <span className={`text-xs text-muted-foreground whitespace-nowrap ${item.hidePrice ? "line-through opacity-50" : ""}`}>
                                  {sizes.map(s => `${s.name} ${formatPrice(s.price)}`).join(" · ")}
                                </span>
                              );
                            }
                          } catch {}
                          return null;
                        })() : item.price ? (
                          <span className={`text-sm font-medium whitespace-nowrap ${item.hidePrice ? "line-through text-muted-foreground" : ""}`}>
                            {formatPrice(item.price)}
                          </span>
                        ) : null}
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
                              applyItemChange(item.id, { description: val });
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
                              applyItemChange(item.id, { suggestedPairing: val });
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

        <Card>
          <CardContent className="p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold">Web Share Link</p>
              <p className="text-xs text-muted-foreground mt-0.5">Share this URL to let anyone view this menu in a browser. It does not include print page breaks.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                readOnly
                value={sharedUrl}
                className="flex-1 min-w-0 px-3 py-2 rounded-md border border-input bg-muted/30 text-xs font-mono"
                data-testid="input-web-share-url"
              />
              <Button size="sm" variant="outline" onClick={() => copyToClipboard(sharedUrl)} data-testid="button-copy-web-url">
                {copiedEmbed ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                {copiedEmbed ? "Copied" : "Copy URL"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => window.open(sharedUrl, "_blank")} data-testid="button-open-web-url">
                <ExternalLink className="w-4 h-4 mr-1" />
                Open
              </Button>
            </div>
            <div>
              <p className="text-xs font-medium mb-1">Embed Code (iframe)</p>
              <div className="flex items-start gap-2">
                <Textarea
                  readOnly
                  value={sharedEmbedCode}
                  className="flex-1 font-mono text-xs resize-none"
                  rows={2}
                  data-testid="textarea-embed-code"
                />
                <Button size="sm" variant="outline" onClick={() => copyToClipboard(sharedEmbedCode)} data-testid="button-copy-embed">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        </>
        )}

        {activeDetailTab === "print" && (
          <>
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
                      <p className="text-sm font-medium">{m.name}</p>
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
                      <p className="text-sm">{m.name}</p>
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
              <div className="space-y-1">
                <label className="text-sm font-medium">Print Scale</label>
                <p className="text-xs text-muted-foreground">Overall size of text on the printed page.</p>
                <Select value={String(printScale)} onValueChange={(v) => setPrintScale(Number(v))}>
                  <SelectTrigger data-testid="select-print-scale">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="70">70% — Very Small</SelectItem>
                    <SelectItem value="80">80% — Small</SelectItem>
                    <SelectItem value="90">90% — Slightly Small</SelectItem>
                    <SelectItem value="100">100% — Normal</SelectItem>
                    <SelectItem value="110">110% — Large</SelectItem>
                    <SelectItem value="120">120% — Very Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Number of Pages / Columns</label>
                <p className="text-xs text-muted-foreground">Splits the menu across multiple columns or pages.</p>
                <Select value={String(printPages)} onValueChange={(v) => setPrintPages(Number(v))}>
                  <SelectTrigger data-testid="select-print-pages">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Single column (default)</SelectItem>
                    <SelectItem value="2">2 Pages / Columns</SelectItem>
                    <SelectItem value="3">3 Pages</SelectItem>
                    <SelectItem value="4">4 Pages</SelectItem>
                    <SelectItem value="5">5 Pages</SelectItem>
                    <SelectItem value="6">6 Pages</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {allPrintGroups.length > 0 && (
              <div className="space-y-2">
                <div>
                  <label className="text-sm font-medium">Page Breaks</label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Mark where the printer should start a new page. You can break before a course or after any item.
                  </p>
                </div>
                <div className="border rounded-md overflow-y-auto max-h-72">
                  {allPrintGroups.map((g, gIdx) => {
                    const groupItems = (g.items || []).filter((item: ToastMenuItemData) => !item.hidden);
                    return (
                      <div key={g.groupGuid} className="border-b last:border-b-0">
                        {gIdx > 0 && (
                          <label className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 cursor-pointer hover-elevate" data-testid={`checkbox-pagebreak-before-${g.groupGuid}`}>
                            <Checkbox
                              checked={printPageBreaks.includes(g.groupGuid)}
                              onCheckedChange={(checked) => {
                                setPrintPageBreaks(prev =>
                                  checked ? [...prev, g.groupGuid] : prev.filter(id => id !== g.groupGuid)
                                );
                              }}
                            />
                            <span className="text-xs text-primary font-medium">Break before "{g.name}"</span>
                          </label>
                        )}
                        <div className="px-3 py-1 bg-muted/30">
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.name}</span>
                          {gIdx === 0 && <span className="text-xs text-muted-foreground ml-2">(first course — no break before)</span>}
                        </div>
                        {groupItems.map((item: ToastMenuItemData) => (
                          <label
                            key={item.itemGuid}
                            className="flex items-center gap-2 px-3 py-1.5 border-t border-border/30 cursor-pointer hover-elevate"
                            data-testid={`checkbox-pagebreak-after-${item.itemGuid}`}
                          >
                            <Checkbox
                              checked={printPageBreaks.includes(item.itemGuid)}
                              onCheckedChange={(checked) => {
                                setPrintPageBreaks(prev =>
                                  checked ? [...prev, item.itemGuid] : prev.filter(id => id !== item.itemGuid)
                                );
                              }}
                            />
                            <span className="text-sm truncate flex-1">{item.name.replace(/\s*\((GF|V|VG|DF|NF)\)\s*/gi, " ").trim()}</span>
                            {printPageBreaks.includes(item.itemGuid) && (
                              <span className="text-xs text-primary shrink-0">break after</span>
                            )}
                          </label>
                        ))}
                        {groupItems.length === 0 && (
                          <p className="px-3 py-1.5 text-xs text-muted-foreground italic">No visible items</p>
                        )}
                      </div>
                    );
                  })}
                </div>
                {printPageBreaks.length > 0 && (
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-primary font-medium">
                      {printPageBreaks.length} page break{printPageBreaks.length > 1 ? "s" : ""} set
                    </p>
                    <Button size="sm" variant="ghost" onClick={() => setPrintPageBreaks([])} className="text-xs h-7 px-2" data-testid="button-clear-pagebreaks">
                      Clear all
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div>
              <p className="text-sm font-medium mb-1">Choose a template and print</p>
              <p className="text-xs text-muted-foreground mb-3">Each template opens a print-ready page in a new tab and triggers your browser's print dialog.</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <Card className="overflow-hidden">
                  <div className="aspect-[3/4] bg-[#1a1a18] flex flex-col items-center justify-center p-6 text-center">
                    <p className="text-[#d4b896] font-serif text-xl tracking-widest uppercase mb-2">Fine Dining</p>
                    <div className="w-8 h-px bg-[#a08c6e] mb-3" />
                    <p className="text-[#e8dcc8] font-serif text-sm uppercase tracking-wider mb-1">Starters</p>
                    <p className="text-[#b8a890] text-xs italic">Elegant serif typography</p>
                    <p className="text-[#b8a890] text-xs italic">Dark background, gold accents</p>
                  </div>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">Fine Dining</p>
                        <p className="text-xs text-muted-foreground">Dark, elegant, serif</p>
                      </div>
                      <Button size="sm" onClick={() => handlePrint("fine-dining")} data-testid="button-print-fine-dining">
                        <Printer className="w-4 h-4 mr-1" />Print
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
                  </div>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">Modern Clean</p>
                        <p className="text-xs text-muted-foreground">Light, minimal, sans-serif</p>
                      </div>
                      <Button size="sm" onClick={() => handlePrint("modern")} data-testid="button-print-modern">
                        <Printer className="w-4 h-4 mr-1" />Print
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden">
                  <div className="aspect-[3/4] bg-white flex flex-col items-center justify-center p-6 text-center">
                    <p className="text-[#1c1917] font-sans text-lg font-bold uppercase tracking-wider mb-3">Beverage</p>
                    <div className="w-full text-left space-y-1 px-2">
                      <p className="text-[#1c1917] font-sans text-xs font-bold underline">Wine</p>
                      <div className="flex justify-between text-[10px] text-[#44403c]"><span>Chardonnay</span><span>$12</span></div>
                      <div className="flex justify-between text-[10px] text-[#44403c]"><span>Pinot Noir</span><span>$14</span></div>
                    </div>
                    <p className="text-[#78716c] text-xs mt-3 italic">Compact list, no descriptions</p>
                  </div>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">Beverage</p>
                        <p className="text-xs text-muted-foreground">Compact list, names + prices</p>
                      </div>
                      <Button size="sm" onClick={() => handlePrint("beverage")} data-testid="button-print-beverage">
                        <Printer className="w-4 h-4 mr-1" />Print
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
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
    const sharedGroups = selectedPrintGroups.length > 0 ? selectedPrintGroups : undefined;
    const sharedUrl = getEmbedUrl(selectedMenu, printTemplate, sharedGroups, undefined, undefined, printFooter, undefined, printHideDescriptions, printHeader, printHidePricing, printHideWinePairing, printHeaderFontSize, printFooterFontSize, printShowImages);
    const sharedEmbedCode = getEmbedCode(selectedMenu, printTemplate, sharedGroups, printFooter, printHideDescriptions, printHeader, printHidePricing, printHideWinePairing, printHeaderFontSize, printFooterFontSize, printShowImages);

    return (
      <>
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => setViewMode("detail")} data-testid="button-back-detail">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold" data-testid="text-embed-title">Get Website Link / Embed Code</h2>
            <p className="text-sm text-muted-foreground">
              Template, groups, and display options are set in the menu editor. Go back to change them.
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="font-medium text-sm">Embed Code (iframe)</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(sharedEmbedCode)}
                data-testid="button-copy-embed"
              >
                {copiedEmbed ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                {copiedEmbed ? "Copied" : "Copy Code"}
              </Button>
            </div>
            <Textarea
              readOnly
              value={sharedEmbedCode}
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
                onClick={() => copyToClipboard(sharedUrl)}
                data-testid="button-copy-link"
              >
                <Copy className="w-4 h-4 mr-1" />
                Copy URL
              </Button>
            </div>
            <Input
              readOnly
              value={sharedUrl}
              className="font-mono text-xs"
              data-testid="input-embed-url"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex-1">
                <h3 className="font-medium text-sm">Static Links</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Save current settings as a permanent URL. To edit a saved link: click <strong>Load</strong> to restore its settings, make changes above, then click <strong>Sync</strong> to save — the URL stays the same.
                </p>
              </div>
            </div>

            <div className="flex gap-2 items-center flex-wrap">
              <Input
                placeholder="Link name (e.g. Main Website Menu)"
                value={staticUrlName}
                onChange={e => setStaticUrlName(e.target.value)}
                className="flex-1 text-sm"
                data-testid="input-static-url-name"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={!staticUrlName.trim() || createEmbedConfigMutation.isPending}
                onClick={() => createEmbedConfigMutation.mutate({ name: staticUrlName.trim() })}
                data-testid="button-save-static-url"
              >
                {createEmbedConfigMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                Save as Static Link
              </Button>
            </div>

            {embedConfigs.length > 0 && (
              <div className="space-y-2 pt-1">
                {embedConfigs.map(cfg => {
                  const staticUrl = `${window.location.origin}/api/toast/public/embed-config/${cfg.slug}`;
                  const isCopied = copiedStaticId === cfg.id;
                  return (
                    <div key={cfg.id} className="rounded-md border bg-muted/30 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-sm font-medium">{cfg.name}</span>
                        <div className="flex gap-1 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            title="Load this config's settings into the editor above"
                            onClick={() => {
                              setPrintTemplate(cfg.template || "fine-dining");
                              setPrintHeader(cfg.header || "");
                              setPrintFooter(cfg.footer || "");
                              setPrintHeaderFontSize(cfg.headerFontSize ?? 1.0);
                              setPrintFooterFontSize(cfg.footerFontSize ?? 1.0);
                              setPrintItemFontSize(cfg.itemFontSize ?? 1.0);
                              setPrintDescFontSize(cfg.descFontSize ?? 1.0);
                              setPrintScale(cfg.scale ?? 100);
                              setPrintHideDescriptions(cfg.hideDescriptions ?? false);
                              setPrintHidePricing(cfg.hidePricing ?? false);
                              setPrintHideWinePairing(cfg.hideWinePairing ?? false);
                              setPrintShowImages(cfg.showImages ?? false);
                              setPrintPages(cfg.pages ?? 0);
                              setPrintPageBreaks(cfg.pageBreaks ? cfg.pageBreaks.split(",").map(s => s.trim()).filter(Boolean) : []);
                              setSelectedPrintGroups(cfg.groupGuids ? cfg.groupGuids.split(",").map(s => s.trim()).filter(Boolean) : []);
                              const allGuids = cfg.menuGuids ? cfg.menuGuids.split(",").map(s => s.trim()).filter(Boolean) : [];
                              if (allGuids.length > 1) {
                                setAdditionalMenuGuids(allGuids.slice(1));
                              } else {
                                setAdditionalMenuGuids([]);
                              }
                              toast({ title: `"${cfg.name}" loaded`, description: "Settings restored. Edit above, then click Sync to save changes." });
                            }}
                            data-testid={`button-load-static-${cfg.id}`}
                          >
                            <Pencil className="w-3 h-3 mr-1" />
                            Load
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            title="Sync current settings to this link"
                            disabled={updateEmbedConfigMutation.isPending}
                            onClick={() => updateEmbedConfigMutation.mutate({ id: cfg.id, name: cfg.name })}
                            data-testid={`button-update-static-${cfg.id}`}
                          >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Sync
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(staticUrl);
                              setCopiedStaticId(cfg.id);
                              setTimeout(() => setCopiedStaticId(null), 2000);
                            }}
                            data-testid={`button-copy-static-${cfg.id}`}
                          >
                            {isCopied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                            {isCopied ? "Copied" : "Copy"}
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            title="Delete this static link"
                            disabled={deleteEmbedConfigMutation.isPending}
                            onClick={() => deleteEmbedConfigMutation.mutate(cfg.id)}
                            data-testid={`button-delete-static-${cfg.id}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <Input
                        readOnly
                        value={staticUrl}
                        className="font-mono text-xs"
                        data-testid={`input-static-url-${cfg.id}`}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => window.open(sharedUrl, "_blank")}
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
              src={sharedUrl}
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
              Template, groups, and display options are set in the menu editor. Configure print-specific options below.
            </p>
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
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Save className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-medium">Save Menu</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Save this menu configuration to your Saved Menus library. You can edit, print, share, or toggle staff board visibility from there.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium">Menu Name</label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder={`e.g., ${menuDetail?.menu?.name || "Evening Menu"} — No Pricing`}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                  data-testid="input-save-name"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Description (optional)</label>
                <input
                  type="text"
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  placeholder="e.g., For dining room staff"
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                  data-testid="input-save-description"
                />
              </div>
            </div>
            {allEmbedConfigs.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-medium">Overwrite existing saved menu (optional)</label>
                <Select
                  value={saveOverwriteId ? String(saveOverwriteId) : "new"}
                  onValueChange={(v) => setSaveOverwriteId(v === "new" ? null : Number(v))}
                >
                  <SelectTrigger data-testid="select-overwrite-menu">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Save as new entry</SelectItem>
                    {allEmbedConfigs.map(m => (
                      <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                disabled={!saveName.trim() || createEmbedConfigMutation.isPending || updateEmbedConfigMutation.isPending}
                onClick={() => {
                  if (saveOverwriteId) {
                    updateEmbedConfigMutation.mutate({ id: saveOverwriteId, name: saveName.trim(), description: saveDescription.trim() });
                  } else {
                    createEmbedConfigMutation.mutate({ name: saveName.trim(), description: saveDescription.trim() });
                  }
                }}
                data-testid="button-save-menu"
              >
                {(createEmbedConfigMutation.isPending || updateEmbedConfigMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                {saveOverwriteId ? "Update Saved Menu" : "Save Menu"}
              </Button>
              {(saveName.trim() || saveOverwriteId) && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setSaveName(""); setSaveDescription(""); setSaveOverwriteId(null); }}
                  data-testid="button-clear-save"
                >
                  Clear
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setViewMode("saved-menus")}
                data-testid="button-go-saved-menus"
              >
                <BookMarked className="w-4 h-4 mr-1" />
                View Saved Menus
              </Button>
            </div>
          </CardContent>
        </Card>

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

  const TEMPLATE_LABELS: Record<string, string> = {
    "fine-dining": "Fine Dining",
    "beverage": "Beverage",
    "modern": "Modern",
  };

  const getConfigPrintUrl = (config: EmbedConfig) => {
    const origin = window.location.origin;
    return `${origin}/api/toast/public/embed-config/${config.slug}`;
  };

  const renderSavedMenusView = () => {
    const staffVisible = allEmbedConfigs.filter(c => c.showOnStaffBoard);
    return (
      <>
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => setViewMode("list")} data-testid="button-back-saved-menus">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold">Saved Menus</h2>
            <p className="text-sm text-muted-foreground">
              {allEmbedConfigs.length} saved {allEmbedConfigs.length === 1 ? "menu" : "menus"} — {staffVisible.length} visible on Staff Board
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode("staff-board")}
            data-testid="button-view-staff-board"
          >
            <BookMarked className="w-4 h-4 mr-2" />
            Staff Board
            {staffVisible.length > 0 && (
              <Badge variant="secondary" className="ml-2 no-default-active-elevate">{staffVisible.length}</Badge>
            )}
          </Button>
        </div>

        {allConfigsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
            <span className="text-sm text-muted-foreground">Loading saved menus...</span>
          </div>
        ) : allEmbedConfigs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Save className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">No saved menus yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Open a menu, configure it in the Print view, then use the Save Menu section to store it here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {allEmbedConfigs.map((config) => (
              <Card key={config.id} data-testid={`card-saved-menu-${config.id}`}>
                <CardContent className="p-4">
                  {editingSavedConfig?.id === config.id ? (
                    <div className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-xs font-medium">Name</label>
                          <input
                            type="text"
                            value={editingSavedConfig.name}
                            onChange={(e) => setEditingSavedConfig({ ...editingSavedConfig, name: e.target.value })}
                            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                            data-testid={`input-edit-config-name-${config.id}`}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium">Description</label>
                          <input
                            type="text"
                            value={editingSavedConfig.description}
                            onChange={(e) => setEditingSavedConfig({ ...editingSavedConfig, description: e.target.value })}
                            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                            data-testid={`input-edit-config-desc-${config.id}`}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          disabled={patchEmbedConfigMutation.isPending}
                          onClick={() => patchEmbedConfigMutation.mutate(
                            { id: config.id, name: editingSavedConfig.name, description: editingSavedConfig.description },
                            { onSuccess: () => setEditingSavedConfig(null) }
                          )}
                          data-testid={`button-save-config-edit-${config.id}`}
                        >
                          {patchEmbedConfigMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                          Save Name
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingSavedConfig(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm" data-testid={`text-saved-menu-name-${config.id}`}>{config.name}</p>
                          <Badge variant="outline" className="text-xs">
                            {TEMPLATE_LABELS[config.template || "fine-dining"] || config.template}
                          </Badge>
                          {config.showOnStaffBoard && (
                            <Badge variant="secondary" className="text-xs">
                              <Eye className="w-3 h-3 mr-1" />
                              Staff Board
                            </Badge>
                          )}
                        </div>
                        {config.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {config.menuGuids.split(",").filter(Boolean).length} menu{config.menuGuids.split(",").filter(Boolean).length !== 1 ? "s" : ""}
                          {config.groupGuids ? ` · ${config.groupGuids.split(",").filter(Boolean).length} groups` : ""}
                          {" · "}Saved {new Date(config.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => loadFromEmbedConfig(config)}
                          data-testid={`button-load-config-${config.id}`}
                          title="Load this saved menu into the editor to edit and resave"
                        >
                          <Pencil className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openPrintView(getConfigPrintUrl(config))}
                          data-testid={`button-print-config-${config.id}`}
                        >
                          <Printer className="w-4 h-4 mr-1" />
                          Print
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Copy permanent URL"
                          onClick={() => {
                            navigator.clipboard.writeText(getConfigPrintUrl(config));
                            setCopiedSavedConfigId(config.id);
                            setTimeout(() => setCopiedSavedConfigId(null), 2000);
                            toast({ title: "URL copied" });
                          }}
                          data-testid={`button-copy-url-config-${config.id}`}
                        >
                          {copiedSavedConfigId === config.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title={config.showOnStaffBoard ? "Remove from Staff Board" : "Show on Staff Board"}
                          className={config.showOnStaffBoard ? "text-primary" : ""}
                          onClick={() => patchEmbedConfigMutation.mutate({ id: config.id, showOnStaffBoard: !config.showOnStaffBoard })}
                          data-testid={`button-toggle-staff-${config.id}`}
                        >
                          {config.showOnStaffBoard ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Rename"
                          onClick={() => setEditingSavedConfig({ id: config.id, name: config.name, description: config.description || "" })}
                          data-testid={`button-rename-config-${config.id}`}
                        >
                          <BookMarked className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => { if (confirm(`Delete "${config.name}"? This cannot be undone.`)) deleteEmbedConfigMutation.mutate(config.id); }}
                          data-testid={`button-delete-config-${config.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </>
    );
  };

  const renderStaffBoardView = () => {
    const staffConfigs = allEmbedConfigs.filter(c => c.showOnStaffBoard);
    return (
      <>
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => setViewMode("saved-menus")} data-testid="button-back-staff-board">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold">Staff Print Board</h2>
            <p className="text-sm text-muted-foreground">
              These menus appear in the Staff Portal for one-click printing. Toggle visibility from Saved Menus.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setViewMode("saved-menus")} data-testid="button-manage-saved">
            <Save className="w-4 h-4 mr-2" />
            Manage Saved Menus
          </Button>
        </div>

        {staffConfigs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookMarked className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">No menus on the Staff Board yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Go to Saved Menus and toggle the eye icon to make a menu visible on the Staff Board.
              </p>
              <Button className="mt-4" variant="outline" size="sm" onClick={() => setViewMode("saved-menus")}>
                <Save className="w-4 h-4 mr-2" />
                Go to Saved Menus
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {staffConfigs.map((config) => (
              <Card key={config.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm" data-testid={`text-staff-config-name-${config.id}`}>{config.name}</p>
                        <Badge variant="outline" className="text-xs">
                          {TEMPLATE_LABELS[config.template || "fine-dining"] || config.template}
                        </Badge>
                      </div>
                      {config.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {config.menuGuids.split(",").filter(Boolean).length} menu{config.menuGuids.split(",").filter(Boolean).length !== 1 ? "s" : ""}
                        {" · "}Updated {new Date(config.updatedAt).toLocaleDateString('en-US')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => loadFromEmbedConfig(config)}
                        data-testid={`button-load-staff-config-${config.id}`}
                      >
                        <Pencil className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openPrintView(getConfigPrintUrl(config))}
                        data-testid={`button-print-staff-config-${config.id}`}
                      >
                        <Printer className="w-4 h-4 mr-1" />
                        Print
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Remove from Staff Board"
                        onClick={() => patchEmbedConfigMutation.mutate({ id: config.id, showOnStaffBoard: false })}
                        data-testid={`button-remove-staff-${config.id}`}
                      >
                        <EyeOff className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
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
        {viewMode === "saved-menus" && renderSavedMenusView()}
        {viewMode === "staff-board" && renderStaffBoardView()}
      </div>

      <ToastSyncDialog
        restaurantGuid={restaurantGuid}
        open={showSyncDialog}
        onOpenChange={setShowSyncDialog}
        testIdPrefix="toast-browser"
      />

      <Dialog open={showUnsavedWarning} onOpenChange={(open) => { if (!open) { setShowUnsavedWarning(false); setPendingNavAction(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Your changes will be lost if you navigate away without saving. What would you like to do?
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              onClick={() => saveChangesMutation.mutate()}
              disabled={saveChangesMutation.isPending}
              data-testid="button-unsaved-save-continue"
            >
              {saveChangesMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes &amp; Continue
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                clearPendingChanges();
                setShowUnsavedWarning(false);
                if (pendingNavAction) {
                  pendingNavAction();
                  setPendingNavAction(null);
                }
              }}
              data-testid="button-unsaved-discard"
            >
              Discard Changes
            </Button>
            <Button
              variant="ghost"
              onClick={() => { setShowUnsavedWarning(false); setPendingNavAction(null); }}
              data-testid="button-unsaved-cancel"
            >
              Cancel — Stay on Page
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSaveDialog} onOpenChange={(open) => { if (!open) { setShowSaveDialog(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save Menu</DialogTitle>
            <DialogDescription>
              {loadedEmbedConfigId
                ? `You're working from "${loadedEmbedConfigName}". Update it or save as a new menu.`
                : "Save the current menu configuration to your Saved Menus library."}
            </DialogDescription>
          </DialogHeader>

          {loadedEmbedConfigId ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={saveDialogTab === "update" ? "default" : "outline"}
                  onClick={() => { setSaveDialogTab("update"); setSaveOverwriteId(loadedEmbedConfigId); }}
                  data-testid="button-save-tab-update"
                >
                  Update "{loadedEmbedConfigName}"
                </Button>
                <Button
                  size="sm"
                  variant={saveDialogTab === "new" ? "default" : "outline"}
                  onClick={() => { setSaveDialogTab("new"); setSaveOverwriteId(null); setSaveName(""); setSaveDescription(""); }}
                  data-testid="button-save-tab-new"
                >
                  Save as New
                </Button>
              </div>

              {saveDialogTab === "update" ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Overwrites <span className="font-medium text-foreground">"{loadedEmbedConfigName}"</span> with your current selections and settings.
                  </p>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
                    <input
                      type="text"
                      value={saveDescription}
                      onChange={(e) => setSaveDescription(e.target.value)}
                      placeholder="e.g., For dining room staff, no pricing"
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                      data-testid="input-save-description-update"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      disabled={updateEmbedConfigMutation.isPending}
                      onClick={() => updateEmbedConfigMutation.mutate({ id: loadedEmbedConfigId, name: loadedEmbedConfigName, description: saveDescription.trim() })}
                      data-testid="button-save-dialog-update"
                    >
                      {updateEmbedConfigMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                      Update
                    </Button>
                    <Button variant="outline" onClick={() => setShowSaveDialog(false)} data-testid="button-save-dialog-cancel">Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">New Menu Name</label>
                    <input
                      type="text"
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      placeholder={menuDetail?.menu?.name || "e.g., Easter Brunch — No Pricing"}
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                      data-testid="input-save-name-new"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
                    <input
                      type="text"
                      value={saveDescription}
                      onChange={(e) => setSaveDescription(e.target.value)}
                      placeholder="e.g., For dining room staff, no pricing"
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                      data-testid="input-save-description-new"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      disabled={!saveName.trim() || createEmbedConfigMutation.isPending}
                      onClick={() => createEmbedConfigMutation.mutate({ name: saveName.trim(), description: saveDescription.trim() })}
                      data-testid="button-save-dialog-new"
                    >
                      {createEmbedConfigMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                      Save as New
                    </Button>
                    <Button variant="outline" onClick={() => setShowSaveDialog(false)} data-testid="button-save-dialog-cancel-new">Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              <div className="space-y-1">
                <label className="text-sm font-medium">Menu Name</label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder={menuDetail?.menu?.name || "e.g., Easter Brunch Menu"}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                  data-testid="input-save-name-dialog"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
                <input
                  type="text"
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  placeholder="e.g., For dining room staff, no pricing"
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                  data-testid="input-save-description-dialog"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  disabled={!saveName.trim() || createEmbedConfigMutation.isPending}
                  onClick={() => createEmbedConfigMutation.mutate({ name: saveName.trim(), description: saveDescription.trim() })}
                  data-testid="button-save-dialog-confirm"
                >
                  {createEmbedConfigMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Menu
                </Button>
                <Button variant="outline" onClick={() => setShowSaveDialog(false)} data-testid="button-save-dialog-cancel">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
