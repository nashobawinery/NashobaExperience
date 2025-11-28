import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Image as ImageIcon,
  Video,
  ChevronUp,
  ChevronDown,
  Search,
} from "lucide-react";
import type { B2bSlideshowSlide } from "@shared/schema";
import { MediaPickerInline } from "@/components/MediaPicker";

type B2bSlideshowSlideWithMedia = B2bSlideshowSlide & { mediaUrl?: string | null };

const iconOptions = [
  { value: "none", label: "No Icon" },
  { value: "Logo", label: "Nashoba Logo" },
  { value: "Sprout", label: "Sprout (Agriculture)" },
  { value: "Users", label: "Users (Family)" },
  { value: "Wine", label: "Wine Glass" },
  { value: "Package", label: "Package" },
  { value: "TrendingDown", label: "Trending Down (Pricing)" },
  { value: "Shield", label: "Shield (Quality)" },
  { value: "Heart", label: "Heart" },
  { value: "Star", label: "Star" },
];

interface MediaLibraryItem {
  id: string;
  filename: string;
  originalFilename: string;
  publicUrl: string;
  category: string;
}

interface VideoItem {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl?: string | null;
}

function formatCategoryLabel(category: string) {
  return category
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function addPublicUrlToMedia(items: any[]): MediaLibraryItem[] {
  return items.map(item => ({
    ...item,
    publicUrl: item.publicUrl || `/api/media-library/${item.id}/file`
  }));
}

export function B2bSlideshowManager() {
  const { toast } = useToast();
  const [editingSlide, setEditingSlide] = useState<B2bSlideshowSlide | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [mediaSearchQuery, setMediaSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    highlight: "",
    mediaType: "none" as "none" | "image" | "video",
    mediaLibraryId: "" as string,
    videoId: "" as string,
    additionalMediaIds: [] as string[],
    iconName: "none",
    sortOrder: 0,
    active: true,
  });

  const { data: slides = [], isLoading } = useQuery<B2bSlideshowSlideWithMedia[]>({
    queryKey: ["/api/b2b/admin/slideshow/slides"],
  });

  const { data: mediaLibrary = [], isLoading: isLoadingMedia } = useQuery<MediaLibraryItem[]>({
    queryKey: ["/api/b2b/admin/media-library"],
  });

  const { data: videos = [], isLoading: isLoadingVideos } = useQuery<VideoItem[]>({
    queryKey: ["/api/b2b/admin/videos"],
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

  const createMutation = useMutation({
    mutationFn: async (data: Omit<typeof formData, 'mediaLibraryId' | 'videoId'> & { mediaLibraryId: string | null; videoId: string | null }) => {
      return apiRequest("POST", "/api/b2b/admin/slideshow/slides", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/b2b/admin/slideshow/slides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/b2b/slideshow/slides"] });
      toast({ title: "Success", description: "Slide created successfully" });
      handleCloseDialog();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create slide", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Omit<typeof formData, 'mediaLibraryId' | 'videoId'> & { mediaLibraryId: string | null; videoId: string | null }> }) => {
      return apiRequest("PATCH", `/api/b2b/admin/slideshow/slides/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/b2b/admin/slideshow/slides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/b2b/slideshow/slides"] });
      toast({ title: "Success", description: "Slide updated successfully" });
      handleCloseDialog();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update slide", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/b2b/admin/slideshow/slides/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/b2b/admin/slideshow/slides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/b2b/slideshow/slides"] });
      toast({ title: "Success", description: "Slide deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete slide", variant: "destructive" });
    },
  });

  const handleOpenDialog = (slide?: B2bSlideshowSlide) => {
    if (slide) {
      setEditingSlide(slide);
      setFormData({
        title: slide.title,
        content: slide.content,
        highlight: slide.highlight || "",
        mediaType: slide.mediaType as any,
        mediaLibraryId: slide.mediaLibraryId || "",
        videoId: slide.videoId || "",
        additionalMediaIds: slide.additionalMediaIds || [],
        iconName: slide.iconName || "none",
        sortOrder: slide.sortOrder,
        active: slide.active,
      });
    } else {
      setEditingSlide(null);
      const maxOrder = Math.max(...slides.map(s => s.sortOrder), -1);
      setFormData({
        title: "",
        content: "",
        highlight: "",
        mediaType: "none",
        mediaLibraryId: "",
        videoId: "",
        additionalMediaIds: [],
        iconName: "none",
        sortOrder: maxOrder + 1,
        active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSlide(null);
    setMediaSearchQuery("");
    setCategoryFilter("all");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate media selection
    if (formData.mediaType === "image" && !formData.mediaLibraryId) {
      toast({ 
        title: "Validation Error", 
        description: "Please select an image from the Media Library", 
        variant: "destructive" 
      });
      return;
    }
    
    if (formData.mediaType === "video" && !formData.videoId) {
      toast({ 
        title: "Validation Error", 
        description: "Please select a video", 
        variant: "destructive" 
      });
      return;
    }
    
    // Prepare data for submission - construct mediaUrl like tasting app does
    let mediaUrl = null;
    if (formData.mediaType === "image" && formData.mediaLibraryId) {
      mediaUrl = `/api/media-library/${formData.mediaLibraryId}/file`;
    } else if (formData.mediaType === "video" && formData.videoId) {
      mediaUrl = `/api/videos/${formData.videoId}/stream`;
    }
    
    const submitData = {
      ...formData,
      mediaUrl, // Add the constructed URL
      mediaLibraryId: formData.mediaLibraryId || null,
      videoId: formData.videoId || null,
      additionalMediaIds: formData.mediaType === "image" ? formData.additionalMediaIds : [],
    };
    
    if (editingSlide) {
      updateMutation.mutate({ id: editingSlide.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleToggleActive = (slide: B2bSlideshowSlide) => {
    const data = { active: !slide.active };
    updateMutation.mutate({ id: slide.id, data });
  };

  const handleDelete = (slide: B2bSlideshowSlide) => {
    if (confirm(`Are you sure you want to delete "${slide.title}"?`)) {
      deleteMutation.mutate(slide.id);
    }
  };

  const handleMoveSlide = (slide: B2bSlideshowSlide, direction: "up" | "down") => {
    const currentIndex = slides.findIndex(s => s.id === slide.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= slides.length) return;

    const currentOrder = slides[currentIndex].sortOrder;
    const targetOrder = slides[targetIndex].sortOrder;

    updateMutation.mutate({
      id: slide.id,
      data: { sortOrder: targetOrder },
    });

    updateMutation.mutate({
      id: slides[targetIndex].id,
      data: { sortOrder: currentOrder },
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
          <div>
            <CardTitle className="font-serif">B2B Slideshow Slides</CardTitle>
            <CardDescription>
              Manage the slides shown on the B2B landing page after access code entry
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()} data-testid="button-add-slide">
            <Plus className="h-4 w-4 mr-2" />
            Add Slide
          </Button>
        </CardHeader>
        <CardContent>
          {slides.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg mb-4">No slides found</p>
              <p className="text-sm">Click "Add Slide" to create your first B2B slideshow slide</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Order</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Media</TableHead>
                  <TableHead>Icon</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slides.map((slide, index) => (
                  <TableRow key={slide.id} data-testid={`slide-row-${slide.id}`}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => handleMoveSlide(slide, "up")}
                          disabled={index === 0}
                          data-testid={`button-move-up-${slide.id}`}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => handleMoveSlide(slide, "down")}
                          disabled={index === slides.length - 1}
                          data-testid={`button-move-down-${slide.id}`}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{slide.title}</div>
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {slide.content}
                        </div>
                        {slide.highlight && (
                          <Badge variant="outline" className="mt-1">
                            {slide.highlight}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {slide.mediaType === "image" && (
                        <div className="flex items-center gap-2">
                          {slide.mediaUrl ? (
                            <img 
                              src={slide.mediaUrl} 
                              alt="Thumbnail"
                              className="h-12 w-12 object-cover rounded border"
                            />
                          ) : (
                            <ImageIcon className="h-4 w-4" />
                          )}
                          <span className="text-sm">Image</span>
                        </div>
                      )}
                      {slide.mediaType === "video" && (
                        <div className="flex items-center gap-2">
                          {slide.mediaUrl ? (
                            <video 
                              src={slide.mediaUrl} 
                              className="h-12 w-12 object-cover rounded border"
                            />
                          ) : (
                            <Video className="h-4 w-4" />
                          )}
                          <span className="text-sm">Video</span>
                        </div>
                      )}
                      {slide.mediaType === "none" && (
                        <span className="text-sm text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {slide.iconName && slide.iconName !== "none" ? (
                        <Badge variant="secondary">{slide.iconName}</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={slide.active}
                        onCheckedChange={() => handleToggleActive(slide)}
                        data-testid={`switch-active-${slide.id}`}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenDialog(slide)}
                          data-testid={`button-edit-${slide.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(slide)}
                          data-testid={`button-delete-${slide.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSlide ? "Edit Slide" : "Add New Slide"}</DialogTitle>
            <DialogDescription>
              Configure the slide content and media. The slide will be displayed in a 2-column layout with media (1/3 width) and content (2/3 width).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                data-testid="input-title"
              />
            </div>

            <div>
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={4}
                required
                data-testid="input-content"
              />
            </div>

            <div>
              <Label htmlFor="highlight">Highlight Text (Optional)</Label>
              <Input
                id="highlight"
                value={formData.highlight}
                onChange={(e) => setFormData({ ...formData, highlight: e.target.value })}
                placeholder="e.g., '100% locally grown fruit'"
                data-testid="input-highlight"
              />
            </div>

            <div>
              <Label htmlFor="mediaType">Media Type</Label>
              <Select
                value={formData.mediaType}
                onValueChange={(value: any) => {
                  setFormData({ 
                    ...formData, 
                    mediaType: value,
                    mediaLibraryId: value === "image" ? formData.mediaLibraryId : "",
                    videoId: value === "video" ? formData.videoId : "",
                  });
                }}
              >
                <SelectTrigger data-testid="select-media-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Media</SelectItem>
                  <SelectItem value="image">Image from Media Library</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.mediaType === "image" && (
              <div className="space-y-3">
                <Label>Select Image *</Label>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search images..."
                      value={mediaSearchQuery}
                      onChange={(e) => setMediaSearchQuery(e.target.value)}
                      className="pl-9"
                      data-testid="input-media-search"
                    />
                  </div>
                  
                  {categories.length > 0 && (
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-category-filter">
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

                <MediaPickerInline
                  value={formData.mediaLibraryId}
                  onChange={(id) => setFormData({ ...formData, mediaLibraryId: id })}
                  items={addPublicUrlToMedia(mediaLibrary)}
                  mediaType="image"
                  categoryFilter={categoryFilter}
                  searchQuery={mediaSearchQuery}
                  isLoading={isLoadingMedia}
                />
                
                {formData.mediaLibraryId && (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <img
                      src={`/api/media-library/${formData.mediaLibraryId}/file`}
                      alt="Selected"
                      className="h-10 w-10 object-cover rounded border"
                    />
                    <span className="text-sm flex-1 truncate">
                      {mediaLibrary.find(m => m.id === formData.mediaLibraryId)?.originalFilename}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData({ ...formData, mediaLibraryId: "" })}
                    >
                      Clear
                    </Button>
                  </div>
                )}

                {formData.mediaLibraryId && (
                  <div className="border-t pt-4 mt-4">
                    <Label className="text-base font-medium">Stack Additional Images (Optional)</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Add more images to display in a vertical stack in the left column. Useful when you have longer content.
                    </p>
                    
                    <MediaPickerInline
                      value=""
                      onChange={(id) => {
                        if (id && !formData.additionalMediaIds.includes(id) && id !== formData.mediaLibraryId) {
                          setFormData({ 
                            ...formData, 
                            additionalMediaIds: [...formData.additionalMediaIds, id] 
                          });
                        }
                      }}
                      items={addPublicUrlToMedia(mediaLibrary.filter(m => 
                        m.id !== formData.mediaLibraryId && 
                        !formData.additionalMediaIds.includes(m.id)
                      ))}
                      mediaType="image"
                      categoryFilter={categoryFilter}
                      searchQuery={mediaSearchQuery}
                      isLoading={isLoadingMedia}
                    />

                    {formData.additionalMediaIds.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <Label className="text-sm">Selected Additional Images ({formData.additionalMediaIds.length})</Label>
                        <div className="flex flex-wrap gap-2">
                          {formData.additionalMediaIds.map((id, index) => {
                            const media = mediaLibrary.find(m => m.id === id);
                            return (
                              <div key={id} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                                <Badge variant="outline" className="h-6 w-6 p-0 flex items-center justify-center">
                                  {index + 2}
                                </Badge>
                                <img
                                  src={`/api/media-library/${id}/file`}
                                  alt={media?.originalFilename || "Additional image"}
                                  className="h-10 w-10 object-cover rounded border"
                                />
                                <span className="text-sm truncate max-w-[120px]">
                                  {media?.originalFilename}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => setFormData({ 
                                    ...formData, 
                                    additionalMediaIds: formData.additionalMediaIds.filter(i => i !== id) 
                                  })}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setFormData({ ...formData, additionalMediaIds: [] })}
                          className="mt-2"
                        >
                          Clear All Additional Images
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {formData.mediaType === "video" && (
              <div className="space-y-3">
                <Label>Select Video *</Label>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search videos..."
                    value={mediaSearchQuery}
                    onChange={(e) => setMediaSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="input-video-search"
                  />
                </div>

                <MediaPickerInline
                  value={formData.videoId}
                  onChange={(id) => setFormData({ ...formData, videoId: id })}
                  items={[]}
                  videos={videos}
                  mediaType="video"
                  searchQuery={mediaSearchQuery}
                  isLoading={isLoadingVideos}
                />
                
                {formData.videoId && (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <div className="h-10 w-10 bg-background rounded border flex items-center justify-center flex-shrink-0">
                      <Video className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <span className="text-sm flex-1 truncate">
                      {videos.find(v => v.id === formData.videoId)?.title}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData({ ...formData, videoId: "" })}
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="iconName">Icon (Optional)</Label>
              <Select
                value={formData.iconName}
                onValueChange={(value) => setFormData({ ...formData, iconName: value })}
              >
                <SelectTrigger data-testid="select-icon">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                Optional: Choose an icon to display alongside the content
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                data-testid="switch-dialog-active"
              />
              <Label htmlFor="active">Active (visible on landing page)</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingSlide ? "Update" : "Create"} Slide
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
