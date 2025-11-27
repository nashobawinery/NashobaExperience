import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, MapPin, Phone, Package, Heart, Wine } from "lucide-react";
import { Fireworks } from "@/components/Fireworks";

interface Location {
  id: string;
  storeName: string;
  accountName: string;
  shippingAddress: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingZipCode: string | null;
  phoneNumber: string | null;
  products: Array<{
    productName: string;
    sku: string | null;
  }>;
}

export default function WhereToBuyPage() {
  const [searchZip, setSearchZip] = useState("");
  const [searchProduct, setSearchProduct] = useState("");

  const { data: locations = [], isLoading } = useQuery<Location[]>({
    queryKey: ["/api/b2b/where-to-buy"],
  });

  const calculateZipDistance = (zip1: string, zip2: string): number => {
    const cleanZip1 = zip1.replace(/\D/g, "").slice(0, 5);
    const cleanZip2 = zip2.replace(/\D/g, "").slice(0, 5);
    
    if (!cleanZip1 || !cleanZip2) return Infinity;
    
    const diff = Math.abs(parseInt(cleanZip1) - parseInt(cleanZip2));
    return diff;
  };

  const filteredAndSortedLocations = useMemo(() => {
    let result = [...locations];
    
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
    
    // Sort by ZIP code proximity if provided, otherwise alphabetically by store name
    if (!searchZip.trim()) {
      return result.sort((a, b) => 
        (a.storeName || a.accountName || "").localeCompare(b.storeName || b.accountName || "")
      );
    }

    return result
      .map((loc) => ({
        ...loc,
        distance: calculateZipDistance(searchZip, loc.shippingZipCode || ""),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 20);
  }, [locations, searchZip, searchProduct]);

  return (
    <div className="min-h-screen bg-background">
      <div className="relative w-full bg-gradient-to-b from-orange-100/20 to-transparent dark:from-orange-950/10 dark:to-transparent overflow-hidden py-8 mb-4">
        <div className="absolute inset-0 h-96">
          <Fireworks />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h1 className="text-4xl font-serif font-semibold mb-4 text-foreground" data-testid="page-title">
            Where to Buy Our Wines
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="page-description">
            Find retailers and establishments near you that carry Nashoba Valley Winery products
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="mb-12 border-l-4 border-l-orange-600 bg-gradient-to-r from-orange-50 to-transparent dark:from-orange-950/20 dark:to-transparent">
          <CardContent className="py-8 px-6">
            <div className="flex gap-4 items-start">
              <Heart className="h-6 w-6 text-orange-600 flex-shrink-0 mt-1" />
              <p className="text-lg italic text-foreground leading-relaxed">
                A heartfelt cheers to our farm-to-table heroes—the stores and restaurants truly committed to local flavors, proudly pouring and serving adult beverages crafted by your neighbors. Their dedication to our farm keeps our community thriving, one sip at a time!  Your support of these stores and restaurants shows your dedication to local farming and locally owned business.  Thank you as every dollar you spend stays in our local enconomy.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mb-8 max-w-2xl mx-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Enter ZIP code for nearby stores"
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
                placeholder="Search by product name"
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
          </div>
          {(searchZip || searchProduct) && (
            <p className="text-sm text-muted-foreground text-center">
              {searchProduct && searchZip 
                ? `Showing stores carrying "${searchProduct}" nearest to ${searchZip}`
                : searchProduct
                ? `Showing stores carrying "${searchProduct}"`
                : `Showing locations nearest to ${searchZip}`
              }
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
                {searchProduct && searchZip
                  ? `No stores carrying "${searchProduct}" found near ${searchZip}. Try broadening your search.`
                  : searchProduct
                  ? `No stores carrying "${searchProduct}" found. Try a different product name.`
                  : searchZip 
                  ? "Try a different ZIP code or clear your search" 
                  : "No retailers have purchased from us in the past 12 months"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredAndSortedLocations.map((location) => (
              <Card key={location.id} className="hover-elevate" data-testid={`location-card-${location.id}`}>
                <CardHeader>
                  <CardTitle className="font-serif text-xl" data-testid={`location-name-${location.id}`}>
                    {location.storeName || location.accountName}
                  </CardTitle>
                  {location.storeName && location.storeName !== location.accountName && (
                    <p className="text-sm text-muted-foreground" data-testid={`location-account-${location.id}`}>
                      {location.accountName}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {(location.shippingAddress || location.shippingCity) && (
                    <div className="flex gap-2 text-sm">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                      <div data-testid={`location-address-${location.id}`}>
                        {location.shippingAddress && (
                          <p>{location.shippingAddress}</p>
                        )}
                        {(location.shippingCity || location.shippingState || location.shippingZipCode) && (
                          <p>
                            {location.shippingCity}
                            {location.shippingCity && location.shippingState && ", "}
                            {location.shippingState} {location.shippingZipCode}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {location.phoneNumber && (
                    <div className="flex gap-2 items-center text-sm">
                      <Phone className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <a
                        href={`tel:${location.phoneNumber}`}
                        className="hover:underline"
                        data-testid={`location-phone-${location.id}`}
                      >
                        {location.phoneNumber}
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
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
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
