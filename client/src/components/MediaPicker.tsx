import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Check, Image as ImageIcon, Search, X, Video, Film } from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaLibraryItem {
  id: string;
  filename: string;
  originalFilename: string;
  publicUrl: string;
  category: string;
  mimeType?: string;
}

interface VideoItem {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl?: string | null;
}

interface MediaPickerProps {
  value?: string;
  onChange: (value: string) => void;
  mediaType?: "image" | "video" | "all";
  apiEndpoint?: string;
  videoApiEndpoint?: string;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function MediaPicker({
  value,
  onChange,
  mediaType = "image",
  apiEndpoint = "/api/media-library",
  videoApiEndpoint = "/api/b2b/admin/videos",
  placeholder = "Select media...",
  label,
  disabled = false,
  className,
}: MediaPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: mediaLibrary = [], isLoading: isLoadingMedia } = useQuery<MediaLibraryItem[]>({
    queryKey: [apiEndpoint],
    enabled: mediaType === "image" || mediaType === "all",
  });

  const { data: videos = [], isLoading: isLoadingVideos } = useQuery<VideoItem[]>({
    queryKey: [videoApiEndpoint],
    enabled: mediaType === "video" || mediaType === "all",
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
      const matchesSearch = searchQuery === "" || 
        item.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.originalFilename.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  }, [mediaLibrary, searchQuery, categoryFilter]);

