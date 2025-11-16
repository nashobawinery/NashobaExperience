import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, Image as ImageIcon, X, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch products with their media
  const { data: products = [], isLoading } = useQuery<ProductWithMedia[]>({
    queryKey: ['/api/admin/products-with-media'],
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
      toast({ title: "Image Uploaded", description: "Product image uploaded successfully" });
      setShowUploadDialog(false);
      setSelectedFile(null);
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-medium">Product Media Management</h2>
          <p className="text-muted-foreground mt-1">
            Manage images for each product - primary, label, lifestyle, and gallery images
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {products.map((product) => {
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

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent data-testid="dialog-upload-image">
          <DialogHeader>
            <DialogTitle>Upload Product Image</DialogTitle>
            <DialogDescription>
              Add an image for {selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
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

            <div className="space-y-2">
              <Label htmlFor="file">Image File</Label>
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
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUploadDialog(false)}
              data-testid="button-cancel-upload"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploadMediaMutation.isPending}
              data-testid="button-confirm-upload"
            >
              {uploadMediaMutation.isPending ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
