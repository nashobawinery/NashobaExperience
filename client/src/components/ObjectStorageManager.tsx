import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, Image, File, Search, Folder, Copy, CheckSquare, Square } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface StorageFile {
  name: string;
  size: number;
  contentType: string;
  updated: string;
  publicUrl: string;
}

interface StorageResponse {
  files: StorageFile[];
  bucketName: string | null;
}

export default function ObjectStorageManager() {
  const { toast } = useToast();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetFolder, setTargetFolder] = useState("products");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedForDelete, setSelectedForDelete] = useState<StorageFile | null>(null);
  const [currentFolder, setCurrentFolder] = useState("public/");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  const { data, isLoading } = useQuery<StorageResponse>({
    queryKey: ["/api/admin/object-storage/files", currentFolder],
    queryFn: async () => {
      const response = await fetch(`/api/admin/object-storage/files?prefix=${encodeURIComponent(currentFolder)}`);
      if (!response.ok) throw new Error("Failed to fetch files");
      return response.json();
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, folder }: { file: File; folder: string }) => {
      const response = await apiRequest("POST", "/api/admin/object-storage/upload", {
        filename: file.name,
        folder,
      });

      const uploadData = await response.json();

      const uploadResponse = await fetch(uploadData.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to storage");
      }

      return uploadData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/object-storage/files"] });
      toast({ title: "Upload Successful", description: "File uploaded to object storage" });
      setShowUploadDialog(false);
      setSelectedFile(null);
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (file: StorageFile) => {
      const bucketName = data?.bucketName;
      if (!bucketName) throw new Error("Bucket name not available");
      
      await apiRequest("DELETE", `/api/admin/object-storage/files/${bucketName}/${file.name}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/object-storage/files"] });
      toast({ title: "File Deleted", description: "File removed from storage" });
      setSelectedForDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete file",
        variant: "destructive",
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (files: StorageFile[]) => {
      const bucketName = data?.bucketName;
      if (!bucketName) throw new Error("Bucket name not available");
      
      await Promise.all(
        files.map(file => 
          apiRequest("DELETE", `/api/admin/object-storage/files/${bucketName}/${file.name}`)
        )
      );
    },
    onSuccess: (_, files) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/object-storage/files"] });
      toast({ 
        title: "Files Deleted", 
        description: `${files.length} file${files.length > 1 ? 's' : ''} removed from storage` 
      });
      setSelectedFiles(new Set());
      setShowBulkDeleteDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Bulk Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete files",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    uploadMutation.mutate({ file: selectedFile, folder: targetFolder });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const filteredFiles = data?.files.filter(file => {
    if (!searchQuery) return true;
    return file.name.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith("image/")) return <Image className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const extractFileName = (fullPath: string) => {
    const parts = fullPath.split('/');
    return parts[parts.length - 1];
  };

  const copyToClipboard = async (text: string, fileName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ 
        title: "URL Copied", 
        description: `URL for ${extractFileName(fileName)} copied to clipboard` 
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy URL to clipboard",
        variant: "destructive",
      });
    }
  };

  const toggleFileSelection = (fileName: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileName)) {
      newSelection.delete(fileName);
    } else {
      newSelection.add(fileName);
    }
    setSelectedFiles(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedFiles.size === filteredFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(filteredFiles.map(f => f.name)));
    }
  };

  const handleBulkDelete = () => {
    const filesToDelete = filteredFiles.filter(f => selectedFiles.has(f.name));
    bulkDeleteMutation.mutate(filesToDelete);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-3 pb-4">
          <div className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Object Storage Browser</CardTitle>
            <div className="flex items-center gap-2">
              {selectedFiles.size > 0 && (
                <Button
                  variant="destructive"
                  onClick={() => setShowBulkDeleteDialog(true)}
                  data-testid="button-delete-selected"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected ({selectedFiles.size})
                </Button>
              )}
              <Button
                onClick={() => setShowUploadDialog(true)}
                data-testid="button-upload-file"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload File
              </Button>
            </div>
          </div>
          <div className="text-sm bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg">
            <p className="font-medium text-amber-700 dark:text-amber-400 mb-1">Advanced Feature</p>
            <p className="text-muted-foreground text-xs">
              This is a direct view of your cloud storage bucket. For everyday image management, use the <strong>Media Library</strong> instead. 
              Object Storage is useful for troubleshooting, cleanup, or advanced file operations.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
                data-testid="input-search-files"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            {data?.bucketName && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Folder className="h-4 w-4" />
                <span>Bucket: {data.bucketName}</span>
                <span className="mx-2">•</span>
                <span>Folder: {currentFolder}</span>
              </div>
            )}
            {filteredFiles.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSelectAll}
                data-testid="button-select-all"
              >
                {selectedFiles.size === filteredFiles.length ? (
                  <CheckSquare className="h-4 w-4 mr-2" />
                ) : (
                  <Square className="h-4 w-4 mr-2" />
                )}
                {selectedFiles.size === filteredFiles.length ? "Deselect All" : "Select All"}
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading files...</div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "No files match your search" : "No files in storage"}
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {filteredFiles.map((file) => (
                  <Card key={file.name} className="hover-elevate">
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedFiles.has(file.name)}
                            onCheckedChange={() => toggleFileSelection(file.name)}
                            data-testid={`checkbox-${extractFileName(file.name)}`}
                            className="mt-1"
                          />
                          
                          {file.contentType.startsWith("image/") ? (
                            <div className="w-16 h-16 flex-shrink-0 rounded overflow-hidden bg-muted">
                              <img
                                src={file.publicUrl}
                                alt={extractFileName(file.name)}
                                className="w-full h-full object-cover"
                                data-testid={`thumbnail-${extractFileName(file.name)}`}
                              />
                            </div>
                          ) : (
                            <div className="w-16 h-16 flex-shrink-0 rounded bg-muted flex items-center justify-center">
                              {getFileIcon(file.contentType)}
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate" title={file.name}>
                              {extractFileName(file.name)}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                              <span>{formatBytes(file.size)}</span>
                              <span>•</span>
                              <span>{new Date(file.updated).toLocaleDateString('en-US')}</span>
                              {file.contentType.startsWith("image/") && (
                                <>
                                  <span>•</span>
                                  <Badge variant="secondary" className="text-xs">Image</Badge>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-wrap pl-[52px]">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(file.publicUrl, file.name)}
                            data-testid={`button-copy-${extractFileName(file.name)}`}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy URL
                          </Button>
                          {file.contentType.startsWith("image/") && (
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                            >
                              <a
                                href={file.publicUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                data-testid={`link-view-${extractFileName(file.name)}`}
                              >
                                <Image className="h-4 w-4 mr-2" />
                                View
                              </a>
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setSelectedForDelete(file)}
                            data-testid={`button-delete-${extractFileName(file.name)}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent data-testid="dialog-upload">
          <DialogHeader>
            <DialogTitle>Upload File to Object Storage</DialogTitle>
            <DialogDescription>
              Select a file to upload to your cloud storage bucket
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="folder">Target Folder</Label>
              <Input
                id="folder"
                value={targetFolder}
                onChange={(e) => setTargetFolder(e.target.value)}
                placeholder="e.g., products, images, etc."
                data-testid="input-folder"
              />
            </div>
            <div>
              <Label htmlFor="file">File</Label>
              <Input
                id="file"
                type="file"
                onChange={handleFileSelect}
                data-testid="input-file"
              />
              {selectedFile && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Selected: {selectedFile.name} ({formatBytes(selectedFile.size)})
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUploadDialog(false);
                setSelectedFile(null);
              }}
              data-testid="button-cancel-upload"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploadMutation.isPending}
              data-testid="button-confirm-upload"
            >
              {uploadMutation.isPending ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedForDelete} onOpenChange={() => setSelectedForDelete(null)}>
        <DialogContent data-testid="dialog-delete">
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this file? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedForDelete && (
            <div className="py-4">
              <div className="text-sm font-medium">{extractFileName(selectedForDelete.name)}</div>
              <div className="text-sm text-muted-foreground">
                {formatBytes(selectedForDelete.size)} • {new Date(selectedForDelete.updated).toLocaleDateString('en-US')}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedForDelete(null)}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedForDelete && deleteMutation.mutate(selectedForDelete)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <DialogContent data-testid="dialog-bulk-delete">
          <DialogHeader>
            <DialogTitle>Delete Multiple Files</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedFiles.size} file{selectedFiles.size > 1 ? 's' : ''}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {filteredFiles
                  .filter(f => selectedFiles.has(f.name))
                  .map(file => (
                    <div key={file.name} className="flex items-center gap-2 text-sm">
                      <File className="h-4 w-4" />
                      <span className="flex-1 truncate">{extractFileName(file.name)}</span>
                      <span className="text-muted-foreground">{formatBytes(file.size)}</span>
                    </div>
                  ))}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBulkDeleteDialog(false)}
              data-testid="button-cancel-bulk-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
              data-testid="button-confirm-bulk-delete"
            >
              {bulkDeleteMutation.isPending ? "Deleting..." : `Delete ${selectedFiles.size} File${selectedFiles.size > 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
