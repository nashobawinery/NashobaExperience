import { useState } from "react";
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
} from "lucide-react";
import type { B2bSlideshowSlide } from "@shared/schema";

const iconOptions = [
  { value: "none", label: "No Icon" },
  { value: "Sprout", label: "Sprout (Agriculture)" },
  { value: "Users", label: "Users (Family)" },
  { value: "Award", label: "Award (Quality)" },
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
}

export function B2bSlideshowManager() {
  const { toast } = useToast();
  const [editingSlide, setEditingSlide] = useState<B2bSlideshowSlide | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    highlight: "",
    mediaType: "none" as "none" | "image" | "video",
    mediaLibraryId: "" as string,
    videoId: "" as string,
    iconName: "none",
    sortOrder: 0,
    active: true,
  });

  const { data: slides = [], isLoading } = useQuery<B2bSlideshowSlide[]>({
    queryKey: ["/api/b2b/admin/slideshow/slides"],
  });

  const { data: mediaLibrary = [], isLoading: isLoadingMedia } = useQuery<MediaLibraryItem[]>({
    queryKey: ["/api/b2b/admin/media-library"],
  });

  const { data: videos = [], isLoading: isLoadingVideos } = useQuery<VideoItem[]>({
    queryKey: ["/api/b2b/admin/videos"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<typeof formData, 'mediaLibraryId' | 'videoId'> & { mediaLibraryId: string | null; videoId: string | null }) => {
      return apiRequest("/api/b2b/admin/slideshow/slides", "POST", data);
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
      return apiRequest(`/api/b2b/admin/slideshow/slides/${id}`, "PATCH", data);
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
      return apiRequest(`/api/b2b/admin/slideshow/slides/${id}`, "DELETE");
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
    
    // Prepare data for submission - convert empty strings to null for optional fields
    const submitData = {
      ...formData,
      mediaLibraryId: formData.mediaLibraryId || null,
      videoId: formData.videoId || null,
    };
    
    console.log('Submitting slide data:', JSON.stringify(submitData, null, 2));
    
    if (editingSlide) {
      updateMutation.mutate({ id: editingSlide.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleToggleActive = (slide: B2bSlideshowSlide) => {
    updateMutation.mutate({
      id: slide.id,
      data: { active: !slide.active },
    });
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
                          <ImageIcon className="h-4 w-4" />
                          <span className="text-sm">Image</span>
                        </div>
                      )}
                      {slide.mediaType === "video" && (
                        <div className="flex items-center gap-2">
                          <Video className="h-4 w-4" />
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
              <div>
                <Label htmlFor="mediaLibraryId">Select Image *</Label>
                {isLoadingMedia ? (
                  <div className="text-sm text-muted-foreground p-2">Loading media library...</div>
                ) : mediaLibrary.length === 0 ? (
                  <div className="text-sm text-destructive p-2 border rounded-md">
                    No images available. Upload images in Media Library first.
                  </div>
                ) : (
                  <Select
                    value={formData.mediaLibraryId}
                    onValueChange={(value) => setFormData({ ...formData, mediaLibraryId: value })}
                  >
                    <SelectTrigger data-testid="select-media-library">
                      <SelectValue placeholder="Choose an image from Media Library" />
                    </SelectTrigger>
                    <SelectContent>
                      {mediaLibrary.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.originalFilename}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  Images must be uploaded to Media Library first
                </p>
              </div>
            )}

            {formData.mediaType === "video" && (
              <div>
                <Label htmlFor="videoId">Select Video *</Label>
                {isLoadingVideos ? (
                  <div className="text-sm text-muted-foreground p-2">Loading videos...</div>
                ) : videos.length === 0 ? (
                  <div className="text-sm text-destructive p-2 border rounded-md">
                    No videos available. Add videos in Admin Dashboard first.
                  </div>
                ) : (
                  <Select
                    value={formData.videoId}
                    onValueChange={(value) => setFormData({ ...formData, videoId: value })}
                  >
                    <SelectTrigger data-testid="select-video">
                      <SelectValue placeholder="Choose a video" />
                    </SelectTrigger>
                    <SelectContent>
                      {videos.map((video) => (
                        <SelectItem key={video.id} value={video.id}>
                          {video.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  Videos must be configured in the Videos section first
                </p>
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
