import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (imageUrl: string, filename: string) => void;
  currentValue?: string;
  title?: string;
  description?: string;
}

export function ImageSelectionDialog({
  open,
  onOpenChange,
  onSelect,
  currentValue,
  title = "Select Product Image",
  description = "Choose an image from your product media library",
}: ImageSelectionDialogProps) {
  const { data: productMediaFiles = [], isLoading } = useQuery<Array<{
    id: string;
    filename: string;
    originalFilename: string;
    mimeType: string;
  }>>({
    queryKey: ['/api/product-media'],
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              Loading product images...
            </div>
          ) : productMediaFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
              <p>No product images found</p>
              <p className="text-sm">Upload images via the Product Media page to see them here</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {productMediaFiles.map((file) => {
                const imageUrl = `/api/media-library/${file.id}/file`;
                const isSelected = currentValue === imageUrl;

                return (
                  <div
                    key={file.id}
                    className={cn(
                      "relative border-2 rounded-md overflow-hidden cursor-pointer hover-elevate transition-all",
                      isSelected ? "border-primary ring-2 ring-primary" : "border-border"
                    )}
                    onClick={() => {
                      onSelect(imageUrl, file.originalFilename);
                      onOpenChange(false);
                    }}
                    data-testid={`image-option-${file.id}`}
                  >
                    <div className="aspect-square bg-muted w-full max-h-48">
                      <img
                        src={imageUrl}
                        alt={file.originalFilename}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                        width="192"
                        height="192"
                      />
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                    <div className="p-2 bg-card">
                      <p className="text-sm font-medium truncate" title={file.originalFilename}>
                        {file.originalFilename}
                      </p>
                      <p className="text-xs text-muted-foreground truncate" title={file.filename}>
                        {file.filename}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
