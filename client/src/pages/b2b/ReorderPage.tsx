import { useState } from "react";
import { useLocation } from "wouter";
import { useB2bPreviousProducts } from "@/hooks/useB2bProducts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, Package, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

export default function ReorderPage() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = useB2bPreviousProducts();
  const [cart, setCart] = useState<Record<string, number>>(getCart());
  const { toast } = useToast();

  const products = data?.products || [];
  const tier = data?.tier;

  const addToCart = (productId: string, quantity: number) => {
    const newCart = { ...cart, [productId]: (cart[productId] || 0) + quantity };
    setCart(newCart);
    saveCart(newCart);
    toast({
      title: "Added to Cart",
      description: `${quantity} case(s) added to your order`,
    });
  };

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
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-semibold mb-2">Quick Reorder</h1>
        <p className="text-muted-foreground">Products you've previously ordered</p>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-12">
          <History className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No previous orders</h3>
          <p className="text-muted-foreground mb-6">
            Products you order will appear here for quick reordering
          </p>
          <Button onClick={() => setLocation("/b2b/catalog")} data-testid="button-browse-catalog">
            Browse Catalog
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card key={product.id} className="hover-elevate" data-testid={`reorder-card-${product.id}`}>
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
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Your Price:</span>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        ${product.tierPrice?.toFixed(2) || product.price.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">per bottle</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Package className="h-4 w-4" />
                    <span>${((product.tierPrice || product.price) * product.caseSize).toFixed(2)} per case</span>
                  </div>

                  <div className="pt-2 border-t space-y-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addToCart(product.id, 1)}
                        disabled={product.currentStock < product.caseSize}
                        className="flex-1"
                        data-testid={`button-reorder-1-${product.id}`}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        1 Case
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => addToCart(product.id, 3)}
                        disabled={product.currentStock < product.caseSize * 3}
                        className="flex-1"
                        data-testid={`button-reorder-3-${product.id}`}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        3 Cases
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
      )}
    </div>
  );
}
