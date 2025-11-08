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
import { Plus, Edit, Trash2, Eye, EyeOff, Video, GripVertical } from "lucide-react";
import { useState } from "react";
import type { Video as VideoType } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

const videoSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  videoUrl: z.string().url("Must be a valid URL"),
  thumbnailUrl: z.string().url("Must be a valid URL").optional(),
  sortOrder: z.number().min(0),
  isActive: z.boolean(),
});

type VideoFormData = z.infer<typeof videoSchema>;

export default function VideoManager() {
  const { toast } = useToast();
  const [editingVideo, setEditingVideo] = useState<VideoType | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: videos = [], isLoading } = useQuery<VideoType[]>({
    queryKey: ["/api/videos"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: VideoFormData) => {
      return await apiRequest("POST", "/api/videos", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      toast({ title: "Video added successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to add video",
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<VideoFormData> }) => {
      return await apiRequest("PATCH", `/api/videos/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      toast({ title: "Video updated successfully" });
      setIsDialogOpen(false);
      setEditingVideo(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to update video",
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/videos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      toast({ title: "Video deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to delete video",
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (updates: { id: string; sortOrder: number }[]) => {
      return await apiRequest("POST", "/api/videos/reorder", { updates });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      toast({ title: "Video order updated" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to update order",
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const form = useForm<VideoFormData>({
    resolver: zodResolver(videoSchema),
    defaultValues: {
      title: "",
      description: "",
      videoUrl: "",
      thumbnailUrl: "",
      sortOrder: videos.length,
      isActive: true,
    },
  });

  const handleAddVideo = () => {
    setEditingVideo(null);
    form.reset({
      title: "",
      description: "",
      videoUrl: "",
      thumbnailUrl: "",
      sortOrder: videos.length,
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const handleEditVideo = (video: VideoType) => {
    setEditingVideo(video);
    form.reset({
      title: video.title,
      description: video.description || "",
      videoUrl: video.videoUrl,
      thumbnailUrl: video.thumbnailUrl || "",
      sortOrder: video.sortOrder,
      isActive: video.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteVideo = (id: string) => {
    if (confirm("Are you sure you want to delete this video?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggleActive = (video: VideoType) => {
    updateMutation.mutate({
      id: video.id,
      data: { isActive: !video.isActive },
    });
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updates = [
      { id: videos[index].id, sortOrder: index - 1 },
      { id: videos[index - 1].id, sortOrder: index },
    ];
    reorderMutation.mutate(updates);
  };

  const handleMoveDown = (index: number) => {
    if (index === videos.length - 1) return;
    const updates = [
      { id: videos[index].id, sortOrder: index + 1 },
      { id: videos[index + 1].id, sortOrder: index },
    ];
    reorderMutation.mutate(updates);
  };

  const onSubmit = (data: VideoFormData) => {
    if (editingVideo) {
      updateMutation.mutate({ id: editingVideo.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Card className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-medium mb-2">Educational Videos</h2>
          <p className="text-muted-foreground">Manage video content for guests</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddVideo} data-testid="button-add-video">
              <Plus className="w-4 h-4 mr-2" />
              Add Video
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingVideo ? "Edit Video" : "Add New Video"}</DialogTitle>
              <DialogDescription>
                Add educational videos for guests to watch
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter video title" {...field} data-testid="input-video-title" />
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
                          placeholder="Enter video description (optional)" 
                          {...field} 
                          data-testid="input-video-description"
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="videoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Video URL</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://www.youtube.com/watch?v=..." 
                          {...field} 
                          data-testid="input-video-url"
                        />
                      </FormControl>
                      <FormDescription>
                        YouTube, Vimeo, or direct video URL
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="thumbnailUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Thumbnail URL (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://example.com/thumbnail.jpg" 
                          {...field} 
                          data-testid="input-video-thumbnail"
                        />
                      </FormControl>
                      <FormDescription>
                        Custom thumbnail image URL
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
                          type="number" 
                          {...field} 
                          value={field.value ?? 0}
                          onChange={(e) => {
                            const value = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                            field.onChange(isNaN(value) ? 0 : value);
                          }}
                          data-testid="input-video-sort-order"
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
                        <FormLabel className="text-base">Active</FormLabel>
                        <FormDescription>
                          Show this video to guests
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-video-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingVideo(null);
                      form.reset();
                    }}
                    data-testid="button-cancel-video"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-save-video"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? "Saving..."
                      : editingVideo
                      ? "Update Video"
                      : "Add Video"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading videos...
        </div>
      ) : (
        <div className="space-y-4">
          {videos.map((video, index) => (
            <Card key={video.id} className="p-4" data-testid={`card-video-${video.id}`}>
              <div className="flex items-start gap-4">
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0 || reorderMutation.isPending}
                    className="h-6 w-6"
                    data-testid={`button-move-up-${video.id}`}
                  >
                    <GripVertical className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === videos.length - 1 || reorderMutation.isPending}
                    className="h-6 w-6"
                    data-testid={`button-move-down-${video.id}`}
                  >
                    <GripVertical className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-medium">{video.title}</h3>
                      {video.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {video.description}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant={video.isActive ? "default" : "secondary"}
                      className="cursor-pointer ml-4"
                      onClick={() => handleToggleActive(video)}
                      data-testid={`badge-video-status-${video.id}`}
                    >
                      {video.isActive ? (
                        <>
                          <Eye className="w-3 h-3 mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3 mr-1" />
                          Inactive
                        </>
                      )}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <a
                      href={video.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                      data-testid={`link-video-url-${video.id}`}
                    >
                      View Video
                    </a>
                    <span className="text-sm text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">
                      Order: {video.sortOrder}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditVideo(video)}
                    data-testid={`button-edit-video-${video.id}`}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteVideo(video.id)}
                    data-testid={`button-delete-video-${video.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          {videos.length === 0 && (
            <div className="text-center py-12">
              <Video className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No videos yet. Click "Add Video" to get started!</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
