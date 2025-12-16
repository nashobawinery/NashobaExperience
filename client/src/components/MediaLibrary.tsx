import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { getMediaLibraryFiles, createMediaLibraryFile, deleteMediaLibraryFile, getMediaLibraryUploadUrl, updateMediaLibraryFile } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, Copy, Image as ImageIcon, FileText, Edit, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";
import type { MediaLibrary } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

interface SyncStatus {
  bucketId: string;
  summary: {
    total: number;
    existingInBucket: number;
    missingFromBucket: number;
    urlMismatch: number;
  };
  files: Array<{
    id: string;
    filename: string;
    objectPath: string;
    publicUrl: string;
    existsInBucket: boolean;
    urlMatchesBucket: boolean;
  }>;
}

interface SyncResult {
  success: boolean;
  dryRun: boolean;
  summary: {
    total: number;
    synced: number;
    skipped: number;
    failed: number;
  };
  results: Array<{
    id: string;
    filename: string;
    status: 'synced' | 'skipped' | 'failed';
    message: string;
    newUrl?: string;
  }>;
}

export function MediaLibrary() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [editingFile, setEditingFile] = useState<MediaLibrary | null>(null);
  const [editForm, setEditForm] = useState<Partial<MediaLibrary>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['/api/media-library', selectedCategory],
    queryFn: () => getMediaLibraryFiles(selectedCategory !== 'all' ? selectedCategory : undefined),
  });

  const syncStatusMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/media-library/sync-status');
      if (!response.ok) throw new Error('Failed to fetch sync status');
      return response.json() as Promise<SyncStatus>;
    },
    onSuccess: (data) => {
      setSyncStatus(data);
      setSyncResult(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to check sync status",
        variant: "destructive",
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (dryRun: boolean) => {
      const response = await apiRequest('POST', '/api/admin/media-library/sync', { dryRun });
      return await response.json() as SyncResult;
    },
    onSuccess: (data) => {
      setSyncResult(data);
      if (!data.dryRun) {
        queryClient.invalidateQueries({ queryKey: ['/api/media-library'] });
        toast({
          title: "Sync Complete",
          description: `Synced ${data.summary.synced} files, ${data.summary.skipped} skipped, ${data.summary.failed} failed`,
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Failed to sync media files",
        variant: "destructive",
      });
    },
  });

  const openSyncDialog = () => {
    setSyncDialogOpen(true);
    setSyncStatus(null);
    setSyncResult(null);
    syncStatusMutation.mutate();
  };

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
          <CardDescription className="space-y-2">
            <p>
              Your central hub for all images and files. Upload, organize, and manage media assets that can be used throughout the platform.
            </p>
            <div className="text-xs bg-muted/50 p-3 rounded-lg mt-2">
              <p className="font-medium mb-1">How it works:</p>
              <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                <li>Upload images here to store them in the cloud</li>
                <li>Organize files by category (Product Images, Slideshow, Logos, etc.)</li>
                <li>Use these images in Product Media to assign them to specific products</li>
              </ul>
            </div>
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
          
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Media Sync Utility</p>
                <p className="text-xs text-muted-foreground">
                  Sync media files from dev to production environment
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={openSyncDialog}
                data-testid="button-open-sync"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Media
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Media Sync Utility</DialogTitle>
            <DialogDescription>
              This utility downloads media files from their source URLs and uploads them to this environment's storage bucket.
              Use this after importing database records from another environment.
            </DialogDescription>
          </DialogHeader>

          {syncStatusMutation.isPending && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Checking sync status...</span>
            </div>
          )}

          {syncStatus && !syncResult && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Sync Status</AlertTitle>
                <AlertDescription>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                    <div>Total files: <strong>{syncStatus.summary.total}</strong></div>
                    <div>Existing in bucket: <strong>{syncStatus.summary.existingInBucket}</strong></div>
                    <div>Missing from bucket: <strong className="text-destructive">{syncStatus.summary.missingFromBucket}</strong></div>
                    <div>URL mismatch: <strong className="text-yellow-600">{syncStatus.summary.urlMismatch}</strong></div>
                  </div>
                </AlertDescription>
              </Alert>

              {syncStatus.summary.missingFromBucket > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Missing Files:</p>
                  <div className="max-h-32 overflow-y-auto border rounded p-2 text-xs">
                    {syncStatus.files
                      .filter(f => !f.existsInBucket)
                      .map(f => (
                        <div key={f.id} className="py-1 border-b last:border-0">
                          {f.filename}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => syncMutation.mutate(true)}
                  disabled={syncMutation.isPending}
                  data-testid="button-dry-run"
                >
                  {syncMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Preview (Dry Run)
                </Button>
                <Button
                  onClick={() => syncMutation.mutate(false)}
                  disabled={syncMutation.isPending || syncStatus.summary.missingFromBucket === 0}
                  data-testid="button-sync-now"
                >
                  {syncMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Sync {syncStatus.summary.missingFromBucket} Files
                </Button>
              </div>
            </div>
          )}

          {syncResult && (
            <div className="space-y-4">
              <Alert variant={syncResult.summary.failed > 0 ? "destructive" : "default"}>
                {syncResult.summary.failed > 0 ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                <AlertTitle>{syncResult.dryRun ? "Dry Run Results" : "Sync Complete"}</AlertTitle>
                <AlertDescription>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                    <div>Total processed: <strong>{syncResult.summary.total}</strong></div>
                    <div>Synced: <strong className="text-green-600">{syncResult.summary.synced}</strong></div>
                    <div>Skipped: <strong>{syncResult.summary.skipped}</strong></div>
                    <div>Failed: <strong className="text-destructive">{syncResult.summary.failed}</strong></div>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <p className="text-sm font-medium">Results:</p>
                <div className="max-h-48 overflow-y-auto border rounded text-xs">
                  {syncResult.results.map(r => (
                    <div 
                      key={r.id} 
                      className={`p-2 border-b last:border-0 flex justify-between ${
                        r.status === 'synced' ? 'bg-green-50 dark:bg-green-950' : 
                        r.status === 'failed' ? 'bg-red-50 dark:bg-red-950' : ''
                      }`}
                    >
                      <span className="font-medium">{r.filename}</span>
                      <span className="text-muted-foreground">{r.message}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setSyncDialogOpen(false)}>
                  Close
                </Button>
                {syncResult.dryRun && syncResult.summary.synced > 0 && (
                  <Button
                    onClick={() => syncMutation.mutate(false)}
                    disabled={syncMutation.isPending}
                    data-testid="button-confirm-sync"
                  >
                    {syncMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Sync Now
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
