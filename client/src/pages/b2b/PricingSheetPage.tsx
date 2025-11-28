import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Wine, Martini, Package, Eye, TrendingUp, DollarSign, UserPlus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Product = {
  id: string;
  name: string;
  category: string;
  type?: string;
  varietal?: string;
  vintageYear?: string;
  region?: string;
  description: string;
  tastingNotes?: string;
  foodPairings?: string;
  servingTemp?: string;
  alcoholContent?: string;
  bottleSize?: string;
  price: string;
  sku?: string;
  stockQuantity: number;
  imageUrl?: string;
  labelImageUrl?: string;
  characteristics?: string;
  wineColor?: string;
  sweetness?: string;
  body?: string;
  spiritType?: string;
  spiritAging?: string;
  spiritFlavor?: string;
  productionMethod?: string;
  agingProcess?: string;
  awards?: string;
  rating?: string;
  available: boolean;
};

type TierPricing = {
  id: string;
  tierName: string;
  category?: string;
  discountPercentage: string;
  description?: string;
  active: boolean;
};

export default function PricingSheetPage() {
  const [, setLocation] = useLocation();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedProductTab, setSelectedProductTab] = useState<string>("wine");
  const [selectedTierTab, setSelectedTierTab] = useState<string>("wine");

  const { data: products = [], isLoading: loadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/b2b/pricing/products"],
  });

  const { data: tiers = [], isLoading: loadingTiers } = useQuery<TierPricing[]>({
    queryKey: ["/api/b2b/pricing/tiers"],
  });

  // Group products by category
  const wines = products.filter(p => p.category === "wine");
  const spirits = products.filter(p => p.category === "spirits");
  const beer = products.filter(p => p.category === "beer");
  const cocktails = products.filter(p => p.category === "canned_cocktail");
  const cannedWine = products.filter(p => p.category === "canned_wine");
  const cider = products.filter(p => p.category === "cider");

  const calculatePrice = (retailPrice: string, discountPercentage: string) => {
    const retail = parseFloat(retailPrice);
    const discount = parseFloat(discountPercentage);
    return (retail * (1 - discount / 100)).toFixed(2);
  };

  const calculateProfit = (retailPrice: string, tierPrice: string) => {
    return (parseFloat(retailPrice) - parseFloat(tierPrice)).toFixed(2);
  };

  const calculateProfitMargin = (retailPrice: string, tierPrice: string) => {
    const profit = parseFloat(retailPrice) - parseFloat(tierPrice);
    const tierPriceNum = parseFloat(tierPrice);
    return tierPriceNum > 0 ? ((profit / tierPriceNum) * 100).toFixed(1) : "0.0";
  };

  const renderProductTable = (categoryProducts: Product[], categoryName: string, categoryFilter?: string[]) => {
    if (loadingProducts || loadingTiers) {
      return (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      );
    }

    if (categoryProducts.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No {categoryName.toLowerCase()} products available
        </div>
      );
    }

    // Filter tiers to only show those matching the product category
    const categoryTiers = categoryFilter 
      ? tiers.filter(tier => categoryFilter.includes(tier.category || ''))
      : tiers;

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Retail Price</TableHead>
              {categoryTiers.map(tier => (
                <TableHead key={tier.id} className="text-right">
                  {tier.tierName}
                  <br />
                  <span className="text-xs text-muted-foreground">
                    ({tier.discountPercentage}% off)
                  </span>
                </TableHead>
              ))}
              <TableHead className="text-center">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categoryProducts.map(product => (
              <TableRow key={product.id} data-testid={`product-row-${product.id}`}>
                <TableCell className="font-medium">
                  <div>
                    <div>{product.name}</div>
                    {product.varietal && (
                      <div className="text-xs text-muted-foreground">{product.varietal}</div>
                    )}
                    {product.type && (
                      <div className="text-xs text-muted-foreground">{product.type}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-xs font-mono">{product.sku || "-"}</TableCell>
                <TableCell className="text-right font-semibold">
                  ${parseFloat(product.price).toFixed(2)}
                </TableCell>
                {categoryTiers.map(tier => {
                  const tierPrice = calculatePrice(product.price, tier.discountPercentage);
                  return (
                    <TableCell key={tier.id} className="text-right">
                      <div className="font-medium">${tierPrice}</div>
                      <div className="text-xs text-muted-foreground">
                        Margin: {calculateProfitMargin(product.price, tierPrice)}%
                      </div>
                    </TableCell>
                  );
                })}
                <TableCell className="text-center">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedProduct(product)}
                    data-testid={`button-view-details-${product.id}`}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderProductDetail = (product: Product) => {
    return (
      <div className="space-y-6">
        {/* Header with Image */}
        <div className="flex gap-6">
          {product.imageUrl && (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-32 h-32 object-cover rounded-lg"
            />
          )}
          <div className="flex-1">
            <h3 className="text-2xl font-serif mb-2">{product.name}</h3>
            {product.sku && (
              <p className="text-sm text-muted-foreground font-mono">SKU: {product.sku}</p>
            )}
            {product.category && (
              <Badge className="mt-2">{product.category}</Badge>
            )}
          </div>
        </div>

        {/* Product Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {product.description && (
            <div className="md:col-span-2">
              <h4 className="font-semibold mb-1">Description</h4>
              <p className="text-sm text-muted-foreground">{product.description}</p>
            </div>
          )}

          {product.type && (
            <div>
              <h4 className="font-semibold mb-1">Type</h4>
              <p className="text-sm">{product.type}</p>
            </div>
          )}

          {product.varietal && (
            <div>
              <h4 className="font-semibold mb-1">Varietal</h4>
              <p className="text-sm">{product.varietal}</p>
            </div>
          )}

          {product.vintageYear && (
            <div>
              <h4 className="font-semibold mb-1">Vintage Year</h4>
              <p className="text-sm">{product.vintageYear}</p>
            </div>
          )}

          {product.region && (
            <div>
              <h4 className="font-semibold mb-1">Region</h4>
              <p className="text-sm">{product.region}</p>
            </div>
          )}

          {product.wineColor && (
            <div>
              <h4 className="font-semibold mb-1">Wine Color</h4>
              <p className="text-sm">{product.wineColor}</p>
            </div>
          )}

          {product.sweetness && (
            <div>
              <h4 className="font-semibold mb-1">Sweetness</h4>
              <p className="text-sm">{product.sweetness}</p>
            </div>
          )}

          {product.body && (
            <div>
              <h4 className="font-semibold mb-1">Body</h4>
              <p className="text-sm">{product.body}</p>
            </div>
          )}

          {product.alcoholContent && (
            <div>
              <h4 className="font-semibold mb-1">Alcohol Content</h4>
              <p className="text-sm">{product.alcoholContent}</p>
            </div>
          )}

          {product.bottleSize && (
            <div>
              <h4 className="font-semibold mb-1">Bottle Size</h4>
              <p className="text-sm">{product.bottleSize}</p>
            </div>
          )}

          {product.spiritType && (
            <div>
              <h4 className="font-semibold mb-1">Spirit Type</h4>
              <p className="text-sm">{product.spiritType}</p>
            </div>
          )}

          {product.spiritAging && (
            <div>
              <h4 className="font-semibold mb-1">Aging</h4>
              <p className="text-sm">{product.spiritAging}</p>
            </div>
          )}

          {product.spiritFlavor && (
            <div>
              <h4 className="font-semibold mb-1">Flavor Profile</h4>
              <p className="text-sm">{product.spiritFlavor}</p>
            </div>
          )}

          {product.tastingNotes && (
            <div className="md:col-span-2">
              <h4 className="font-semibold mb-1">Tasting Notes</h4>
              <p className="text-sm text-muted-foreground">{product.tastingNotes}</p>
            </div>
          )}

          {product.foodPairings && (
            <div className="md:col-span-2">
              <h4 className="font-semibold mb-1">Food Pairings</h4>
              <p className="text-sm text-muted-foreground">{product.foodPairings}</p>
            </div>
          )}

          {product.servingTemp && (
            <div>
              <h4 className="font-semibold mb-1">Serving Temperature</h4>
              <p className="text-sm">{product.servingTemp}</p>
            </div>
          )}

          {product.productionMethod && (
            <div>
              <h4 className="font-semibold mb-1">Production Method</h4>
              <p className="text-sm">{product.productionMethod}</p>
            </div>
          )}

          {product.agingProcess && (
            <div>
              <h4 className="font-semibold mb-1">Aging Process</h4>
              <p className="text-sm">{product.agingProcess}</p>
            </div>
          )}

          {product.awards && (
            <div className="md:col-span-2">
              <h4 className="font-semibold mb-1">Awards</h4>
              <p className="text-sm">{product.awards}</p>
            </div>
          )}

          {product.rating && (
            <div>
              <h4 className="font-semibold mb-1">Rating</h4>
              <p className="text-sm">{product.rating}/5</p>
            </div>
          )}
        </div>

        {/* Pricing Table */}
        <div className="border-t pt-6">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Pricing & Profit Margins
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="font-medium">Retail Price</span>
              <span className="text-lg font-semibold">
                ${parseFloat(product.price).toFixed(2)}
              </span>
            </div>
            
            {/* Filter tiers to only show those matching the product's exact category */}
            {(() => {
              const productTiers = tiers.filter(tier => tier.category === product.category);
              
              if (productTiers.length === 0) {
                return (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="mb-2">No wholesale pricing tiers configured for {product.category} products.</p>
                    <p className="text-sm">Please contact an administrator to set up tier pricing for this category.</p>
                  </div>
                );
              }
              
              return productTiers.map(tier => {
                const tierPrice = calculatePrice(product.price, tier.discountPercentage);
                const profit = calculateProfit(product.price, tierPrice);
                const profitMargin = calculateProfitMargin(product.price, tierPrice);
                
                return (
                  <div key={tier.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-semibold">{tier.tierName}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          ({tier.discountPercentage}% off)
                        </span>
                      </div>
                      <span className="text-lg font-semibold text-primary">
                        ${tierPrice}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <div>
                          <div className="text-muted-foreground">Profit</div>
                          <div className="font-medium text-green-600">${profit}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                        <div>
                          <div className="text-muted-foreground">Profit Margin</div>
                          <div className="font-medium text-blue-600">{profitMargin}%</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-8 mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/b2b")}
            className="mb-4 text-primary-foreground hover:bg-primary-foreground/10"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Wholesale Portal
          </Button>
          <h1 className="text-3xl md:text-4xl font-serif font-light">
            B2B Pricing Sheet
          </h1>
          <p className="text-lg text-primary-foreground/90 mt-2">
            Complete wholesale pricing with profit margin calculations
          </p>
          <Button
            onClick={() => setLocation("/b2b/register")}
            className="mt-4 bg-white text-primary hover:bg-white/90"
            data-testid="button-open-account-top"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Open an Account
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <Tabs value={selectedProductTab} onValueChange={(value) => {
          setSelectedProductTab(value);
          // Sync tier tab with product tab (1:1 mapping now)
          setSelectedTierTab(value);
        }} className="space-y-6">
          <TabsList className="flex flex-wrap w-full h-auto gap-2 p-2">
            <TabsTrigger value="wine" className="flex-1 min-w-[100px] gap-2" data-testid="tab-wine">
              <Wine className="h-4 w-4" />
              Wine ({wines.length})
            </TabsTrigger>
            <TabsTrigger value="spirits" className="flex-1 min-w-[100px] gap-2" data-testid="tab-spirits">
              <Martini className="h-4 w-4" />
              Spirits ({spirits.length})
            </TabsTrigger>
            <TabsTrigger value="beer" className="flex-1 min-w-[100px] gap-2" data-testid="tab-beer">
              <Wine className="h-4 w-4" />
              Beer ({beer.length})
            </TabsTrigger>
            <TabsTrigger value="canned_cocktail" className="flex-1 min-w-[100px] gap-2" data-testid="tab-cocktails">
              <Package className="h-4 w-4" />
              Canned Cocktails ({cocktails.length})
            </TabsTrigger>
            <TabsTrigger value="canned_wine" className="flex-1 min-w-[100px] gap-2" data-testid="tab-canned-wine">
              <Package className="h-4 w-4" />
              Canned Wine ({cannedWine.length})
            </TabsTrigger>
            <TabsTrigger value="cider" className="flex-1 min-w-[100px] gap-2" data-testid="tab-cider">
              <Wine className="h-4 w-4" />
              Cider ({cider.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wine">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif flex items-center gap-2">
                  <Wine className="h-5 w-5" />
                  Wine Products
                </CardTitle>
                <CardDescription>
                  All wine products with tier pricing and profit margins
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderProductTable(wines, "Wines", ["wine"])}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="spirits">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif flex items-center gap-2">
                  <Martini className="h-5 w-5" />
                  Spirit Products
                </CardTitle>
                <CardDescription>
                  All spirit products with tier pricing and profit margins
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderProductTable(spirits, "Spirits", ["spirits"])}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="beer">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif flex items-center gap-2">
                  <Wine className="h-5 w-5" />
                  Beer Products
                </CardTitle>
                <CardDescription>
                  All beer products with tier pricing and profit margins
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderProductTable(beer, "Beer", ["beer"])}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="canned_cocktail">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Canned Cocktail Products
                </CardTitle>
                <CardDescription>
                  All canned cocktail products with tier pricing and profit margins
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderProductTable(cocktails, "Canned Cocktails", ["canned_cocktail"])}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="canned_wine">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Canned Wine Products
                </CardTitle>
                <CardDescription>
                  All canned wine products with tier pricing and profit margins
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderProductTable(cannedWine, "Canned Wine", ["canned_wine"])}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cider">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif flex items-center gap-2">
                  <Wine className="h-5 w-5" />
                  Cider Products
                </CardTitle>
                <CardDescription>
                  All cider products with tier pricing and profit margins
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderProductTable(cider, "Cider", ["cider"])}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Tier Information Footer */}
        {!loadingTiers && tiers.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="font-serif flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Wholesale Pricing Tiers by Category
              </CardTitle>
              <CardDescription>
                Category-specific tier-based discount structure for wholesale partners
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={selectedTierTab} onValueChange={setSelectedTierTab} className="w-full">
                <TabsList className="flex flex-wrap w-full h-auto gap-2 p-2">
                  <TabsTrigger value="wine" className="flex-1 min-w-[100px]" data-testid="tab-wine-tiers">
                    Wine
                  </TabsTrigger>
                  <TabsTrigger value="spirits" className="flex-1 min-w-[100px]" data-testid="tab-spirits-tiers">
                    Spirits
                  </TabsTrigger>
                  <TabsTrigger value="beer" className="flex-1 min-w-[100px]" data-testid="tab-beer-tiers">
                    Beer
                  </TabsTrigger>
                  <TabsTrigger value="canned_cocktail" className="flex-1 min-w-[100px]" data-testid="tab-cocktails-tiers">
                    Canned Cocktails
                  </TabsTrigger>
                  <TabsTrigger value="canned_wine" className="flex-1 min-w-[100px]" data-testid="tab-canned-wine-tiers">
                    Canned Wine
                  </TabsTrigger>
                  <TabsTrigger value="cider" className="flex-1 min-w-[100px]" data-testid="tab-cider-tiers">
                    Cider
                  </TabsTrigger>
                </TabsList>

                {["wine", "spirits", "beer", "canned_cocktail", "canned_wine", "cider"].map((category) => {
                  const categoryTiers = tiers.filter(t => t.category === category);
                  const categoryLabel = {
                    "wine": "Wine",
                    "spirits": "Spirits",
                    "beer": "Beer",
                    "canned_cocktail": "Canned Cocktails",
                    "canned_wine": "Canned Wine",
                    "cider": "Cider"
                  }[category];

                  return (
                    <TabsContent key={category} value={category} className="mt-4">
                      {categoryTiers.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">
                          No active pricing tiers for {categoryLabel}
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {categoryTiers.map((tier) => (
                            <div
                              key={tier.id}
                              className="flex items-center justify-between p-4 rounded-lg border bg-card hover-elevate"
                              data-testid={`tier-${category}-${tier.tierName.toLowerCase().replace(/\s+/g, '-')}`}
                            >
                              <div>
                                <p className="font-semibold text-lg">
                                  {tier.tierName}
                                  <span className="ml-2 text-xs text-muted-foreground">({categoryLabel})</span>
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {tier.description || `Wholesale pricing for ${categoryLabel}`}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-primary">{tier.discountPercentage}%</p>
                                <p className="text-sm text-muted-foreground">off retail</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  );
                })}
              </Tabs>

              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-start gap-3">
                  <Package className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium mb-1">Case Quantities</p>
                    <p className="text-sm text-muted-foreground">
                      All orders are calculated by case (12 bottles per case). Each beverage category has its own independent tier pricing structure.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bottom CTA */}
        <div className="mt-8 text-center">
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="py-8">
              <h3 className="text-2xl font-serif mb-2">Ready to Partner with Us?</h3>
              <p className="text-primary-foreground/90 mb-4">
                Apply for a wholesale account and start saving today
              </p>
              <Button
                onClick={() => setLocation("/b2b/register")}
                className="bg-white text-primary hover:bg-white/90"
                size="lg"
                data-testid="button-open-account-bottom"
              >
                <UserPlus className="h-5 w-5 mr-2" />
                Open an Account
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Product Detail Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-product-detail">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Product Details</DialogTitle>
            <DialogDescription>
              Complete product information and pricing breakdown
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && renderProductDetail(selectedProduct)}
        </DialogContent>
      </Dialog>
    </div>
  );
}
