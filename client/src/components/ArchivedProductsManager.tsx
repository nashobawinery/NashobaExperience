import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Search, RotateCcw, Trash2, Archive, ImageOff } from "lucide-react";
import type { Product } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getArchivedProducts, restoreProduct, permanentlyDeleteProduct } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ArchivedProductsManager() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: archivedProducts = [], isLoading } = useQuery<Product[]>({
    queryKey: ['/api/products/archived'],
    queryFn: getArchivedProducts,
  });

  const restoreMutation = useMutation({
    mutationFn: restoreProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products/archived'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products-with-media'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: "Product restored",
        description: "The product has been restored and is now active again.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error restoring product",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: permanentlyDeleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products/archived'] });
      toast({
        title: "Product permanently deleted",
        description: "The product has been permanently removed from the database.",
      });
      setProductToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting product",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkRestoreMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await restoreProduct(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products/archived'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products-with-media'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: "Products restored",
        description: `Successfully restored ${selectedIds.length} product(s).`,
      });
      setSelectedIds([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Error restoring products",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredProducts = archivedProducts.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredProducts.map(p => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    }
  };

  const handleBulkRestore = () => {
    if (selectedIds.length === 0) return;
    
    if (window.confirm(`Are you sure you want to restore ${selectedIds.length} product(s)?`)) {
      bulkRestoreMutation.mutate(selectedIds);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">Loading archived products...</div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Archive className="w-6 h-6 text-muted-foreground" />
            <h2 className="font-serif text-2xl font-medium">Archived Products</h2>
            <Badge variant="secondary">{archivedProducts.length}</Badge>
          </div>
          <div className="flex gap-2">
            {selectedIds.length > 0 && (
              <Button 
                variant="default" 
                onClick={handleBulkRestore}
                disabled={bulkRestoreMutation.isPending}
                data-testid="button-bulk-restore"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Restore Selected ({selectedIds.length})
              </Button>
            )}
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search archived products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-archived"
            />
          </div>
        </div>

        {archivedProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Archive className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No archived products</h3>
            <p className="text-muted-foreground">
              When you delete products, they will appear here and can be restored.
            </p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.length === filteredProducts.length && filteredProducts.length > 0}
                      onCheckedChange={handleSelectAll}
                      data-testid="checkbox-select-all-archived"
                    />
                  </TableHead>
                  <TableHead className="w-16">Image</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Archived Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No archived products match your search
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => {
                    const isSelected = selectedIds.includes(product.id);
                    return (
                      <TableRow key={product.id} data-testid={`row-archived-product-${product.id}`}>
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectOne(product.id, checked as boolean)}
                            data-testid={`checkbox-archived-product-${product.id}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="w-12 h-12 rounded overflow-hidden bg-muted flex items-center justify-center">
                            {product.imageUrl ? (
                              <img 
                                src={product.imageUrl} 
                                alt={product.name}
                                className="w-full h-full object-cover opacity-50"
                              />
                            ) : (
                              <ImageOff className="w-6 h-6 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-muted-foreground">{product.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{product.category}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">${Number(product.price).toFixed(2)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {product.archivedAt 
                            ? new Date(product.archivedAt).toLocaleDateString()
                            : 'Unknown'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => restoreMutation.mutate(product.id)}
                              disabled={restoreMutation.isPending}
                              data-testid={`button-restore-${product.id}`}
                            >
                              <RotateCcw className="w-4 h-4 mr-1" />
                              Restore
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setProductToDelete(product.id);
                                setDeleteDialogOpen(true);
                              }}
                              data-testid={`button-permanent-delete-${product.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the product from the database and it cannot be recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-permanent-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (productToDelete) {
                  permanentDeleteMutation.mutate(productToDelete);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-permanent-delete"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
