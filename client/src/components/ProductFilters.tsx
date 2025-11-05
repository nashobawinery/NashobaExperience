import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, SlidersHorizontal } from "lucide-react";

interface ProductFiltersProps {
  searchQuery: string;
  selectedCategory: string;
  sortBy: string;
  priceRange: string;
  wineColor?: string;
  sweetness?: string;
  onSearchChange: (query: string) => void;
  onCategoryChange: (category: string) => void;
  onSortChange: (sort: string) => void;
  onPriceRangeChange: (range: string) => void;
  onWineColorChange?: (color: string) => void;
  onSweetnessChange?: (sweetness: string) => void;
  onClearFilters: () => void;
}

export default function ProductFilters({
  searchQuery,
  selectedCategory,
  sortBy,
  priceRange,
  wineColor = 'all',
  sweetness = 'all',
  onSearchChange,
  onCategoryChange,
  onSortChange,
  onPriceRangeChange,
  onWineColorChange,
  onSweetnessChange,
  onClearFilters,
}: ProductFiltersProps) {
  const hasActiveFilters = selectedCategory !== 'all' || priceRange !== 'all' || wineColor !== 'all' || sweetness !== 'all';

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
        
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="icon"
            onClick={onClearFilters}
            data-testid="button-clear-filters"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={selectedCategory} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-[180px]" data-testid="select-category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Wine">Wine</SelectItem>
            <SelectItem value="Spirits">Spirits</SelectItem>
            <SelectItem value="Beer">Beer</SelectItem>
            <SelectItem value="Canned Cocktails">Canned Cocktails</SelectItem>
            <SelectItem value="Canned Wine">Canned Wine</SelectItem>
          </SelectContent>
        </Select>

        {selectedCategory === 'Wine' && (
          <>
            <Select value={wineColor} onValueChange={onWineColorChange}>
              <SelectTrigger className="w-[150px]" data-testid="select-wine-color">
                <SelectValue placeholder="Color" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Colors</SelectItem>
                <SelectItem value="red">Red</SelectItem>
                <SelectItem value="white">White</SelectItem>
                <SelectItem value="rosé">Rosé</SelectItem>
                <SelectItem value="sparkling">Sparkling</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sweetness} onValueChange={onSweetnessChange}>
              <SelectTrigger className="w-[150px]" data-testid="select-sweetness">
                <SelectValue placeholder="Sweetness" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="dry">Dry</SelectItem>
                <SelectItem value="off-dry">Off-Dry</SelectItem>
                <SelectItem value="semi-sweet">Semi-Sweet</SelectItem>
                <SelectItem value="sweet">Sweet</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}

        <Select value={priceRange} onValueChange={onPriceRangeChange}>
          <SelectTrigger className="w-[150px]" data-testid="select-price">
            <SelectValue placeholder="Price Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Prices</SelectItem>
            <SelectItem value="0-20">Under $20</SelectItem>
            <SelectItem value="20-40">$20 - $40</SelectItem>
            <SelectItem value="40-60">$40 - $60</SelectItem>
            <SelectItem value="60+">$60+</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-[180px]" data-testid="select-sort">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name (A-Z)</SelectItem>
            <SelectItem value="price-low">Price (Low to High)</SelectItem>
            <SelectItem value="price-high">Price (High to Low)</SelectItem>
            <SelectItem value="popular">Most Popular</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {selectedCategory !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {selectedCategory}
              <button onClick={() => onCategoryChange('all')}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {priceRange !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              ${priceRange}
              <button onClick={() => onPriceRangeChange('all')}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {wineColor !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {wineColor}
              <button onClick={() => onWineColorChange?.('all')}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {sweetness !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {sweetness}
              <button onClick={() => onSweetnessChange?.('all')}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
