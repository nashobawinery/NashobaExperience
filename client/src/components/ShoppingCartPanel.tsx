import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Minus, ShoppingCart, Tag, Mail, AlertTriangle, Award } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { getDiscountTiers, getCannedDiscountTiers, getCartDiscounts } from "@/lib/api";
import { useMemo } from "react";

interface CartItem {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  note?: string;
}

interface ShoppingCartPanelProps {
  items: CartItem[];
  triviaCredit: number;
  sessionId?: string;
  onUpdateQuantity?: (id: string, quantity: number) => void;
  onRemoveItem?: (id: string) => void;
  onCheckout?: () => void;
}

export default function ShoppingCartPanel({
  items,
  triviaCredit = 0,
  sessionId,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
}: ShoppingCartPanelProps) {
  const { data: discountTiers } = useQuery({
    queryKey: ['/api/settings/discount_tiers'],
    queryFn: getDiscountTiers,
  });

  const { data: cannedDiscountTiers } = useQuery({
    queryKey: ['/api/settings/canned_discount_tiers'],
    queryFn: getCannedDiscountTiers,
  });

  const { data: cartDiscounts = [] } = useQuery({
    queryKey: ['/api/cart-discounts', sessionId],
    queryFn: () => getCartDiscounts(sessionId!),
    enabled: !!sessionId,
  });

  const wineSpiritsCount = useMemo(() => 
    items
      .filter(item => ['wine', 'spirits'].includes(item.category.toLowerCase()))
      .reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const cannedCount = useMemo(() => 
    items
      .filter(item => ['beer', 'canned_cocktail', 'canned_wine'].includes(item.category.toLowerCase()))
      .reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const calculateDiscount = useMemo(() => (count: number, tiers: typeof discountTiers): number => {
    if (!tiers) {
      return 0;
    }

    const tierList = [tiers.tier4, tiers.tier3, tiers.tier2, tiers.tier1];
    for (const tier of tierList) {
      if (count >= tier.min && count <= tier.max) {
        return tier.discount;
      }
    }
    return 0;
  }, []);

  const bottleSubtotal = useMemo(() => 
    items
      .filter(item => ['wine', 'spirits'].includes(item.category.toLowerCase()))
      .reduce((sum, item) => sum + (item.price * item.quantity), 0),
    [items]
  );

  const cannedSubtotal = useMemo(() => 
    items
      .filter(item => ['beer', 'canned_cocktail', 'canned_wine'].includes(item.category.toLowerCase()))
      .reduce((sum, item) => sum + (item.price * item.quantity), 0),
    [items]
  );

  const subtotal = useMemo(() => 
    items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
    [items]
  );

  const bottleDiscountRate = useMemo(() => 
    calculateDiscount(wineSpiritsCount, discountTiers),
    [calculateDiscount, wineSpiritsCount, discountTiers]
  );

  const cannedDiscountRate = useMemo(() => 
    calculateDiscount(cannedCount, cannedDiscountTiers),
    [calculateDiscount, cannedCount, cannedDiscountTiers]
  );

  const bottleDiscountAmount = useMemo(() => 
    bottleSubtotal * bottleDiscountRate,
    [bottleSubtotal, bottleDiscountRate]
  );

  const cannedDiscountAmount = useMemo(() => 
    cannedSubtotal * cannedDiscountRate,
    [cannedSubtotal, cannedDiscountRate]
  );

  const totalDiscountAmount = useMemo(() => 
    bottleDiscountAmount + cannedDiscountAmount,
    [bottleDiscountAmount, cannedDiscountAmount]
  );

  const achievementDiscountAmount = useMemo(() => 
    cartDiscounts.reduce((sum, discount) => sum + parseFloat(discount.amount), 0),
    [cartDiscounts]
  );

  const afterTierDiscount = useMemo(() => 
    subtotal - totalDiscountAmount,
    [subtotal, totalDiscountAmount]
  );

  const afterAchievementDiscount = useMemo(() => 
    afterTierDiscount - achievementDiscountAmount,
    [afterTierDiscount, achievementDiscountAmount]
  );

  const total = useMemo(() => 
    Math.max(0, afterAchievementDiscount - triviaCredit),
    [afterAchievementDiscount, triviaCredit]
  );

  // Calculate next tier guidance messages
  const getNextBottleTierMessage = (): string | null => {
    if (!discountTiers) return null;
    
    const tiers = [
      { ...discountTiers.tier1, name: 'tier1' },
      { ...discountTiers.tier2, name: 'tier2' },
      { ...discountTiers.tier3, name: 'tier3' },
      { ...discountTiers.tier4, name: 'tier4' }
    ].sort((a, b) => a.min - b.min);

    for (const tier of tiers) {
      if (wineSpiritsCount < tier.min) {
        const bottlesNeeded = tier.min - wineSpiritsCount;
        const discountPercent = (tier.discount * 100).toFixed(0);
        return `Add ${bottlesNeeded} more bottles for ${discountPercent}% off`;
      }
    }
    return null;
  };

  const getNextCannedTierMessage = (): string | null => {
    if (!cannedDiscountTiers) return null;
    
    const tiers = [
      { ...cannedDiscountTiers.tier1, name: 'tier1' },
      { ...cannedDiscountTiers.tier2, name: 'tier2' },
      { ...cannedDiscountTiers.tier3, name: 'tier3' },
      { ...cannedDiscountTiers.tier4, name: 'tier4' }
    ].sort((a, b) => a.min - b.min);

    for (const tier of tiers) {
      if (cannedCount < tier.min) {
        const cannedsNeeded = tier.min - cannedCount;
        const discountPercent = (tier.discount * 100).toFixed(0);
        return `Add ${cannedsNeeded} more cans for ${discountPercent}% off`;
      }
    }
    return null;
  };

  return (
    <Card className="h-full flex flex-col">
      <div className="p-6 border-b">
        <div className="flex items-center gap-3 mb-2">
          <ShoppingCart className="w-6 h-6 text-primary" />
          <h2 className="font-serif text-2xl font-medium">Your Cart</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-4">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">Your cart is empty</p>
            <p className="text-sm text-muted-foreground mt-2">
              Add some products to get started
            </p>
          </div>
        ) : (
          items.map((item) => (
            <Card key={item.id} className="p-4" data-testid={`cart-item-${item.id}`}>
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-medium mb-1">{item.name}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {item.category}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onRemoveItem?.(item.id)}
                      data-testid={`button-remove-${item.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-12 w-12"
                        onClick={() => onUpdateQuantity?.(item.id, Math.max(1, item.quantity - 1))}
                        data-testid={`button-decrease-${item.id}`}
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-5 h-5" />
                      </Button>
                      <span className="w-10 text-center font-medium text-lg" data-testid={`text-quantity-${item.id}`}>
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-12 w-12"
                        onClick={() => onUpdateQuantity?.(item.id, item.quantity + 1)}
                        data-testid={`button-increase-${item.id}`}
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-5 h-5" />
                      </Button>
                    </div>
                    <p className="font-semibold">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {items.length > 0 && (
        <div className="border-t p-6 space-y-4">
          {/* Debug info - always shows when cart has items */}
          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3 border border-blue-200 dark:border-blue-800 text-xs">
            <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">Discount Debug Info:</p>
            <p className="text-blue-700 dark:text-blue-300">
              Bottles: {wineSpiritsCount} ({(bottleDiscountRate * 100).toFixed(0)}%) | 
              Cans: {cannedCount} ({(cannedDiscountRate * 100).toFixed(0)}%) | 
              Tiers: {discountTiers && cannedDiscountTiers ? 'Yes' : 'No'}
            </p>
            {(!discountTiers || !cannedDiscountTiers) && (
              <p className="text-destructive mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Discount tiers not loaded from server
              </p>
            )}
          </div>

          {bottleDiscountRate > 0 && (
            <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-4 h-4 text-green-600" />
                <p className="font-medium text-sm text-green-900 dark:text-green-100">
                  {wineSpiritsCount} bottles: {(bottleDiscountRate * 100).toFixed(0)}% discount applied!
                </p>
              </div>
              {getNextBottleTierMessage() && (
                <p className="text-xs text-green-700 dark:text-green-300">
                  {getNextBottleTierMessage()}
                </p>
              )}
            </div>
          )}

          {cannedDiscountRate > 0 && (
            <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-4 h-4 text-green-600" />
                <p className="font-medium text-sm text-green-900 dark:text-green-100">
                  {cannedCount} cans: {(cannedDiscountRate * 100).toFixed(0)}% discount applied!
                </p>
              </div>
              {getNextCannedTierMessage() && (
                <p className="text-xs text-green-700 dark:text-green-300">
                  {getNextCannedTierMessage()}
                </p>
              )}
            </div>
          )}

          {cartDiscounts.length > 0 && (
            <div className="bg-primary/5 dark:bg-primary/10 rounded-lg p-4 border border-primary/20" data-testid="section-achievement-discounts">
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-5 h-5 text-primary" />
                <p className="font-medium text-sm">Trivia Achievement Rewards</p>
              </div>
              <div className="space-y-2">
                {cartDiscounts.map((discount, index) => (
                  <div 
                    key={discount.id} 
                    className="flex items-center justify-between"
                    data-testid={`achievement-discount-${index}`}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs" data-testid={`badge-discount-label-${index}`}>
                        {discount.label}
                      </Badge>
                    </div>
                    <p className="font-semibold text-primary" data-testid={`text-discount-amount-${index}`}>
                      -${parseFloat(discount.amount).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {triviaCredit > 0 && (
            <div className="bg-chart-2/10 rounded-lg p-4 border border-chart-2/20">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">Trivia Reward</p>
                <p className="font-semibold text-green-600">-${triviaCredit.toFixed(2)}</p>
              </div>
            </div>
          )}

          <Separator />

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span data-testid="text-subtotal">${subtotal.toFixed(2)}</span>
            </div>
            {bottleDiscountRate > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Bottle Discount ({(bottleDiscountRate * 100).toFixed(0)}%)</span>
                <span className="text-green-600" data-testid="text-bottle-discount">-${bottleDiscountAmount.toFixed(2)}</span>
              </div>
            )}
            {cannedDiscountRate > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Canned Discount ({(cannedDiscountRate * 100).toFixed(0)}%)</span>
                <span className="text-green-600" data-testid="text-canned-discount">-${cannedDiscountAmount.toFixed(2)}</span>
              </div>
            )}
            {cartDiscounts.map((discount, index) => (
              <div key={discount.id} className="flex justify-between text-sm" data-testid={`breakdown-achievement-discount-${index}`}>
                <span className="text-muted-foreground">{discount.label}</span>
                <span className="text-primary font-medium" data-testid={`breakdown-discount-amount-${index}`}>-${parseFloat(discount.amount).toFixed(2)}</span>
              </div>
            ))}
            {triviaCredit > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Trivia Reward</span>
                <span className="text-green-600" data-testid="text-trivia-credit">-${triviaCredit.toFixed(2)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span data-testid="text-cart-total">${total.toFixed(2)}</span>
            </div>
          </div>

          <Button 
            className="w-full gap-2" 
            size="lg"
            onClick={onCheckout}
            data-testid="button-checkout"
          >
            <Mail className="w-4 h-4" />
            Email Order to Staff
          </Button>
        </div>
      )}
    </Card>
  );
}
