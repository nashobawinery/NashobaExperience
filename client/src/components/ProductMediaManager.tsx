import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, Image as ImageIcon, Search, FolderOpen, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MediaLibraryFile {
  id: string;
  filename: string;
  originalFilename: string;
  publicUrl: string;
  category: string;
  mimeType: string;
}

interface ProductMedia {
  id: string;
  productId: string;
  mediaId: string;
  role: "primary" | "label" | "lifestyle" | "gallery";
  sortOrder: number;
  media: {
    id: string;
    filename: string;
    publicUrl: string;
    originalFilename: string;
    fileSize: number;
  };
}

interface ProductWithMedia {
  id: string;
  name: string;
  sku: string;
  imageUrl?: string;
  labelImageUrl?: string;
  media: ProductMedia[];
}

export default function ProductMediaManager() {
  const { toast } = useToast();
  const [selectedProduct, setSelectedProduct] = useState<ProductWithMedia | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadRole, setUploadRole] = useState<"primary" | "label" | "lifestyle" | "gallery">("gallery");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogMode, setDialogMode] = useState<"upload" | "library">("library");
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [librarySearchQuery, setLibrarySearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch products with their media
  const { data: products = [], isLoading } = useQuery<ProductWithMedia[]>({
    queryKey: ['/api/admin/products-with-media'],
  });

  // Fetch all media library files (uses default queryFn with proper auth)
  const { data: allMediaLibraryFiles = [], isLoading: isLoadingLibrary } = useQuery<MediaLibraryFile[]>({
    queryKey: ['/api/media-library'],
    enabled: showUploadDialog,
  });

  // Filter to only show image files, with search
  const filteredMediaFiles = allMediaLibraryFiles.filter(file => {
    if (!file.mimeType?.startsWith('image/')) return false;
    if (!librarySearchQuery) return true;
    const query = librarySearchQuery.toLowerCase();
    return (
      file.filename?.toLowerCase().includes(query) ||
      file.originalFilename?.toLowerCase().includes(query)
    );
  });

  // Reset state when switching tabs
  const handleTabChange = (newMode: "library" | "upload") => {
    setDialogMode(newMode);
    if (newMode === "upload") {
      setSelectedMediaId(null);
      setLibrarySearchQuery("");
    } else {
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Filter products based on search query
  const filteredProducts = products.filter(product => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      product.name?.toLowerCase().includes(query) ||
      product.sku?.toLowerCase().includes(query)
    );
  });

  // Upload media mutation
  const uploadMediaMutation = useMutation({
    mutationFn: async ({ productId, file, role }: { productId: string; file: File; role: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('productId', productId);
      formData.append('role', role);

      const response = await fetch('/api/admin/product-media/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products-with-media'] });
      queryClient.invalidateQueries({ queryKey: ['/api/media-library'] });
      toast({ title: "Image Uploaded", description: "Product image uploaded successfully" });
      setShowUploadDialog(false);
      setSelectedFile(null);
      setSelectedMediaId(null);
      setLibrarySearchQuery("");
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive"
      });
    },
  });

  // Delete media mutation
  const deleteMediaMutation = useMutation({
    mutationFn: async (productMediaId: string) => {
      const response = await fetch(`/api/admin/product-media/${productMediaId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete image');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products-with-media'] });
      toast({ title: "Image Deleted", description: "Product image removed successfully" });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete image",
        variant: "destructive"
      });
    },
  });

  // Associate existing media library item with product
  const associateMediaMutation = useMutation({
    mutationFn: async ({ productId, mediaId, role }: { productId: string; mediaId: string; role: string }) => {
      const response = await apiRequest('POST', '/api/admin/product-media/associate', {
        productId,
        mediaId,
        role,
        sortOrder: 0,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products-with-media'] });
      queryClient.invalidateQueries({ queryKey: ['/api/media-library'] });
      toast({ title: "Image Assigned", description: "Image from library assigned to product successfully" });
      setShowUploadDialog(false);
      setSelectedFile(null);
      setSelectedMediaId(null);
      setLibrarySearchQuery("");
    },
    onError: (error) => {
      toast({
        title: "Assignment Failed",
        description: error instanceof Error ? error.message : "Failed to assign image",
        variant: "destructive"
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please select an image file",
          variant: "destructive"
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (selectedProduct && selectedFile) {
      uploadMediaMutation.mutate({
        productId: selectedProduct.id,
        file: selectedFile,
        role: uploadRole
      });
    }
  };

  const handleDelete = (productMediaId: string, productName: string, role: string) => {
    if (confirm(`Delete ${role} image for ${productName}?`)) {
      deleteMediaMutation.mutate(productMediaId);
    }
  };

  const handleOpenUploadDialog = (product: ProductWithMedia) => {
    setSelectedProduct(product);
    setShowUploadDialog(true);
    setUploadRole("gallery");
    setSelectedFile(null);
    setSelectedMediaId(null);
    setDialogMode("library");
    setLibrarySearchQuery("");
  };

  const handleAssignFromLibrary = () => {
    if (selectedProduct && selectedMediaId) {
      associateMediaMutation.mutate({
        productId: selectedProduct.id,
        mediaId: selectedMediaId,
        role: uploadRole
      });
    }
  };

  const groupMediaByRole = (media: ProductMedia[]) => {
    return media.reduce((acc, item) => {
      if (!acc[item.role]) {
        acc[item.role] = [];
      }
      acc[item.role].push(item);
      return acc;
    }, {} as Record<string, ProductMedia[]>);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'primary': return 'default';
      case 'label': return 'secondary';
      case 'lifestyle': return 'outline';
      case 'gallery': return 'outline';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Loading products...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-medium">Product Media Management</h2>
          <p className="text-muted-foreground mt-1">
            Link images to specific products with designated roles for how they're displayed.
          </p>
        </div>
        <div className="text-sm bg-muted/50 p-4 rounded-lg">
          <p className="font-medium mb-2">Image Roles Explained:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-muted-foreground">
            <div>
              <Badge className="mb-1">Primary</Badge>
              <p className="text-xs">Main product image shown in listings and cards</p>
            </div>
            <div>
              <Badge variant="secondary" className="mb-1">Label</Badge>
              <p className="text-xs">Close-up of the bottle label for detail view</p>
            </div>
            <div>
              <Badge variant="outline" className="mb-1">Lifestyle</Badge>
              <p className="text-xs">Product in use or scenic context shots</p>
            </div>
            <div>
              <Badge variant="outline" className="mb-1">Gallery</Badge>
              <p className="text-xs">Additional images for product gallery</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search products by name or SKU..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-search-products"
        />
      </div>

      {filteredProducts.length === 0 && searchQuery ? (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <p>No products found matching "{searchQuery}"</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredProducts.map((product) => {
          const mediaByRole = groupMediaByRole(product.media || []);
          const hasMedia = (product.media?.length || 0) > 0;

          return (
            <Card key={product.id} className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-lg">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleOpenUploadDialog(product)}
                    data-testid={`button-upload-image-${product.id}`}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Add Image
                  </Button>
                </div>

                {hasMedia ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {(['primary', 'label', 'lifestyle', 'gallery'] as const).map((role) => {
                      const images = mediaByRole[role] || [];
                      if (images.length === 0) return null;

                      return (
                        <div key={role} className="space-y-2">
                          <Badge variant={getRoleBadgeVariant(role)} className="capitalize">
                            {role}
                          </Badge>
                          <div className="space-y-2">
                            {images.map((media) => (
                              <div
                                key={media.id}
                                className="relative group border rounded-lg overflow-hidden hover-elevate"
                              >
                                <img
                                  src={`/api/media-library/${media.mediaId}/file`}
                                  alt={media.media.originalFilename}
                                  className="w-full h-32 object-cover"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDelete(media.id, product.name, role)}
                                    data-testid={`button-delete-media-${media.id}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                                  <p className="text-white text-xs truncate">
                                    {media.media.originalFilename}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <div className="text-center">
                      <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No images yet</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
        </div>
      )}

      {/* Add Image Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden" data-testid="dialog-upload-image">
          <DialogHeader>
            <DialogTitle>Add Image for {selectedProduct?.name}</DialogTitle>
            <DialogDescription>
              Select an image from your Media Library or upload a new one
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Image Role Selection */}
            <div className="space-y-2">
              <Label htmlFor="role">Image Role</Label>
              <Select value={uploadRole} onValueChange={(value: any) => setUploadRole(value)}>
                <SelectTrigger data-testid="select-image-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary (main product image)</SelectItem>
                  <SelectItem value="label">Label (bottle label closeup)</SelectItem>
                  <SelectItem value="lifestyle">Lifestyle (product in use/context)</SelectItem>
                  <SelectItem value="gallery">Gallery (additional images)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tabs for Library vs Upload */}
            <Tabs value={dialogMode} onValueChange={(v) => handleTabChange(v as "library" | "upload")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="library" className="flex items-center gap-2" data-testid="tab-select-from-library">
                  <FolderOpen className="w-4 h-4" />
                  Select from Library
                </TabsTrigger>
                <TabsTrigger value="upload" className="flex items-center gap-2" data-testid="tab-upload-new">
                  <Upload className="w-4 h-4" />
                  Upload New
                </TabsTrigger>
              </TabsList>

              <TabsContent value="library" className="mt-4">
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search images..."
                      value={librarySearchQuery}
                      onChange={(e) => setLibrarySearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-library-search"
                    />
                  </div>

                  <ScrollArea className="h-[300px] border rounded-lg p-2">
                    {isLoadingLibrary ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Loading images...
                      </div>
                    ) : filteredMediaFiles.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 py-8">
                        <ImageIcon className="w-12 h-12 opacity-50" />
                        <p>No images found in library</p>
                        <p className="text-sm">Upload images via the Media Library tab first</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {filteredMediaFiles.map((file) => {
                          const isSelected = selectedMediaId === file.id;
                          return (
                            <div
                              key={file.id}
                              className={cn(
                                "relative border-2 rounded-lg overflow-hidden cursor-pointer hover-elevate transition-all",
                                isSelected ? "border-primary ring-2 ring-primary" : "border-border"
                              )}
                              onClick={() => setSelectedMediaId(file.id)}
                              data-testid={`library-image-${file.id}`}
                            >
                              <div className="aspect-square bg-muted">
                                <img
                                  src={`/api/media-library/${file.id}/file`}
                                  alt={file.originalFilename}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              </div>
                              {isSelected && (
                                <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1">
                                  <Check className="w-3 h-3" />
                                </div>
                              )}
                              <div className="p-1.5 bg-card">
                                <p className="text-xs truncate" title={file.originalFilename}>
                                  {file.originalFilename}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </TabsContent>

              <TabsContent value="upload" className="mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="file">Choose an image file from your computer</Label>
                    <Input
                      ref={fileInputRef}
                      id="file"
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      data-testid="input-image-file"
                    />
                    {selectedFile && (
                      <p className="text-sm text-muted-foreground">
                        Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    <p>Tip: Images uploaded here will also be added to your Media Library for future use.</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUploadDialog(false)}
              data-testid="button-cancel-upload"
            >
              Cancel
            </Button>
            {dialogMode === "library" ? (
              <Button
                onClick={handleAssignFromLibrary}
                disabled={!selectedMediaId || associateMediaMutation.isPending}
                data-testid="button-assign-from-library"
              >
                {associateMediaMutation.isPending ? "Assigning..." : "Assign Image"}
              </Button>
            ) : (
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploadMediaMutation.isPending}
                data-testid="button-confirm-upload"
              >
                {uploadMediaMutation.isPending ? "Uploading..." : "Upload"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
