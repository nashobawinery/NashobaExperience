import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Minus, ShoppingCart, Tag, Mail } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { getDiscountTiers } from "@/lib/api";

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
  onUpdateQuantity?: (id: string, quantity: number) => void;
  onRemoveItem?: (id: string) => void;
  onCheckout?: () => void;
}

export default function ShoppingCartPanel({
  items,
  triviaCredit = 0,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
}: ShoppingCartPanelProps) {
  const { data: discountTiers } = useQuery({
    queryKey: ['/api/settings/discount_tiers'],
    queryFn: getDiscountTiers,
  });

  const wineSpiritsCount = items
    .filter(item => ['Wine', 'Spirits'].includes(item.category))
    .reduce((sum, item) => sum + item.quantity, 0);

  const calculateDiscount = (count: number): number => {
    if (!discountTiers) {
      return 0; // No discount until tiers are loaded
    }

    // Check tiers in reverse order (highest to lowest) to get best discount
    const tiers = [discountTiers.tier4, discountTiers.tier3, discountTiers.tier2, discountTiers.tier1];
    for (const tier of tiers) {
      if (count >= tier.min && count <= tier.max) {
        return tier.discount;
      }
    }
    return 0;
  };

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountRate = calculateDiscount(wineSpiritsCount);
  const discountAmount = subtotal * discountRate;
  const afterDiscount = subtotal - discountAmount;
  const total = Math.max(0, afterDiscount - triviaCredit);

  // Calculate next tier guidance message
  const getNextTierMessage = (): string | null => {
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
        return `Add ${bottlesNeeded} more for ${discountPercent}% off`;
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
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onUpdateQuantity?.(item.id, Math.max(1, item.quantity - 1))}
                        data-testid={`button-decrease-${item.id}`}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center font-medium" data-testid={`text-quantity-${item.id}`}>
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onUpdateQuantity?.(item.id, item.quantity + 1)}
                        data-testid={`button-increase-${item.id}`}
                      >
                        <Plus className="w-3 h-3" />
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
          {discountRate > 0 && (
            <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-4 h-4 text-green-600" />
                <p className="font-medium text-sm text-green-900 dark:text-green-100">
                  {wineSpiritsCount} bottles: {(discountRate * 100).toFixed(0)}% discount applied!
                </p>
              </div>
              {getNextTierMessage() && (
                <p className="text-xs text-green-700 dark:text-green-300">
                  {getNextTierMessage()}
                </p>
              )}
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
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {discountRate > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount ({(discountRate * 100).toFixed(0)}%)</span>
                <span className="text-green-600">-${discountAmount.toFixed(2)}</span>
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
