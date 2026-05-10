import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Heart, Wine, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Characteristic } from "@shared/schema";

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
    tierPrice?: string;
    caseSize?: number;
    stockQuantity?: number | null;
    ignoreInventory?: boolean;
    description: string;
    tastingNotes?: string | null;
    foodPairings?: string | null;
    servingTemp?: string | null;
    alcoholContent?: string | null;
    bottleSize?: string | null;
    characteristics?: string | null;
    sweetness?: string | null;
    body?: string | null;
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
    isDistributed?: boolean;
  } | null;
  isOpen: boolean;
  isFavorite?: boolean;
  note?: string;
  tier?: string;
  onClose: () => void;
  onFavoriteToggle?: () => void;
  onAddToCart?: (quantity: number, unit: 'bottle' | 'case') => void;
  onUpdateNote?: (note: string) => void;
}

export default function ProductDetailModal({
  product,
  isOpen,
  isFavorite = false,
  note = "",
  tier,
  onClose,
  onFavoriteToggle,
  onAddToCart,
  onUpdateNote,
}: ProductDetailModalProps) {
  const [localNote, setLocalNote] = useState(note);
  const [bottleQuantity, setBottleQuantity] = useState(0);
  const [caseQuantity, setCaseQuantity] = useState(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedNoteRef = useRef<string>(note);

  const { data: characteristicsTags = [], isLoading: loadingCharacteristics } = useQuery<Characteristic[]>({
    queryKey: [`/api/products/${product?.id}/characteristics`],
    enabled: isOpen && !!product?.id,
  });

  useEffect(() => {
    if (product?.id) {
      setLocalNote(note);
      lastSavedNoteRef.current = note;
    }
  }, [product?.id]);

  useEffect(() => {
    if (note !== lastSavedNoteRef.current && debounceTimerRef.current === null) {
      setLocalNote(note);
      lastSavedNoteRef.current = note;
    }
  }, [note]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleNoteChange = (value: string) => {
    setLocalNote(value);
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      lastSavedNoteRef.current = value;
      onUpdateNote?.(value);
      debounceTimerRef.current = null;
    }, 500);
  };

  const flushPendingNoteSave = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    
    if (localNote !== lastSavedNoteRef.current) {
      lastSavedNoteRef.current = localNote;
      onUpdateNote?.(localNote);
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      flushPendingNoteSave();
      onClose();
    }
  };

  const handleSaveAndClose = () => {
    flushPendingNoteSave();
    onClose();
  };

  const handleAddBottles = () => {
    if (bottleQuantity > 0) {
      onAddToCart?.(bottleQuantity, 'bottle');
      setBottleQuantity(0);
    }
  };

  const handleAddCases = () => {
    if (caseQuantity > 0) {
      onAddToCart?.(caseQuantity, 'case');
      setCaseQuantity(0);
    }
  };

  const getDiscountInfo = (product: any) => {
    if (!product.tierPrice) return null;
    const regularPrice = Number(product.price);
    const tierPrice = Number(product.tierPrice);
    const discountPercent = Math.round(((regularPrice - tierPrice) / regularPrice) * 100);
    return {
      discountPercent,
      savings: (regularPrice - tierPrice).toFixed(2),
      tierPrice: tierPrice.toFixed(2)
    };
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
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
                
                {/* Search Criteria Badges */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {/* Category */}
                  <Badge variant="outline" className="capitalize" data-testid="badge-category">
                    {product.category}
                  </Badge>
                  
                  {/* Wine Color - show for all products if not N/A */}
                  {product.type && product.type !== 'N/A' && (
                    <Badge variant="outline" data-testid="badge-wine-color">
                      {product.type}
                    </Badge>
                  )}
                  
                  {/* Sweetness - from dedicated field */}
                  {product.sweetness && product.sweetness !== 'N/A' && (
                    <Badge variant="outline" data-testid="badge-sweetness">
                      {product.sweetness}
                    </Badge>
                  )}
                  
                  {/* Body - from dedicated field */}
                  {product.body && product.body !== 'N/A' && (
                    <Badge variant="outline" data-testid="badge-body">
                      {product.body}
                    </Badge>
                  )}
                </div>
                
                {/* Feature Badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {product.staffPick && (
                    <Badge className="bg-chart-2 text-background">Staff Pick</Badge>
                  )}
                  {product.featured && (
                    <Badge className="bg-primary text-primary-foreground">Featured</Badge>
                  )}
                  {product.wineOfMonth && (
                    <Badge className="bg-chart-1 text-background">Product of the Month</Badge>
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

              {/* Tier & Pricing */}
              <div className="space-y-4 pt-4">
                {tier && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pricing Tier:</span>
                    <Badge variant="secondary">{tier}</Badge>
                  </div>
                )}
                
                {getDiscountInfo(product) ? (
                  <>
                    <div className="space-y-2">
                      <span className="text-sm text-muted-foreground">Retail Price:</span>
                      <p className="text-lg line-through text-muted-foreground">${parseFloat(product.price).toFixed(2)} per bottle</p>
                    </div>
                    <div className="space-y-1 p-3 bg-primary/10 rounded-lg border border-primary/20">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Your Price:</span>
                        <span className="text-2xl font-bold text-primary">${getDiscountInfo(product)!.tierPrice} per bottle</span>
                      </div>
                      <p className="text-sm text-green-600">
                        Save ${getDiscountInfo(product)!.savings} per bottle ({getDiscountInfo(product)!.discountPercent}% off)
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Price:</span>
                    <span className="text-2xl font-bold text-primary" data-testid="text-product-price">
                      ${parseFloat(product.price).toFixed(2)} per bottle
                    </span>
                  </div>
                )}
              </div>

              {product.isDistributed && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg" data-testid="distributor-notice-detail">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-300 text-sm mb-1">Distributed Product</p>
                      <p className="text-sm text-amber-700 dark:text-amber-400">
                        Distributed by Carolina - See note below
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Order Section */}
              <div className="space-y-4">
                {(product.category === 'wine' || product.category === 'spirits') ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="detail-bottles" className="text-sm">Bottles</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="detail-bottles"
                          type="number"
                          min="0"
                          value={bottleQuantity}
                          onChange={(e) => setBottleQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                          className="h-8"
                          placeholder="0"
                          data-testid="input-bottles-detail"
                        />
                        <Button
                          size="sm"
                          onClick={handleAddBottles}
                          disabled={!product.ignoreInventory && product.stockQuantity! < 1 || bottleQuantity === 0}
                          style={{ backgroundColor: '#dcfce7', color: '#000000' }}
                          className="hover:brightness-95 disabled:bg-muted disabled:text-muted-foreground"
                          data-testid="button-add-bottles-detail"
                        >
                          Bottles
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="detail-cases" className="text-sm">Cases</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="detail-cases"
                          type="number"
                          min="0"
                          value={caseQuantity}
                          onChange={(e) => setCaseQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                          className="h-8"
                          placeholder="0"
                          data-testid="input-cases-detail"
                        />
                        <Button
                          size="sm"
                          onClick={handleAddCases}
                          disabled={!product.ignoreInventory && product.stockQuantity! < product.caseSize! || caseQuantity === 0}
                          style={{ backgroundColor: '#dcfce7', color: '#000000' }}
                          className="hover:brightness-95 disabled:bg-muted disabled:text-muted-foreground"
                          data-testid="button-add-cases-detail"
                        >
                          Cases
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="detail-cases-qty" className="text-sm">Cases</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="detail-cases-qty"
                        type="number"
                        min="0"
                        value={caseQuantity}
                        onChange={(e) => setCaseQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                        className="h-8"
                        placeholder="0"
                        data-testid="input-cases-qty-detail"
                      />
                      <Button
                        size="sm"
                        onClick={handleAddCases}
                        disabled={!product.ignoreInventory && product.stockQuantity! < product.caseSize! || caseQuantity === 0}
                        style={{ backgroundColor: '#dcfce7', color: '#000000' }}
                        className="hover:brightness-95 disabled:bg-muted disabled:text-muted-foreground"
                        data-testid="button-add-cases-qty-detail"
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Product Details & Search Criteria */}
              <div className="space-y-4">
                <h3 className="font-serif text-xl font-medium">Product Details</h3>
                
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  {/* Search Criteria Fields */}
                  {product.type && product.type !== 'N/A' && (
                    <div>
                      <span className="text-muted-foreground">Color</span>
                      <p className="font-medium">{product.type}</p>
                    </div>
                  )}
                  {product.sweetness && product.sweetness !== 'N/A' && (
                    <div>
                      <span className="text-muted-foreground">Sweetness</span>
                      <p className="font-medium">{product.sweetness}</p>
                    </div>
                  )}
                  {product.body && product.body !== 'N/A' && (
                    <div>
                      <span className="text-muted-foreground">Body</span>
                      <p className="font-medium">{product.body}</p>
                    </div>
                  )}
                  {product.varietal && (
                    <div>
                      <span className="text-muted-foreground">Varietal</span>
                      <p className="font-medium">{product.varietal}</p>
                    </div>
                  )}
                  {product.vintageYear && (
                    <div>
                      <span className="text-muted-foreground">Vintage</span>
                      <p className="font-medium">{product.vintageYear}</p>
                    </div>
                  )}
                  {product.region && (
                    <div>
                      <span className="text-muted-foreground">Region</span>
                      <p className="font-medium">{product.region}</p>
                    </div>
                  )}
                  {product.bottleSize && (
                    <div>
                      <span className="text-muted-foreground">Bottle Size</span>
                      <p className="font-medium">{product.bottleSize}</p>
                    </div>
                  )}
                  {product.servingTemp && (
                    <div>
                      <span className="text-muted-foreground">Serving Temp</span>
                      <p className="font-medium">{product.servingTemp}</p>
                    </div>
                  )}
                  {product.alcoholContent && (
                    <div>
                      <span className="text-muted-foreground">Alcohol Content</span>
                      <p className="font-medium">{product.alcoholContent}</p>
                    </div>
                  )}
                  {product.productionMethod && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Production</span>
                      <p className="font-medium">{product.productionMethod}</p>
                    </div>
                  )}
                  {product.agingProcess && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Aging</span>
                      <p className="font-medium">{product.agingProcess}</p>
                    </div>
                  )}
                  {product.awards && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Awards</span>
                      <p className="font-medium">{product.awards}</p>
                    </div>
                  )}
                  {(characteristicsTags.length > 0 || product.characteristics) && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground block mb-2">Characteristics</span>
                      {loadingCharacteristics ? (
                        <div className="flex gap-2">
                          <div className="h-6 w-20 bg-muted animate-pulse rounded-full" />
                          <div className="h-6 w-24 bg-muted animate-pulse rounded-full" />
                          <div className="h-6 w-16 bg-muted animate-pulse rounded-full" />
                        </div>
                      ) : characteristicsTags.length > 0 ? (
                        <div className="flex flex-wrap gap-2" data-testid="characteristics-tags">
                          {characteristicsTags.map((characteristic, i) => (
                            <Badge 
                              key={characteristic.id} 
                              variant="secondary"
                              data-testid={`badge-characteristic-${i}`}
                            >
                              {characteristic.name}
                            </Badge>
                          ))}
                        </div>
                      ) : product.characteristics ? (
                        <p className="font-medium text-sm text-muted-foreground italic">
                          {product.characteristics}
                        </p>
                      ) : null}
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
              </div>

              <Separator />

              {/* Customer Notes */}
              <div>
                <h3 className="font-serif text-lg font-medium mb-3">Your Tasting Notes</h3>
                <Textarea
                  placeholder="Add your personal tasting notes..."
                  value={localNote}
                  onChange={(e) => handleNoteChange(e.target.value)}
                  className="min-h-[100px]"
                  data-testid="textarea-product-notes"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Notes are saved when you click Save
                </p>
              </div>

              {/* Save Button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={handleSaveAndClose}
                data-testid="button-save-detail"
              >
                Save
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
