import { useState, useEffect } from "react";
import { useB2bProducts } from "@/hooks/useB2bProducts";
import { useB2bAuth } from "@/contexts/B2bAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, ShoppingCart, Package, DollarSign, UserCog, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Cart state stored in localStorage
function getCart(): Record<string, number> {
  try {
    const cart = localStorage.getItem("b2b_cart");
    return cart ? JSON.parse(cart) : {};
  } catch {
    return {};
  }
}

function saveCart(cart: Record<string, number>) {
  localStorage.setItem("b2b_cart", JSON.stringify(cart));
}

export default function CatalogPage() {
  const { user } = useB2bAuth();
  const { data, isLoading } = useB2bProducts();
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<Record<string, number>>(getCart());
  const { toast } = useToast();
  const [adminImpersonating, setAdminImpersonating] = useState<any>(null);

  const products = data?.products || [];
  const tier = data?.tier;

  // Check for admin impersonation on mount
  useEffect(() => {
    const impersonationData = localStorage.getItem('admin_impersonating');
    if (impersonationData) {
      try {
        setAdminImpersonating(JSON.parse(impersonationData));
      } catch {
        localStorage.removeItem('admin_impersonating');
      }
    }
  }, []);

  const handleReturnToAdmin = () => {
    localStorage.removeItem('admin_impersonating');
    localStorage.removeItem('b2b_cart'); // Clear cart when returning
    window.location.href = '/b2b/admin';
  };

  // Filter products by search
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (productId: string, quantity: number) => {
    const newCart = { ...cart, [productId]: (cart[productId] || 0) + quantity };
    setCart(newCart);
    saveCart(newCart);
    toast({
      title: "Added to Cart",
      description: `${quantity} case(s) added to your order`,
    });
  };

  const cartItemCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-48 w-full mb-4" />
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Admin Impersonation Banner */}
      {adminImpersonating && (
        <Alert className="mb-6 bg-primary/10 border-primary">
          <UserCog className="h-5 w-5" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <p className="font-medium">Placing Order For: {adminImpersonating.customerName}</p>
              <p className="text-sm text-muted-foreground">
                Admin mode - You are browsing the catalog as this customer
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReturnToAdmin}
              data-testid="button-return-to-admin"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return to Admin
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Header with search and cart */}
      <div className="mb-8 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-serif font-semibold mb-2">Wholesale Catalog</h1>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{typeof tier === 'string' ? tier : tier?.tierName || "No Tier"} Pricing</Badge>
            <span className="text-sm text-muted-foreground">
              {products.length} Products Available
            </span>
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full sm:w-64"
              data-testid="input-search"
            />
          </div>
          <Button
            variant="default"
            size="default"
            onClick={() => window.location.href = "/b2b/cart"}
            data-testid="button-view-cart"
            className="relative"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Cart
            {cartItemCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center"
              >
                {cartItemCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="hover-elevate" data-testid={`product-card-${product.id}`}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1">
                  <CardTitle className="font-serif text-xl mb-1">{product.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                </div>
                <Badge variant="outline">{product.category}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {product.imageUrl && (
                <div className="aspect-square rounded-lg overflow-hidden mb-4 bg-muted">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Retail Price:</span>
                  <span className="line-through">${Number(product.price).toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-medium">Your Price:</span>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      ${product.tierPrice ? Number(product.tierPrice).toFixed(2) : Number(product.price).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">per bottle</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Package className="h-4 w-4" />
                  <span>Case Size: {product.caseSize} bottles</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4" />
                  <span>
                    ${((product.tierPrice ? Number(product.tierPrice) : Number(product.price)) * product.caseSize).toFixed(2)} per case
                  </span>
                </div>

                <div className="pt-2 border-t space-y-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addToCart(product.id, 1)}
                      disabled={product.currentStock < product.caseSize}
                      className="flex-1"
                      data-testid={`button-add-1-case-${product.id}`}
                    >
                      Add 1 Case
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => addToCart(product.id, 3)}
                      disabled={product.currentStock < product.caseSize * 3}
                      className="flex-1"
                      data-testid={`button-add-3-cases-${product.id}`}
                    >
                      Add 3 Cases
                    </Button>
                  </div>

                  <p className="text-xs text-center text-muted-foreground">
                    {product.currentStock >= product.caseSize
                      ? `${Math.floor(product.currentStock / product.caseSize)} cases available`
                      : "Out of stock"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No products found</h3>
          <p className="text-muted-foreground">Try adjusting your search query</p>
        </div>
      )}
    </div>
  );
}
