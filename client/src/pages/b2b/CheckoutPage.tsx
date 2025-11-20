import { useState } from "react";
import { useLocation } from "wouter";
import { useB2bProducts } from "@/hooks/useB2bProducts";
import { useB2bPublicTiers } from "@/hooks/useB2bTiers";
import { useB2bCheckout } from "@/hooks/useB2bOrders";
import { useB2bAuth } from "@/contexts/B2bAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2, Package, Loader2, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function getCart(): Record<string, number> {
  try {
    const cart = localStorage.getItem("b2b_cart");
    return cart ? JSON.parse(cart) : {};
  } catch {
    return {};
  }
}

function clearCart() {
  localStorage.removeItem("b2b_cart");
}

export default function CheckoutPage() {
  const [, setLocation] = useLocation();
  const { user } = useB2bAuth();
  const { data, isLoading, isError } = useB2bProducts();
  const { data: tiers } = useB2bPublicTiers();
  const { mutateAsync: placeOrder, isPending } = useB2bCheckout();
  const { toast } = useToast();
  const [cart] = useState<Record<string, number>>(getCart());

  const products = data?.products || [];
  const currentTier = data?.tier;
  
  // Get Tier 2 for auto-upgrade at 5+ cases
  const tier2 = tiers?.find(t => t.tierName === 'Tier 2');
  
  // Calculate total cases first to determine if Tier 2 upgrade applies
  const totalCases = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const qualifiesForTier2 = totalCases >= 5;
  const tier2Discount = tier2 ? parseFloat(tier2.discountPercentage) / 100 : 0;
  
  // Determine effective tier - upgrade to Tier 2 if cart >= 5 cases
  const effectiveTier = qualifiesForTier2 && tier2 ? tier2.tierName : currentTier;

  // Get cart items with product details and apply tier-based pricing
  const cartItems = Object.entries(cart)
    .map(([productId, quantity]) => {
      const product = products.find((p) => p.id === productId);
      if (!product) return null;
      
      // Apply Tier 2 discount if qualified, otherwise use product's tier price
      let effectivePrice = product.tierPrice || product.price;
      if (qualifiesForTier2 && tier2) {
        // Apply Tier 2 discount to base price
        effectivePrice = product.price * (1 - tier2Discount);
      }
      
      return {
        productId,
        product,
        quantity,
        bottlePrice: effectivePrice,
        casePrice: effectivePrice * product.caseSize,
        subtotal: effectivePrice * product.caseSize * quantity,
      };
    })
    .filter(Boolean);

  const totalBottles = cartItems.reduce((sum, item) => sum + (item ? item.quantity * item.product.caseSize : 0), 0);
  const totalAmount = cartItems.reduce((sum, item) => sum + (item?.subtotal || 0), 0);

  // Show loading state while products are being fetched
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Loading checkout...</p>
      </div>
    );
  }

  // Show error state if products failed to load
  if (isError) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <p className="text-destructive mb-4">Failed to load product information</p>
        <Button onClick={() => setLocation("/b2b/catalog")}>Back to Catalog</Button>
      </div>
    );
  }

  // Only redirect to catalog if cart is empty AFTER products have loaded
  if (cartItems.length === 0) {
    setLocation("/b2b/catalog");
    return null;
  }

  const handlePlaceOrder = async () => {
    try {
      const orderData = {
        items: Object.entries(cart).map(([productId, quantity]) => ({
          productId,
          quantity,
        })),
      };

      await placeOrder(orderData);

      toast({
        title: "Order Placed Successfully",
        description: "Your wholesale order has been submitted. You'll receive a confirmation email shortly.",
      });

      // Clear cart and redirect
      clearCart();
      setTimeout(() => {
        setLocation("/b2b/orders");
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Order Failed",
        description: error.message || "Failed to place order",
        variant: "destructive",
      });
    }
  };

  if (cartItems.length === 0) {
    setLocation("/b2b/catalog");
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Button
        variant="ghost"
        onClick={() => setLocation("/b2b/cart")}
        className="mb-4"
        data-testid="button-back-to-cart"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Cart
      </Button>

      <h1 className="text-3xl font-serif font-semibold mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order Review */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif">Order Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cartItems.map((item) => {
                if (!item) return null;
                const { product, quantity, bottlePrice, casePrice, subtotal } = item;

                return (
                  <div key={product.id} className="flex justify-between items-start py-3 border-b last:border-0">
                    <div className="flex-1">
                      <h4 className="font-medium mb-1">{product.name}</h4>
                      <p className="text-sm text-muted-foreground mb-2">SKU: {product.sku}</p>
                      <div className="text-sm space-y-1">
                        <p>Quantity: {quantity} case(s) × {product.caseSize} bottles = {quantity * product.caseSize} bottles</p>
                        <p>Price: ${bottlePrice.toFixed(2)}/bottle × {product.caseSize} = ${casePrice.toFixed(2)}/case</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${subtotal.toFixed(2)}</p>
                    </div>
                  </div>
                );
              })}

              <Separator className="my-4" />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Cases:</span>
                  <span className="font-medium">{totalCases}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Bottles:</span>
                  <span className="font-medium">{totalBottles}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Information */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="font-serif">Delivery Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>Business:</strong> {user?.accountName}</p>
                <p><strong>Email:</strong> {user?.email}</p>
                {user?.salesRep && (
                  <p><strong>Sales Rep:</strong> {user.salesRep}</p>
                )}
                <p className="text-muted-foreground mt-4">
                  Order will be prepared and you will be contacted for delivery coordination.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary & Place Order */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="font-serif">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {qualifiesForTier2 && tier2 && (
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-md">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm text-primary">Tier 2 Upgrade Applied!</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Your order of {totalCases} cases qualifies for {tier2.discountPercentage}% wholesale pricing.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pricing Tier:</span>
                  <Badge variant={qualifiesForTier2 ? "default" : "secondary"} data-testid="text-checkout-tier">
                    {effectiveTier}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Cases:</span>
                  <span className="font-medium">{totalCases}</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">${totalAmount.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Total:</span>
                  <span className="text-2xl font-bold text-primary" data-testid="text-checkout-total">
                    ${totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handlePlaceOrder}
                disabled={isPending}
                data-testid="button-place-order"
              >
                {isPending ? (
                  "Processing..."
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Place Order
                  </>
                )}
              </Button>

              <div className="pt-4 border-t">
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Package className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <p>
                    Your order will be reviewed and you'll receive a confirmation email with delivery details.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
