import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { getMediaLibraryFiles, createMediaLibraryFile, deleteMediaLibraryFile, getMediaLibraryUploadUrl, updateMediaLibraryFile } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, Copy, Image as ImageIcon, FileText, Edit } from "lucide-react";
import type { MediaLibrary } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";

const CATEGORIES = [
  { value: 'all', label: 'All Files' },
  { value: 'products', label: 'Product Images' },
  { value: 'slideshow', label: 'Slideshow Images' },
  { value: 'logos', label: 'Logos' },
  { value: 'backgrounds', label: 'Backgrounds' },
  { value: 'icons', label: 'Icons' },
  { value: 'events', label: 'Event Photos' },
  { value: 'marketing', label: 'Marketing Materials' },
  { value: 'vineyard', label: 'Vineyard Photos' },
  { value: 'staff', label: 'Staff Photos' },
  { value: 'uncategorized', label: 'Uncategorized' },
];

export function MediaLibrary() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [editingFile, setEditingFile] = useState<MediaLibrary | null>(null);
  const [editForm, setEditForm] = useState<Partial<MediaLibrary>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['/api/media-library', selectedCategory],
    queryFn: () => getMediaLibraryFiles(selectedCategory !== 'all' ? selectedCategory : undefined),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadingFile(true);
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
          throw new Error('Failed to upload file');
        }

        const baseUrl = uploadUrl.split('?')[0];

        return await createMediaLibraryFile({
          filename: file.name.replace(/[^a-zA-Z0-9._-]/g, '_'),
          originalFilename: file.name,
          mimeType: file.type,
          fileSize: file.size,
          objectPath: baseUrl,
          publicUrl: baseUrl,
          category: 'uncategorized',
          description: null,
          altText: null,
          tags: null,
        });
      } finally {
        setUploadingFile(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/media-library'] });
      toast({
        title: "Success",
        description: "File uploaded successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMediaLibraryFile,
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/media-library'] });
      setSelectedIds(prev => prev.filter(id => id !== deletedId));
      toast({
        title: "Success",
        description: "File deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Failed to delete file",
        variant: "destructive",
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const validIds = ids.filter(id => files.some(f => f.id === id));
      if (validIds.length === 0) throw new Error("No valid files to delete");
      
      const results = await Promise.all(validIds.map(id => deleteMediaLibraryFile(id)));
      return { results, count: validIds.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/media-library'] });
      toast({
        title: "Success",
        description: `Successfully deleted ${data.count} file(s)`,
      });
      setSelectedIds([]);
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete selected files",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MediaLibrary> }) => 
      updateMediaLibraryFile(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/media-library'] });
      setEditingFile(null);
      setEditForm({});
      toast({
        title: "Success",
        description: "File updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update file",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "Copied",
      description: "URL copied to clipboard",
    });
  };

  const openEditDialog = (file: MediaLibrary) => {
    setEditingFile(file);
    setEditForm({
      category: file.category,
      description: file.description || '',
      altText: file.altText || '',
      tags: file.tags || [],
    });
  };

  const handleUpdate = () => {
    if (!editingFile) return;
    
    updateMutation.mutate({
      id: editingFile.id,
      data: {
        category: editForm.category,
        description: editForm.description || null,
        altText: editForm.altText || null,
        tags: editForm.tags && editForm.tags.length > 0 ? editForm.tags : null,
      },
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Media Library</CardTitle>
          <CardDescription>
            Upload and manage images and files. All files are stored in cloud storage and accessible from both preview and production.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="category-filter">Filter by Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger id="category-filter" data-testid="select-category-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <Label htmlFor="file-upload">Upload File</Label>
              <div className="flex gap-2">
                <Input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploadingFile}
                  data-testid="input-file-upload"
                />
                <Button disabled={uploadingFile} size="icon" data-testid="button-upload">
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {uploadingFile && (
            <div className="text-sm text-muted-foreground">
              Uploading file...
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : files.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No files found. Upload your first file to get started.
          </CardContent>
        </Card>
      ) : (
        <>
          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium">{selectedIds.length} file(s) selected</p>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm(`Delete ${selectedIds.length} selected file(s)?`)) {
                    bulkDeleteMutation.mutate(selectedIds);
                  }
                }}
                disabled={bulkDeleteMutation.isPending}
                data-testid="button-delete-selected"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </Button>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((file) => (
            <Card key={file.id} data-testid={`card-media-${file.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <Checkbox
                    checked={selectedIds.includes(file.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedIds([...selectedIds, file.id]);
                      } else {
                        setSelectedIds(selectedIds.filter(id => id !== file.id));
                      }
                    }}
                    data-testid={`checkbox-select-${file.id}`}
                  />
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm truncate" title={file.originalFilename}>
                      {file.originalFilename}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {file.category}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEditDialog(file)}
                      data-testid={`button-edit-${file.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(file.id)}
                      data-testid={`button-delete-${file.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {file.mimeType.startsWith('image/') ? (
                  <img
                    src={`/api/media-library/${file.id}/file`}
                    alt={file.altText || file.originalFilename}
                    className="w-full h-40 object-cover rounded"
                  />
                ) : (
                  <div className="w-full h-40 bg-muted rounded flex items-center justify-center">
                    <FileText className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Input
                    value={file.publicUrl}
                    readOnly
                    className="text-xs"
                    data-testid={`input-url-${file.id}`}
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(file.publicUrl)}
                    data-testid={`button-copy-${file.id}`}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>

                {file.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {file.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
          </div>
        </>
      )}

      <Dialog open={!!editingFile} onOpenChange={(open) => !open && setEditingFile(null)}>
        <DialogContent data-testid="dialog-edit-file">
          <DialogHeader>
            <DialogTitle>Edit File Details</DialogTitle>
            <DialogDescription>
              Update the category, description, and other metadata for this file.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-category">Category</Label>
              <Select
                value={editForm.category}
                onValueChange={(value) => setEditForm({ ...editForm, category: value })}
              >
                <SelectTrigger id="edit-category" data-testid="select-edit-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter(c => c.value !== 'all').map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description || ''}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Optional description"
                data-testid="textarea-edit-description"
              />
            </div>

            <div>
              <Label htmlFor="edit-alt-text">Alt Text</Label>
              <Input
                id="edit-alt-text"
                value={editForm.altText || ''}
                onChange={(e) => setEditForm({ ...editForm, altText: e.target.value })}
                placeholder="Descriptive alt text for accessibility"
                data-testid="input-edit-alt-text"
              />
            </div>

            <div>
              <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
              <Input
                id="edit-tags"
                value={Array.isArray(editForm.tags) ? editForm.tags.join(', ') : ''}
                onChange={(e) => setEditForm({ 
                  ...editForm, 
                  tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                })}
                placeholder="wine, red, bottle"
                data-testid="input-edit-tags"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingFile(null)} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending} data-testid="button-save-edit">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
