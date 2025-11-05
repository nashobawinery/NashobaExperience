import { useState } from 'react';
import ProductFilters from '../ProductFilters';

export default function ProductFiltersExample() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [priceRange, setPriceRange] = useState('all');
  const [wineColor, setWineColor] = useState('all');
  const [sweetness, setSweetness] = useState('all');

  return (
    <div className="p-6">
      <ProductFilters
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
        sortBy={sortBy}
        priceRange={priceRange}
        wineColor={wineColor}
        sweetness={sweetness}
        onSearchChange={setSearchQuery}
        onCategoryChange={setSelectedCategory}
        onSortChange={setSortBy}
        onPriceRangeChange={setPriceRange}
        onWineColorChange={setWineColor}
        onSweetnessChange={setSweetness}
        onClearFilters={() => {
          setSelectedCategory('all');
          setPriceRange('all');
          setWineColor('all');
          setSweetness('all');
        }}
      />
    </div>
  );
}
