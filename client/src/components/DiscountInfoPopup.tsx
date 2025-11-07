import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BadgePercent, X, Sparkles } from "lucide-react";

interface DiscountInfoPopupProps {
  onClose: () => void;
}

export default function DiscountInfoPopup({ onClose }: DiscountInfoPopupProps) {
  const tiers = [
    { name: "Tier 1", bottles: "3-5 bottles", discount: "5% off" },
    { name: "Tier 2", bottles: "6-11 bottles", discount: "10% off" },
    { name: "Tier 3", bottles: "12-23 bottles", discount: "15% off" },
    { name: "Tier 4", bottles: "24+ bottles", discount: "20% off" },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full p-6 relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-2 right-2"
          data-testid="button-close-discount-info"
        >
          <X className="w-4 h-4" />
        </Button>

        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <BadgePercent className="w-8 h-8 text-primary" />
            </div>
          </div>

          <h2 className="text-2xl font-semibold">Volume Discounts</h2>

          <p className="text-sm text-muted-foreground">
            Did you know? The more you purchase, the more you save!
          </p>

          <div className="space-y-2">
            {tiers.map((tier, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="text-left">
                  <p className="font-medium text-sm">{tier.name}</p>
                  <p className="text-xs text-muted-foreground">{tier.bottles}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary">{tier.discount}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 pb-1 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4 text-primary" />
            <p className="italic">Buy the winery and get 100% off!!</p>
            <Sparkles className="w-4 h-4 text-primary" />
          </div>

          <div className="pt-2">
            <Button
              onClick={onClose}
              className="w-full"
              data-testid="button-got-it-discount"
            >
              Great to know!
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
