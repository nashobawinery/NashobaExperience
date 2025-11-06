import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Heart, ShoppingCart, X, Wine } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProductDetailModalProps {
  product: {
    id: string;
    name: string;
    category: string;
    type?: string | null;
    varietal?: string | null;
    vintageYear?: string | null;
    region?: string | null;
    price: string;
    description: string;
    tastingNotes?: string | null;
    foodPairings?: string | null;
    servingTemp?: string | null;
    alcoholContent?: string | null;
    bottleSize?: string | null;
    characteristics?: string | null;
    productionMethod?: string | null;
    agingProcess?: string | null;
    awards?: string | null;
    rating?: string | null;
    imageUrl?: string | null;
    labelImageUrl?: string | null;
    lifestyleImageUrl?: string | null;
    available?: boolean;
    featured?: boolean;
    staffPick?: boolean;
    wineOfMonth?: boolean;
  } | null;
  isOpen: boolean;
  isFavorite?: boolean;
  note?: string;
  onClose: () => void;
  onFavoriteToggle?: () => void;
  onAddToCart?: () => void;
  onUpdateNote?: (note: string) => void;
}

export default function ProductDetailModal({
  product,
  isOpen,
  isFavorite = false,
  note = "",
  onClose,
  onFavoriteToggle,
  onAddToCart,
  onUpdateNote,
}: ProductDetailModalProps) {
  const [localNote, setLocalNote] = useState(note);

  useEffect(() => {
    setLocalNote(note);
  }, [note]);

  const handleNoteChange = (value: string) => {
    setLocalNote(value);
    onUpdateNote?.(value);
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0" data-testid="product-detail-modal">
        <ScrollArea className="max-h-[90vh]">
          <div className="relative">
            {/* Header Image */}
            <div className="relative w-full h-64 bg-muted">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Wine className="w-24 h-24 text-muted-foreground/30" />
                </div>
              )}
              
              {/* Favorite Button */}
              <button
                onClick={onFavoriteToggle}
                className="absolute top-4 right-4 p-3 rounded-full bg-background/80 backdrop-blur-sm hover-elevate active-elevate-2"
                data-testid="button-favorite-product"
              >
                <Heart
                  className={`w-6 h-6 ${isFavorite ? 'fill-primary text-primary' : 'text-foreground'}`}
                />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <DialogTitle className="font-serif text-3xl mb-2" data-testid="text-product-name">
                      {product.name}
                    </DialogTitle>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge variant="secondary">{product.category}</Badge>
                      {product.type && <Badge variant="outline">{product.type}</Badge>}
                      {product.varietal && <Badge variant="outline">{product.varietal}</Badge>}
                      {product.staffPick && (
                        <Badge className="bg-chart-2 text-background">⭐ Staff Pick</Badge>
                      )}
                      {product.featured && (
                        <Badge className="bg-primary text-primary-foreground">Featured</Badge>
                      )}
                      {product.wineOfMonth && (
                        <Badge className="bg-chart-1 text-background">Wine of the Month</Badge>
                      )}
                    </div>
                    <div className="text-3xl font-semibold text-primary" data-testid="text-product-price">
                      ${parseFloat(product.price).toFixed(2)}
                    </div>
                  </div>
                </div>
              </DialogHeader>

              {/* Vintage & Region */}
              {(product.vintageYear || product.region) && (
                <div className="flex flex-wrap gap-4 text-sm">
                  {product.vintageYear && (
                    <div>
                      <span className="text-muted-foreground">Vintage:</span>{' '}
                      <span className="font-medium">{product.vintageYear}</span>
                    </div>
                  )}
                  {product.region && (
                    <div>
                      <span className="text-muted-foreground">Region:</span>{' '}
                      <span className="font-medium">{product.region}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              <div>
                <p className="text-muted-foreground leading-relaxed">{product.description}</p>
              </div>

              {/* Tasting Notes */}
              {product.tastingNotes && (
                <div>
                  <h3 className="font-semibold mb-2">Tasting Notes</h3>
                  <p className="text-muted-foreground">{product.tastingNotes}</p>
                </div>
              )}

              {/* Product Details Grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {product.alcoholContent && (
                  <div>
                    <span className="text-muted-foreground">Alcohol:</span>{' '}
                    <span className="font-medium">{product.alcoholContent}</span>
                  </div>
                )}
                {product.bottleSize && (
                  <div>
                    <span className="text-muted-foreground">Size:</span>{' '}
                    <span className="font-medium">{product.bottleSize}</span>
                  </div>
                )}
                {product.servingTemp && (
                  <div>
                    <span className="text-muted-foreground">Serving Temp:</span>{' '}
                    <span className="font-medium">{product.servingTemp}</span>
                  </div>
                )}
                {product.rating && (
                  <div>
                    <span className="text-muted-foreground">Rating:</span>{' '}
                    <span className="font-medium">{parseFloat(product.rating).toFixed(1)} / 5.0</span>
                  </div>
                )}
              </div>

              {/* Characteristics */}
              {product.characteristics && (
                <div>
                  <h3 className="font-semibold mb-2">Characteristics</h3>
                  <p className="text-muted-foreground">{product.characteristics}</p>
                </div>
              )}

              {/* Food Pairings */}
              {product.foodPairings && (
                <div>
                  <h3 className="font-semibold mb-2">Food Pairings</h3>
                  <p className="text-muted-foreground">{product.foodPairings}</p>
                </div>
              )}

              {/* Production Details */}
              {(product.productionMethod || product.agingProcess) && (
                <div>
                  <h3 className="font-semibold mb-2">Production</h3>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {product.productionMethod && <p>{product.productionMethod}</p>}
                    {product.agingProcess && <p>{product.agingProcess}</p>}
                  </div>
                </div>
              )}

              {/* Awards */}
              {product.awards && (
                <div>
                  <h3 className="font-semibold mb-2">Awards & Recognition</h3>
                  <p className="text-muted-foreground">{product.awards}</p>
                </div>
              )}

              <Separator />

              {/* Customer Notes */}
              <div>
                <h3 className="font-semibold mb-2">Your Tasting Notes</h3>
                <Textarea
                  placeholder="Add your personal notes about this product..."
                  value={localNote}
                  onChange={(e) => handleNoteChange(e.target.value)}
                  className="min-h-[100px]"
                  data-testid="textarea-product-notes"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Your notes are saved automatically for all products you view
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  className="flex-1 gap-2"
                  size="lg"
                  onClick={onAddToCart}
                  data-testid="button-add-to-cart-detail"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Add to Cart
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={onClose}
                  data-testid="button-close-detail"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
