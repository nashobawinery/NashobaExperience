import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Save, Undo2, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Product, FilterOption } from "@shared/schema";

interface ProductChanges {
  [productId: string]: Partial<Product>;
}

type SortField = 'name' | 'sku' | 'price' | 'stockQuantity' | 'category' | 'type' | 'description';
type SortDirection = 'asc' | 'desc' | null;

type CategoryFilter = 'all' | 'wine' | 'beer' | 'spirits' | 'canned_cocktail' | 'canned_wine';

export default function BulkProductEditor() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [changes, setChanges] = useState<ProductChanges>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: filterOptions = [] } = useQuery<FilterOption[]>({
    queryKey: ["/api/filter-options"],
  });

  // Helper to get filter options by field type
  const getFilterOptionsByType = (fieldType: string) => {
    return filterOptions
      .filter(opt => opt.fieldType === fieldType && opt.isActive)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  };

  const sweetnessOptions = getFilterOptionsByType('sweetness');
  const bodyOptions = getFilterOptionsByType('body');
  const beerStyleOptions = getFilterOptionsByType('beer_style');
  const beerColorOptions = getFilterOptionsByType('beer_color');
  const beerBitternessOptions = getFilterOptionsByType('beer_bitterness');
  const spiritTypeOptions = getFilterOptionsByType('spirit_type');
  const spiritAgingOptions = getFilterOptionsByType('spirit_aging');
  const spiritFlavorOptions = getFilterOptionsByType('spirit_flavor');

  // Category configuration for conditional column rendering
  // Columns: Name, SKU, Price, Stock, Category, Type, [category-specific], Description, Tasting Notes, Staff Pick, Featured, New
  const categoryConfig = {
    all: {
      // 6 core + 0 category + 5 end = 11 columns
      gridTemplate: 'grid-cols-[250px_120px_100px_80px_120px_180px_350px_250px_100px_100px_100px]',
      minWidth: 'min-w-[1670px]',
    },
    wine: {
      // 6 core + 6 wine + 5 end = 17 columns
      gridTemplate: 'grid-cols-[250px_120px_100px_80px_120px_180px_180px_140px_100px_140px_130px_130px_350px_250px_100px_100px_100px]',
      minWidth: 'min-w-[2660px]',
    },
    beer: {
      // 6 core + 3 beer + 5 end = 14 columns
      gridTemplate: 'grid-cols-[250px_120px_100px_80px_120px_180px_150px_150px_150px_350px_250px_100px_100px_100px]',
      minWidth: 'min-w-[2220px]',
    },
    spirits: {
      // 6 core + 3 spirits + 5 end = 14 columns
      gridTemplate: 'grid-cols-[250px_120px_100px_80px_120px_180px_150px_150px_150px_350px_250px_100px_100px_100px]',
      minWidth: 'min-w-[2220px]',
    },
    canned_cocktail: {
      // 6 core + 6 wine + 5 end = 17 columns
      gridTemplate: 'grid-cols-[250px_120px_100px_80px_120px_180px_180px_140px_100px_140px_130px_130px_350px_250px_100px_100px_100px]',
      minWidth: 'min-w-[2660px]',
    },
    canned_wine: {
      // 6 core + 6 wine + 5 end = 17 columns
      gridTemplate: 'grid-cols-[250px_120px_100px_80px_120px_180px_180px_140px_100px_140px_130px_130px_350px_250px_100px_100px_100px]',
      minWidth: 'min-w-[2660px]',
    },
  };

  const config = categoryConfig[categoryFilter];

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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 ml-1 inline opacity-50" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="w-3 h-3 ml-1 inline" />;
    }
    return <ArrowDown className="w-3 h-3 ml-1 inline" />;
  };

  const filteredProducts = products
    .filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (!sortField || !sortDirection) return 0;

      let comparison = 0;
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'sku') {
        comparison = (a.sku || '').localeCompare(b.sku || '');
      } else if (sortField === 'price') {
        comparison = Number(a.price) - Number(b.price);
      } else if (sortField === 'stockQuantity') {
        comparison = (a.stockQuantity || 0) - (b.stockQuantity || 0);
      } else if (sortField === 'category') {
        comparison = a.category.localeCompare(b.category);
      } else if (sortField === 'type') {
        comparison = (a.type || '').localeCompare(b.type || '');
      } else if (sortField === 'description') {
        comparison = a.description.localeCompare(b.description);
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (newSize: string) => {
    setPageSize(Number(newSize));
    setCurrentPage(1);
  };

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

        <div className="mb-6 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">Category:</span>
            {(['all', 'wine', 'beer', 'spirits', 'canned_cocktail', 'canned_wine'] as const).map((category) => (
              <Button
                key={category}
                variant={categoryFilter === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setCategoryFilter(category);
                  setCurrentPage(1);
                }}
                data-testid={`button-category-${category}`}
              >
                {category === 'all' ? 'All' : 
                 category === 'canned_cocktail' ? 'Canned Cocktail' :
                 category === 'canned_wine' ? 'Canned Wine' :
                 category.charAt(0).toUpperCase() + category.slice(1)}
              </Button>
            ))}
          </div>
          
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
          {/* Grid layout changes based on category filter */}
          <div className={config.minWidth}>
            <div className={`gap-2 font-medium text-sm pb-2 border-b grid ${config.gridTemplate}`}>
              <div 
                className="cursor-pointer hover-elevate rounded px-2 py-1"
                onClick={() => handleSort('name')}
                data-testid="header-sort-name"
              >
                Product Name{getSortIcon('name')}
              </div>
              <div 
                className="cursor-pointer hover-elevate rounded px-2 py-1"
                onClick={() => handleSort('sku')}
                data-testid="header-sort-sku"
              >
                SKU{getSortIcon('sku')}
              </div>
              <div 
                className="cursor-pointer hover-elevate rounded px-2 py-1"
                onClick={() => handleSort('price')}
                data-testid="header-sort-price"
              >
                Price{getSortIcon('price')}
              </div>
              <div 
                className="cursor-pointer hover-elevate rounded px-2 py-1"
                onClick={() => handleSort('stockQuantity')}
                data-testid="header-sort-stock"
              >
                Stock{getSortIcon('stockQuantity')}
              </div>
              <div 
                className="cursor-pointer hover-elevate rounded px-2 py-1"
                onClick={() => handleSort('category')}
                data-testid="header-sort-category"
              >
                Category{getSortIcon('category')}
              </div>
              <div 
                className="cursor-pointer hover-elevate rounded px-2 py-1"
                onClick={() => handleSort('type')}
                data-testid="header-sort-type"
              >
                Type{getSortIcon('type')}
              </div>
              
              {/* Category-specific headers */}
              {(categoryFilter === 'wine' || categoryFilter === 'canned_wine' || categoryFilter === 'canned_cocktail') && (
                <>
                  <div className="px-2 py-1">Wine Color</div>
                  <div className="px-2 py-1">Varietal</div>
                  <div className="px-2 py-1">Vintage</div>
                  <div className="px-2 py-1">Region</div>
                  <div className="px-2 py-1">Sweetness</div>
                  <div className="px-2 py-1">Body</div>
                </>
              )}
              
              {categoryFilter === 'beer' && (
                <>
                  <div className="px-2 py-1">Beer Style</div>
                  <div className="px-2 py-1">Beer Color</div>
                  <div className="px-2 py-1">Bitterness</div>
                </>
              )}
              
              {categoryFilter === 'spirits' && (
                <>
                  <div className="px-2 py-1">Spirit Type</div>
                  <div className="px-2 py-1">Aging</div>
                  <div className="px-2 py-1">Flavor</div>
                </>
              )}
              
              <div 
                className="cursor-pointer hover-elevate rounded px-2 py-1"
                onClick={() => handleSort('description')}
                data-testid="header-sort-description"
              >
                Description{getSortIcon('description')}
              </div>
              <div className="px-2 py-1">Tasting Notes</div>
              <div className="text-center px-2 py-1">Staff Pick</div>
              <div className="text-center px-2 py-1">Featured</div>
              <div className="text-center px-2 py-1">New</div>
            </div>

            <div className="space-y-2 mt-2">
              {paginatedProducts.map((product) => (
                <div
                  key={product.id}
                  className={`grid ${config.gridTemplate} gap-2 items-start py-2 ${
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
                  
                  {/* Category-specific row cells */}
                  {(categoryFilter === 'wine' || categoryFilter === 'canned_wine' || categoryFilter === 'canned_cocktail') && (
                    <>
                      <Select
                        value={(getFieldValue(product, 'wineColor') as string) || ''}
                        onValueChange={(value) => updateField(product.id, 'wineColor', value || null)}
                      >
                        <SelectTrigger className="h-9" data-testid={`select-wine-color-${product.id}`}>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="red">Red</SelectItem>
                          <SelectItem value="white">White</SelectItem>
                          <SelectItem value="rosé">Rosé</SelectItem>
                          <SelectItem value="sparkling">Sparkling</SelectItem>
                          <SelectItem value="dessert">Dessert</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Input
                        value={getFieldValue(product, 'varietal') as string || ''}
                        onChange={(e) => updateField(product.id, 'varietal', e.target.value)}
                        placeholder="e.g., Merlot"
                        className="h-9"
                        data-testid={`input-varietal-${product.id}`}
                      />
                      
                      <Input
                        value={getFieldValue(product, 'vintageYear') as string || ''}
                        onChange={(e) => updateField(product.id, 'vintageYear', e.target.value)}
                        placeholder="e.g., 2020"
                        className="h-9"
                        data-testid={`input-vintage-${product.id}`}
                      />
                      
                      <Input
                        value={getFieldValue(product, 'region') as string || ''}
                        onChange={(e) => updateField(product.id, 'region', e.target.value)}
                        placeholder="e.g., Napa"
                        className="h-9"
                        data-testid={`input-region-${product.id}`}
                      />
                      
                      <Select
                        value={(getFieldValue(product, 'sweetness') as string) || ''}
                        onValueChange={(value) => updateField(product.id, 'sweetness', value || null)}
                      >
                        <SelectTrigger className="h-9" data-testid={`select-sweetness-${product.id}`}>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {sweetnessOptions.map((option) => (
                            <SelectItem key={option.id} value={option.optionValue}>
                              {option.displayLabel}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select
                        value={(getFieldValue(product, 'body') as string) || ''}
                        onValueChange={(value) => updateField(product.id, 'body', value || null)}
                      >
                        <SelectTrigger className="h-9" data-testid={`select-body-${product.id}`}>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {bodyOptions.map((option) => (
                            <SelectItem key={option.id} value={option.optionValue}>
                              {option.displayLabel}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  )}
                  
                  {categoryFilter === 'beer' && (
                    <>
                      <Select
                        value={(getFieldValue(product, 'beerStyle') as string) || ''}
                        onValueChange={(value) => updateField(product.id, 'beerStyle', value || null)}
                      >
                        <SelectTrigger className="h-9" data-testid={`select-beer-style-${product.id}`}>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {beerStyleOptions.map((option) => (
                            <SelectItem key={option.id} value={option.optionValue}>
                              {option.displayLabel}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select
                        value={(getFieldValue(product, 'beerColor') as string) || ''}
                        onValueChange={(value) => updateField(product.id, 'beerColor', value || null)}
                      >
                        <SelectTrigger className="h-9" data-testid={`select-beer-color-${product.id}`}>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {beerColorOptions.map((option) => (
                            <SelectItem key={option.id} value={option.optionValue}>
                              {option.displayLabel}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select
                        value={(getFieldValue(product, 'beerBitterness') as string) || ''}
                        onValueChange={(value) => updateField(product.id, 'beerBitterness', value || null)}
                      >
                        <SelectTrigger className="h-9" data-testid={`select-beer-bitterness-${product.id}`}>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {beerBitternessOptions.map((option) => (
                            <SelectItem key={option.id} value={option.optionValue}>
                              {option.displayLabel}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  )}
                  
                  {categoryFilter === 'spirits' && (
                    <>
                      <Select
                        value={(getFieldValue(product, 'spiritType') as string) || ''}
                        onValueChange={(value) => updateField(product.id, 'spiritType', value || null)}
                      >
                        <SelectTrigger className="h-9" data-testid={`select-spirit-type-${product.id}`}>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {spiritTypeOptions.map((option) => (
                            <SelectItem key={option.id} value={option.optionValue}>
                              {option.displayLabel}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select
                        value={(getFieldValue(product, 'spiritAging') as string) || ''}
                        onValueChange={(value) => updateField(product.id, 'spiritAging', value || null)}
                      >
                        <SelectTrigger className="h-9" data-testid={`select-spirit-aging-${product.id}`}>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {spiritAgingOptions.map((option) => (
                            <SelectItem key={option.id} value={option.optionValue}>
                              {option.displayLabel}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select
                        value={(getFieldValue(product, 'spiritFlavor') as string) || ''}
                        onValueChange={(value) => updateField(product.id, 'spiritFlavor', value || null)}
                      >
                        <SelectTrigger className="h-9" data-testid={`select-spirit-flavor-${product.id}`}>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {spiritFlavorOptions.map((option) => (
                            <SelectItem key={option.id} value={option.optionValue}>
                              {option.displayLabel}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  )}
                  
                  <Textarea
                    value={getFieldValue(product, 'description') as string}
                    onChange={(e) => updateField(product.id, 'description', e.target.value)}
                    placeholder="Product description..."
                    className="min-h-[36px] h-9 resize-none"
                    data-testid={`input-description-${product.id}`}
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

        {filteredProducts.length > 0 && (
          <div className="mt-6 flex items-center justify-between border-t pt-4">
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} products
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Items per page:</span>
                <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                  <SelectTrigger className="w-20 h-9" data-testid="select-page-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">6</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNumber;
                  if (totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (currentPage <= 3) {
                    pageNumber = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i;
                  } else {
                    pageNumber = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNumber}
                      variant={currentPage === pageNumber ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNumber)}
                      className="w-9"
                      data-testid={`button-page-${pageNumber}`}
                    >
                      {pageNumber}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                data-testid="button-next-page"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
