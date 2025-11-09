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
import { Plus, Edit, Trash2, Eye, EyeOff, AlertTriangle, Lock, Image, Upload } from "lucide-react";
import { useState, useRef } from "react";
import type { SlideshowImage, MediaLibrary } from "@shared/schema";
import { getMediaLibraryUploadUrl, createMediaLibraryFile } from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: images = [], isLoading } = useQuery<SlideshowImage[]>({
    queryKey: ["/api/slideshow-images"],
  });

  const { data: mediaFiles = [] } = useQuery<MediaLibrary[]>({
    queryKey: ["/api/media-library"],
  });

  const imageMediaFiles = mediaFiles.filter(
    (file) => file.mimeType.startsWith("image/")
  );

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/slideshow-images"] });
      toast({ title: "Slide deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete slide", variant: "destructive" });
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
    setUploadPreview(null);
    setIsDialogOpen(true);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      const uploadUrl = await getMediaLibraryUploadUrl();
      
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to cloud storage');
      }

      const baseUrl = uploadUrl.split('?')[0];

      const uploadedFile = await createMediaLibraryFile({
        filename: file.name.replace(/[^a-zA-Z0-9._-]/g, '_'),
        originalFilename: file.name,
        mimeType: file.type,
        fileSize: file.size,
        objectPath: baseUrl,
        publicUrl: baseUrl,
        category: 'slideshow',
        description: 'Slideshow image',
        altText: file.name,
        tags: null,
      });
      
      form.setValue('imageUrl', uploadedFile.publicUrl);
      setUploadPreview(uploadedFile.publicUrl);
      
      queryClient.invalidateQueries({ queryKey: ["/api/media-library"] });
      
      toast({
        title: "Image uploaded successfully",
        description: "Your image has been uploaded to cloud storage",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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
                      <FormLabel>Image</FormLabel>
                      
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                            data-testid="input-file-upload"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="flex-1"
                            data-testid="button-upload-image"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            {isUploading ? "Uploading..." : "Upload New Image"}
                          </Button>
                        </div>

                        {imageMediaFiles.length > 0 && (
                          <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                              <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                              <span className="bg-background px-2 text-muted-foreground">
                                Or select existing
                              </span>
                            </div>
                          </div>
                        )}

                        {imageMediaFiles.length > 0 && (
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={isUploading}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-image" disabled={isUploading}>
                                <SelectValue placeholder="Select from media library" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {imageMediaFiles.map((file) => (
                                <SelectItem key={file.id} value={`/api/media-library/${file.id}/file`}>
                                  <div className="flex items-center gap-2">
                                    <Image className="h-4 w-4" />
                                    {file.filename}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      
                      <FormDescription>
                        Upload a new image or select from your media library
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {(form.watch("imageUrl") || uploadPreview) && (
                  <div className="rounded-lg border p-4 bg-muted/20">
                    <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                    <img
                      src={uploadPreview || form.watch("imageUrl")}
                      alt="Selected slide"
                      className="max-w-full h-auto max-h-48 rounded object-contain"
                    />
                  </div>
                )}

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

      <div className="space-y-2">
        {images.map((image) => (
          <div
            key={image.id}
            className="flex items-center gap-4 p-4 rounded-lg border hover-elevate"
            data-testid={`row-slide-${image.id}`}
          >
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
