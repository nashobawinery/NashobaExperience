import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShoppingCart, Heart } from "lucide-react";

interface PreSurveyDialogProps {
  open: boolean;
  hasCartItems: boolean;
  hasFavorites: boolean;
  onPlaceOrder: () => void;
  onEmailFavorites: (email: string) => void;
  onComplete: () => void;
  isPlacingOrder: boolean;
  isEmailingFavorites: boolean;
}

export default function PreSurveyDialog({
  open,
  hasCartItems,
  hasFavorites,
  onPlaceOrder,
  onEmailFavorites,
  onComplete,
  isPlacingOrder,
  isEmailingFavorites,
}: PreSurveyDialogProps) {
  const [wantOrder, setWantOrder] = useState(false);
  const [wantEmail, setWantEmail] = useState(false);
  const [wantNone, setWantNone] = useState(false);
  const [email, setEmail] = useState("");

  const handleOrderChange = (checked: boolean) => {
    setWantOrder(checked);
    if (checked) setWantNone(false);
  };

  const handleEmailChange = (checked: boolean) => {
    setWantEmail(checked);
    if (checked) setWantNone(false);
  };

  const handleNoneChange = (checked: boolean) => {
    setWantNone(checked);
    if (checked) {
      setWantOrder(false);
      setWantEmail(false);
    }
  };

  const handleContinue = async () => {
    if (wantNone) {
      onComplete();
      return;
    }

    let completed = true;

    if (wantOrder && hasCartItems) {
      onPlaceOrder();
      completed = false;
    }

    if (wantEmail && hasFavorites) {
      if (!email.trim()) {
        return;
      }
      onEmailFavorites(email);
      completed = false;
    }

    if (completed || (!wantOrder && !wantEmail)) {
      onComplete();
    }
  };

  const isLoading = isPlacingOrder || isEmailingFavorites;
  const canContinue = wantNone || wantOrder || (wantEmail && email.trim()) || (!wantOrder && !wantEmail);

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-pre-survey">
        <DialogHeader>
          <DialogTitle>Before You Go</DialogTitle>
          <DialogDescription>
            Would you like us to help with anything before completing your tasting experience?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {hasCartItems && (
            <div className="flex items-start space-x-3">
              <Checkbox
                id="order"
                checked={wantOrder}
                onCheckedChange={handleOrderChange}
                disabled={isLoading}
                data-testid="checkbox-order"
              />
              <div className="flex-1">
                <Label htmlFor="order" className="flex items-center gap-2 cursor-pointer">
                  <ShoppingCart className="h-4 w-4" />
                  <span>Place an order for my cart items to pick up at the retail register</span>
                </Label>
              </div>
            </div>
          )}

          {hasFavorites && (
            <div className="space-y-2">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="email"
                  checked={wantEmail}
                  onCheckedChange={handleEmailChange}
                  disabled={isLoading}
                  data-testid="checkbox-email"
                />
                <div className="flex-1">
                  <Label htmlFor="email" className="flex items-center gap-2 cursor-pointer">
                    <Heart className="h-4 w-4" />
                    <span>Email my favorites and notes to me</span>
                  </Label>
                </div>
              </div>
              {wantEmail && (
                <div className="ml-9">
                  <Input
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    data-testid="input-email"
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex items-start space-x-3">
            <Checkbox
              id="none"
              checked={wantNone}
              onCheckedChange={handleNoneChange}
              disabled={isLoading}
              data-testid="checkbox-none"
            />
            <div className="flex-1">
              <Label htmlFor="none" className="cursor-pointer">
                None of the above
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleContinue}
            disabled={!canContinue || isLoading}
            className="w-full"
            data-testid="button-continue"
          >
            {isLoading ? "Processing..." : "Continue to Survey"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
