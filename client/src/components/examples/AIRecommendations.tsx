import AIRecommendations from '../AIRecommendations';

export default function AIRecommendationsExample() {
  const mockProducts = [
    {
      id: '1',
      name: 'Pinot Noir Reserve',
      category: 'Wine',
      price: 38.99,
      description: 'Smooth and elegant with notes of cherry and earth',
      image: 'https://images.unsplash.com/photo-1586370434639-0fe43b2d32d6?w=400&q=80',
      reason: 'Similar flavor profile to your favorited Cabernet Sauvignon'
    },
    {
      id: '2',
      name: 'Barrel-Aged Bourbon',
      category: 'Spirits',
      price: 52.00,
      description: 'Rich oak and caramel notes with a smooth finish',
      image: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=400&q=80',
      reason: 'You viewed similar aged spirits products'
    },
    {
      id: '3',
      name: 'Sparkling Rosé',
      category: 'Wine',
      price: 28.99,
      description: 'Crisp and refreshing with delicate berry notes',
      image: 'https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=400&q=80',
      reason: 'Complements your preference for fruit-forward wines'
    },
    {
      id: '4',
      name: 'Craft IPA Selection',
      category: 'Beer',
      price: 16.99,
      description: 'Hoppy and bold with citrus undertones',
      image: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=400&q=80',
      reason: 'Popular pairing with wine enthusiasts'
    }
  ];

  return (
    <div className="p-6">
      <AIRecommendations
        products={mockProducts}
        onRefresh={() => console.log('Refresh recommendations')}
        onProductClick={(id) => console.log('Product clicked:', id)}
        onAddToCart={(id) => console.log('Added to cart:', id)}
        onFavoriteToggle={(id) => console.log('Favorited:', id)}
      />
    </div>
  );
}
