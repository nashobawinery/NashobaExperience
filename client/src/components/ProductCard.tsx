import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, ShoppingCart, Eye } from "lucide-react";

interface ProductCardProps {
  id: string;
  name: string;
  category: string;
  price: number;
  image?: string;
  description: string;
  isFavorite?: boolean;
  viewCount?: number;
  isStaffPick?: boolean;
  isFeatured?: boolean;
  onFavoriteToggle?: (id: string) => void;
  onAddToCart?: (id: string) => void;
  onClick?: (id: string) => void;
}

export default function ProductCard({
  id,
  name,
  category,
  price,
  image,
  description,
  isFavorite = false,
  viewCount = 0,
  isStaffPick = false,
  isFeatured = false,
  onFavoriteToggle,
  onAddToCart,
  onClick,
}: ProductCardProps) {
  const [favorite, setFavorite] = useState(isFavorite);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorite(!favorite);
    onFavoriteToggle?.(id);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart?.(id);
  };

  return (
    <Card 
      className="overflow-hidden hover-elevate cursor-pointer group"
      onClick={() => onClick?.(id)}
      data-testid={`card-product-${id}`}
    >
      <div className="relative aspect-[3/4] bg-muted overflow-hidden">
        {image ? (
          <img 
            src={image} 
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-muted-foreground text-4xl">🍷</div>
          </div>
        )}
        
        <button
          onClick={handleFavoriteClick}
          className="absolute top-3 right-3 p-2 rounded-full bg-background/80 backdrop-blur-sm hover-elevate active-elevate-2"
          data-testid={`button-favorite-${id}`}
        >
          <Heart 
            className={`w-5 h-5 ${favorite ? 'fill-primary text-primary' : 'text-foreground'}`}
          />
        </button>

        <div className="absolute bottom-3 right-3">
          <Badge className="bg-chart-2 text-background font-semibold">
            ${price.toFixed(2)}
          </Badge>
        </div>

        {viewCount > 0 && (
          <div className="absolute bottom-3 left-3">
            <Badge variant="secondary" className="gap-1">
              <Eye className="w-3 h-3" />
              {viewCount}
            </Badge>
          </div>
        )}

        {(isStaffPick || isFeatured) && (
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {isStaffPick && (
              <Badge className="bg-chart-2 text-background">
                ⭐ Staff Pick
              </Badge>
            )}
            {isFeatured && (
              <Badge className="bg-primary text-primary-foreground">
                Featured
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="mb-2">
          <Badge variant="secondary" className="text-xs">
            {category}
          </Badge>
        </div>
        
        <h3 className="font-serif text-xl font-medium mb-2 line-clamp-2" data-testid={`text-product-name-${id}`}>
          {name}
        </h3>
        
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {description}
        </p>

        <Button 
          size="sm"
          className="w-full gap-2"
          onClick={handleAddToCart}
          data-testid={`button-add-to-cart-${id}`}
        >
          <ShoppingCart className="w-4 h-4" />
          Add to Cart
        </Button>
      </div>
    </Card>
  );
}
