import { useState, useEffect } from "react";
import { useB2bProducts } from "@/hooks/useB2bProducts";
import { useB2bAuth } from "@/contexts/B2bAuthContext";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ShoppingCart, Package, DollarSign, UserCog, ArrowLeft, Grid3X3, List } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ProductDetailModal from "@/components/ProductDetailModal";

// Cart state stored in localStorage
interface CartItem {
  quantity: number;
  unit: 'bottle' | 'case';
}

function getCart(): Record<string, CartItem | number> {
  try {
    const cart = localStorage.getItem("b2b_cart");
    return cart ? JSON.parse(cart) : {};
  } catch {
    return {};
  }
}

function saveCart(cart: Record<string, CartItem | number>) {
  localStorage.setItem("b2b_cart", JSON.stringify(cart));
}

type ViewType = "detailed" | "listing" | "past-orders";

export default function CatalogPage() {
  const { user } = useB2bAuth();
  const { data, isLoading } = useB2bProducts();
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<Record<string, CartItem | number>>(getCart());
  const { toast } = useToast();
  const [adminImpersonating, setAdminImpersonating] = useState<any>(null);
  const [viewType, setViewType] = useState<ViewType>("listing");
  const [quantityInputs, setQuantityInputs] = useState<Record<string, number>>({});
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  const { data: pastOrderItems = [] } = useQuery<any[]>({
    queryKey: ['/api/b2b/customer/past-orders'],
    enabled: viewType === 'past-orders',
  });

  const { data: customerData } = useQuery<{ accountName: string }>({
    queryKey: ['b2b', 'customer', 'info'],
    queryFn: async () => {
      // Check for admin impersonation
      const impersonationData = localStorage.getItem('admin_impersonating');
      let url = "/api/b2b/customer/info";
      
      if (impersonationData) {
        try {
          const { customerId } = JSON.parse(impersonationData);
          if (customerId) {
            url += `?customerId=${encodeURIComponent(customerId)}`;
          }
        } catch {
          // Invalid impersonation data, ignore
        }
      }
      
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) {
        throw new Error("Failed to fetch customer info");
      }
      return response.json();
    },
  });

  const { data: welcomeSettings } = useQuery<{ welcomeStatement: string }>({
    queryKey: ['b2b', 'settings', 'welcome'],
    queryFn: async () => {
      const response = await fetch('/api/b2b/settings/welcome', { credentials: 'include' });
      if (!response.ok) {
        throw new Error("Failed to fetch welcome statement");
      }
      return response.json();
    },
  });

  const products = data?.products || [];
  const tier = data?.tier;
  const storeName = customerData?.accountName || "Wholesale Partner";
  const welcomeStatement = welcomeSettings?.welcomeStatement || "Great Pricing With Supporting Local Agriculture - Thank you";

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

  const addToCart = (productId: string, quantity: number, unit: 'bottle' | 'case' = 'case') => {
    if (quantity < 1) {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a quantity of at least 1",
        variant: "destructive",
      });
      return;
    }
    const newCart = { ...cart };
    const cartItem = newCart[productId];
    
    // If product is in cart and has same unit, add to quantity; otherwise replace
    if (cartItem && typeof cartItem === 'object' && cartItem.unit === unit) {
      cartItem.quantity += quantity;
    } else {
      newCart[productId] = { quantity, unit };
    }
    
    setCart(newCart);
    saveCart(newCart);
    toast({
      title: "Added to Cart",
      description: `${quantity} ${unit}(s) added to your order`,
    });
  };

  const cartItemCount = Object.values(cart).reduce((sum, item) => {
    if (typeof item === 'number') return sum + item;
    return sum + item.quantity;
  }, 0);

  // Calculate discount percentage for a product
  const getDiscountInfo = (product: any) => {
    if (!product.tierPrice) return null;
    const regularPrice = Number(product.price);
    const tierPrice = Number(product.tierPrice);
    const discountPercent = Math.round(((regularPrice - tierPrice) / regularPrice) * 100);
    return {
      discountPercent,
      savings: (regularPrice - tierPrice).toFixed(2)
    };
  };

  const renderDetailedView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredProducts.map((product) => (
        <Card key={product.id} className="hover-elevate cursor-pointer" onClick={() => {
          setSelectedProduct(product);
          setIsDetailModalOpen(true);
        }} data-testid={`product-card-${product.id}`}>
          <CardHeader>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1">
                <CardTitle className="font-serif text-xl mb-1">{product.name}</CardTitle>
                <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
              </div>
              <div className="flex flex-col gap-1 items-end">
                <Badge variant="outline">{product.category}</Badge>
                <Badge variant="secondary" className="text-xs" data-testid={`badge-tier-${product.id}`}>
                  {tier || "Standard"}
                </Badge>
                {getDiscountInfo(product) && (
                  <Badge variant="default" className="bg-green-600 text-xs" data-testid={`badge-discount-${product.id}`}>
                    {getDiscountInfo(product)!.discountPercent}% off
                  </Badge>
                )}
              </div>
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
              <div className="pt-2 border-t space-y-3">
                {(product.category === 'wine' || product.category === 'spirits') ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <Label htmlFor={`bottles-${product.id}`} className="text-xs text-muted-foreground mb-1 block">Bottles</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id={`bottles-${product.id}`}
                              type="number"
                              min="0"
                              value={quantityInputs[`${product.id}-bottle`] || 0}
                              onChange={(e) =>
                                setQuantityInputs({
                                  ...quantityInputs,
                                  [`${product.id}-bottle`]: Math.max(0, parseInt(e.target.value) || 0),
                                })
                              }
                              className="h-8"
                              data-testid={`input-bottles-${product.id}`}
                            />
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                const qty = quantityInputs[`${product.id}-bottle`] || 0;
                                if (qty > 0) {
                                  addToCart(product.id, qty, 'bottle');
                                  setQuantityInputs({ ...quantityInputs, [`${product.id}-bottle`]: 0 });
                                }
                              }}
                              disabled={!product.ignoreInventory && product.stockQuantity < 1 || (quantityInputs[`${product.id}-bottle`] || 0) === 0}
                              style={{ backgroundColor: '#dcfce7', color: '#000000' }}
                              className="hover:brightness-95 disabled:bg-muted disabled:text-muted-foreground"
                              data-testid={`button-add-bottles-${product.id}`}
                            >
                              Bottles
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <Label htmlFor={`cases-${product.id}`} className="text-xs text-muted-foreground mb-1 block">Cases</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id={`cases-${product.id}`}
                              type="number"
                              min="0"
                              value={quantityInputs[`${product.id}-case`] || 0}
                              onChange={(e) =>
                                setQuantityInputs({
                                  ...quantityInputs,
                                  [`${product.id}-case`]: Math.max(0, parseInt(e.target.value) || 0),
                                })
                              }
                              className="h-8"
                              data-testid={`input-cases-${product.id}`}
                            />
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                const qty = quantityInputs[`${product.id}-case`] || 0;
                                if (qty > 0) {
                                  addToCart(product.id, qty, 'case');
                                  setQuantityInputs({ ...quantityInputs, [`${product.id}-case`]: 0 });
                                }
                              }}
                              disabled={!product.ignoreInventory && product.stockQuantity < product.caseSize || (quantityInputs[`${product.id}-case`] || 0) === 0}
                              style={{ backgroundColor: '#dcfce7', color: '#000000' }}
                              className="hover:brightness-95 disabled:bg-muted disabled:text-muted-foreground"
                              data-testid={`button-add-cases-${product.id}`}
                            >
                              Cases
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-center text-muted-foreground">
                      {product.ignoreInventory ? (
                        "In stock"
                      ) : product.stockQuantity >= product.caseSize
                        ? `${Math.floor(product.stockQuantity / product.caseSize)} cases available`
                        : product.stockQuantity > 0
                        ? `${product.stockQuantity} bottle(s) available`
                        : "Out of Stock"}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Label htmlFor={`cases-qty-${product.id}`} className="text-xs text-muted-foreground mb-1 block">Cases</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id={`cases-qty-${product.id}`}
                            type="number"
                            min="0"
                            value={quantityInputs[product.id] || 0}
                            onChange={(e) =>
                              setQuantityInputs({
                                ...quantityInputs,
                                [product.id]: Math.max(0, parseInt(e.target.value) || 0),
                              })
                            }
                            className="h-8"
                            placeholder="0"
                            data-testid={`input-cases-qty-${product.id}`}
                          />
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              const qty = quantityInputs[product.id] || 0;
                              if (qty > 0) {
                                addToCart(product.id, qty);
                                setQuantityInputs({ ...quantityInputs, [product.id]: 0 });
                              }
                            }}
                            disabled={!product.ignoreInventory && product.stockQuantity < product.caseSize || (quantityInputs[product.id] || 0) === 0}
                            style={{ backgroundColor: '#dcfce7', color: '#000000' }}
                            className="hover:brightness-95 disabled:bg-muted disabled:text-muted-foreground"
                            data-testid={`button-add-cases-qty-${product.id}`}
                          >
                            Cases
                          </Button>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-center text-muted-foreground">
                      {product.ignoreInventory ? (
                        "In stock"
                      ) : product.stockQuantity >= product.caseSize
                        ? `${Math.floor(product.stockQuantity / product.caseSize)} cases available`
                        : "Out of Stock"}
                    </p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderListingView = () => (
    <div className="space-y-3">
      {filteredProducts.map((product) => (
        <Card key={product.id} className="hover-elevate cursor-pointer" onClick={() => {
          setSelectedProduct(product);
          setIsDetailModalOpen(true);
        }} data-testid={`product-listing-${product.id}`}>
          <CardContent className="p-4">
            <div className="flex gap-4">
              {product.imageUrl && (
                <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-serif text-lg font-semibold">{product.name}</h3>
                    <Badge variant="secondary" className="text-xs" data-testid={`badge-tier-listing-${product.id}`}>
                      {tier || "Standard"}
                    </Badge>
                    {getDiscountInfo(product) && (
                      <Badge variant="default" className="bg-green-600 text-xs" data-testid={`badge-discount-listing-${product.id}`}>
                        {getDiscountInfo(product)!.discountPercent}% off
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">SKU: {product.sku}</p>
                  <div className="flex gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Retail: </span>
                      <span className="line-through">${Number(product.price).toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Your Price: </span>
                      <span className="font-bold text-primary">
                        ${product.tierPrice ? Number(product.tierPrice).toFixed(2) : Number(product.price).toFixed(2)}/bottle
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 items-end flex-shrink-0">
                  {(product.category === 'wine' || product.category === 'spirits') ? (
                    <>
                      <div className="flex gap-2 items-center">
                        <div className="w-16">
                          <Input
                            type="number"
                            min="0"
                            value={quantityInputs[`${product.id}-bottle`] || 0}
                            onChange={(e) =>
                              setQuantityInputs({
                                ...quantityInputs,
                                [`${product.id}-bottle`]: Math.max(0, parseInt(e.target.value) || 0),
                              })
                            }
                            placeholder="0"
                            className="h-8 text-center text-xs"
                            data-testid={`input-bottles-listing-${product.id}`}
                          />
                        </div>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            const qty = quantityInputs[`${product.id}-bottle`] || 0;
                            if (qty > 0) {
                              addToCart(product.id, qty, 'bottle');
                              setQuantityInputs({ ...quantityInputs, [`${product.id}-bottle`]: 0 });
                            }
                          }}
                          disabled={!product.ignoreInventory && product.stockQuantity < 1 || (quantityInputs[`${product.id}-bottle`] || 0) === 0}
                          style={{ backgroundColor: '#dcfce7', color: '#000000' }}
                          className="hover:brightness-95 disabled:bg-muted disabled:text-muted-foreground"
                          data-testid={`button-add-bottles-listing-${product.id}`}
                        >
                          Bottles
                        </Button>
                      </div>
                      <div className="flex gap-2 items-center">
                        <div className="w-16">
                          <Input
                            type="number"
                            min="0"
                            value={quantityInputs[`${product.id}-case`] || 0}
                            onChange={(e) =>
                              setQuantityInputs({
                                ...quantityInputs,
                                [`${product.id}-case`]: Math.max(0, parseInt(e.target.value) || 0),
                              })
                            }
                            placeholder="0"
                            className="h-8 text-center text-xs"
                            data-testid={`input-cases-listing-${product.id}`}
                          />
                        </div>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            const qty = quantityInputs[`${product.id}-case`] || 0;
                            if (qty > 0) {
                              addToCart(product.id, qty, 'case');
                              setQuantityInputs({ ...quantityInputs, [`${product.id}-case`]: 0 });
                            }
                          }}
                          disabled={!product.ignoreInventory && product.stockQuantity < product.caseSize || (quantityInputs[`${product.id}-case`] || 0) === 0}
                          style={{ backgroundColor: '#dcfce7', color: '#000000' }}
                          className="hover:brightness-95 disabled:bg-muted disabled:text-muted-foreground"
                          data-testid={`button-add-cases-listing-${product.id}`}
                        >
                          Cases
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <div className="w-16">
                        <Input
                          type="number"
                          min="0"
                          value={quantityInputs[product.id] || 0}
                          onChange={(e) =>
                            setQuantityInputs({
                              ...quantityInputs,
                              [product.id]: Math.max(0, parseInt(e.target.value) || 0),
                            })
                          }
                          placeholder="Cases"
                          className="h-8 text-center text-xs"
                          data-testid={`input-cases-listing-qty-${product.id}`}
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          const qty = quantityInputs[product.id] || 0;
                          if (qty > 0) {
                            addToCart(product.id, qty);
                            setQuantityInputs({ ...quantityInputs, [product.id]: 0 });
                          }
                        }}
                        disabled={!product.ignoreInventory && product.stockQuantity < product.caseSize || (quantityInputs[product.id] || 0) === 0}
                        style={{ backgroundColor: '#dcfce7', color: '#000000' }}
                        className="hover:brightness-95 disabled:bg-muted disabled:text-muted-foreground"
                        data-testid={`button-add-cases-listing-qty-${product.id}`}
                      >
                        Cases
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderPastOrdersView = () => (
    <div className="space-y-3">
      {pastOrderItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Previous Orders</h3>
            <p className="text-muted-foreground">Switch to Listing View to browse all products</p>
          </CardContent>
        </Card>
      ) : (
        filteredProducts
          .filter((p) => pastOrderItems.some((item) => item.productId === p.id))
          .map((product) => (
            <Card key={product.id} className="hover-elevate cursor-pointer" onClick={() => {
              setSelectedProduct(product);
              setIsDetailModalOpen(true);
            }} data-testid={`past-order-listing-${product.id}`}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {product.imageUrl && (
                    <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-serif text-lg font-semibold">{product.name}</h3>
                        <Badge variant="secondary" className="text-xs" data-testid={`badge-tier-past-${product.id}`}>
                          {tier || "Standard"}
                        </Badge>
                        {getDiscountInfo(product) && (
                          <Badge variant="default" className="bg-green-600 text-xs" data-testid={`badge-discount-past-${product.id}`}>
                            {getDiscountInfo(product)!.discountPercent}% off
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">SKU: {product.sku}</p>
                      <div className="flex gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Your Price: </span>
                          <span className="font-bold text-primary">
                            ${product.tierPrice ? Number(product.tierPrice).toFixed(2) : Number(product.price).toFixed(2)}/bottle
                          </span>
                        </div>
                        <Badge variant="secondary">Previously Ordered</Badge>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end flex-shrink-0">
                      {(product.category === 'wine' || product.category === 'spirits') ? (
                        <>
                          <div className="flex gap-2 items-center">
                            <div className="w-16">
                              <Input
                                type="number"
                                min="0"
                                value={quantityInputs[`${product.id}-bottle`] || 0}
                                onChange={(e) =>
                                  setQuantityInputs({
                                    ...quantityInputs,
                                    [`${product.id}-bottle`]: Math.max(0, parseInt(e.target.value) || 0),
                                  })
                                }
                                placeholder="0"
                                className="h-8 text-center text-xs"
                                data-testid={`input-bottles-past-${product.id}`}
                              />
                            </div>
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                const qty = quantityInputs[`${product.id}-bottle`] || 0;
                                if (qty > 0) {
                                  addToCart(product.id, qty, 'bottle');
                                  setQuantityInputs({ ...quantityInputs, [`${product.id}-bottle`]: 0 });
                                }
                              }}
                              disabled={!product.ignoreInventory && product.stockQuantity < 1 || (quantityInputs[`${product.id}-bottle`] || 0) === 0}
                              style={{ backgroundColor: '#dcfce7', color: '#000000' }}
                              className="hover:brightness-95 disabled:bg-muted disabled:text-muted-foreground"
                              data-testid={`button-add-bottles-past-${product.id}`}
                            >
                              Bottles
                            </Button>
                          </div>
                          <div className="flex gap-2 items-center">
                            <div className="w-16">
                              <Input
                                type="number"
                                min="0"
                                value={quantityInputs[`${product.id}-case`] || 0}
                                onChange={(e) =>
                                  setQuantityInputs({
                                    ...quantityInputs,
                                    [`${product.id}-case`]: Math.max(0, parseInt(e.target.value) || 0),
                                  })
                                }
                                placeholder="0"
                                className="h-8 text-center text-xs"
                                data-testid={`input-cases-past-${product.id}`}
                              />
                            </div>
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                const qty = quantityInputs[`${product.id}-case`] || 0;
                                if (qty > 0) {
                                  addToCart(product.id, qty, 'case');
                                  setQuantityInputs({ ...quantityInputs, [`${product.id}-case`]: 0 });
                                }
                              }}
                              disabled={!product.ignoreInventory && product.stockQuantity < product.caseSize || (quantityInputs[`${product.id}-case`] || 0) === 0}
                              style={{ backgroundColor: '#dcfce7', color: '#000000' }}
                              className="hover:brightness-95 disabled:bg-muted disabled:text-muted-foreground"
                              data-testid={`button-add-cases-past-${product.id}`}
                            >
                              Cases
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="flex gap-2 items-center">
                          <div className="w-16">
                            <Input
                              type="number"
                              min="0"
                              value={quantityInputs[product.id] || 0}
                              onChange={(e) =>
                                setQuantityInputs({
                                  ...quantityInputs,
                                  [product.id]: Math.max(0, parseInt(e.target.value) || 0),
                                })
                              }
                              placeholder="0"
                              className="h-8 text-center text-xs"
                              data-testid={`input-quantity-past-${product.id}`}
                            />
                          </div>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              const qty = quantityInputs[product.id] || 0;
                              if (qty > 0) {
                                addToCart(product.id, qty);
                                setQuantityInputs({ ...quantityInputs, [product.id]: 0 });
                              }
                            }}
                            disabled={!product.ignoreInventory && product.stockQuantity < product.caseSize || (quantityInputs[product.id] || 0) === 0}
                            style={{ backgroundColor: '#dcfce7', color: '#000000' }}
                            className="hover:brightness-95 disabled:bg-muted disabled:text-muted-foreground"
                            data-testid={`button-add-past-order-${product.id}`}
                          >
                            Cases
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
      )}
    </div>
  );

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

      {/* Welcome Section */}
      <div className="mb-8 p-6 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
        <h1 className="text-3xl font-serif font-semibold mb-2">Welcome, {storeName}!</h1>
        <p className="text-lg text-foreground/80">{welcomeStatement}</p>
      </div>

      {/* Header with search, view toggle, and cart */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
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

        {/* View Toggle */}
        <div className="flex gap-2 border-b">
          <Button
            variant={viewType === "listing" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewType("listing")}
            data-testid="button-view-listing"
            className="flex gap-2"
          >
            <List className="h-4 w-4" />
            Listing View
          </Button>
          <Button
            variant={viewType === "past-orders" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewType("past-orders")}
            data-testid="button-view-past-orders"
            className="flex gap-2"
          >
            <Package className="h-4 w-4" />
            Past Orders
          </Button>
          <Button
            variant={viewType === "detailed" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewType("detailed")}
            data-testid="button-view-detailed"
            className="flex gap-2"
          >
            <Grid3X3 className="h-4 w-4" />
            Detailed View
          </Button>
        </div>
      </div>

      {/* Render appropriate view */}
      {viewType === "detailed" && renderDetailedView()}
      {viewType === "listing" && renderListingView()}
      {viewType === "past-orders" && renderPastOrdersView()}

      {(viewType === "detailed" || viewType === "listing") && filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No products found</h3>
          <p className="text-muted-foreground">Try adjusting your search query</p>
        </div>
      )}

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={isDetailModalOpen}
        tier={typeof tier === 'string' ? tier : tier?.tierName}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedProduct(null);
        }}
        onAddToCart={(quantity: number, unit: 'bottle' | 'case') => {
          if (selectedProduct) {
            addToCart(selectedProduct.id, quantity, unit);
          }
        }}
      />
    </div>
  );
}
