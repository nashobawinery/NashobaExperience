import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Check, Image as ImageIcon, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface MediaLibraryItem {
  id: string;
  filename: string;
  originalFilename: string;
  publicUrl: string;
  category: string;
  mimeType?: string;
}

interface ObjectUploaderProps {
  onComplete?: (imageUrl: string) => void;
  buttonClassName?: string;
  children: ReactNode;
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  disabled?: boolean;
}

export function ObjectUploader({
  onComplete,
  buttonClassName,
  children,
  variant = "default",
  size = "default",
  disabled = false,
}: ObjectUploaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: mediaLibrary = [], isLoading } = useQuery<MediaLibraryItem[]>({
    queryKey: ["/api/media-library"],
    enabled: isOpen,
  });

  const categories = useMemo(() => {
    const cats = new Set<string>();
    mediaLibrary.forEach(item => {
      if (item.category) {
        cats.add(item.category);
      }
    });
    return Array.from(cats).sort();
  }, [mediaLibrary]);

  const filteredMedia = useMemo(() => {
    return mediaLibrary.filter(item => {
      const matchesSearch = !searchQuery || 
        item.originalFilename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.filename.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [mediaLibrary, searchQuery, categoryFilter]);

  const handleSelect = (item: MediaLibraryItem) => {
    const imageUrl = `/api/media-library/${item.id}/file`;
    onComplete?.(imageUrl);
    setIsOpen(false);
  };

  return (
    <div>
      <Button
        onClick={() => setIsOpen(true)}
        className={buttonClassName}
        variant={variant}
        size={size}
        disabled={disabled}
        type="button"
        data-testid="button-select-media"
      >
        {children}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Image</DialogTitle>
            <DialogDescription>
              Choose an image from your media library
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search images..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-media"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                data-testid="select-category"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            )}
          </div>

          <ScrollArea className="flex-1 -mx-6 px-6">
            {isLoading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 pb-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg" />
                ))}
              </div>
            ) : filteredMedia.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
                <ImageIcon className="h-12 w-12 opacity-50" />
                <p>No images found</p>
                <p className="text-sm">
                  {searchQuery ? "Try adjusting your search" : "Upload images in the Media Library section first"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 pb-4">
                {filteredMedia.map((item) => {
                  const imageUrl = `/api/media-library/${item.id}/file`;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item)}
                      className={cn(
                        "group relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover-elevate",
                        "border-border hover:border-primary/50"
                      )}
                      data-testid={`media-item-${item.id}`}
                    >
                      <img
                        src={imageUrl}
                        alt={item.originalFilename}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-xs truncate">{item.originalFilename}</p>
                      </div>
                      {item.category && (
                        <Badge 
                          variant="secondary" 
                          className="absolute top-2 left-2 text-[10px] opacity-80"
                        >
                          {item.category}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
