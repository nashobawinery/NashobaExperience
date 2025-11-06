import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, GripVertical, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { useState } from "react";
import type { SlideshowImage } from "@shared/schema";
import { Alert, AlertDescription } from "@/components/ui/alert";

const imageSchema = z.object({
  filename: z.string().min(1, "Filename is required"),
  caption: z.string().optional(),
  description: z.string().optional(),
  displayOrder: z.number().min(0),
  isActive: z.boolean(),
});

type ImageFormData = z.infer<typeof imageSchema>;

export default function SlideshowImageManager() {
  const { toast } = useToast();
  const [editingImage, setEditingImage] = useState<SlideshowImage | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
      if (!response.ok) throw new Error("Failed to create image");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/slideshow-images"] });
      toast({ title: "Image added successfully" });
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to add image", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ImageFormData> }) => {
      const response = await fetch(`/api/slideshow-images/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update image");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/slideshow-images"] });
      toast({ title: "Image updated successfully" });
      setIsDialogOpen(false);
      setEditingImage(null);
    },
    onError: () => {
      toast({ title: "Failed to update image", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/slideshow-images/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete image");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/slideshow-images"] });
      toast({ title: "Image deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete image", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await fetch(`/api/slideshow-images/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!response.ok) throw new Error("Failed to toggle image status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/slideshow-images"] });
      toast({ title: "Image status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  const form = useForm<ImageFormData>({
    resolver: zodResolver(imageSchema),
    defaultValues: {
      filename: "",
      caption: "",
      description: "",
      displayOrder: images.length,
      isActive: true,
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
      filename: image.filename,
      caption: image.caption || "",
      description: image.description || "",
      displayOrder: image.displayOrder,
      isActive: image.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingImage(null);
    form.reset({
      filename: "",
      caption: "",
      description: "",
      displayOrder: images.length,
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return <div>Loading slideshow images...</div>;
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
            Activate at least one image to display the full slideshow experience.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Slideshow Images</h3>
          <p className="text-sm text-muted-foreground">
            Manage the images shown in the welcome slideshow
            {activeImageCount > 0 && (
              <span className="ml-2 text-primary font-medium">
                ({activeImageCount} active)
              </span>
            )}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd} data-testid="button-add-image">
              <Plus className="h-4 w-4 mr-2" />
              Add Image
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingImage ? "Edit Image" : "Add New Image"}
              </DialogTitle>
              <DialogDescription>
                {editingImage
                  ? "Update the slideshow image details"
                  : "Add a new image to the slideshow"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="filename"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Filename</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="image_name.jpg"
                          data-testid="input-filename"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="caption"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Caption</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Short caption for the image"
                          data-testid="input-caption"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Longer description or context"
                          data-testid="input-description"
                        />
                      </FormControl>
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
                      <FormMessage />
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
                        <div className="text-sm text-muted-foreground">
                          Show this image in the welcome slideshow
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-is-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="flex gap-2 justify-end">
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
                    data-testid="button-save-image"
                  >
                    {editingImage ? "Update" : "Add"} Image
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {images.map((image) => (
          <div
            key={image.id}
            className="flex items-center gap-4 p-4 rounded-lg border hover-elevate"
            data-testid={`row-image-${image.id}`}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">{image.caption || image.filename}</p>
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
              <p className="text-sm text-muted-foreground mt-1">{image.filename}</p>
              {image.description && (
                <p className="text-sm text-muted-foreground mt-1">{image.description}</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  toggleActiveMutation.mutate({ id: image.id, isActive: !image.isActive })
                }
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
                  if (confirm("Are you sure you want to delete this image?")) {
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
            No slideshow images yet. Click "Add Image" to get started.
          </div>
        )}
      </div>
    </Card>
  );
}
