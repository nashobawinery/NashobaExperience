import { Badge } from "@/components/ui/badge";
import { Heart } from "lucide-react";

interface ProductListItemProps {
  id: string;
  name: string;
  category: string;
  image?: string;
  characteristics?: string;
  isFavorite?: boolean;
  onFavoriteToggle?: (id: string) => void;
  onClick?: (id: string) => void;
}

export default function ProductListItem({
  id,
  name,
  category,
  image,
  characteristics,
  isFavorite = false,
  onFavoriteToggle,
  onClick,
}: ProductListItemProps) {
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavoriteToggle?.(id);
  };

  return (
    <div
      className="flex items-center gap-4 p-3 hover-elevate cursor-pointer rounded-md border border-border bg-card"
      onClick={() => onClick?.(id)}
      data-testid={`list-item-product-${id}`}
    >
      <div className="relative w-14 h-14 flex-shrink-0 rounded-md overflow-hidden bg-muted">
        {image ? (
          <img 
            src={image} 
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-2xl">
            🍷
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-serif text-base font-medium mb-1 truncate" data-testid={`text-product-name-${id}`}>
          {name}
        </h3>
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="secondary" className="text-xs">
            {category}
          </Badge>
          {characteristics && (
            <span className="text-muted-foreground truncate">
              {characteristics}
            </span>
          )}
        </div>
      </div>

      <button
        onClick={handleFavoriteClick}
        className="flex-shrink-0 p-2 rounded-full hover-elevate active-elevate-2"
        data-testid={`button-favorite-${id}`}
      >
        <Heart 
          className={`w-5 h-5 ${isFavorite ? 'fill-primary text-primary' : 'text-muted-foreground'}`}
        />
      </button>
    </div>
  );
}
