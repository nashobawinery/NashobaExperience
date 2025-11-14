import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
        className="max-w-2xl max-h-[85vh] overflow-hidden"
        data-testid="dialog-commercial"
      >
        <DialogTitle className="sr-only">{commercial.title}</DialogTitle>
        <DialogDescription className="sr-only">
          {commercial.description || "Commercial message"}
        </DialogDescription>

        {commercial.imageUrl && (
          <div className="w-full -mx-6 -mt-6 max-h-[50vh] flex items-center justify-center bg-black">
            <img
              src={commercial.imageUrl}
              alt={commercial.title}
              className="w-full h-auto object-contain max-h-[50vh]"
              data-testid="img-commercial"
            />
          </div>
        )}

        <div className="space-y-4">
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
      </DialogContent>
    </Dialog>
  );
}
