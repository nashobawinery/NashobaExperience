import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  ArrowLeft, 
  Plus, 
  Edit2, 
  Trash2, 
  FolderOpen, 
  Tag,
  X,
  Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { SupportCategory } from "@shared/schema";

export default function SupportCategoriesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<SupportCategory | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newTag, setNewTag] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    icon: "",
    color: "",
    tags: [] as string[],
    sortOrder: 0,
    isActive: true,
    notifyEmail: "",
  });
  const [emailDrafts, setEmailDrafts] = useState<Record<string, string>>({});
  const [defaultEmailDraft, setDefaultEmailDraft] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: categories = [], isLoading } = useQuery<SupportCategory[]>({
    queryKey: ["/api/admin/support/categories"],
  });

  const { data: settings = [] } = useQuery<Array<{ settingKey: string; settingValue: string | null }>>({
    queryKey: ["/api/admin/support/settings"],
  });
  const savedDefaultEmail = settings.find((setting) => setting.settingKey === "default_notify_email")?.settingValue ?? "";
  const defaultEmail = defaultEmailDraft ?? savedDefaultEmail;

  const createMutation = useMutation({
    mutationFn: async (data: Omit<typeof formData, "notifyEmail"> & { notifyEmail: string | null }) => {
      return apiRequest("POST", "/api/admin/support/categories", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/categories"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Category created" });
    },
    onError: () => {
      toast({ title: "Failed to create category", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Omit<typeof formData, "notifyEmail"> & { notifyEmail: string | null } }) => {
      return apiRequest("PATCH", `/api/admin/support/categories/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/categories"] });
      setIsDialogOpen(false);
      setEditingCategory(null);
      resetForm();
      toast({ title: "Category updated" });
    },
    onError: () => {
      toast({ title: "Failed to update category", variant: "destructive" });
    },
  });

  const defaultEmailMutation = useMutation({
    mutationFn: async (value: string) => {
      return apiRequest("PUT", "/api/admin/support/settings/default_notify_email", { value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/settings"] });
      setDefaultEmailDraft(null);
      toast({ title: "Default mailbox saved" });
    },
    onError: () => {
      toast({ title: "Failed to save default mailbox", variant: "destructive" });
    },
  });

  const categoryEmailMutation = useMutation({
    mutationFn: async ({ id, notifyEmail }: { id: string; notifyEmail: string | null }) => {
      return apiRequest("PATCH", `/api/admin/support/categories/${id}`, { notifyEmail });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/categories"] });
      toast({ title: "Category mailbox saved" });
    },
    onError: () => {
      toast({ title: "Failed to save category mailbox", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/support/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/categories"] });
      setDeleteId(null);
      toast({ title: "Category deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete category", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      description: "",
      icon: "",
      color: "",
      tags: [],
      sortOrder: 0,
      isActive: true,
      notifyEmail: "",
    });
    setNewTag("");
  };

  const openEditDialog = (category: SupportCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      icon: category.icon || "",
      color: category.color || "",
      tags: category.tags || [],
      sortOrder: category.sortOrder || 0,
      isActive: category.isActive ?? true,
      notifyEmail: category.notifyEmail || "",
    });
    setNewTag("");
    setIsDialogOpen(true);
  };

  const addTag = () => {
    const tag = newTag.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tagToRemove) });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const payload = { ...formData, slug, notifyEmail: formData.notifyEmail.trim() || null };
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/support">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Support Categories
              </h1>
              <p className="text-sm text-muted-foreground">
                Add categories and set the email for each one. AI sends a clear match to that mailbox, sends several possible matches to each of those mailboxes, and sends an unclear message to the default mailbox.
              </p>
            </div>
          </div>
          <Button onClick={() => { resetForm(); setEditingCategory(null); setIsDialogOpen(true); }} data-testid="button-add-category">
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>
      </header>

      <main className="p-4 max-w-4xl mx-auto space-y-4">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Default mailbox</CardTitle>
            <p className="text-sm text-muted-foreground">
              Unclear tickets, and any selected category without its own email, are sent here.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                value={defaultEmail}
                onChange={(e) => setDefaultEmailDraft(e.target.value)}
                placeholder="name@nashobawinery.com, other@nashobawinery.com"
                className="pl-9"
                data-testid="input-default-notify-email"
              />
            </div>
            <Button
              type="button"
              onClick={() => defaultEmailMutation.mutate(defaultEmail.trim())}
              disabled={defaultEmailMutation.isPending || defaultEmail.trim() === savedDefaultEmail.trim()}
              data-testid="button-save-default-notify-email"
            >
              Save default
            </Button>
          </CardContent>
        </Card>
        {isLoading ? (
          <div className="text-center p-8 text-muted-foreground">Loading...</div>
        ) : categories.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No categories yet</p>
              <p className="text-sm">Create categories to organize tickets and help AI classify incoming requests</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {categories.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map((category) => (
              <Card key={category.id} data-testid={`category-${category.id}`}>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div 
                        className="h-8 w-8 rounded flex items-center justify-center text-white"
                        style={{ backgroundColor: category.color || "#6b7280" }}
                      >
                        <FolderOpen className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base">{category.name}</CardTitle>
                          {!category.isActive && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                        {category.description && (
                          <p className="text-sm text-muted-foreground">{category.description}</p>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <Input
                            type="text"
                            value={emailDrafts[category.id] ?? category.notifyEmail ?? ""}
                            onChange={(e) => setEmailDrafts((prev) => ({ ...prev, [category.id]: e.target.value }))}
                            onBlur={(e) => {
                              const next = e.target.value.trim();
                              const current = (category.notifyEmail ?? "").trim();
                              if (next === current) return;
                              categoryEmailMutation.mutate({ id: category.id, notifyEmail: next || null });
                            }}
                            placeholder="one@nashobawinery.com, two@nashobawinery.com"
                            data-testid={`input-category-email-${category.id}`}
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={
                              categoryEmailMutation.isPending ||
                              (emailDrafts[category.id] ?? category.notifyEmail ?? "").trim() === (category.notifyEmail ?? "").trim()
                            }
                            onClick={() => {
                              const next = (emailDrafts[category.id] ?? category.notifyEmail ?? "").trim();
                              categoryEmailMutation.mutate({ id: category.id, notifyEmail: next || null });
                            }}
                            data-testid={`button-save-category-email-${category.id}`}
                          >
                            Save
                          </Button>
                        </div>
                        {category.tags && category.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {category.tags.slice(0, 5).map((tag, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                <Tag className="h-3 w-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                            {category.tags.length > 5 && (
                              <Badge variant="outline" className="text-xs">
                                +{category.tags.length - 5} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEditDialog(category)} data-testid={`button-edit-category-${category.id}`}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteId(category.id)} data-testid={`button-delete-category-${category.id}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
            <DialogDescription>
              Add a category and the email that should receive those tickets. You can change the name, description, and email later.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Name</Label>
              <Input
                id="category-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Reservations, Wine Club, Spam"
                required
                data-testid="input-category-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-slug">Slug (URL-friendly)</Label>
              <Input
                id="category-slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="reservations"
                data-testid="input-category-slug"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-notify-email">Notification emails</Label>
              <Input
                id="category-notify-email"
                type="text"
                value={formData.notifyEmail}
                onChange={(e) => setFormData({ ...formData, notifyEmail: e.target.value })}
                placeholder="one@nashobawinery.com, two@nashobawinery.com"
                data-testid="input-category-notify-email"
              />
              <p className="text-xs text-muted-foreground">Separate multiple addresses with a comma. Leave blank to use the default mailbox.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-description">Description</Label>
              <Textarea
                id="category-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this category..."
                rows={2}
                data-testid="input-category-description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-tags">AI Classification Tags</Label>
              <p className="text-xs text-muted-foreground">Keywords/phrases to help AI categorize incoming support requests (e.g., for Spam: "unsubscribe", "promotional", "newsletter")</p>
              <div className="flex gap-2">
                <Input
                  id="category-tags"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a keyword or phrase..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  data-testid="input-category-tags"
                />
                <Button type="button" variant="outline" onClick={addTag} data-testid="button-add-tag">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-destructive"
                        data-testid={`button-remove-tag-${idx}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category-color">Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="category-color"
                    type="color"
                    value={formData.color || "#6b7280"}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-12 h-9 p-1"
                    data-testid="input-category-color"
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="#6b7280"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category-order">Sort Order</Label>
                <Input
                  id="category-order"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                  data-testid="input-category-order"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="category-isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-category-active"
              />
              <Label htmlFor="category-isActive">Active</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-category">
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this category? Articles and tickets in this category will become uncategorized.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} data-testid="button-confirm-delete-category">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
