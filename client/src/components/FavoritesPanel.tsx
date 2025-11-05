import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Heart, ShoppingCart, Mail, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface Favorite {
  id: string;
  name: string;
  category: string;
  price: number;
  image?: string;
  note?: string;
}

interface FavoritesPanelProps {
  favorites: Favorite[];
  onUpdateNote?: (id: string, note: string) => void;
  onRemoveFavorite?: (id: string) => void;
  onAddToCart?: (id: string) => void;
  onEmailFavorites?: () => void;
}

export default function FavoritesPanel({
  favorites,
  onUpdateNote,
  onRemoveFavorite,
  onAddToCart,
  onEmailFavorites,
}: FavoritesPanelProps) {
  return (
    <Card className="h-full flex flex-col">
      <div className="p-6 border-b">
        <div className="flex items-center gap-3 mb-2">
          <Heart className="w-6 h-6 text-primary fill-primary" />
          <h2 className="font-serif text-2xl font-medium">Your Favorites</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {favorites.length} {favorites.length === 1 ? 'item' : 'items'} saved
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-4">
        {favorites.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No favorites yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Tap the heart icon on products you love
            </p>
          </div>
        ) : (
          favorites.map((favorite) => (
            <Card key={favorite.id} className="p-4" data-testid={`favorite-item-${favorite.id}`}>
              <div className="flex gap-4">
                <div className="w-20 h-20 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                  {favorite.image ? (
                    <img
                      src={favorite.image}
                      alt={favorite.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      🍷
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium mb-1 truncate">{favorite.name}</h3>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {favorite.category}
                        </Badge>
                        <span className="font-semibold text-sm">
                          ${favorite.price.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={() => onRemoveFavorite?.(favorite.id)}
                      data-testid={`button-remove-favorite-${favorite.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <Textarea
                    placeholder="Add your tasting notes..."
                    value={favorite.note || ''}
                    onChange={(e) => onUpdateNote?.(favorite.id, e.target.value)}
                    className="mb-3 text-sm min-h-[60px]"
                    data-testid={`textarea-note-${favorite.id}`}
                  />

                  <Button
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => onAddToCart?.(favorite.id)}
                    data-testid={`button-add-favorite-to-cart-${favorite.id}`}
                  >
                    <ShoppingCart className="w-3 h-3" />
                    Add to Cart
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {favorites.length > 0 && (
        <div className="border-t p-6">
          <Button
            className="w-full gap-2"
            size="lg"
            onClick={onEmailFavorites}
            data-testid="button-email-favorites"
          >
            <Mail className="w-4 h-4" />
            Email My Favorites & Notes
          </Button>
        </div>
      )}
    </Card>
  );
}
