import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useB2bProducts, useB2bPublicTiers } from "@/hooks/useB2bProducts";
import { useB2bAuth } from "@/contexts/B2bAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, Loader2, TrendingUp, UserCog } from "lucide-react";

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

export default function CartPage() {
  const [, setLocation] = useLocation();
  const { user } = useB2bAuth();
  const { data, isLoading, isError } = useB2bProducts();
  const { data: tiers } = useB2bPublicTiers();
  const [cart, setCart] = useState<Record<string, number>>(getCart());
  const [adminImpersonating, setAdminImpersonating] = useState<any>(null);

  const products = data?.products || [];
  const currentTier = data?.tier;
  
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
    localStorage.removeItem('b2b_cart');
    window.location.href = '/b2b/admin';
  };
  
  // Get Tier 2 for auto-upgrade at 5+ cases
  const tier2 = tiers?.find(t => t.tierName === 'Tier 2');

  // Calculate total cases first to determine if Tier 2 upgrade applies
  const totalCases = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const qualifiesForTier2 = totalCases >= 5;
  
  // Determine effective tier - upgrade to Tier 2 if cart >= 5 cases
  const effectiveTier = qualifiesForTier2 && tier2 ? tier2.tierName : currentTier;
  const tier2Discount = tier2 ? parseFloat(tier2.discountPercentage) / 100 : 0;
  
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
        product,
        quantity,
        effectivePrice,
        subtotal: effectivePrice * product.caseSize * quantity,
      };
    })
    .filter(Boolean);

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      const newCart = { ...cart };
      delete newCart[productId];
      setCart(newCart);
      saveCart(newCart);
    } else {
      const newCart = { ...cart, [productId]: newQuantity };
      setCart(newCart);
      saveCart(newCart);
    }
  };

  const removeItem = (productId: string) => {
    const newCart = { ...cart };
    delete newCart[productId];
    setCart(newCart);
    saveCart(newCart);
  };

  const totalAmount = cartItems.reduce((sum, item) => sum + (item?.subtotal || 0), 0);

  const handleCheckout = () => {
    setLocation("/b2b/checkout");
  };

  // Show loading state while products are being fetched
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Loading cart...</p>
      </div>
    );
  }

  // Show error state if products failed to load
  if (isError) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <p className="text-destructive mb-4">Failed to load cart information</p>
        <Button onClick={() => setLocation("/b2b/catalog")}>Back to Catalog</Button>
      </div>
    );
  }

  // Only show empty cart AFTER products have loaded
  if (cartItems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-12">
          <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-serif font-semibold mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground mb-6">Add some products to get started</p>
          <Button onClick={() => setLocation("/b2b/catalog")} data-testid="button-browse-catalog">
            Browse Catalog
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Admin Impersonation Banner */}
      {adminImpersonating && (
        <Alert className="mb-6 bg-primary/10 border-primary">
          <UserCog className="h-5 w-5" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <p className="font-medium">Placing Order For: {adminImpersonating.customerName}</p>
              <p className="text-sm text-muted-foreground">
                Admin mode - You are managing the cart for this customer
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

      <Button
        variant="ghost"
        onClick={() => setLocation("/b2b/catalog")}
        className="mb-4"
        data-testid="button-back-to-catalog"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Continue Shopping
      </Button>

      <h1 className="text-3xl font-serif font-semibold mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cartItems.map((item) => {
            if (!item) return null;
            const { product, quantity, effectivePrice, subtotal } = item;

            return (
              <Card key={product.id} data-testid={`cart-item-${product.id}`}>
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    {product.imageUrl && (
                      <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg mb-1">{product.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">SKU: {product.sku}</p>
                      <div className="flex items-center gap-4 mb-3">
                        <span className="text-sm">
                          ${effectivePrice.toFixed(2)} × {product.caseSize} bottles
                        </span>
                        <span className="font-medium">
                          = ${(effectivePrice * product.caseSize).toFixed(2)}/case
                        </span>
                        {qualifiesForTier2 && (
                          <Badge variant="secondary" className="text-xs">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            Tier 2 Pricing
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateQuantity(product.id, quantity - 1)}
                            data-testid={`button-decrease-${product.id}`}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(e) => updateQuantity(product.id, parseInt(e.target.value) || 0)}
                            className="w-20 text-center"
                            data-testid={`input-quantity-${product.id}`}
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateQuantity(product.id, quantity + 1)}
                            data-testid={`button-increase-${product.id}`}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <span className="text-sm text-muted-foreground">cases</span>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(product.id)}
                          className="text-destructive"
                          data-testid={`button-remove-${product.id}`}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-semibold">${subtotal.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{quantity} case(s)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="font-serif">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {qualifiesForTier2 && tier2 && currentTier && (
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-md">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm text-primary">Tier 2 Upgrade Applied!</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Your order of {totalCases} cases qualifies for {tier2.discountPercentage}% wholesale pricing (upgraded from {currentTier} pricing).
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pricing Tier:</span>
                  <Badge variant={qualifiesForTier2 ? "default" : "secondary"} data-testid="text-tier">
                    {effectiveTier}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Cases:</span>
                  <span className="font-medium" data-testid="text-total-cases">{totalCases}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Bottles:</span>
                  <span className="font-medium">
                    {cartItems.reduce((sum, item) => sum + (item ? item.quantity * item.product.caseSize : 0), 0)}
                  </span>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between mb-4">
                  <span className="text-lg font-semibold">Total Amount:</span>
                  <span className="text-2xl font-bold text-primary" data-testid="text-total-amount">
                    ${totalAmount.toFixed(2)}
                  </span>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleCheckout}
                  data-testid="button-proceed-to-checkout"
                >
                  Proceed to Checkout
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                All orders are subject to availability and final approval
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