  const filteredVideos = useMemo(() => {
    return videos.filter(video => {
      return searchQuery === "" || 
        video.title.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [videos, searchQuery]);

  const selectedMedia = useMemo(() => {
    if (!value) return null;
    
    if (mediaType === "video" || mediaType === "all") {
      const video = videos.find(v => v.id === value);
      if (video) return { type: "video" as const, item: video };
    }
    
    if (mediaType === "image" || mediaType === "all") {
      const media = mediaLibrary.find(m => m.id === value || m.publicUrl === value || `/api/media-library/${m.id}/file` === value);
      if (media) return { type: "image" as const, item: media };
    }
    
    return null;
  }, [value, mediaLibrary, videos, mediaType]);

  const handleSelect = (id: string, type: "image" | "video") => {
    if (type === "image") {
      const item = mediaLibrary.find(m => m.id === id);
      if (item) {
        onChange(`/api/media-library/${id}/file`);
      }
    } else {
      onChange(id);
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange("");
  };

  const isLoading = isLoadingMedia || isLoadingVideos;

  const formatCategoryLabel = (category: string) => {
    return category
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label>{label}</Label>}
      
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1 justify-start text-left font-normal h-auto min-h-10 py-2"
          onClick={() => setIsOpen(true)}
          disabled={disabled}
          data-testid="button-media-picker"
        >
          {selectedMedia ? (
            <div className="flex items-center gap-3">
              {selectedMedia.type === "image" ? (
                <>
                  <img
                    src={(selectedMedia.item as MediaLibraryItem).publicUrl}
                    alt=""
                    className="h-8 w-8 object-cover rounded border flex-shrink-0"
                  />
                  <span className="truncate">{(selectedMedia.item as MediaLibraryItem).originalFilename}</span>
                </>
              ) : (
                <>
                  <div className="h-8 w-8 bg-muted rounded border flex items-center justify-center flex-shrink-0">
                    <Film className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span className="truncate">{(selectedMedia.item as VideoItem).title}</span>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <ImageIcon className="h-4 w-4" />
              <span>{placeholder}</span>
            </div>
          )}
        </Button>
        
        {value && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClear}
            data-testid="button-clear-media"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {mediaType === "video" ? "Select Video" : mediaType === "all" ? "Select Media" : "Select Image"}
            </DialogTitle>
            <DialogDescription>
              {mediaType === "video" 
                ? "Choose a video from your library"
                : mediaType === "all"
                ? "Choose an image or video from your library"
                : "Choose an image from your media library. Use the filters to narrow down your selection."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col sm:flex-row gap-3 py-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by filename..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-media-search"
              />
            </div>
            
            {(mediaType === "image" || mediaType === "all") && categories.length > 0 && (
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-category-filter">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {formatCategoryLabel(category)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <ScrollArea className="flex-1 -mx-6 px-6">
            {isLoading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 pb-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-6 pb-4">
                {(mediaType === "image" || mediaType === "all") && filteredMedia.length > 0 && (
                  <div>
                    {mediaType === "all" && (
                      <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Images ({filteredMedia.length})
                      </h3>
                    )}
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                      {filteredMedia.map((item) => {
                        const imageUrl = `/api/media-library/${item.id}/file`;
                        const isSelected = value === imageUrl || value === item.publicUrl || value === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelect(item.id, "image")}
                            className={cn(
                              "group relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover-elevate",
                              isSelected
                                ? "border-primary ring-2 ring-primary ring-offset-2"
                                : "border-border hover:border-primary/50"
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
                            
                            {isSelected && (
                              <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                                <Check className="h-3 w-3" />
                              </div>
                            )}
                            
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                              <p className="text-white text-xs truncate">
                                {item.originalFilename}
                              </p>
                              {item.category && item.category !== "uncategorized" && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mt-1">
                                  {formatCategoryLabel(item.category)}
                                </Badge>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {(mediaType === "video" || mediaType === "all") && filteredVideos.length > 0 && (
                  <div>
                    {mediaType === "all" && (
                      <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        Videos ({filteredVideos.length})
                      </h3>
                    )}
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                      {filteredVideos.map((video) => {
                        const isSelected = value === video.id;
                        return (
                          <button
                            key={video.id}
                            type="button"
                            onClick={() => handleSelect(video.id, "video")}
                            className={cn(
                              "group relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover-elevate",
                              isSelected
                                ? "border-primary ring-2 ring-primary ring-offset-2"
                                : "border-border hover:border-primary/50"
                            )}
                            data-testid={`video-item-${video.id}`}
                          >
                            {video.thumbnailUrl ? (
                              <img
                                src={video.thumbnailUrl}
                                alt={video.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full bg-muted flex items-center justify-center">
                                <Film className="h-10 w-10 text-muted-foreground" />
                              </div>
                            )}
                            
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                            
                            <div className="absolute top-2 left-2">
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                <Video className="h-2.5 w-2.5 mr-1" />
                                Video
                              </Badge>
                            </div>
                            
                            {isSelected && (
                              <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                                <Check className="h-3 w-3" />
                              </div>
                            )}
                            
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                              <p className="text-white text-xs truncate">
                                {video.title}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {(() => {
                  const showImages = mediaType === "image" || mediaType === "all";
                  const showVideos = mediaType === "video" || mediaType === "all";
                  const noImages = !showImages || filteredMedia.length === 0;
                  const noVideos = !showVideos || filteredVideos.length === 0;
                  
                  if ((showImages && noImages && showVideos && noVideos) ||
                      (showImages && noImages && !showVideos) ||
                      (!showImages && showVideos && noVideos)) {
                    return (
                      <div className="text-center py-12 text-muted-foreground">
                        <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg">No media found</p>
                        <p className="text-sm mt-1">
                          {searchQuery || categoryFilter !== "all" 
                            ? "Try adjusting your search or filters" 
                            : "Upload media in the Media Library section first"}
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function MediaPickerInline({
  value,
  onChange,
  items,
  videos = [],
  mediaType = "image",
  categoryFilter = "all",
  searchQuery = "",
  isLoading = false,
  className,
}: {
  value?: string;
  onChange: (id: string, type: "image" | "video") => void;
  items: MediaLibraryItem[];
  videos?: VideoItem[];
  mediaType?: "image" | "video" | "all";
  categoryFilter?: string;
  searchQuery?: string;
  isLoading?: boolean;
  className?: string;
}) {
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = searchQuery === "" || 
        item.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.originalFilename.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  }, [items, searchQuery, categoryFilter]);

  const filteredVideos = useMemo(() => {
    return videos.filter(video => {
      return searchQuery === "" || 
        video.title.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [videos, searchQuery]);

  const formatCategoryLabel = (category: string) => {
    return category
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3", className)}>
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {(mediaType === "image" || mediaType === "all") && filteredItems.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {filteredItems.map((item) => {
            const imageUrl = `/api/media-library/${item.id}/file`;
            const isSelected = value === imageUrl || value === item.publicUrl || value === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange(item.id, "image")}
                className={cn(
                  "group relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover-elevate",
                  isSelected
                    ? "border-primary ring-2 ring-primary ring-offset-2"
                    : "border-border hover:border-primary/50"
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
                
                {isSelected && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                    <Check className="h-3 w-3" />
                  </div>
                )}
                
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="text-white text-xs truncate">
                    {item.originalFilename}
                  </p>
                  {item.category && item.category !== "uncategorized" && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mt-1">
                      {formatCategoryLabel(item.category)}
                    </Badge>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {(mediaType === "video" || mediaType === "all") && filteredVideos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {filteredVideos.map((video) => {
            const isSelected = value === video.id;
            return (
              <button
                key={video.id}
                type="button"
                onClick={() => onChange(video.id, "video")}
                className={cn(
                  "group relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover-elevate",
                  isSelected
                    ? "border-primary ring-2 ring-primary ring-offset-2"
                    : "border-border hover:border-primary/50"
                )}
                data-testid={`video-item-${video.id}`}
              >
                {video.thumbnailUrl ? (
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Film className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
                
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                
                <div className="absolute top-2 left-2">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    <Video className="h-2.5 w-2.5 mr-1" />
                    Video
                  </Badge>
                </div>
                
                {isSelected && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                    <Check className="h-3 w-3" />
                  </div>
                )}
                
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="text-white text-xs truncate">
                    {video.title}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
