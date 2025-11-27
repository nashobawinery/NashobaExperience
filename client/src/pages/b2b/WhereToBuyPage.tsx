import { useState, useMemo, useEffect, useRef, Suspense, lazy } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Search, MapPin, Phone, Package, Heart, Wine, Store, UtensilsCrossed, Globe, AlertCircle, Star, Map, X, List } from "lucide-react";
import { Fireworks } from "@/components/Fireworks";

const StoreLocationsMap = lazy(() => import("@/components/StoreLocationsMap"));

type CustomerType = "retail_liquor" | "restaurant";

interface Location {
  id: string;
  storeName: string;
  accountName: string;
  customerType: CustomerType | null;
  storeAddress: string | null;
  storeCity: string | null;
  storeState: string | null;
  storeZipCode: string | null;
  storePhone: string | null;
  website: string | null;
  tierName: string | null;
  tierSortOrder: number | null;
  distanceMiles?: number | null;
  mapLat?: number | null;
  mapLng?: number | null;
  coordsPrecise?: boolean;
  products: Array<{
    productName: string;
    sku: string | null;
  }>;
}

const customerTypeLabels: Record<CustomerType, string> = {
  retail_liquor: "Retail Liquor Store",
  restaurant: "Restaurant",
};

export default function WhereToBuyPage() {
  const [searchZip, setSearchZip] = useState("");
  const [debouncedZip, setDebouncedZip] = useState("");
  const [searchProduct, setSearchProduct] = useState("");
  const [filterType, setFilterType] = useState<CustomerType | "all">("all");
  const [showMap, setShowMap] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [mobileMapOpen, setMobileMapOpen] = useState(false);
  const locationRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Debounce zip code using useEffect
  useEffect(() => {
    const timer = setTimeout(() => {
      const cleanZip = searchZip.replace(/\D/g, "").slice(0, 5);
      if (cleanZip.length === 5 || cleanZip.length === 0) {
        setDebouncedZip(cleanZip);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchZip]);

  // Build query key with zip parameter if provided
  const queryKey = debouncedZip 
    ? `/api/b2b/where-to-buy?zip=${debouncedZip}` 
    : "/api/b2b/where-to-buy";

  const { data: locations = [], isLoading } = useQuery<Location[]>({
    queryKey: [queryKey],
  });

  // Handle location selection from map
  const handleMapLocationSelect = (id: string) => {
    setSelectedLocationId(id);
    // Close mobile map sheet and scroll to the card
    setMobileMapOpen(false);
    setTimeout(() => {
      const element = locationRefs.current[id];
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.classList.add("ring-2", "ring-orange-500");
        setTimeout(() => {
          element.classList.remove("ring-2", "ring-orange-500");
        }, 2000);
      }
    }, 100);
  };

  // Handle card click to highlight on map
  const handleCardClick = (id: string) => {
    setSelectedLocationId(id);
    if (!showMap && window.innerWidth >= 1024) {
      setShowMap(true);
    }
  };

  const filteredAndSortedLocations = useMemo(() => {
    let result = [...locations];
    
    // Filter by customer type if selected
    if (filterType !== "all") {
      result = result.filter((loc) => loc.customerType === filterType);
    }
    
    // Filter by product search if provided
    const productSearchTerm = searchProduct.trim().toLowerCase();
    if (productSearchTerm) {
      result = result.filter((loc) =>
        loc.products.some((product) =>
          product.productName.toLowerCase().includes(productSearchTerm) ||
          (product.sku && product.sku.toLowerCase().includes(productSearchTerm))
        )
      );
    }
    
    // Sort by: 1) Tier (highest first), 2) Distance within same tier, 3) Alphabetically
    // Tier 4 (sortOrder 4) is highest priority and always appears first
    return result.sort((a, b) => {
      // First sort by tier (highest tier first - Tier 4 has sortOrder 4)
      const tierA = a.tierSortOrder ?? 0;
      const tierB = b.tierSortOrder ?? 0;
      if (tierB !== tierA) {
        return tierB - tierA; // Higher tier always comes first
      }
      
      // Within same tier: if both have distance info, use distance as tiebreaker
      if (a.distanceMiles != null && b.distanceMiles != null) {
        return a.distanceMiles - b.distanceMiles;
      }
      
      // If only one has distance, prioritize the one with distance
      if (a.distanceMiles != null && b.distanceMiles == null) return -1;
      if (a.distanceMiles == null && b.distanceMiles != null) return 1;
      
      // Otherwise sort alphabetically by store name
      return (a.storeName || a.accountName || "").localeCompare(b.storeName || b.accountName || "");
    });
  }, [locations, searchProduct, filterType]);

  return (
    <div className="min-h-screen bg-background">
      <div className="relative w-full bg-gradient-to-b from-orange-100/30 to-transparent dark:from-orange-950/20 dark:to-transparent overflow-hidden py-6 mb-0">
        <div className="absolute inset-0 h-96">
          <Fireworks />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
          <h1 className="text-4xl font-serif font-semibold mb-3 text-foreground" data-testid="page-title">
            Where to Buy Nashoba Valley's Wines, Spirits, Beers, Canned Cocktails and Hard Ciders
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="page-description">
            Help us build a Community by Asking for us at the Stores and Restaurants that you support
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2">
        <Card className="mb-8 border-l-4 border-l-orange-600 bg-gradient-to-r from-orange-50 via-orange-25 to-transparent dark:from-orange-950/30 dark:via-orange-900/10 dark:to-transparent shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardContent className="py-6 px-6">
            <div className="flex gap-5 items-center">
              <div className="flex-shrink-0 bg-gradient-to-br from-orange-500 to-red-500 rounded-full p-3 shadow-md">
                <Heart className="h-8 w-8 text-white" fill="currentColor" />
              </div>
              <div>
                <p className="text-xl font-medium text-foreground leading-relaxed mb-2">
                  A heartfelt cheers to our farm-to-table heroes!
                </p>
                <p className="text-base text-muted-foreground leading-relaxed">
                  The stores and restaurants truly committed to local flavors, proudly pouring and serving adult beverages crafted by your neighbors. Their dedication to our farm keeps our community thriving, one sip at a time! Your support shows your dedication to local farming and locally owned business. <span className="font-semibold text-orange-600 dark:text-orange-400">Every dollar you spend stays in our local economy.</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mb-8 max-w-3xl mx-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Enter ZIP code"
                value={searchZip}
                onChange={(e) => setSearchZip(e.target.value)}
                className="pl-10 pr-16"
                data-testid="input-zip-search"
                maxLength={10}
              />
              {searchZip && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchZip("")}
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  data-testid="button-clear-zip"
                >
                  Clear
                </Button>
              )}
            </div>
            <div className="relative">
              <Wine className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by product"
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                className="pl-10 pr-16"
                data-testid="input-product-search"
              />
              {searchProduct && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchProduct("")}
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  data-testid="button-clear-product"
                >
                  Clear
                </Button>
              )}
            </div>
            <Select value={filterType} onValueChange={(val) => setFilterType(val as CustomerType | "all")}>
              <SelectTrigger data-testid="select-type-filter">
                <div className="flex items-center gap-2">
                  {filterType === "retail_liquor" ? (
                    <Store className="h-4 w-4 text-muted-foreground" />
                  ) : filterType === "restaurant" ? (
                    <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
                  ) : null}
                  <SelectValue placeholder="All Types" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="retail_liquor">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    <span>Retail Liquor Stores</span>
                  </div>
                </SelectItem>
                <SelectItem value="restaurant">
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed className="h-4 w-4" />
                    <span>Restaurants</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-center gap-2">
            {/* Desktop map toggle */}
            <Button
              variant={showMap ? "default" : "outline"}
              size="sm"
              onClick={() => setShowMap(!showMap)}
              className="hidden lg:flex items-center gap-2"
              data-testid="button-toggle-map-desktop"
            >
              <Map className="h-4 w-4" />
              {showMap ? "Hide Map" : "View Map"}
            </Button>
            
            {/* Mobile map sheet trigger */}
            <Sheet open={mobileMapOpen} onOpenChange={setMobileMapOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="lg:hidden flex items-center gap-2"
                  data-testid="button-view-map-mobile"
                >
                  <Map className="h-4 w-4" />
                  View Map
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh] p-0">
                <SheetHeader className="p-4 pb-2">
                  <SheetTitle className="flex items-center gap-2">
                    <Map className="h-5 w-5" />
                    Store Locations Map
                  </SheetTitle>
                </SheetHeader>
                <div className="h-[calc(100%-60px)] px-4 pb-4">
                  <Suspense fallback={
                    <div className="h-full w-full flex items-center justify-center bg-muted/30 rounded-lg">
                      <div className="text-center">
                        <MapPin className="h-8 w-8 mx-auto mb-2 animate-pulse text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Loading map...</p>
                      </div>
                    </div>
                  }>
                    <StoreLocationsMap
                      locations={filteredAndSortedLocations}
                      selectedLocationId={selectedLocationId}
                      onLocationSelect={handleMapLocationSelect}
                    />
                  </Suspense>
                </div>
              </SheetContent>
            </Sheet>
          </div>
          
          {(searchZip || searchProduct || filterType !== "all") && (
            <p className="text-sm text-muted-foreground text-center">
              {(() => {
                const parts: string[] = [];
                if (filterType !== "all") {
                  parts.push(filterType === "retail_liquor" ? "retail liquor stores" : "restaurants");
                }
                if (searchProduct) {
                  parts.push(`carrying "${searchProduct}"`);
                }
                if (searchZip) {
                  parts.push(`nearest to ${searchZip}`);
                }
                if (parts.length === 0) return "";
                return `Showing ${parts.join(" ")}`;
              })()}
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredAndSortedLocations.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <MapPin className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Locations Found</h3>
              <p className="text-muted-foreground">
                {(() => {
                  const filters: string[] = [];
                  if (filterType !== "all") {
                    filters.push(filterType === "retail_liquor" ? "retail liquor stores" : "restaurants");
                  }
                  if (searchProduct) {
                    filters.push(`carrying "${searchProduct}"`);
                  }
                  if (searchZip) {
                    filters.push(`near ${searchZip}`);
                  }
                  if (filters.length > 0) {
                    return `No ${filters.join(" ")} found. Try broadening your search.`;
                  }
                  return "No retailers have purchased from us in the past 12 months";
                })()}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className={`flex gap-6 ${showMap ? 'lg:flex-row' : ''}`}>
            {/* Desktop Map Panel */}
            {showMap && (
              <div className="hidden lg:block lg:w-[45%] lg:sticky lg:top-4 lg:h-[600px]">
                <Suspense fallback={
                  <div className="h-full w-full flex items-center justify-center bg-muted/30 rounded-lg border">
                    <div className="text-center">
                      <MapPin className="h-8 w-8 mx-auto mb-2 animate-pulse text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Loading map...</p>
                    </div>
                  </div>
                }>
                  <StoreLocationsMap
                    locations={filteredAndSortedLocations}
                    selectedLocationId={selectedLocationId}
                    onLocationSelect={handleMapLocationSelect}
                  />
                </Suspense>
              </div>
            )}
            
            {/* Location Cards Grid */}
            <div className={`grid gap-6 md:grid-cols-2 ${showMap ? 'lg:grid-cols-2 lg:w-[55%]' : 'lg:grid-cols-3 w-full'}`}>
            {filteredAndSortedLocations.map((location) => {
              const isTier4 = location.tierSortOrder === 4;
              const isSelected = selectedLocationId === location.id;
              return (
              <div 
                key={location.id}
                ref={(el) => { locationRefs.current[location.id] = el; }}
              >
              <Card 
                className={`hover-elevate relative cursor-pointer transition-all duration-300 ${isTier4 ? 'border-2 border-amber-400 dark:border-amber-500 shadow-lg shadow-amber-100 dark:shadow-amber-900/20' : ''} ${isSelected ? 'ring-2 ring-orange-500 shadow-lg' : ''}`}
                data-testid={`location-card-${location.id}`}
                onClick={() => handleCardClick(location.id)}
              >
                {isTier4 && (
                  <div className="absolute -top-2 -right-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full p-1.5 shadow-md">
                    <Star className="h-4 w-4 text-white" fill="currentColor" />
                  </div>
                )}
                <CardHeader>
                  {isTier4 && (
                    <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 text-xs mb-2 w-fit">
                      Premium Supporter of Nashoba
                    </Badge>
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="font-serif text-xl" data-testid={`location-name-${location.id}`}>
                      {location.storeName || location.accountName}
                    </CardTitle>
                    {location.customerType && (
                      <Badge 
                        variant="outline" 
                        className="text-xs flex-shrink-0"
                        data-testid={`location-type-${location.id}`}
                      >
                        {location.customerType === "retail_liquor" ? (
                          <><Store className="h-3 w-3 mr-1" />Retail</>
                        ) : (
                          <><UtensilsCrossed className="h-3 w-3 mr-1" />Restaurant</>
                        )}
                      </Badge>
                    )}
                  </div>
                  {location.storeName && location.storeName !== location.accountName && (
                    <p className="text-sm text-muted-foreground" data-testid={`location-account-${location.id}`}>
                      {location.accountName}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {(location.storeAddress || location.storeCity) && (
                    <div className="flex gap-2 text-sm">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                      <div data-testid={`location-address-${location.id}`}>
                        {location.storeAddress && (
                          <p>{location.storeAddress}</p>
                        )}
                        {(location.storeCity || location.storeState || location.storeZipCode) && (
                          <p>
                            {location.storeCity}
                            {location.storeCity && location.storeState && ", "}
                            {location.storeState} {location.storeZipCode}
                          </p>
                        )}
                        {location.distanceMiles != null && (
                          <p className="text-orange-600 dark:text-orange-400 font-medium mt-1" data-testid={`location-distance-${location.id}`}>
                            {location.distanceMiles} miles away
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {location.storePhone && (
                    <div className="flex gap-2 items-center text-sm">
                      <Phone className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <a
                        href={`tel:${location.storePhone}`}
                        className="hover:underline"
                        data-testid={`location-phone-${location.id}`}
                      >
                        {location.storePhone}
                      </a>
                    </div>
                  )}

                  {location.website && (
                    <div className="flex gap-2 items-center text-sm">
                      <Globe className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <a
                        href={location.website.startsWith('http') ? location.website : `https://${location.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                        data-testid={`location-website-${location.id}`}
                      >
                        Visit Website
                      </a>
                    </div>
                  )}

                  {location.products.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Products purchased in the last 12 months:</span>
                      </div>
                      <div className="flex flex-wrap gap-1" data-testid={`location-products-${location.id}`}>
                        {location.products.slice(0, 5).map((product, idx) => {
                          const isMatch = searchProduct.trim() && (
                            product.productName.toLowerCase().includes(searchProduct.trim().toLowerCase()) ||
                            (product.sku && product.sku.toLowerCase().includes(searchProduct.trim().toLowerCase()))
                          );
                          return (
                            <Badge 
                              key={idx} 
                              variant={isMatch ? "default" : "secondary"} 
                              className={`text-xs ${isMatch ? "bg-orange-600 hover:bg-orange-700" : ""}`}
                            >
                              {product.productName}
                            </Badge>
                          );
                        })}
                        {location.products.length > 5 && (
                          <Badge variant="secondary" className="text-xs">
                            +{location.products.length - 5} more
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 italic flex items-start gap-1">
                        <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span>Items purchased does not mean "In Stock" - Call for current availability.</span>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
              </div>
              );
            })}
            </div>
          </div>
        )}

        {!isLoading && filteredAndSortedLocations.length > 0 && (
          <p className="text-center text-sm text-muted-foreground mt-8">
            Showing {filteredAndSortedLocations.length} location{filteredAndSortedLocations.length !== 1 ? 's' : ''}
            {searchZip && " (sorted by proximity)"}
          </p>
        )}
      </div>
    </div>
  );
}
