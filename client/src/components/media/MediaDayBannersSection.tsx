import { useState, type ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Megaphone, Plus, Pencil, Trash2 } from "lucide-react";

export interface MediaDayBannerRow {
  id: number;
  bannerDate: string;
  label: string;
  isActive: boolean;
}

type BannerForm = { bannerDate: string; label: string; isActive: boolean };

export function MediaDayBannersSection({
  heading,
  description,
  publicPathLabel,
  mediaListUrl,
  publicListUrl,
  addButtonTestId = "button-add-day-banner",
}: {
  heading: string;
  description: ReactNode;
  /** e.g. `/food-trucks` — shown in help text */
  publicPathLabel: string;
  mediaListUrl: string;
  publicListUrl: string;
  addButtonTestId?: string;
}) {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editBanner, setEditBanner] = useState<MediaDayBannerRow | null>(null);
  const [form, setForm] = useState<BannerForm>({ bannerDate: "", label: "", isActive: true });

  const { data: banners = [], isLoading } = useQuery<MediaDayBannerRow[]>({
    queryKey: [mediaListUrl],
  });

  const createMutation = useMutation({
    mutationFn: async (data: BannerForm) => {
      const res = await apiRequest("POST", mediaListUrl, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [mediaListUrl] });
      queryClient.invalidateQueries({ queryKey: [publicListUrl] });
      setShowDialog(false);
      setEditBanner(null);
      setForm({ bannerDate: "", label: "", isActive: true });
      toast({ title: "Day label saved" });
    },
    onError: (e: Error) => toast({ title: "Failed to save", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: BannerForm }) => {
      const res = await apiRequest("PUT", `${mediaListUrl}/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [mediaListUrl] });
      queryClient.invalidateQueries({ queryKey: [publicListUrl] });
      setShowDialog(false);
      setEditBanner(null);
      setForm({ bannerDate: "", label: "", isActive: true });
      toast({ title: "Day label updated" });
    },
    onError: (e: Error) => toast({ title: "Failed to update", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `${mediaListUrl}/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [mediaListUrl] });
      queryClient.invalidateQueries({ queryKey: [publicListUrl] });
      toast({ title: "Day label removed" });
    },
    onError: (e: Error) => toast({ title: "Failed to delete", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setEditBanner(null);
    setForm({ bannerDate: "", label: "", isActive: true });
    setShowDialog(true);
  };

  const openEdit = (b: MediaDayBannerRow) => {
    setEditBanner(b);
    setForm({ bannerDate: b.bannerDate, label: b.label, isActive: b.isActive });
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditBanner(null);
    setForm({ bannerDate: "", label: "", isActive: true });
  };

  const handleSave = () => {
    if (!form.bannerDate.trim() || !form.label.trim()) {
      toast({ title: "Date and label are required", variant: "destructive" });
      return;
    }
    if (editBanner) {
      updateMutation.mutate({ id: editBanner.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  return (
    <>
      <Card className="border-dashed">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex gap-2 min-w-0">
              <Megaphone className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm" data-testid="text-day-banners-heading">
                  {heading}
                </h3>
                <p className="text-xs text-muted-foreground">{description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Public page:{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-[0.7rem]">{publicPathLabel}</code>
                </p>
              </div>
            </div>
            <Button size="sm" variant="secondary" onClick={openCreate} data-testid={addButtonTestId}>
              <Plus className="h-4 w-4 mr-1" /> Add label
            </Button>
          </div>

          {isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : banners.length === 0 ? (
            <p className="text-sm text-muted-foreground">No day labels — the public calendar is unchanged.</p>
          ) : (
            <div className="space-y-2">
              {banners.map((b) => (
                <div
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm"
                  data-testid={`row-day-banner-${b.id}`}
                >
                  <div className="min-w-0">
                    <span className="font-medium">{format(parseISO(b.bannerDate), "MMM d, yyyy")}</span>
                    <span className="text-muted-foreground"> — </span>
                    <span>{b.label}</span>
                    {!b.isActive && (
                      <Badge variant="secondary" className="ml-2">
                        Hidden
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(b)} data-testid={`button-edit-day-banner-${b.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => {
                        if (confirm(`Remove label for ${b.bannerDate}?`)) deleteMutation.mutate(b.id);
                      }}
                      data-testid={`button-delete-day-banner-${b.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={(v) => { if (!v) closeDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editBanner ? "Edit day label" : "Add day label"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pr-1 pb-2">
            <div className="space-y-2">
              <Label>Calendar date *</Label>
              <Input
                type="date"
                value={form.bannerDate}
                onChange={(e) => setForm((p) => ({ ...p, bannerDate: e.target.value }))}
                data-testid="input-day-banner-date"
              />
            </div>
            <div className="space-y-2">
              <Label>Banner text *</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
                placeholder="e.g. Jazz on the Lawn"
                data-testid="input-day-banner-label"
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label>Show on public calendar</Label>
                <p className="text-xs text-muted-foreground">Turn off to hide without deleting.</p>
              </div>
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v }))} data-testid="switch-day-banner-active" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} data-testid="button-cancel-day-banner">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-day-banner">
              {editBanner ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
