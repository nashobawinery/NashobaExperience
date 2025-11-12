import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Save, Undo2, Search } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Product } from "@shared/schema";

interface ProductChanges {
  [productId: string]: Partial<Product>;
}

export default function BulkProductEditor() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [changes, setChanges] = useState<ProductChanges>({});

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const saveChangesMutation = useMutation({
    mutationFn: async (updates: ProductChanges) => {
      const bulkUpdate = Object.entries(updates).map(([id, data]) => ({
        id,
        ...data,
      }));
      return apiRequest("POST", "/api/admin/products/bulk-update", { products: bulkUpdate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setChanges({});
      toast({
        title: "Changes saved",
        description: `Updated ${Object.keys(changes).length} products successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: error.message,
      });
    },
  });

  const updateField = (productId: string, field: keyof Product, value: any) => {
    setChanges(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value,
      },
    }));
  };

  const getFieldValue = (product: Product, field: keyof Product) => {
    if (changes[product.id] && field in changes[product.id]) {
      return changes[product.id][field];
    }
    return product[field];
  };

  const hasChanges = (productId: string) => {
    return !!changes[productId] && Object.keys(changes[productId]).length > 0;
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const changedProductsCount = Object.keys(changes).length;

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="text-center py-8 text-muted-foreground">Loading products...</div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-serif text-2xl font-medium">Bulk Product Editor</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Edit multiple products at once - changes are saved when you click Save Changes
            </p>
          </div>
          <div className="flex gap-2">
            {changedProductsCount > 0 && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setChanges({})}
                  disabled={saveChangesMutation.isPending}
                  data-testid="button-discard-changes"
                >
                  <Undo2 className="w-4 h-4 mr-2" />
                  Discard ({changedProductsCount})
                </Button>
                <Button
                  onClick={() => saveChangesMutation.mutate(changes)}
                  disabled={saveChangesMutation.isPending}
                  data-testid="button-save-changes"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saveChangesMutation.isPending ? "Saving..." : `Save Changes (${changedProductsCount})`}
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products by name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-bulk-edit"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[1400px]">
            <div className="grid grid-cols-[300px_120px_100px_80px_120px_200px_300px_100px_100px_100px] gap-2 font-medium text-sm pb-2 border-b">
              <div>Product Name</div>
              <div>SKU</div>
              <div>Price</div>
              <div>Stock</div>
              <div>Category</div>
              <div>Type</div>
              <div>Tasting Notes</div>
              <div>Staff Pick</div>
              <div>Featured</div>
              <div>New</div>
            </div>

            <div className="space-y-2 mt-2">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className={`grid grid-cols-[300px_120px_100px_80px_120px_200px_300px_100px_100px_100px] gap-2 items-start py-2 ${
                    hasChanges(product.id) ? 'bg-accent/10 rounded-lg px-2' : ''
                  }`}
                  data-testid={`row-bulk-edit-${product.id}`}
                >
                  <Input
                    value={getFieldValue(product, 'name') as string}
                    onChange={(e) => updateField(product.id, 'name', e.target.value)}
                    className="h-9"
                    data-testid={`input-name-${product.id}`}
                  />
                  
                  <Input
                    value={getFieldValue(product, 'sku') as string || ''}
                    onChange={(e) => updateField(product.id, 'sku', e.target.value)}
                    className="h-9 font-mono text-sm"
                    placeholder="No SKU"
                    data-testid={`input-sku-${product.id}`}
                  />
                  
                  <Input
                    type="number"
                    step="0.01"
                    value={getFieldValue(product, 'price') as string}
                    onChange={(e) => updateField(product.id, 'price', e.target.value)}
                    className="h-9"
                    data-testid={`input-price-${product.id}`}
                  />
                  
                  <Input
                    type="number"
                    value={getFieldValue(product, 'stockQuantity') as number || 0}
                    onChange={(e) => updateField(product.id, 'stockQuantity', parseInt(e.target.value, 10))}
                    className="h-9"
                    data-testid={`input-stock-${product.id}`}
                  />
                  
                  <Select
                    value={getFieldValue(product, 'category') as string}
                    onValueChange={(value) => updateField(product.id, 'category', value)}
                  >
                    <SelectTrigger className="h-9" data-testid={`select-category-${product.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wine">Wine</SelectItem>
                      <SelectItem value="spirits">Spirits</SelectItem>
                      <SelectItem value="beer">Beer</SelectItem>
                      <SelectItem value="canned_cocktail">Canned Cocktail</SelectItem>
                      <SelectItem value="canned_wine">Canned Wine</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Input
                    value={getFieldValue(product, 'type') as string || ''}
                    onChange={(e) => updateField(product.id, 'type', e.target.value)}
                    placeholder="e.g., Red Wine"
                    className="h-9"
                    data-testid={`input-type-${product.id}`}
                  />
                  
                  <Textarea
                    value={getFieldValue(product, 'tastingNotes') as string || ''}
                    onChange={(e) => updateField(product.id, 'tastingNotes', e.target.value)}
                    placeholder="Add tasting notes..."
                    className="min-h-[36px] h-9 resize-none"
                    data-testid={`input-tasting-notes-${product.id}`}
                  />
                  
                  <div className="flex items-center justify-center h-9">
                    <Checkbox
                      checked={getFieldValue(product, 'staffPick') as boolean}
                      onCheckedChange={(checked) => updateField(product.id, 'staffPick', checked)}
                      data-testid={`checkbox-staff-pick-${product.id}`}
                    />
                  </div>
                  
                  <div className="flex items-center justify-center h-9">
                    <Checkbox
                      checked={getFieldValue(product, 'featured') as boolean}
                      onCheckedChange={(checked) => updateField(product.id, 'featured', checked)}
                      data-testid={`checkbox-featured-${product.id}`}
                    />
                  </div>
                  
                  <div className="flex items-center justify-center h-9">
                    <Checkbox
                      checked={getFieldValue(product, 'newArrival') as boolean}
                      onCheckedChange={(checked) => updateField(product.id, 'newArrival', checked)}
                      data-testid={`checkbox-new-arrival-${product.id}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No products found matching your search
          </div>
        )}
      </Card>
    </div>
  );
}
