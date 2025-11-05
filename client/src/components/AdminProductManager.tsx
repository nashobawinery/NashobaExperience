import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Plus, Edit, Trash2, Eye, Package } from "lucide-react";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: string;
  views: number;
  isStaffPick: boolean;
  isFeatured: boolean;
}

interface AdminProductManagerProps {
  products: Product[];
  onAddProduct?: () => void;
  onEditProduct?: (id: string) => void;
  onDeleteProduct?: (id: string) => void;
  onToggleStock?: (id: string) => void;
}

export default function AdminProductManager({
  products,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onToggleStock,
}: AdminProductManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: products.length,
    inStock: products.filter(p => p.stock === 'in-stock').length,
    outOfStock: products.filter(p => p.stock === 'out-of-stock').length,
    totalViews: products.reduce((sum, p) => sum + p.views, 0),
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
            <Eye className="w-8 h-8 text-chart-2" />
            <div>
              <p className="text-2xl font-serif font-semibold">{stats.totalViews}</p>
              <p className="text-sm text-muted-foreground">Total Views</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-2xl font-medium">Product Management</h2>
          <Button onClick={onAddProduct} data-testid="button-add-product">
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
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
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Badges</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id} data-testid={`row-product-${product.id}`}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{product.category}</Badge>
                    </TableCell>
                    <TableCell>${product.price.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={product.stock === 'in-stock' ? 'default' : 'destructive'}
                        className="cursor-pointer"
                        onClick={() => onToggleStock?.(product.id)}
                      >
                        {product.stock === 'in-stock' ? 'In Stock' : 'Out of Stock'}
                      </Badge>
                    </TableCell>
                    <TableCell>{product.views}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {product.isStaffPick && (
                          <Badge variant="secondary" className="text-xs">Staff Pick</Badge>
                        )}
                        {product.isFeatured && (
                          <Badge className="text-xs">Featured</Badge>
                        )}
                      </div>
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
                          onClick={() => onDeleteProduct?.(product.id)}
                          data-testid={`button-delete-${product.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
