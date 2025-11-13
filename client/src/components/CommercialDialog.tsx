import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { Commercial } from "@shared/schema";

interface CommercialDialogProps {
  commercial: Commercial;
  onClose: () => void;
}

export default function CommercialDialog({ commercial, onClose }: CommercialDialogProps) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-2xl p-0 overflow-hidden"
        data-testid="dialog-commercial"
      >
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm hover-elevate"
            onClick={onClose}
            data-testid="button-close-commercial"
          >
            <X className="h-4 w-4" />
          </Button>

          {commercial.imageUrl && (
            <div className="w-full">
              <img
                src={commercial.imageUrl}
                alt={commercial.title}
                className="w-full h-auto object-cover"
              />
            </div>
          )}

          <div className="p-6 space-y-4">
            <h2 className="text-2xl font-semibold" data-testid="text-commercial-title">
              {commercial.title}
            </h2>
            
            {commercial.description && (
              <p className="text-muted-foreground whitespace-pre-wrap" data-testid="text-commercial-description">
                {commercial.description}
              </p>
            )}

            <Button 
              onClick={onClose}
              className="w-full"
              data-testid="button-continue"
            >
              Continue
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
