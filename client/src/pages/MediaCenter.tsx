import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import NashobatvAdmin from "@/components/NashobatvAdmin";
import ToastMenuPrinter from "@/components/ToastMenuPrinter";
import MusicManager from "@/components/MusicManager";
import SpecialEventsManager from "@/components/SpecialEventsManager";
import EventFlyerPrinter from "@/components/EventFlyerPrinter";
import ShelfTalkerPrinter from "@/components/ShelfTalkerPrinter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Monitor,
  Plus,
  Edit,
  Trash2,
  Eye,
  ExternalLink,
  Tv,
  Info,
  MapPin,
  Code,
  Copy,
  Check,
  Printer,
  CalendarDays,
  Music,
  Tag,
  FileText,
} from "lucide-react";

interface Channel {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  channelType: string;
  location: string | null;
  isActive: boolean;
  isEmbeddable: boolean;
  createdAt: string;
}

const CHANNEL_TYPES: Record<string, string> = {
  tv_display: "TV Display",
  info_board: "Info Board",
  iframe_embed: "Website Embed",
};

export default function MediaCenter() {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<"nashobatv" | "menu-printer" | "live-music" | "special-events" | "flyer-printer" | "shelf-talkers">("nashobatv");
  const [flyerMode, setFlyerMode] = useState<"music" | "events">("music");
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editChannel, setEditChannel] = useState<Channel | null>(null);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    channelType: "tv_display",
    location: "",
    isActive: true,
    isEmbeddable: false,
  });

  const { data: channels, isLoading } = useQuery<Channel[]>({
    queryKey: ["/api/nashobatv/channels"],
  });

  useEffect(() => {
    if (channels && channels.length > 0 && !selectedChannelId) {
      const saved = localStorage.getItem("media-center-channel");
      const savedId = saved ? parseInt(saved) : null;
      const found = savedId ? channels.find(c => c.id === savedId) : null;
      setSelectedChannelId(found ? found.id : channels[0].id);
    }
  }, [channels, selectedChannelId]);

  useEffect(() => {
    if (selectedChannelId) {
      localStorage.setItem("media-center-channel", String(selectedChannelId));
    }
  }, [selectedChannelId]);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/nashobatv/channels", data);
      return res.json();
    },
    onSuccess: (newChannel: Channel) => {
      queryClient.invalidateQueries({ queryKey: ["/api/nashobatv/channels"] });
      setShowCreateDialog(false);
      setSelectedChannelId(newChannel.id);
      toast({ title: `Channel "${newChannel.name}" created` });
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to create channel", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      const res = await apiRequest("PUT", `/api/nashobatv/channels/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nashobatv/channels"] });
      setEditChannel(null);
      toast({ title: "Channel updated" });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/nashobatv/channels/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nashobatv/channels"] });
      if (channels && channels.length > 1) {
        const remaining = channels.filter(c => c.id !== selectedChannelId);
        setSelectedChannelId(remaining[0]?.id || null);
      } else {
        setSelectedChannelId(null);
      }
      toast({ title: "Channel deleted" });
    },
  });

  const resetForm = () => {
    setFormData({ name: "", slug: "", description: "", channelType: "tv_display", location: "", isActive: true, isEmbeddable: false });
  };

  const openCreate = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  const openEdit = (channel: Channel) => {
    setFormData({
      name: channel.name,
      slug: channel.slug,
      description: channel.description || "",
      channelType: channel.channelType,
      location: channel.location || "",
      isActive: channel.isActive,
      isEmbeddable: channel.isEmbeddable,
    });
    setEditChannel(channel);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.slug) return;
    if (editChannel) {
      updateMutation.mutate({ id: editChannel.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const selectedChannel = channels?.find(c => c.id === selectedChannelId);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const copyEmbedCode = () => {
    if (!selectedChannel) return;
    const code = `<iframe src="${baseUrl}/display/${selectedChannel.slug}?embed=1" width="100%" height="600" frameborder="0" style="border:none;"></iframe>`;
    navigator.clipboard.writeText(code);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3" data-testid="text-media-center-title">
            <Monitor className="w-7 h-7" />
            Media Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Digital signage, live music, special events, printing tools, and shelf talkers.
          </p>
        </div>
        {activeSection === "nashobatv" && (
          <div className="flex items-center gap-2 flex-wrap">
            {selectedChannel && (
              <Button
                variant="outline"
                onClick={() => window.open(`/display/${selectedChannel.slug}`, "_blank")}
                data-testid="button-open-display"
              >
                <Eye className="w-4 h-4 mr-2" />
                Open Display
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            )}
            <Button onClick={openCreate} data-testid="button-create-channel">
              <Plus className="w-4 h-4 mr-2" />
              New Channel
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-b pb-1">
        <Button
          variant={activeSection === "nashobatv" ? "default" : "ghost"}
          onClick={() => setActiveSection("nashobatv")}
          className="flex items-center gap-2"
          data-testid="button-section-nashobatv"
        >
          <Tv className="w-4 h-4" />
          NashobaTV
        </Button>
        <Button
          variant={activeSection === "menu-printer" ? "default" : "ghost"}
          onClick={() => setActiveSection("menu-printer")}
          className="flex items-center gap-2"
          data-testid="button-section-menu-printer"
        >
          <Printer className="w-4 h-4" />
          Menu Printer
        </Button>
        <Button
          variant={activeSection === "live-music" ? "default" : "ghost"}
          onClick={() => setActiveSection("live-music")}
          className="flex items-center gap-2"
          data-testid="button-section-live-music"
        >
          <Music className="w-4 h-4" />
          Live Music
        </Button>
        <Button
          variant={activeSection === "special-events" ? "default" : "ghost"}
          onClick={() => setActiveSection("special-events")}
          className="flex items-center gap-2"
          data-testid="button-section-special-events"
        >
          <CalendarDays className="w-4 h-4" />
          Special Events
        </Button>
        <Button
          variant={activeSection === "flyer-printer" ? "default" : "ghost"}
          onClick={() => setActiveSection("flyer-printer")}
          className="flex items-center gap-2"
          data-testid="button-section-flyer-printer"
        >
          <FileText className="w-4 h-4" />
          Flyer Printer
        </Button>
        <Button
          variant={activeSection === "shelf-talkers" ? "default" : "ghost"}
          onClick={() => setActiveSection("shelf-talkers")}
          className="flex items-center gap-2"
          data-testid="button-section-shelf-talkers"
        >
          <Tag className="w-4 h-4" />
          Shelf Talkers
        </Button>
      </div>

      {activeSection === "live-music" && (
        <MusicManager />
      )}

      {activeSection === "menu-printer" && (
        <ToastMenuPrinter testIdPrefix="mc" />
      )}

      {activeSection === "special-events" && (
        <SpecialEventsManager />
      )}

      {activeSection === "flyer-printer" && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b pb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFlyerMode("music")}
              className={flyerMode === "music" ? "toggle-elevate toggle-elevated" : ""}
              data-testid="button-flyer-music"
            >
              <Music className="w-4 h-4 mr-1" />
              Music Lineup
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFlyerMode("events")}
              className={flyerMode === "events" ? "toggle-elevate toggle-elevated" : ""}
              data-testid="button-flyer-events"
            >
              <CalendarDays className="w-4 h-4 mr-1" />
              Events
            </Button>
          </div>
          <EventFlyerPrinter mode={flyerMode} />
        </div>
      )}

      {activeSection === "shelf-talkers" && (
        <ShelfTalkerPrinter />
      )}

      {activeSection === "nashobatv" && ((!channels || channels.length === 0) ? (
        <Card className="p-8 text-center">
          <Tv className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Channels Yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first channel to start managing digital signage content.
          </p>
          <Button onClick={openCreate} data-testid="button-create-first-channel">
            <Plus className="w-4 h-4 mr-2" />
            Create Channel
          </Button>
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
              {channels.map(channel => (
                <Button
                  key={channel.id}
                  variant={selectedChannelId === channel.id ? "default" : "outline"}
                  onClick={() => setSelectedChannelId(channel.id)}
                  className="flex items-center gap-2"
                  data-testid={`button-channel-${channel.slug}`}
                >
                  <Tv className="w-4 h-4" />
                  {channel.name}
                  {!channel.isActive && (
                    <Badge variant="secondary">Off</Badge>
                  )}
                </Button>
              ))}
            </div>
          </div>

          {selectedChannel && (
            <Card className="p-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold" data-testid="text-channel-name">{selectedChannel.name}</h3>
                      <Badge variant="outline">{CHANNEL_TYPES[selectedChannel.channelType] || selectedChannel.channelType}</Badge>
                      {selectedChannel.isEmbeddable && <Badge variant="secondary">Embeddable</Badge>}
                      <Badge variant={selectedChannel.isActive ? "default" : "secondary"}>
                        {selectedChannel.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {selectedChannel.description && (
                      <p className="text-sm text-muted-foreground mt-1">{selectedChannel.description}</p>
                    )}
                    {selectedChannel.location && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" /> {selectedChannel.location}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Display URL: <code className="bg-muted px-1 rounded">/display/{selectedChannel.slug}</code>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {selectedChannel.isEmbeddable && (
                    <Button size="icon" variant="ghost" onClick={copyEmbedCode} data-testid="button-copy-embed">
                      {copiedEmbed ? <Check className="w-4 h-4" /> : <Code className="w-4 h-4" />}
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => openEdit(selectedChannel)} data-testid="button-edit-channel">
                    <Edit className="w-4 h-4" />
                  </Button>
                  {channels.length > 1 && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Delete "${selectedChannel.name}" and all its content?`)) {
                          deleteMutation.mutate(selectedChannel.id);
                        }
                      }}
                      data-testid="button-delete-channel"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )}

          {selectedChannel && (
            <NashobatvAdmin channelId={selectedChannel.id} channelSlug={selectedChannel.slug} />
          )}
        </>
      ))}


      <Dialog open={showCreateDialog || !!editChannel} onOpenChange={(v) => { if (!v) { setShowCreateDialog(false); setEditChannel(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editChannel ? "Edit Channel" : "Create Channel"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Channel Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    name,
                    slug: !editChannel ? generateSlug(name) : prev.slug,
                  }));
                }}
                placeholder="e.g., Tasting Room"
                data-testid="input-channel-name"
              />
            </div>
            <div className="space-y-2">
              <Label>URL Slug</Label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: generateSlug(e.target.value) }))}
                placeholder="e.g., tasting-room"
                data-testid="input-channel-slug"
              />
              <p className="text-xs text-muted-foreground">
                Display will be available at /display/{formData.slug || "..."}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="What is this channel for?"
                data-testid="input-channel-description"
              />
            </div>
            <div className="space-y-2">
              <Label>Channel Type</Label>
              <Select value={formData.channelType} onValueChange={(v) => setFormData(prev => ({ ...prev, channelType: v }))}>
                <SelectTrigger data-testid="select-channel-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tv_display">TV Display</SelectItem>
                  <SelectItem value="info_board">Info Board</SelectItem>
                  <SelectItem value="iframe_embed">Website Embed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="e.g., Main Building, Pavilion"
                data-testid="input-channel-location"
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">Display is live when active</p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, isActive: v }))}
                data-testid="switch-channel-active"
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label>Embeddable</Label>
                <p className="text-xs text-muted-foreground">Allow embedding as iframe on website</p>
              </div>
              <Switch
                checked={formData.isEmbeddable}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, isEmbeddable: v }))}
                data-testid="switch-channel-embeddable"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); setEditChannel(null); resetForm(); }} data-testid="button-cancel-channel">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name || !formData.slug || createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-channel"
            >
              {editChannel ? "Save Changes" : "Create Channel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
