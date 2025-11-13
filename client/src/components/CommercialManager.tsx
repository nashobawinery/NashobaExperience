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
import { Plus, Edit, Trash2, Eye, EyeOff, Image } from "lucide-react";
import { useState } from "react";
import type { Commercial, MediaLibrary } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const commercialSchema = z.object({
  imageUrl: z.string().min(1, "Image URL is required (select from media library)"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  sortOrder: z.number().min(0),
  isActive: z.boolean(),
});

type CommercialFormData = z.infer<typeof commercialSchema>;

export default function CommercialManager() {
  const { toast } = useToast();
  const [editingCommercial, setEditingCommercial] = useState<Commercial | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: commercials = [], isLoading } = useQuery<Commercial[]>({
    queryKey: ["/api/commercials"],
  });

  const { data: mediaFiles = [] } = useQuery<MediaLibrary[]>({
    queryKey: ["/api/media-library"],
  });

  const imageMediaFiles = mediaFiles.filter(
    (file) => file.mimeType.startsWith("image/")
  );

  const createMutation = useMutation({
    mutationFn: async (data: CommercialFormData) => {
      const response = await fetch("/api/commercials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create commercial");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commercials"], exact: false });
      toast({ title: "Commercial added successfully" });
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to add commercial", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CommercialFormData> }) => {
      const response = await fetch(`/api/commercials/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update commercial");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commercials"], exact: false });
      toast({ title: "Commercial updated successfully" });
      setIsDialogOpen(false);
      setEditingCommercial(null);
    },
    onError: () => {
      toast({ title: "Failed to update commercial", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/commercials/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete commercial");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commercials"], exact: false });
      toast({ title: "Commercial deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete commercial", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await fetch(`/api/commercials/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!response.ok) throw new Error("Failed to toggle commercial status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commercials"], exact: false });
      toast({ title: "Commercial status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  const form = useForm<CommercialFormData>({
    resolver: zodResolver(commercialSchema),
    defaultValues: {
      imageUrl: "",
      title: "",
      description: "",
      sortOrder: commercials.length,
      isActive: true,
    },
  });

  const onSubmit = (data: CommercialFormData) => {
    if (editingCommercial) {
      updateMutation.mutate({ id: editingCommercial.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (commercial: Commercial) => {
    setEditingCommercial(commercial);
    form.reset({
      imageUrl: commercial.imageUrl,
      title: commercial.title,
      description: commercial.description || "",
      sortOrder: commercial.sortOrder,
      isActive: commercial.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingCommercial(null);
    form.reset({
      imageUrl: "",
      title: "",
      description: "",
      sortOrder: commercials.length,
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return <div>Loading commercials...</div>;
  }

  const activeCommercialCount = commercials.filter(c => c.isActive).length;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Commercials</h3>
          <p className="text-sm text-muted-foreground">
            Manage commercials shown between trivia questions (every 3 questions)
            {activeCommercialCount > 0 && (
              <span className="ml-2 text-primary font-medium">
                ({activeCommercialCount} active)
              </span>
            )}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd} data-testid="button-add-commercial">
              <Plus className="h-4 w-4 mr-2" />
              Add Commercial
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCommercial ? "Edit Commercial" : "Add New Commercial"}
              </DialogTitle>
              <DialogDescription>
                {editingCommercial
                  ? "Update the commercial content and settings"
                  : "Add a new commercial to display between trivia questions"}
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
                      
                      {imageMediaFiles.length > 0 ? (
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-image">
                              <SelectValue placeholder="Select from media library" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {imageMediaFiles.map((file) => (
                              <SelectItem key={file.id} value={`/api/media-library/${file.id}/file`}>
                                <div className="flex items-center gap-2">
                                  <Image className="h-4 w-4" />
                                  {file.filename}
                                  {file.category && (
                                    <span className="text-xs text-muted-foreground">
                                      ({file.category})
                                    </span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm text-muted-foreground py-2">
                          No images in media library. Upload images in the Media Library section first.
                        </p>
                      )}
                      
                      <FormDescription>
                        Select an image from your media library
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {form.watch("imageUrl") && (
                  <div className="rounded-lg border p-4 bg-muted/20">
                    <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                    <img
                      src={form.watch("imageUrl")}
                      alt="Selected commercial"
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
                          placeholder="Tier Discounts Available!"
                          data-testid="input-title"
                        />
                      </FormControl>
                      <FormDescription>
                        The main heading for this commercial
                      </FormDescription>
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
                          placeholder="Enter the commercial description..."
                          rows={6}
                          data-testid="input-description"
                        />
                      </FormControl>
                      <FormDescription>
                        The descriptive text for this commercial
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sort Order</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          data-testid="input-sort-order"
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
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>
                          Toggle to show/hide this commercial
                        </FormDescription>
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
                    data-testid="button-save-commercial"
                  >
                    {editingCommercial ? "Update" : "Add"} Commercial
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {commercials.map((commercial) => (
          <div
            key={commercial.id}
            className="flex items-center gap-4 p-4 rounded-lg border hover-elevate"
            data-testid={`row-commercial-${commercial.id}`}
          >
            {commercial.imageUrl && (
              <img
                src={commercial.imageUrl}
                alt={commercial.title}
                className="w-16 h-16 object-cover rounded"
              />
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium truncate">{commercial.title}</p>
                {commercial.isActive ? (
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
                <Badge variant="outline">Order: {commercial.sortOrder}</Badge>
              </div>
              {commercial.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {commercial.description.substring(0, 100)}...
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  toggleActiveMutation.mutate({ id: commercial.id, isActive: !commercial.isActive })
                }
                title="Toggle active status"
                data-testid={`button-toggle-${commercial.id}`}
              >
                {commercial.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleEdit(commercial)}
                data-testid={`button-edit-${commercial.id}`}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this commercial?")) {
                    deleteMutation.mutate(commercial.id);
                  }
                }}
                data-testid={`button-delete-${commercial.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {commercials.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No commercials yet. Click "Add Commercial" to get started.
          </div>
        )}
      </div>
    </Card>
  );
}
