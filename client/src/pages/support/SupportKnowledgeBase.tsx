import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  Plus, 
  Edit2, 
  Trash2, 
  BookOpen, 
  Globe, 
  Search,
  Check,
  X,
  RefreshCw,
  Loader2,
  FileText,
  FolderOpen,
  Tag,
  Eye,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { SupportCannedResponse, SupportWebSource, SupportCategory, SupportArticle, SupportTag } from "@shared/schema";

function CannedResponsesTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingResponse, setEditingResponse] = useState<SupportCannedResponse | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    answer: "",
    keywords: "",
    category: "",
    priority: 0,
    isActive: true,
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: responses = [], isLoading } = useQuery<SupportCannedResponse[]>({
    queryKey: ["/api/admin/support/canned-responses"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/admin/support/canned-responses", {
        ...data,
        keywords: data.keywords.split(",").map(k => k.trim()).filter(Boolean),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/canned-responses"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Canned response created" });
    },
    onError: () => {
      toast({ title: "Failed to create canned response", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      return apiRequest("PATCH", `/api/admin/support/canned-responses/${id}`, {
        ...data,
        keywords: data.keywords.split(",").map(k => k.trim()).filter(Boolean),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/canned-responses"] });
      setIsDialogOpen(false);
      setEditingResponse(null);
      resetForm();
      toast({ title: "Canned response updated" });
    },
    onError: () => {
      toast({ title: "Failed to update canned response", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/support/canned-responses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/canned-responses"] });
      setDeleteId(null);
      toast({ title: "Canned response deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete canned response", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      answer: "",
      keywords: "",
      category: "",
      priority: 0,
      isActive: true,
    });
  };

  const openEditDialog = (response: SupportCannedResponse) => {
    setEditingResponse(response);
    setFormData({
      title: response.title,
      answer: response.answer,
      keywords: response.keywords?.join(", ") || "",
      category: response.category || "",
      priority: response.priority || 0,
      isActive: response.isActive ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingResponse) {
      updateMutation.mutate({ id: editingResponse.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Canned Responses</h2>
          <p className="text-sm text-muted-foreground">Pre-written responses for common questions</p>
        </div>
        <Button onClick={() => { resetForm(); setEditingResponse(null); setIsDialogOpen(true); }} data-testid="button-add-canned">
          <Plus className="h-4 w-4 mr-2" />
          Add Response
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center p-8 text-muted-foreground">Loading...</div>
      ) : responses.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No canned responses yet</p>
            <p className="text-sm">Add pre-written responses to help the AI answer common questions</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {responses.map((response) => (
            <Card key={response.id} data-testid={`canned-response-${response.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{response.title}</CardTitle>
                      {!response.isActive && (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-600">Inactive</Badge>
                      )}
                    </div>
                    {response.category && (
                      <Badge variant="outline" className="mt-1">{response.category}</Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEditDialog(response)} data-testid={`button-edit-${response.id}`}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteId(response.id)} data-testid={`button-delete-${response.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">{response.answer}</p>
                {response.keywords && response.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {response.keywords.map((keyword, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{keyword}</Badge>
                    ))}
                  </div>
                )}
                {response.usageCount > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Used {response.usageCount} times
                    {response.lastUsedAt && ` · Last used ${format(new Date(response.lastUsedAt), "MMM d, yyyy")}`}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingResponse ? "Edit Canned Response" : "Add Canned Response"}</DialogTitle>
            <DialogDescription>
              Create pre-written responses for common customer questions
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Hours of Operation"
                required
                data-testid="input-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="answer">Response Content</Label>
              <Textarea
                id="answer"
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                placeholder="The response that will be used by the AI..."
                rows={5}
                required
                data-testid="input-answer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="keywords">Keywords (comma-separated)</Label>
              <Input
                id="keywords"
                value={formData.keywords}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                placeholder="hours, open, close, schedule"
                data-testid="input-keywords"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="General, Events, Products"
                  data-testid="input-category"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  data-testid="input-priority"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-active"
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save">
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Canned Response</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this canned response? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} data-testid="button-confirm-delete">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function WebSourcesTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<SupportWebSource | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    url: "",
    content: "",
    isActive: true,
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: sources = [], isLoading } = useQuery<SupportWebSource[]>({
    queryKey: ["/api/admin/support/web-sources"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/admin/support/web-sources", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/web-sources"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Web source created" });
    },
    onError: () => {
      toast({ title: "Failed to create web source", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      return apiRequest("PATCH", `/api/admin/support/web-sources/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/web-sources"] });
      setIsDialogOpen(false);
      setEditingSource(null);
      resetForm();
      toast({ title: "Web source updated" });
    },
    onError: () => {
      toast({ title: "Failed to update web source", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/support/web-sources/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/web-sources"] });
      setDeleteId(null);
      toast({ title: "Web source deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete web source", variant: "destructive" });
    },
  });

  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const fetchMutation = useMutation({
    mutationFn: async (id: string) => {
      setFetchingId(id);
      const response = await apiRequest("POST", `/api/admin/support/web-sources/${id}/fetch`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/web-sources"] });
      setFetchingId(null);
      toast({ title: "Content fetched", description: `Retrieved ${data.contentLength?.toLocaleString() || 0} characters` });
    },
    onError: (error: any) => {
      setFetchingId(null);
      toast({ title: "Failed to fetch content", description: error?.message || "Could not retrieve page content", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      url: "",
      content: "",
      isActive: true,
    });
  };

  const openEditDialog = (source: SupportWebSource) => {
    setEditingSource(source);
    setFormData({
      title: source.title,
      url: source.url || "",
      content: source.content || "",
      isActive: source.isActive ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSource) {
      updateMutation.mutate({ id: editingSource.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Web Sources</h2>
          <p className="text-sm text-muted-foreground">Website content used to train the AI</p>
        </div>
        <Button onClick={() => { resetForm(); setEditingSource(null); setIsDialogOpen(true); }} data-testid="button-add-source">
          <Plus className="h-4 w-4 mr-2" />
          Add Source
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center p-8 text-muted-foreground">Loading...</div>
      ) : sources.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No web sources yet</p>
            <p className="text-sm">Add website pages to help the AI provide accurate information</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sources.map((source) => (
            <Card key={source.id} data-testid={`web-source-${source.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                      <CardTitle className="text-base truncate">{source.title}</CardTitle>
                      {!source.isActive && (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-600">Inactive</Badge>
                      )}
                    </div>
                    <a 
                      href={source.url || "#"} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline truncate block mt-1"
                    >
                      {source.url || "No URL"}
                    </a>
                  </div>
                  <div className="flex gap-1">
                    {source.url && (
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => fetchMutation.mutate(source.id)}
                        disabled={fetchingId === source.id}
                        title="Fetch content from URL"
                        data-testid={`button-fetch-source-${source.id}`}
                      >
                        {fetchingId === source.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => openEditDialog(source)} data-testid={`button-edit-source-${source.id}`}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteId(source.id)} data-testid={`button-delete-source-${source.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {source.lastFetchedAt && (
                  <p className="text-xs text-muted-foreground mb-2">
                    Last fetched: {format(new Date(source.lastFetchedAt), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                )}
                {source.content ? (
                  <p className="text-sm text-muted-foreground line-clamp-2">{source.content}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No content yet - click the refresh icon to fetch</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSource ? "Edit Web Source" : "Add Web Source"}</DialogTitle>
            <DialogDescription>
              Add website content to help the AI provide accurate information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="source-title">Title</Label>
              <Input
                id="source-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., About Us Page"
                required
                data-testid="input-source-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source-url">URL</Label>
              <Input
                id="source-url"
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://nashobawinery.com/about"
                required
                data-testid="input-source-url"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source-content">Content (extracted or summary)</Label>
              <Textarea
                id="source-content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Paste the relevant content from this page..."
                rows={6}
                data-testid="input-source-content"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="source-isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-source-active"
              />
              <Label htmlFor="source-isActive">Active</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-source">
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Web Source</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this web source? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} data-testid="button-confirm-delete-source">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CategoriesTab() {
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
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: categories = [], isLoading } = useQuery<SupportCategory[]>({
    queryKey: ["/api/admin/support/categories"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
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
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
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
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: { ...formData, slug } });
    } else {
      createMutation.mutate({ ...formData, slug });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Categories</h2>
          <p className="text-sm text-muted-foreground">Organize articles into categories</p>
        </div>
        <Button onClick={() => { resetForm(); setEditingCategory(null); setIsDialogOpen(true); }} data-testid="button-add-category">
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center p-8 text-muted-foreground">Loading...</div>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No categories yet</p>
            <p className="text-sm">Create categories to organize your articles</p>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
            <DialogDescription>
              Categories help organize tickets, route requests to agents, and allow AI to classify incoming messages
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Name</Label>
              <Input
                id="category-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Getting Started"
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
                placeholder="getting-started"
                data-testid="input-category-slug"
              />
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
              <p className="text-xs text-muted-foreground">Keywords/phrases to help AI categorize incoming support requests</p>
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
              Are you sure you want to delete this category? Articles in this category will become uncategorized.
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

function TagsTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<SupportTag | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    color: "",
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: tags = [], isLoading } = useQuery<SupportTag[]>({
    queryKey: ["/api/admin/support/tags"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/admin/support/tags", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/tags"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Tag created" });
    },
    onError: () => {
      toast({ title: "Failed to create tag", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      return apiRequest("PATCH", `/api/admin/support/tags/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/tags"] });
      setIsDialogOpen(false);
      setEditingTag(null);
      resetForm();
      toast({ title: "Tag updated" });
    },
    onError: () => {
      toast({ title: "Failed to update tag", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/support/tags/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/tags"] });
      setDeleteId(null);
      toast({ title: "Tag deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete tag", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      color: "",
    });
  };

  const openEditDialog = (tag: SupportTag) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      slug: tag.slug,
      color: tag.color || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (editingTag) {
      updateMutation.mutate({ id: editingTag.id, data: { ...formData, slug } });
    } else {
      createMutation.mutate({ ...formData, slug });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Tags</h2>
          <p className="text-sm text-muted-foreground">Label articles with tags for better organization</p>
        </div>
        <Button onClick={() => { resetForm(); setEditingTag(null); setIsDialogOpen(true); }} data-testid="button-add-tag">
          <Plus className="h-4 w-4 mr-2" />
          Add Tag
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center p-8 text-muted-foreground">Loading...</div>
      ) : tags.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No tags yet</p>
            <p className="text-sm">Create tags to label and filter articles</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center gap-1 rounded-full px-3 py-1.5 border"
              style={{ backgroundColor: tag.color ? `${tag.color}20` : undefined, borderColor: tag.color || undefined }}
              data-testid={`tag-${tag.id}`}
            >
              <Tag className="h-3 w-3" style={{ color: tag.color || undefined }} />
              <span className="text-sm font-medium">{tag.name}</span>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-5 w-5 ml-1" 
                onClick={() => openEditDialog(tag)}
                data-testid={`button-edit-tag-${tag.id}`}
              >
                <Edit2 className="h-3 w-3" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-5 w-5" 
                onClick={() => setDeleteId(tag.id)}
                data-testid={`button-delete-tag-${tag.id}`}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTag ? "Edit Tag" : "Add Tag"}</DialogTitle>
            <DialogDescription>
              Tags help users find related articles
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tag-name">Name</Label>
              <Input
                id="tag-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Wine Selection"
                required
                data-testid="input-tag-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tag-slug">Slug</Label>
              <Input
                id="tag-slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="wine-selection"
                data-testid="input-tag-slug"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tag-color">Color</Label>
              <div className="flex gap-2">
                <Input
                  id="tag-color"
                  type="color"
                  value={formData.color || "#6b7280"}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-12 h-9 p-1"
                  data-testid="input-tag-color"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#6b7280"
                  className="flex-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-tag">
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tag</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this tag? It will be removed from all articles.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} data-testid="button-confirm-delete-tag">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ArticlesTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<SupportArticle | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    content: "",
    summary: "",
    categoryId: "",
    status: "draft" as "draft" | "published" | "archived",
    isPublic: false,
    isFeatured: false,
    searchKeywords: "",
    priority: 0,
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: articles = [], isLoading } = useQuery<SupportArticle[]>({
    queryKey: ["/api/admin/support/articles"],
  });

  const { data: categories = [] } = useQuery<SupportCategory[]>({
    queryKey: ["/api/admin/support/categories"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/admin/support/articles", {
        ...data,
        searchKeywords: data.searchKeywords.split(",").map(k => k.trim()).filter(Boolean),
        categoryId: data.categoryId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/articles"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Article created" });
    },
    onError: () => {
      toast({ title: "Failed to create article", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      return apiRequest("PATCH", `/api/admin/support/articles/${id}`, {
        ...data,
        searchKeywords: data.searchKeywords.split(",").map(k => k.trim()).filter(Boolean),
        categoryId: data.categoryId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/articles"] });
      setIsDialogOpen(false);
      setEditingArticle(null);
      resetForm();
      toast({ title: "Article updated" });
    },
    onError: () => {
      toast({ title: "Failed to update article", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/support/articles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/articles"] });
      setDeleteId(null);
      toast({ title: "Article deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete article", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      slug: "",
      content: "",
      summary: "",
      categoryId: "",
      status: "draft",
      isPublic: false,
      isFeatured: false,
      searchKeywords: "",
      priority: 0,
    });
  };

  const openEditDialog = (article: SupportArticle) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      slug: article.slug,
      content: article.content,
      summary: article.summary || "",
      categoryId: article.categoryId || "",
      status: article.status as "draft" | "published" | "archived",
      isPublic: article.isPublic ?? false,
      isFeatured: article.isFeatured ?? false,
      searchKeywords: article.searchKeywords?.join(", ") || "",
      priority: article.priority || 0,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const slug = formData.slug || formData.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (editingArticle) {
      updateMutation.mutate({ id: editingArticle.id, data: { ...formData, slug } });
    } else {
      createMutation.mutate({ ...formData, slug });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "draft": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "archived": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
      default: return "";
    }
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return null;
    const category = categories.find(c => c.id === categoryId);
    return category?.name;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Articles</h2>
          <p className="text-sm text-muted-foreground">FAQ articles for customers and AI context</p>
        </div>
        <Button onClick={() => { resetForm(); setEditingArticle(null); setIsDialogOpen(true); }} data-testid="button-add-article">
          <Plus className="h-4 w-4 mr-2" />
          Add Article
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center p-8 text-muted-foreground">Loading...</div>
      ) : articles.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No articles yet</p>
            <p className="text-sm">Create articles to help customers and train the AI</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {articles.map((article) => (
            <Card key={article.id} data-testid={`article-${article.id}`}>
              <CardHeader className="py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base">{article.title}</CardTitle>
                      <Badge className={getStatusColor(article.status)}>{article.status}</Badge>
                      {article.isPublic && <Badge variant="outline"><Globe className="h-3 w-3 mr-1" />Public</Badge>}
                      {article.isFeatured && <Badge variant="outline"><Star className="h-3 w-3 mr-1" />Featured</Badge>}
                    </div>
                    {article.summary && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{article.summary}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {getCategoryName(article.categoryId) && (
                        <span className="flex items-center gap-1">
                          <FolderOpen className="h-3 w-3" />
                          {getCategoryName(article.categoryId)}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {article.viewCount || 0} views
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEditDialog(article)} data-testid={`button-edit-article-${article.id}`}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteId(article.id)} data-testid={`button-delete-article-${article.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingArticle ? "Edit Article" : "Add Article"}</DialogTitle>
            <DialogDescription>
              Create articles for your FAQ and AI knowledge base
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="article-title">Title</Label>
              <Input
                id="article-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., What are your business hours?"
                required
                data-testid="input-article-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="article-slug">Slug (URL-friendly)</Label>
              <Input
                id="article-slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="business-hours"
                data-testid="input-article-slug"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="article-summary">Summary</Label>
              <Textarea
                id="article-summary"
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                placeholder="Brief summary shown in search results..."
                rows={2}
                data-testid="input-article-summary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="article-content">Content</Label>
              <Textarea
                id="article-content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Full article content..."
                rows={8}
                required
                data-testid="input-article-content"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="article-category">Category</Label>
                <Select
                  value={formData.categoryId || "none"}
                  onValueChange={(value) => setFormData({ ...formData, categoryId: value === "none" ? "" : value })}
                >
                  <SelectTrigger data-testid="select-article-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="article-status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as "draft" | "published" | "archived" })}
                >
                  <SelectTrigger data-testid="select-article-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="article-keywords">Search Keywords (comma-separated)</Label>
              <Input
                id="article-keywords"
                value={formData.searchKeywords}
                onChange={(e) => setFormData({ ...formData, searchKeywords: e.target.value })}
                placeholder="hours, open, schedule, times"
                data-testid="input-article-keywords"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="article-priority">Priority (higher = more important)</Label>
                <Input
                  id="article-priority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  data-testid="input-article-priority"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="article-isPublic"
                  checked={formData.isPublic}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
                  data-testid="switch-article-public"
                />
                <Label htmlFor="article-isPublic">Show on public FAQ</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="article-isFeatured"
                  checked={formData.isFeatured}
                  onCheckedChange={(checked) => setFormData({ ...formData, isFeatured: checked })}
                  data-testid="switch-article-featured"
                />
                <Label htmlFor="article-isFeatured">Featured article</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-article">
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Article</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this article? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} data-testid="button-confirm-delete-article">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function SupportKnowledgeBase() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b p-4">
        <div className="flex items-center gap-3">
          <Link href="/support/admin">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold">Knowledge Base</h1>
            <p className="text-sm text-muted-foreground">Manage content used by the AI to answer questions</p>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-5xl mx-auto">
        <Tabs defaultValue="articles" className="space-y-4">
          <TabsList className="flex flex-wrap gap-1">
            <TabsTrigger value="articles" data-testid="tab-articles">
              <FileText className="h-4 w-4 mr-2" />
              Articles
            </TabsTrigger>
            <TabsTrigger value="categories" data-testid="tab-categories">
              <FolderOpen className="h-4 w-4 mr-2" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="tags" data-testid="tab-tags">
              <Tag className="h-4 w-4 mr-2" />
              Tags
            </TabsTrigger>
            <TabsTrigger value="canned-responses" data-testid="tab-canned-responses">
              <BookOpen className="h-4 w-4 mr-2" />
              Canned Responses
            </TabsTrigger>
            <TabsTrigger value="web-sources" data-testid="tab-web-sources">
              <Globe className="h-4 w-4 mr-2" />
              Web Sources
            </TabsTrigger>
          </TabsList>
          <TabsContent value="articles">
            <ArticlesTab />
          </TabsContent>
          <TabsContent value="categories">
            <CategoriesTab />
          </TabsContent>
          <TabsContent value="tags">
            <TagsTab />
          </TabsContent>
          <TabsContent value="canned-responses">
            <CannedResponsesTab />
          </TabsContent>
          <TabsContent value="web-sources">
            <WebSourcesTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
