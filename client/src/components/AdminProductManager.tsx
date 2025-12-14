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
import { Search, Plus, Edit, Trash2, Eye, Package, ArrowUpDown, ArrowUp, ArrowDown, ImageOff, Archive } from "lucide-react";
import type { Product } from "@shared/schema";
import { type ProductWithMedia, getPrimaryImageUrl } from "@/lib/productImageUtils";
import { useMutation } from "@tanstack/react-query";
import { archiveProduct } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type SortField = 'name' | 'category' | 'price' | 'stockQuantity';
type SortDirection = 'asc' | 'desc' | null;

interface AdminProductManagerProps {
  products: ProductWithMedia[];
  onAddProduct?: () => void;
  onEditProduct?: (id: string) => void;
  onDeleteProduct?: (id: string) => void;
  onToggleStock?: (id: string) => void;
  onToggleIgnoreInventory?: (id: string) => void;
}

export default function AdminProductManager({
  products,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onToggleStock,
  onToggleIgnoreInventory,
}: AdminProductManagerProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 inline-block text-muted-foreground" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="w-4 h-4 ml-1 inline-block text-primary" />;
    }
    return <ArrowDown className="w-4 h-4 ml-1 inline-block text-primary" />;
  };

  const filteredProducts = products
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (!sortField || !sortDirection) return 0;

      let comparison = 0;
      
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'category') {
        comparison = a.category.localeCompare(b.category);
      } else if (sortField === 'price') {
        comparison = Number(a.price) - Number(b.price);
      } else if (sortField === 'stockQuantity') {
        comparison = (a.stockQuantity ?? 0) - (b.stockQuantity ?? 0);
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

  const bulkArchiveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await archiveProduct(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: "Products archived",
        description: `Successfully archived ${selectedIds.length} product(s). You can restore them from the archived products section.`,
      });
      setSelectedIds([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Error archiving products",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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

  const handleBulkArchive = () => {
    if (selectedIds.length === 0) return;
    
    if (window.confirm(`Are you sure you want to archive ${selectedIds.length} product(s)? You can restore them later from the archived products section.`)) {
      bulkArchiveMutation.mutate(selectedIds);
    }
  };

  const stats = {
    total: products.length,
    inStock: products.filter(p => (p.stockQuantity ?? 0) > 0).length,
    outOfStock: products.filter(p => (p.stockQuantity ?? 0) === 0).length,
    staffPicks: products.filter(p => p.staffPick).length,
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-primary" />
            <div>
              <p className="text-2xl font-serif font-semibold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Products</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-green-600" />
            </div>
            <div>
              <p className="text-2xl font-serif font-semibold">{stats.inStock}</p>
              <p className="text-sm text-muted-foreground">In Stock</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-destructive" />
            </div>
            <div>
              <p className="text-2xl font-serif font-semibold">{stats.outOfStock}</p>
              <p className="text-sm text-muted-foreground">Out of Stock</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-chart-2" />
            <div>
              <p className="text-2xl font-serif font-semibold">{stats.staffPicks}</p>
              <p className="text-sm text-muted-foreground">Staff Picks</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-2xl font-medium">Product Management</h2>
          <div className="flex gap-2">
            {selectedIds.length > 0 && (
              <Button 
                variant="secondary" 
                onClick={handleBulkArchive}
                disabled={bulkArchiveMutation.isPending}
                data-testid="button-bulk-archive"
              >
                <Archive className="w-4 h-4 mr-2" />
                Archive Selected ({selectedIds.length})
              </Button>
            )}
            <Button onClick={onAddProduct} data-testid="button-add-product">
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-products"
            />
          </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.length === filteredProducts.length && filteredProducts.length > 0}
                    onCheckedChange={handleSelectAll}
                    data-testid="checkbox-select-all"
                  />
                </TableHead>
                <TableHead className="w-16">Image</TableHead>
                <TableHead 
                  className="cursor-pointer hover-elevate select-none"
                  onClick={() => handleSort('name')}
                  data-testid="header-sort-name"
                >
                  Product{getSortIcon('name')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover-elevate select-none"
                  onClick={() => handleSort('category')}
                  data-testid="header-sort-category"
                >
                  Category{getSortIcon('category')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover-elevate select-none"
                  onClick={() => handleSort('price')}
                  data-testid="header-sort-price"
                >
                  Price{getSortIcon('price')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover-elevate select-none"
                  onClick={() => handleSort('stockQuantity')}
                  data-testid="header-sort-stock"
                >
                  Stock{getSortIcon('stockQuantity')}
                </TableHead>
                <TableHead>Inventory</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => {
                  const imageUrl = getPrimaryImageUrl(product);
                  const isSelected = selectedIds.includes(product.id);
                  return (
                  <TableRow key={product.id} data-testid={`row-product-${product.id}`}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectOne(product.id, checked as boolean)}
                        data-testid={`checkbox-product-${product.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="w-12 h-12 rounded overflow-hidden bg-muted flex items-center justify-center">
                        {imageUrl ? (
                          <img 
                            src={imageUrl} 
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageOff className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{product.category}</Badge>
                    </TableCell>
                    <TableCell>${Number(product.price).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={(product.stockQuantity ?? 0) > 0 ? 'default' : 'destructive'}
                        className="cursor-pointer"
                        onClick={() => onToggleStock?.(product.id)}
                        data-testid={`badge-stock-${product.id}`}
                      >
                        {(product.stockQuantity ?? 0) > 0 ? `${product.stockQuantity ?? 0} in stock` : 'Out of Stock'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={product.ignoreInventory ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => onToggleIgnoreInventory?.(product.id)}
                        data-testid={`badge-inventory-${product.id}`}
                      >
                        {product.ignoreInventory ? 'Ignored' : 'Tracked'}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`cell-sku-${product.id}`}>
                      {product.sku ? (
                        <span className="font-mono text-sm">{product.sku}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm italic">No SKU</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEditProduct?.(product.id)}
                          data-testid={`button-edit-${product.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setProductToDelete(product.id);
                            setDeleteDialogOpen(true);
                          }}
                          data-testid={`button-delete-${product.id}`}
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
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the product from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">No</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (productToDelete) {
                  onDeleteProduct?.(productToDelete);
                  setProductToDelete(null);
                }
              }}
              data-testid="button-confirm-delete"
            >
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
