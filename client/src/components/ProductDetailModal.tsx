import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Heart, ShoppingCart, Wine } from "lucide-react";
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
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setLocalNote(note);
  }, [note]);

  const handleNoteChange = (value: string) => {
    setLocalNote(value);
    onUpdateNote?.(value);
  };

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      onAddToCart?.();
    }
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] p-0" data-testid="product-detail-modal">
        <VisuallyHidden>
          <DialogTitle>{product.name}</DialogTitle>
        </VisuallyHidden>
        <ScrollArea className="max-h-[95vh]">
          <div className="grid md:grid-cols-2 gap-0">
            {/* Left Column - Bottle Image */}
            <div className="relative bg-muted flex items-center justify-center p-12 min-h-[600px]">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="max-h-[550px] w-auto object-contain"
                />
              ) : (
                <Wine className="w-48 h-48 text-muted-foreground/20" />
              )}
              
              {/* Favorite Button */}
              <button
                onClick={onFavoriteToggle}
                className="absolute top-6 right-6 p-3 rounded-full bg-background/80 backdrop-blur-sm hover-elevate active-elevate-2"
                data-testid="button-favorite-product"
              >
                <Heart
                  className={`w-6 h-6 ${isFavorite ? 'fill-primary text-primary' : 'text-foreground'}`}
                />
              </button>
            </div>

            {/* Right Column - Product Details */}
            <div className="p-8 space-y-6">
              {/* Title & Vintage */}
              <div>
                <h1 className="font-serif text-4xl font-medium mb-2" data-testid="text-product-name">
                  {product.name}
                </h1>
                {product.vintageYear && (
                  <p className="text-xl text-muted-foreground mb-3">
                    {product.vintageYear} {product.varietal || product.type}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mb-4">
                  {product.staffPick && (
                    <Badge className="bg-chart-2 text-background">Staff Pick</Badge>
                  )}
                  {product.featured && (
                    <Badge className="bg-primary text-primary-foreground">Featured</Badge>
                  )}
                  {product.wineOfMonth && (
                    <Badge className="bg-chart-1 text-background">Wine of the Month</Badge>
                  )}
                </div>
              </div>

              {/* Description */}
              {product.description && (
                <p className="text-base leading-relaxed text-muted-foreground">
                  {product.description}
                </p>
              )}

              {/* Tasting Notes */}
              {product.tastingNotes && (
                <p className="text-base leading-relaxed text-muted-foreground">
                  {product.tastingNotes}
                </p>
              )}

              {/* Quantity & Price */}
              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground block mb-2">Quantity</label>
                    <select
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value))}
                      className="flex h-10 w-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      data-testid="select-quantity"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                  </div>
                  
                  {product.bottleSize && (
                    <div>
                      <label className="text-sm text-muted-foreground block mb-2">Bottle Size</label>
                      <div className="h-10 px-3 py-2 text-sm font-medium">
                        {product.bottleSize}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-3xl font-semibold text-primary" data-testid="text-product-price">
                    ${parseFloat(product.price).toFixed(2)}
                  </div>
                  <Button
                    size="lg"
                    className="gap-2 px-8"
                    onClick={handleAddToCart}
                    data-testid="button-add-to-cart-detail"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Add to Cart
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Technical Specifications */}
              <div className="space-y-4">
                <h3 className="font-serif text-xl font-medium">About this Wine</h3>
                
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  {product.alcoholContent && (
                    <div>
                      <span className="text-muted-foreground">Alcohol</span>
                      <p className="font-medium">{product.alcoholContent}</p>
                    </div>
                  )}
                  {product.region && (
                    <div>
                      <span className="text-muted-foreground">Region</span>
                      <p className="font-medium">{product.region}</p>
                    </div>
                  )}
                  {product.characteristics && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Composition</span>
                      <p className="font-medium">{product.characteristics}</p>
                    </div>
                  )}
                  {product.agingProcess && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Fermentation</span>
                      <p className="font-medium">{product.agingProcess}</p>
                    </div>
                  )}
                  {product.servingTemp && (
                    <div>
                      <span className="text-muted-foreground">Serving Temp</span>
                      <p className="font-medium">{product.servingTemp}</p>
                    </div>
                  )}
                  {product.rating && (
                    <div>
                      <span className="text-muted-foreground">Rating</span>
                      <p className="font-medium">{parseFloat(product.rating).toFixed(1)} / 5.0</p>
                    </div>
                  )}
                </div>

                {/* Food Pairings */}
                {product.foodPairings && (
                  <div className="pt-2">
                    <span className="text-sm text-muted-foreground block mb-2">Pairs well with</span>
                    <p className="font-medium">{product.foodPairings}</p>
                  </div>
                )}

                {/* Production Method */}
                {product.productionMethod && (
                  <div className="pt-2">
                    <p className="text-sm text-muted-foreground">{product.productionMethod}</p>
                  </div>
                )}

                {/* Awards */}
                {product.awards && (
                  <div className="pt-2">
                    <span className="text-sm text-muted-foreground block mb-2">Awards & Recognition</span>
                    <p className="font-medium text-sm">{product.awards}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Customer Notes */}
              <div>
                <h3 className="font-serif text-lg font-medium mb-3">Your Tasting Notes</h3>
                <Textarea
                  placeholder="Add your personal notes about this wine..."
                  value={localNote}
                  onChange={(e) => handleNoteChange(e.target.value)}
                  className="min-h-[100px]"
                  data-testid="textarea-product-notes"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Your notes are saved automatically
                </p>
              </div>

              {/* Close Button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={onClose}
                data-testid="button-close-detail"
              >
                Close
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
