import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Mail, X } from "lucide-react";

interface FavoritesInfoPopupProps {
  onClose: () => void;
}

export default function FavoritesInfoPopup({ onClose }: FavoritesInfoPopupProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full p-6 relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-2 right-2"
          data-testid="button-close-favorites-info"
        >
          <X className="w-4 h-4" />
        </Button>

        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Heart className="w-8 h-8 text-primary" />
            </div>
          </div>

          <h2 className="text-2xl font-semibold">Save Your Favorites</h2>

          <div className="space-y-3 text-left">
            <div className="flex gap-3">
              <Heart className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                Press the <span className="font-medium text-foreground">heart button</span> on any product to add it to your favorites list along with your tasting notes.
              </p>
            </div>

            <div className="flex gap-3">
              <Mail className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                At the end of your tasting, visit the <span className="font-medium text-foreground">Profile tab</span> to email your favorites list to yourself.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <Button
              onClick={onClose}
              className="w-full"
              data-testid="button-got-it-favorites"
            >
              Got it!
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
