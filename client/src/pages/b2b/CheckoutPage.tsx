import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useB2bProducts, useB2bPublicTiers } from "@/hooks/useB2bProducts";
import { useB2bCheckout } from "@/hooks/useB2bOrders";
import { useB2bAuth } from "@/contexts/B2bAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, CheckCircle2, Package, Loader2, TrendingUp, UserCog } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CartItem {
  quantity: number;
  unit: 'bottle' | 'case';
  productId?: string;
}

function getCart(): Record<string, CartItem | number> {
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
  const [cart] = useState<Record<string, CartItem | number>>(getCart());
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
  
  // Helper to get cart quantity in cases
  const getCartQuantityInCases = (item: CartItem | number, product: any): number => {
    if (typeof item === 'number') return item;
    if (item.unit === 'case') return item.quantity;
    return item.quantity / (product?.caseSize || 1);
  };
  
  // Calculate total cases across ALL categories for Tier 2 qualification
  const totalCases = Object.entries(cart).reduce((sum, [cartKey, item]) => {
    // Extract productId from cartKey
    let productId: string;
    if (typeof item === 'object' && item.productId) {
      productId = item.productId;
    } else if (typeof item === 'object' && item.unit) {
      const parts = cartKey.split('-');
      productId = parts.slice(0, -1).join('-');
    } else {
      productId = cartKey;
    }
    
    const product = products.find((p) => p.id === productId);
    return sum + getCartQuantityInCases(item, product);
  }, 0);
  const qualifiesForTier2 = totalCases >= 5;
  
  // Determine effective tier - upgrade to Tier 2 if cart >= 5 cases
  const effectiveTier = qualifiesForTier2 ? 'Tier 2' : currentTier;

  // Get cart items with product details and apply category-specific tier-based pricing
  const cartItems = Object.entries(cart)
    .map(([cartKey, cartItem]) => {
      // Extract productId from cartKey (format: "productId-unit" or legacy productId)
      let productId: string;
      let unit: 'bottle' | 'case' = 'case';
      
      if (typeof cartItem === 'object' && cartItem.productId) {
        // New format with composite key
        productId = cartItem.productId;
        unit = cartItem.unit;
      } else if (typeof cartItem === 'object' && cartItem.unit) {
        // New format with composite key but need to extract productId from cartKey
        const parts = cartKey.split('-');
        unit = (parts[parts.length - 1] as 'bottle' | 'case');
        productId = parts.slice(0, -1).join('-');
      } else {
        // Legacy format: just productId as key
        productId = cartKey;
        if (typeof cartItem === 'object') {
          unit = cartItem.unit;
        }
      }
      
      const product = products.find((p) => p.id === productId);
      if (!product) return null;
      
      // Normalize cart item to standard format
      let quantity: number;
      if (typeof cartItem === 'number') {
        quantity = cartItem;
        unit = 'case';
      } else {
        quantity = cartItem.quantity;
      }
      
      const quantityInCases = getCartQuantityInCases(cartItem, product);
      const productCategory = product.category || 'unknown';
      
      // Find Tier 2 for this specific product's category
      const tier2ForCategory = tiers?.find(
        t => t.tierName === 'Tier 2' && t.category === productCategory && t.active
      );
      
      // Determine effective price
      let effectivePrice: number;
      
      if (qualifiesForTier2 && tier2ForCategory) {
        // Cart has 5+ total cases - apply Tier 2 discount for this product's category
        const tier2Discount = parseFloat(tier2ForCategory.discountPercentage) / 100;
        effectivePrice = Number(product.price) * (1 - tier2Discount);
      } else {
        // Use customer's base tier price (already calculated by backend per category)
        effectivePrice = product.tierPrice ? Number(product.tierPrice) : Number(product.price);
      }
      
      // Calculate subtotal based on unit
      const subtotal = unit === 'case' 
        ? effectivePrice * product.caseSize * quantity
        : effectivePrice * quantity;
      
      return {
        productId,
        product,
        quantity,
        unit,
        quantityInCases,
        bottlePrice: effectivePrice,
        casePrice: effectivePrice * product.caseSize,
        subtotal,
      };
    })
    .filter(Boolean);

  const totalBottles = cartItems.reduce((sum, item) => sum + (item ? (item.unit === 'bottle' ? item.quantity : item.quantity * item.product.caseSize) : 0), 0);
  const totalAmount = cartItems.reduce((sum, item) => sum + (item?.subtotal || 0), 0);
  
  // Check minimum purchase requirement: at least 1 case equivalent
  // For wine/spirits: 12 bottles = 1 case equivalent
  // For canned products: 1 case = 1 case equivalent
  const meetsMinimumPurchase = totalCases >= 1;

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
      const orderData: any = {
        items: Object.entries(cart).map(([cartKey, cartItem]) => {
          // Extract productId from cartKey (format: "productId-unit" or legacy productId)
          let productId: string;
          if (typeof cartItem === 'object' && cartItem.productId) {
            productId = cartItem.productId;
          } else if (typeof cartItem === 'object' && cartItem.unit) {
            const parts = cartKey.split('-');
            productId = parts.slice(0, -1).join('-');
          } else {
            productId = cartKey;
          }
          
          const product = products.find((p) => p.id === productId);
          if (!product) return null;
          
          // Normalize cart item and convert bottles to cases
          let quantity: number;
          let unit: 'bottle' | 'case' = 'case';
          if (typeof cartItem === 'number') {
            quantity = cartItem;
            unit = 'case';
          } else {
            quantity = cartItem.quantity;
            unit = cartItem.unit;
          }
          
          // Convert bottles to cases for order submission
          const quantityInCases = unit === 'case' 
            ? quantity 
            : quantity / (product?.caseSize || 1);
          
          return {
            productId,
            quantity: Math.ceil(quantityInCases), // Round up to nearest case
          };
        }).filter(Boolean),
      };

      // If admin is impersonating, include customerId for backend validation
      if (adminImpersonating?.customerId) {
        orderData.customerId = adminImpersonating.customerId;
      }

      await placeOrder(orderData);

      toast({
        title: "Order Placed Successfully",
        description: "Your wholesale order has been submitted. You'll receive a confirmation email shortly.",
      });

      // Clear cart and impersonation data
      clearCart();
      if (adminImpersonating) {
        localStorage.removeItem('admin_impersonating');
      }
      
      setTimeout(() => {
        // If admin was impersonating, redirect to admin dashboard
        if (adminImpersonating) {
          window.location.href = '/b2b/admin';
        } else {
          setLocation("/b2b/orders");
        }
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
      {/* Admin Impersonation Banner */}
      {adminImpersonating && (
        <Alert className="mb-6 bg-primary/10 border-primary">
          <UserCog className="h-5 w-5" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <p className="font-medium">Placing Order For: {adminImpersonating.customerName}</p>
              <p className="text-sm text-muted-foreground">
                Admin mode - You are completing checkout for this customer
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
              {qualifiesForTier2 && (
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-md">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm text-primary">Tier 2 Upgrade Applied!</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Your order of {totalCases} cases qualifies for Tier 2 wholesale pricing across all categories{currentTier && ` (upgraded from ${currentTier} pricing)`}.
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

              {!meetsMinimumPurchase && (
                <Alert className="border-destructive bg-destructive/10">
                  <AlertDescription className="text-destructive">
                    <p className="font-medium mb-1">Minimum Purchase Required</p>
                    <p className="text-sm">Your order must contain at least one case equivalent:</p>
                    <ul className="text-sm mt-2 space-y-1 ml-4 list-disc">
                      <li>1 case of any canned product (Beer, Cocktails, Canned Wine, Cider)</li>
                      <li>12 bottles of Wine or Spirits</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={handlePlaceOrder}
                disabled={isPending || !meetsMinimumPurchase}
                data-testid="button-place-order"
              >
                {isPending ? (
                  "Processing..."
                ) : !meetsMinimumPurchase ? (
                  <>
                    <Package className="h-5 w-5 mr-2" />
                    Minimum Not Met
                  </>
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
