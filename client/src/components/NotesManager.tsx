import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ImprovementNote } from "@shared/schema";

interface NotesManagerProps {
  appType: 'base' | 'b2b';
}

const pageOptions: Record<string, { label: string; app: string }> = {
  // Base app pages
  'landing': { label: 'Landing', app: 'base' },
  'browse': { label: 'Browse', app: 'base' },
  'favorites': { label: 'Favorites', app: 'base' },
  'cart': { label: 'Cart', app: 'base' },
  'profile': { label: 'Profile', app: 'base' },
  'admin': { label: 'Admin', app: 'base' },
  // B2B pages
  'pricing': { label: 'Pricing', app: 'b2b' },
  'sheet': { label: 'Pricing Sheet', app: 'b2b' },
  'where-to-buy': { label: 'Where to Buy', app: 'b2b' },
  'registration': { label: 'Registration', app: 'b2b' },
  'login': { label: 'Login', app: 'b2b' },
  'catalog': { label: 'Catalog', app: 'b2b' },
  'b2b-cart': { label: 'Cart', app: 'b2b' },
  'checkout': { label: 'Checkout', app: 'b2b' },
  'orders': { label: 'Orders', app: 'b2b' },
  'b2b-admin': { label: 'Admin', app: 'b2b' },
};

export default function NotesManager({ appType }: NotesManagerProps) {
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<ImprovementNote | null>(null);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('active');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    pageReference: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  const { data: notes = [], isLoading } = useQuery<ImprovementNote[]>({
    queryKey: [`/api/admin/improvement-notes`, appType],
    queryFn: async () => {
      const response = await fetch(`/api/admin/improvement-notes?appType=${appType}`);
      if (!response.ok) throw new Error('Failed to fetch notes');
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/admin/improvement-notes', 'POST', {
        ...data,
        appType,
        status: 'active',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/improvement-notes`, appType] });
      setIsAddOpen(false);
      setFormData({ title: '', description: '', pageReference: '', priority: 'medium' });
      toast({ title: 'Note created successfully' });
    },
    onError: () => toast({ title: 'Failed to create note', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/admin/improvement-notes/${data.id}`, 'PATCH', {
        title: data.title,
        description: data.description,
        pageReference: data.pageReference,
        priority: data.priority,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/improvement-notes`, appType] });
      setEditingNote(null);
      toast({ title: 'Note updated successfully' });
    },
    onError: () => toast({ title: 'Failed to update note', variant: 'destructive' }),
  });

  const completeMutation = useMutation({
    mutationFn: async (noteId: string) => {
      return apiRequest(`/api/admin/improvement-notes/${noteId}/complete`, 'PATCH');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/improvement-notes`, appType] });
      toast({ title: 'Note marked as complete' });
    },
    onError: () => toast({ title: 'Failed to complete note', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      return apiRequest(`/api/admin/improvement-notes/${noteId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/improvement-notes`, appType] });
      setDeleteNoteId(null);
      toast({ title: 'Note deleted successfully' });
    },
    onError: () => toast({ title: 'Failed to delete note', variant: 'destructive' }),
  });

  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      if (filterStatus === 'active') return note.status === 'active';
      if (filterStatus === 'completed') return note.status === 'completed';
      return true;
    });
  }, [notes, filterStatus]);

  const handleAdd = () => {
    if (!formData.title || !formData.description || !formData.pageReference) {
      toast({ title: 'Please fill in all fields', variant: 'destructive' });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleSaveEdit = () => {
    if (!editingNote) return;
    updateMutation.mutate(editingNote);
  };

  const priorityColors: Record<string, string> = {
    'low': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
    'medium': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
    'high': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
  };

  const appPages = Object.entries(pageOptions)
    .filter(([_, options]) => options.app === appType)
    .map(([key, options]) => ({ key, label: options.label }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Improvement Notes</h3>
          <p className="text-sm text-muted-foreground">Track and manage app improvement ideas</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} data-testid="button-add-note">
          <Plus className="w-4 h-4 mr-2" />
          Add Note
        </Button>
      </div>

      <Tabs value={filterStatus} onValueChange={(value) => setFilterStatus(value as any)}>
        <TabsList>
          <TabsTrigger value="active">Active ({notes.filter(n => n.status === 'active').length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({notes.filter(n => n.status === 'completed').length})</TabsTrigger>
        </TabsList>

        <TabsContent value={filterStatus} className="space-y-4 mt-4">
          {isLoading ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">Loading notes...</CardContent>
            </Card>
          ) : filteredNotes.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No {filterStatus} notes yet
              </CardContent>
            </Card>
          ) : (
            filteredNotes.map((note) => (
              <Card key={note.id} data-testid={`note-card-${note.noteNumber}`}>
                <CardHeader>
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl font-bold text-muted-foreground">#{note.noteNumber}</span>
                        <Badge className={priorityColors[note.priority || 'medium']}>
                          {note.priority}
                        </Badge>
                        {note.status === 'completed' && (
                          <Badge variant="outline" className="bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Complete
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg">{note.title}</CardTitle>
                      <CardDescription className="mt-2">
                        Page: <span className="font-medium">{pageOptions[note.pageReference]?.label || note.pageReference}</span>
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {note.status === 'active' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => completeMutation.mutate(note.id)}
                          data-testid={`button-complete-${note.noteNumber}`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingNote(note)}
                        data-testid={`button-edit-${note.noteNumber}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteNoteId(note.id)}
                        data-testid={`button-delete-${note.noteNumber}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{note.description}</p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddOpen || !!editingNote} onOpenChange={(open) => {
        if (!open) {
          setIsAddOpen(false);
          setEditingNote(null);
          setFormData({ title: '', description: '', pageReference: '', priority: 'medium' });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingNote ? 'Edit Note' : 'Add New Note'}</DialogTitle>
            <DialogDescription>
              {editingNote ? `Note #${editingNote.noteNumber}` : 'Create a new improvement note'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={editingNote?.title || formData.title}
                onChange={(e) => {
                  if (editingNote) {
                    setEditingNote({ ...editingNote, title: e.target.value });
                  } else {
                    setFormData({ ...formData, title: e.target.value });
                  }
                }}
                placeholder="Note title"
                data-testid="input-note-title"
              />
            </div>
            <div>
              <Label htmlFor="page">Page Reference</Label>
              <Select
                value={editingNote?.pageReference || formData.pageReference}
                onValueChange={(value) => {
                  if (editingNote) {
                    setEditingNote({ ...editingNote, pageReference: value });
                  } else {
                    setFormData({ ...formData, pageReference: value });
                  }
                }}
              >
                <SelectTrigger data-testid="select-note-page">
                  <SelectValue placeholder="Select a page" />
                </SelectTrigger>
                <SelectContent>
                  {appPages.map(({ key, label }) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={editingNote?.priority || formData.priority}
                onValueChange={(value) => {
                  if (editingNote) {
                    setEditingNote({ ...editingNote, priority: value });
                  } else {
                    setFormData({ ...formData, priority: value as any });
                  }
                }}
              >
                <SelectTrigger data-testid="select-note-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editingNote?.description || formData.description}
                onChange={(e) => {
                  if (editingNote) {
                    setEditingNote({ ...editingNote, description: e.target.value });
                  } else {
                    setFormData({ ...formData, description: e.target.value });
                  }
                }}
                placeholder="Detailed description of the improvement"
                rows={4}
                data-testid="textarea-note-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={editingNote ? handleSaveEdit : handleAdd}
              data-testid={editingNote ? "button-save-note" : "button-create-note"}
            >
              {editingNote ? 'Save Changes' : 'Create Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteNoteId} onOpenChange={(open) => !open && setDeleteNoteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteNoteId) {
                  deleteMutation.mutate(deleteNoteId);
                }
              }}
              data-testid="button-confirm-delete-note"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
