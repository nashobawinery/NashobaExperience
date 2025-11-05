import FavoritesPanel from '../FavoritesPanel';

export default function FavoritesPanelExample() {
  const mockFavorites = [
    {
      id: '1',
      name: 'Reserve Cabernet Sauvignon',
      category: 'Wine',
      price: 34.99,
      image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
      note: 'Excellent with steak. Bold and smooth finish.'
    },
    {
      id: '2',
      name: 'Aged Apple Brandy',
      category: 'Spirits',
      price: 45.00,
      image: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=400&q=80',
      note: ''
    },
  ];

  return (
    <div className="h-screen max-w-md">
      <FavoritesPanel
        favorites={mockFavorites}
        onUpdateNote={(id, note) => console.log('Update note:', id, note)}
        onRemoveFavorite={(id) => console.log('Remove favorite:', id)}
        onAddToCart={(id) => console.log('Add to cart:', id)}
        onEmailFavorites={() => console.log('Email favorites')}
      />
    </div>
  );
}
