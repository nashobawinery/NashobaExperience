import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, Eye, EyeOff, AlertTriangle, Lock, Image, CheckSquare, Square } from "lucide-react";
import { useState } from "react";
import type { SlideshowImage } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MediaPicker } from "@/components/MediaPicker";

const imageSchema = z.object({
  imageUrl: z.string().min(1, "Image URL is required (select from media library)"),
  title: z.string().min(1, "Title is required"),
  contentHtml: z.string().min(1, "Content is required"),
  displayOrder: z.number().min(0),
  isActive: z.boolean(),
  isRequired: z.boolean(),
});

type ImageFormData = z.infer<typeof imageSchema>;

export default function SlideshowImageManager() {
  const { toast } = useToast();
  const [editingImage, setEditingImage] = useState<SlideshowImage | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: images = [], isLoading } = useQuery<SlideshowImage[]>({
    queryKey: ["/api/slideshow-images"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: ImageFormData) => {
      const response = await fetch("/api/slideshow-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create slide");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/slideshow-images"] });
      toast({ title: "Slide added successfully" });
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to add slide", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ImageFormData> }) => {
      const response = await fetch(`/api/slideshow-images/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update slide");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/slideshow-images"] });
      toast({ title: "Slide updated successfully" });
      setIsDialogOpen(false);
      setEditingImage(null);
    },
    onError: () => {
      toast({ title: "Failed to update slide", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/slideshow-images/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete slide");
      return response.json();
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/slideshow-images"] });
      setSelectedIds(prev => prev.filter(id => id !== deletedId));
      toast({ title: "Slide deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete slide", variant: "destructive" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const validIds = ids.filter(id => images.some(img => img.id === id));
      if (validIds.length === 0) throw new Error("No valid slides to delete");
      
      const results = await Promise.all(
        validIds.map(id =>
          fetch(`/api/slideshow-images/${id}`, { method: "DELETE" })
        )
      );
      const failed = results.filter(r => !r.ok);
      if (failed.length > 0) throw new Error(`Failed to delete ${failed.length} slide(s)`);
      return { results, count: validIds.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/slideshow-images"] });
      toast({ title: `Successfully deleted ${data.count} slide(s)` });
      setSelectedIds([]);
    },
    onError: (error) => {
      toast({ 
        title: "Failed to delete selected slides", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await fetch(`/api/slideshow-images/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!response.ok) throw new Error("Failed to toggle slide status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/slideshow-images"] });
      toast({ title: "Slide status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  const form = useForm<ImageFormData>({
    resolver: zodResolver(imageSchema),
    defaultValues: {
      imageUrl: "",
      title: "",
      contentHtml: "",
      displayOrder: images.length,
      isActive: true,
      isRequired: false,
    },
  });

  const onSubmit = (data: ImageFormData) => {
    if (editingImage) {
      updateMutation.mutate({ id: editingImage.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (image: SlideshowImage) => {
    setEditingImage(image);
    form.reset({
      imageUrl: image.imageUrl || "",
      title: image.title || "",
      contentHtml: image.contentHtml || "",
      displayOrder: image.displayOrder,
      isActive: image.isActive,
      isRequired: image.isRequired,
    });
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingImage(null);
    form.reset({
      imageUrl: "",
      title: "",
      contentHtml: "",
      displayOrder: images.length,
      isActive: true,
      isRequired: false,
    });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return <div>Loading slideshow...</div>;
  }

  const activeImageCount = images.filter(img => img.isActive).length;
  const hasNoActiveImages = activeImageCount === 0 && images.length > 0;

  return (
    <Card className="p-6">
      {hasNoActiveImages && (
        <Alert className="mb-6 border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive">
            <strong>Warning:</strong> No active slideshow images. Guests will see a simplified welcome message. 
            Activate at least one slide to display the full slideshow experience.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Welcome Slideshow</h3>
          <p className="text-sm text-muted-foreground">
            Manage slides shown in the welcome experience
            {activeImageCount > 0 && (
              <span className="ml-2 text-primary font-medium">
                ({activeImageCount} active)
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm(`Delete ${selectedIds.length} selected slide(s)?`)) {
                  bulkDeleteMutation.mutate(selectedIds);
                }
              }}
              disabled={bulkDeleteMutation.isPending}
              data-testid="button-delete-selected"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected ({selectedIds.length})
            </Button>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAdd} data-testid="button-add-slide">
                <Plus className="h-4 w-4 mr-2" />
                Add Slide
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingImage ? "Edit Slide" : "Add New Slide"}
              </DialogTitle>
              <DialogDescription>
                {editingImage
                  ? "Update the slide content and settings"
                  : "Add a new slide to the welcome slideshow"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <MediaPicker
                        value={field.value}
                        onChange={field.onChange}
                        mediaType="image"
                        label="Select Image"
                        placeholder="Choose an image for this slide"
                      />
                      <FormDescription>
                        Select an image from your media library. Upload images in the Media Library section.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Welcome to Nashoba Valley Winery!"
                          data-testid="input-title"
                        />
                      </FormControl>
                      <FormDescription>
                        The main heading displayed on this slide
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="contentHtml"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Enter the slide content..."
                          rows={8}
                          data-testid="input-content"
                        />
                      </FormControl>
                      <FormDescription>
                        The text content for this slide. You can use simple HTML if needed.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="displayOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Order</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          data-testid="input-display-order"
                        />
                      </FormControl>
                      <FormDescription>
                        Lower numbers appear first (0, 1, 2...)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isRequired"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <FormLabel>Required Slide</FormLabel>
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <FormDescription>
                          Required slides cannot be disabled and must always be shown
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-is-required"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel>Active in Slideshow</FormLabel>
                        <FormDescription>
                          {form.watch("isRequired")
                            ? "This slide is required and will always be shown"
                            : "Toggle to show/hide this slide in the welcome experience"}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={form.watch("isRequired")}
                          data-testid="switch-is-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex gap-2 justify-end pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-save-slide"
                  >
                    {editingImage ? "Update" : "Add"} Slide
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="space-y-2">
        {images.map((image) => (
          <div
            key={image.id}
            className="flex items-center gap-4 p-4 rounded-lg border hover-elevate"
            data-testid={`row-slide-${image.id}`}
          >
            <Checkbox
              checked={selectedIds.includes(image.id)}
              onCheckedChange={(checked) => {
                if (checked) {
                  setSelectedIds([...selectedIds, image.id]);
                } else {
                  setSelectedIds(selectedIds.filter(id => id !== image.id));
                }
              }}
              data-testid={`checkbox-select-${image.id}`}
            />
            {image.imageUrl && (
              <img
                src={image.imageUrl}
                alt={image.title || "Slide"}
                className="w-16 h-16 object-cover rounded"
              />
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium truncate">{image.title || "Untitled Slide"}</p>
                {image.isRequired && (
                  <Badge variant="outline" className="gap-1">
                    <Lock className="h-3 w-3" />
                    Required
                  </Badge>
                )}
                {image.isActive ? (
                  <Badge variant="default" className="gap-1">
                    <Eye className="h-3 w-3" />
                    Active
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <EyeOff className="h-3 w-3" />
                    Inactive
                  </Badge>
                )}
                <Badge variant="outline">Order: {image.displayOrder}</Badge>
              </div>
              {image.contentHtml && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {image.contentHtml.substring(0, 100)}...
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  toggleActiveMutation.mutate({ id: image.id, isActive: !image.isActive })
                }
                disabled={image.isRequired}
                title={image.isRequired ? "Required slides cannot be disabled" : "Toggle active status"}
                data-testid={`button-toggle-${image.id}`}
              >
                {image.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleEdit(image)}
                data-testid={`button-edit-${image.id}`}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this slide?")) {
                    deleteMutation.mutate(image.id);
                  }
                }}
                data-testid={`button-delete-${image.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {images.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No slides yet. Click "Add Slide" to get started.
          </div>
        )}
      </div>
    </Card>
  );
}
