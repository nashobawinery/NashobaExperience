import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  ArrowLeft, Plus, Lightbulb, Rocket, Clock, CheckCircle, 
  Edit2, Trash2, Star, TrendingUp, AlertCircle
} from "lucide-react";

interface FutureConcept {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  status: string;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

const categoryColors: Record<string, string> = {
  general: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  ecommerce: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  reservations: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  operations: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  marketing: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  analytics: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
};

const priorityIcons: Record<string, typeof Star> = {
  low: Clock,
  medium: TrendingUp,
  high: Star,
  critical: AlertCircle,
};

const statusColors: Record<string, string> = {
  idea: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  planned: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "in-progress": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  archived: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

export default function FutureConcepts() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [editingConcept, setEditingConcept] = useState<FutureConcept | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "general",
    priority: "medium",
    status: "idea",
    notes: "",
  });

  const { data: concepts, isLoading } = useQuery<FutureConcept[]>({
    queryKey: ["/api/platform/future-concepts"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/platform/future-concepts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/future-concepts"] });
      setShowNewDialog(false);
      resetForm();
      toast({ title: "Concept created", description: "Your idea has been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create concept.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const res = await apiRequest("PATCH", `/api/platform/future-concepts/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/future-concepts"] });
      setEditingConcept(null);
      resetForm();
      toast({ title: "Concept updated", description: "Changes have been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update concept.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/platform/future-concepts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/future-concepts"] });
      toast({ title: "Concept deleted", description: "The idea has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete concept.", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "general",
      priority: "medium",
      status: "idea",
      notes: "",
    });
  };

  const openEdit = (concept: FutureConcept) => {
    setFormData({
      title: concept.title,
      description: concept.description || "",
      category: concept.category,
      priority: concept.priority,
      status: concept.status,
      notes: concept.notes || "",
    });
    setEditingConcept(concept);
  };

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      toast({ title: "Error", description: "Title is required.", variant: "destructive" });
      return;
    }

    if (editingConcept) {
      updateMutation.mutate({ id: editingConcept.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setLocation("/admin-hub")} data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-semibold flex items-center gap-2">
                  <Lightbulb className="h-6 w-6 text-yellow-500" />
                  Future Concepts
                </h1>
                <p className="text-sm text-muted-foreground">Ideas and roadmap for platform development</p>
              </div>
            </div>
            <Button onClick={() => setShowNewDialog(true)} data-testid="button-new-concept">
              <Plus className="h-4 w-4 mr-2" />
              New Concept
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="h-20 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : concepts && concepts.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {concepts.map((concept) => {
              const PriorityIcon = priorityIcons[concept.priority] || TrendingUp;
              return (
                <Card key={concept.id} className="group hover-elevate" data-testid={`card-concept-${concept.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg line-clamp-2">{concept.title}</CardTitle>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(concept)} data-testid={`button-edit-${concept.id}`}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(concept.id)} data-testid={`button-delete-${concept.id}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge className={categoryColors[concept.category] || categoryColors.general}>
                        {concept.category}
                      </Badge>
                      <Badge className={statusColors[concept.status] || statusColors.idea}>
                        {concept.status}
                      </Badge>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <PriorityIcon className="h-3 w-3" />
                        {concept.priority}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {concept.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{concept.description}</p>
                    )}
                    {concept.notes && (
                      <div className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {concept.notes}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <Rocket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No concepts yet</h3>
              <p className="text-muted-foreground mb-4">Start capturing your ideas for future development</p>
              <Button onClick={() => setShowNewDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Concept
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      <Dialog open={showNewDialog || !!editingConcept} onOpenChange={(open) => {
        if (!open) {
          setShowNewDialog(false);
          setEditingConcept(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingConcept ? "Edit Concept" : "New Future Concept"}</DialogTitle>
            <DialogDescription>
              {editingConcept ? "Update the details of this concept" : "Capture an idea for future platform development"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Unified Shopping Cart Experience"
                data-testid="input-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Short Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief overview of the concept"
                data-testid="input-description"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger data-testid="select-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="ecommerce">E-Commerce</SelectItem>
                    <SelectItem value="reservations">Reservations</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="analytics">Analytics</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                  <SelectTrigger data-testid="select-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="idea">Idea</SelectItem>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Detailed Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add detailed notes, requirements, or implementation ideas..."
                className="min-h-[200px]"
                data-testid="input-notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowNewDialog(false);
              setEditingConcept(null);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save"
            >
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingConcept ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
