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
import { Search, X, SlidersHorizontal, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getFilterOptions } from "@/lib/api";
import type { FilterOption } from "@shared/schema";

interface ProductFiltersProps {
  searchQuery: string;
  selectedCategory: string;
  sortBy: string;
  priceRange: string;
  wineColor?: string;
  sweetness?: string;
  body?: string;
  characteristics?: string;
  onSearchChange: (query: string) => void;
  onCategoryChange: (category: string) => void;
  onSortChange: (sort: string) => void;
  onPriceRangeChange: (range: string) => void;
  onWineColorChange?: (color: string) => void;
  onSweetnessChange?: (sweetness: string) => void;
  onBodyChange?: (body: string) => void;
  onCharacteristicsChange?: (characteristics: string) => void;
  onClearFilters: () => void;
}

export default function ProductFilters({
  searchQuery,
  selectedCategory,
  sortBy,
  priceRange,
  wineColor = 'all',
  sweetness = 'all',
  body = 'all',
  characteristics = 'all',
  onSearchChange,
  onCategoryChange,
  onSortChange,
  onPriceRangeChange,
  onWineColorChange,
  onSweetnessChange,
  onBodyChange,
  onCharacteristicsChange,
  onClearFilters,
}: ProductFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const { data: filterOptions = [] } = useQuery<FilterOption[]>({
    queryKey: ['/api/filter-options'],
    queryFn: () => getFilterOptions(),
  });

  const groupedOptions = useMemo(() => {
    const grouped = filterOptions.reduce((acc, option) => {
      if (!acc[option.fieldType]) {
        acc[option.fieldType] = [];
      }
      if (option.isActive) {
        acc[option.fieldType].push(option);
      }
      return acc;
    }, {} as Record<string, FilterOption[]>);

    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => a.sortOrder - b.sortOrder);
    });

    return grouped;
  }, [filterOptions]);
  
  const hasActiveFilters = selectedCategory !== 'all' || priceRange !== 'all' || 
    wineColor !== 'all' || sweetness !== 'all' || body !== 'all' || characteristics !== 'all';

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
            {groupedOptions.category?.map((option) => (
              <SelectItem key={option.id} value={option.optionValue}>
                {option.displayLabel}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedCategory === 'wine' && (
          <>
            <Select value={wineColor} onValueChange={onWineColorChange}>
              <SelectTrigger className="w-[150px]" data-testid="select-wine-color">
                <SelectValue placeholder="Wine Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {groupedOptions.wine_color?.map((option) => (
                  <SelectItem key={option.id} value={option.optionValue}>
                    {option.displayLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sweetness} onValueChange={onSweetnessChange}>
              <SelectTrigger className="w-[150px]" data-testid="select-sweetness">
                <SelectValue placeholder="Sweetness" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sweetness</SelectItem>
                {groupedOptions.sweetness?.map((option) => (
                  <SelectItem key={option.id} value={option.optionValue}>
                    {option.displayLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="gap-2"
              data-testid="button-advanced-filters"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Advanced
              <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </Button>
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

      {/* Advanced Filters for Wine */}
      {selectedCategory === 'Wine' && showAdvanced && (
        <div className="flex flex-wrap gap-3 p-4 bg-muted/30 rounded-lg border">
          <Select value={body} onValueChange={onBodyChange}>
            <SelectTrigger className="w-[160px]" data-testid="select-body">
              <SelectValue placeholder="Body" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Body Types</SelectItem>
              {groupedOptions.body?.map((option) => (
                <SelectItem key={option.id} value={option.optionValue}>
                  {option.displayLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={characteristics} onValueChange={onCharacteristicsChange}>
            <SelectTrigger className="w-[200px]" data-testid="select-characteristics">
              <SelectValue placeholder="Characteristics" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Characteristics</SelectItem>
              {groupedOptions.characteristics?.map((option) => (
                <SelectItem key={option.id} value={option.optionValue}>
                  {option.displayLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="text-xs text-muted-foreground flex items-center px-2">
            <span>Pro tip: Combine filters to find your perfect match!</span>
          </div>
        </div>
      )}

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
          {body !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {body}
              <button onClick={() => onBodyChange?.('all')}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {characteristics !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {characteristics}
              <button onClick={() => onCharacteristicsChange?.('all')}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
