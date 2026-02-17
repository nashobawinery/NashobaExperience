import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw, Search, UtensilsCrossed, Loader2,
  Tag, ListFilter, ExternalLink
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
  syncedAt: string;
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

export function ToastMenuBrowser() {
  const { toast } = useToast();
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("");
  const [selectedMenu, setSelectedMenu] = useState<string>("all");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

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

  const { data: menus = [] } = useQuery<ToastMenuData[]>({
    queryKey: ["/api/toast/menus", { restaurantGuid }],
    enabled: !!restaurantGuid,
  });

  const { data: groups = [] } = useQuery<ToastMenuGroupData[]>({
    queryKey: ["/api/toast/menu-groups", { restaurantGuid }],
    enabled: !!restaurantGuid,
  });

  const { data: items = [] } = useQuery<ToastMenuItemData[]>({
    queryKey: ["/api/toast/menu-items", { restaurantGuid }],
    enabled: !!restaurantGuid,
  });

  const syncMutation = useMutation({
    mutationFn: async (guid: string) => {
      const res = await apiRequest("POST", "/api/toast/menus/sync", { restaurantGuid: guid });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ predicate: (query) => {
        const key = query.queryKey[0] as string;
        return key === "/api/toast/menus" || key === "/api/toast/menu-groups" || key === "/api/toast/menu-items" || key === "/api/toast/menus/sync-status";
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

  const filteredItems = useMemo(() => {
    let result = items;
    if (selectedMenu !== "all") {
      result = result.filter((item) => item.menuGuid === selectedMenu);
    }
    if (selectedGroup !== "all") {
      result = result.filter((item) => item.groupGuid === selectedGroup);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.posName && item.posName.toLowerCase().includes(q)) ||
          (item.description && item.description.toLowerCase().includes(q)) ||
          (item.sku && item.sku.toLowerCase().includes(q))
      );
    }
    return result;
  }, [items, selectedMenu, selectedGroup, searchQuery]);

  const filteredGroups = useMemo(() => {
    if (selectedMenu === "all") return groups;
    return groups.filter((g) => g.menuGuid === selectedMenu);
  }, [groups, selectedMenu]);

  const groupNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const g of groups) {
      map[g.groupGuid] = g.name;
    }
    return map;
  }, [groups]);

  const menuNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of menus) {
      map[m.menuGuid] = m.name;
    }
    return map;
  }, [menus]);

  const currentRestaurantStatus = restaurantGuid && syncStatus ? syncStatus[restaurantGuid] : null;

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

  return (
    <div className="p-6 space-y-4">
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
                setSelectedMenu("all");
                setSelectedGroup("all");
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

      {items.length === 0 && !syncMutation.isPending ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium mb-1">No menu items synced yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Click "Sync Menus from Toast" to pull in your menu items and their classifications.
            </p>
          </CardContent>
        </Card>
      ) : syncMutation.isPending ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-3 animate-spin text-primary" />
            <p className="font-medium mb-1">Syncing menus from Toast...</p>
            <p className="text-sm text-muted-foreground">This may take a moment.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-menu-items"
              />
            </div>
            <Select value={selectedMenu} onValueChange={(v) => { setSelectedMenu(v); setSelectedGroup("all"); }}>
              <SelectTrigger className="w-48" data-testid="select-menu-filter">
                <ListFilter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Menus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Menus</SelectItem>
                {menus.map((m) => (
                  <SelectItem key={m.menuGuid} value={m.menuGuid}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger className="w-48" data-testid="select-group-filter">
                <Tag className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Groups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {filteredGroups.map((g) => (
                  <SelectItem key={g.groupGuid} value={g.groupGuid}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-sm text-muted-foreground" data-testid="text-item-count">
            Showing {filteredItems.length} of {items.length} items
          </p>

          <div className="border rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-left px-4 py-3 font-medium">Item Name</th>
                    <th className="text-left px-4 py-3 font-medium">Group</th>
                    <th className="text-left px-4 py-3 font-medium">Menu</th>
                    <th className="text-right px-4 py-3 font-medium">Price</th>
                    <th className="text-left px-4 py-3 font-medium">POS Name</th>
                    <th className="text-left px-4 py-3 font-medium">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="border-b last:border-0 hover-elevate" data-testid={`row-menu-item-${item.id}`}>
                      <td className="px-4 py-3">
                        <div className="font-medium" data-testid={`text-item-name-${item.id}`}>{item.name}</div>
                        {item.description && (
                          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {item.groupGuid && groupNameMap[item.groupGuid] ? (
                          <Badge variant="outline" className="text-xs">{groupNameMap[item.groupGuid]}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {item.menuGuid && menuNameMap[item.menuGuid] ? menuNameMap[item.menuGuid] : "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium" data-testid={`text-item-price-${item.id}`}>
                        {formatPrice(item.price) || <span className="text-muted-foreground">-</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {item.posName || "-"}
                      </td>
                      <td className="px-4 py-3">
                        {item.type ? (
                          <Badge variant="secondary" className="text-xs">{item.type}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        No items match your filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
