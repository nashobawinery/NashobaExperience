import ProductCard from '../ProductCard';

export default function ProductCardExample() {
  return (
    <div className="p-6 max-w-sm">
      <ProductCard
        id="1"
        name="Reserve Cabernet Sauvignon"
        category="Wine"
        price={34.99}
        description="Rich and full-bodied with notes of dark cherry, oak, and subtle vanilla undertones"
        image="https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80"
        viewCount={12}
        isStaffPick={true}
        onFavoriteToggle={(id) => console.log('Favorited:', id)}
        onAddToCart={(id) => console.log('Added to cart:', id)}
        onClick={(id) => console.log('Clicked product:', id)}
      />
    </div>
  );
}
