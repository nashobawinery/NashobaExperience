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
  X
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { SupportCannedResponse, SupportWebSource } from "@shared/schema";

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
                    <Button size="icon" variant="ghost" onClick={() => openEditDialog(source)} data-testid={`button-edit-source-${source.id}`}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteId(source.id)} data-testid={`button-delete-source-${source.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {source.content && (
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">{source.content}</p>
                </CardContent>
              )}
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

export default function SupportKnowledgeBase() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b p-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/support">
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

      <main className="p-4 max-w-4xl mx-auto">
        <Tabs defaultValue="canned-responses" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="canned-responses" data-testid="tab-canned-responses">
              <BookOpen className="h-4 w-4 mr-2" />
              Canned Responses
            </TabsTrigger>
            <TabsTrigger value="web-sources" data-testid="tab-web-sources">
              <Globe className="h-4 w-4 mr-2" />
              Web Sources
            </TabsTrigger>
          </TabsList>
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
