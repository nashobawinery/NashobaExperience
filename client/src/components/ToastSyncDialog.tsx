import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RefreshCw, Loader2, UtensilsCrossed, ListFilter, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvailableMenu {
  guid: string;
  name: string;
  groupCount: number;
  itemCount: number;
}

interface SyncItemData {
  itemGuid: string;
  name: string;
  price: string | null;
}

interface SyncGroupData {
  groupGuid: string;
  name: string;
  items: SyncItemData[];
}

interface SyncMenuDetail {
  groups: SyncGroupData[];
}

interface ToastSyncDialogProps {
  restaurantGuid: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testIdPrefix?: string;
}

export function ToastSyncDialog({ restaurantGuid, open, onOpenChange, testIdPrefix = "sync" }: ToastSyncDialogProps) {
  const { toast } = useToast();
  const [selectedMenuGuids, setSelectedMenuGuids] = useState<string[]>([]);
  const [selectedGroupGuids, setSelectedGroupGuids] = useState<string[]>([]);
  const [selectedItemGuids, setSelectedItemGuids] = useState<string[]>([]);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [menuDetailCache, setMenuDetailCache] = useState<Record<string, SyncMenuDetail>>({});

  const { data: availableMenus = [], isLoading: availableLoading, refetch: fetchAvailableMenus } = useQuery<AvailableMenu[]>({
    queryKey: ["/api/toast/menus/available", { restaurantGuid }],
    enabled: false,
  });

  useEffect(() => {
    if (open && restaurantGuid) fetchAvailableMenus();
  }, [open, restaurantGuid]);

  const resetState = () => {
    setSelectedMenuGuids([]);
    setSelectedGroupGuids([]);
    setSelectedItemGuids([]);
    setExpandedMenus(new Set());
    setExpandedGroups(new Set());
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) resetState();
    onOpenChange(val);
  };

  const syncMutation = useMutation({
    mutationFn: async ({ menuGuids, groupGuids, itemGuids }: { menuGuids?: string[]; groupGuids?: string[]; itemGuids?: string[] }) => {
      const body: any = { restaurantGuid };
      if (menuGuids?.length) body.menuGuids = menuGuids;
      if (groupGuids?.length) body.groupGuids = groupGuids;
      if (itemGuids?.length) body.itemGuids = itemGuids;
      const res = await apiRequest("POST", "/api/toast/menus/sync", body);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ predicate: (q) => (q.queryKey[0] as string)?.startsWith?.("/api/toast/") });
      handleOpenChange(false);
      toast({
        title: "Sync complete",
        description: `Synced ${data.menuCount} menus, ${data.groupCount} groups, ${data.itemCount} items`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    },
  });

  const loadMenuDetail = async (menuGuid: string) => {
    if (menuDetailCache[menuGuid]) return;
    try {
      const res = await fetch(`/api/toast/public/menu/${menuGuid}?includeHidden=true`);
      if (res.ok) {
        const data = await res.json();
        setMenuDetailCache(prev => ({ ...prev, [menuGuid]: data }));
      }
    } catch (_e) {}
  };

  const toggleMenu = (guid: string) => {
    setSelectedMenuGuids(prev => prev.includes(guid) ? prev.filter(g => g !== guid) : [...prev, guid]);
  };

  const toggleGroup = (groupGuid: string, items: SyncItemData[], isChecked: boolean) => {
    setSelectedGroupGuids(prev => prev.includes(groupGuid) ? prev.filter(g => g !== groupGuid) : [...prev, groupGuid]);
    if (isChecked) {
      const ids = items.map(i => i.itemGuid);
      setSelectedItemGuids(prev => prev.filter(id => !ids.includes(id)));
    }
  };

  const toggleItem = (itemGuid: string) => {
    setSelectedItemGuids(prev => prev.includes(itemGuid) ? prev.filter(id => id !== itemGuid) : [...prev, itemGuid]);
  };

  const getEffectiveSyncParams = (): { menuGuids?: string[]; groupGuids?: string[]; itemGuids?: string[] } | null => {
    if (selectedItemGuids.length > 0) {
      const parentGroups = new Set<string>();
      const parentMenus = new Set<string>();
      for (const [menuGuid, detail] of Object.entries(menuDetailCache)) {
        for (const group of detail.groups) {
          for (const item of group.items) {
            if (selectedItemGuids.includes(item.itemGuid)) {
              parentGroups.add(group.groupGuid);
              parentMenus.add(menuGuid);
            }
          }
        }
      }
      return { menuGuids: Array.from(parentMenus), groupGuids: Array.from(parentGroups), itemGuids: selectedItemGuids };
    }
    if (selectedGroupGuids.length > 0) {
      const parentMenus = new Set<string>();
      for (const [menuGuid, detail] of Object.entries(menuDetailCache)) {
        for (const group of detail.groups) {
          if (selectedGroupGuids.includes(group.groupGuid)) parentMenus.add(menuGuid);
        }
      }
      return { menuGuids: Array.from(parentMenus), groupGuids: selectedGroupGuids };
    }
    if (selectedMenuGuids.length > 0) return { menuGuids: selectedMenuGuids };
    return null;
  };

  const hasSelection = selectedMenuGuids.length > 0 || selectedGroupGuids.length > 0 || selectedItemGuids.length > 0;

  const syncLabel = (): string => {
    if (selectedItemGuids.length > 0) return `Sync ${selectedItemGuids.length} item${selectedItemGuids.length === 1 ? "" : "s"}`;
    if (selectedGroupGuids.length > 0) return `Sync ${selectedGroupGuids.length} course${selectedGroupGuids.length === 1 ? "" : "s"}`;
    if (selectedMenuGuids.length > 0) return `Sync ${selectedMenuGuids.length} menu${selectedMenuGuids.length === 1 ? "" : "s"}`;
    return "Sync Selected";
  };

  const selectionSummary = (): string => {
    if (selectedItemGuids.length > 0) return `${selectedItemGuids.length} item${selectedItemGuids.length === 1 ? "" : "s"} selected`;
    if (selectedGroupGuids.length > 0) return `${selectedGroupGuids.length} course${selectedGroupGuids.length === 1 ? "" : "s"} selected`;
    if (selectedMenuGuids.length > 0) return `${selectedMenuGuids.length} menu${selectedMenuGuids.length === 1 ? "" : "s"} selected`;
    return "Select to narrow sync, or use Sync All";
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Sync Menus from Toast</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Expand a menu to select specific courses or individual items, or sync everything at once.
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
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xs text-muted-foreground">{selectionSummary()}</p>
              {hasSelection && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setSelectedMenuGuids([]); setSelectedGroupGuids([]); setSelectedItemGuids([]); }}
                  data-testid={`${testIdPrefix}-button-clear-selection`}
                >
                  Clear
                </Button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto border rounded-md p-1 space-y-0.5">
              {availableMenus.map((m) => {
                const isMenuChecked = selectedMenuGuids.includes(m.guid);
                const isMenuExpanded = expandedMenus.has(m.guid);
                const detail = menuDetailCache[m.guid];
                const isLoadingDetail = isMenuExpanded && !detail;

                return (
                  <div key={m.guid}>
                    <div className="flex items-center gap-1.5 p-1.5 rounded-md hover-elevate" data-testid={`${testIdPrefix}-menu-row-${m.guid}`}>
                      <button
                        type="button"
                        className="p-0.5 shrink-0"
                        onClick={() => {
                          setExpandedMenus(prev => {
                            const next = new Set(prev);
                            if (next.has(m.guid)) { next.delete(m.guid); } else { next.add(m.guid); loadMenuDetail(m.guid); }
                            return next;
                          });
                        }}
                        data-testid={`${testIdPrefix}-button-expand-menu-${m.guid}`}
                      >
                        <ChevronRight className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", isMenuExpanded ? "rotate-90" : "")} />
                      </button>
                      <Checkbox
                        checked={isMenuChecked}
                        onCheckedChange={() => toggleMenu(m.guid)}
                        data-testid={`${testIdPrefix}-checkbox-menu-${m.guid}`}
                      />
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleMenu(m.guid)}>
                        <p className="text-sm font-medium truncate">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.groupCount} courses · {m.itemCount} items</p>
                      </div>
                    </div>

                    {isMenuExpanded && (
                      <div className="ml-7 space-y-0.5 mb-1">
                        {isLoadingDetail ? (
                          <div className="flex items-center gap-2 py-2 px-2">
                            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Loading courses...</span>
                          </div>
                        ) : !detail || detail.groups.length === 0 ? (
                          <p className="text-xs text-muted-foreground px-2 py-1">No courses found — sync the menu first.</p>
                        ) : (
                          detail.groups.map((group) => {
                            const isGroupChecked = selectedGroupGuids.includes(group.groupGuid);
                            const isGroupExpanded = expandedGroups.has(group.groupGuid);

                            return (
                              <div key={group.groupGuid}>
                                <div className="flex items-center gap-1.5 p-1.5 rounded-md hover-elevate" data-testid={`${testIdPrefix}-group-row-${group.groupGuid}`}>
                                  <button
                                    type="button"
                                    className="p-0.5 shrink-0"
                                    onClick={() => setExpandedGroups(prev => {
                                      const next = new Set(prev);
                                      if (next.has(group.groupGuid)) { next.delete(group.groupGuid); } else { next.add(group.groupGuid); }
                                      return next;
                                    })}
                                    data-testid={`${testIdPrefix}-button-expand-group-${group.groupGuid}`}
                                  >
                                    <ChevronRight className={cn("w-3 h-3 text-muted-foreground transition-transform", isGroupExpanded ? "rotate-90" : "")} />
                                  </button>
                                  <Checkbox
                                    checked={isGroupChecked}
                                    onCheckedChange={() => toggleGroup(group.groupGuid, group.items, isGroupChecked)}
                                    data-testid={`${testIdPrefix}-checkbox-group-${group.groupGuid}`}
                                  />
                                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleGroup(group.groupGuid, group.items, isGroupChecked)}>
                                    <p className="text-sm truncate">{group.name}</p>
                                    <p className="text-xs text-muted-foreground">{group.items.length} items</p>
                                  </div>
                                </div>

                                {isGroupExpanded && (
                                  <div className="ml-6 space-y-0.5 mb-1">
                                    {group.items.length === 0 ? (
                                      <p className="text-xs text-muted-foreground px-2 py-1">No items</p>
                                    ) : (
                                      group.items.map((item) => (
                                        <label
                                          key={item.itemGuid}
                                          className="flex items-center gap-1.5 p-1.5 rounded-md hover-elevate cursor-pointer"
                                          data-testid={`${testIdPrefix}-item-row-${item.itemGuid}`}
                                        >
                                          <div className="w-3.5 shrink-0" />
                                          <Checkbox
                                            checked={selectedItemGuids.includes(item.itemGuid)}
                                            onCheckedChange={() => toggleItem(item.itemGuid)}
                                            data-testid={`${testIdPrefix}-checkbox-item-${item.itemGuid}`}
                                          />
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs truncate">{item.name}</p>
                                            {item.price && <p className="text-xs text-muted-foreground">${parseFloat(item.price).toFixed(2)}</p>}
                                          </div>
                                        </label>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 flex-wrap">
          <Button variant="outline" onClick={() => handleOpenChange(false)} data-testid={`${testIdPrefix}-button-cancel-sync`}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => syncMutation.mutate({})}
            disabled={syncMutation.isPending || availableLoading || availableMenus.length === 0}
            data-testid={`${testIdPrefix}-button-sync-all`}
          >
            {syncMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Sync All
          </Button>
          <Button
            onClick={() => {
              const params = getEffectiveSyncParams();
              if (!params) return;
              syncMutation.mutate(params);
            }}
            disabled={syncMutation.isPending || !hasSelection}
            data-testid={`${testIdPrefix}-button-sync-selected`}
          >
            {syncMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ListFilter className="w-4 h-4 mr-2" />}
            {syncLabel()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
