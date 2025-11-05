import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw } from "lucide-react";
import ProductCard from "./ProductCard";

interface RecommendedProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  image?: string;
  description: string;
  reason: string;
}

interface AIRecommendationsProps {
  products: RecommendedProduct[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onProductClick?: (id: string) => void;
  onAddToCart?: (id: string) => void;
  onFavoriteToggle?: (id: string) => void;
}

export default function AIRecommendations({
  products,
  isLoading = false,
  onRefresh,
  onProductClick,
  onAddToCart,
  onFavoriteToggle,
}: AIRecommendationsProps) {
  return (
    <Card className="p-6 md:p-8">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="font-serif text-2xl md:text-3xl font-medium">
              Your AI Picks
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Personalized recommendations based on your preferences
            </p>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          disabled={isLoading}
          data-testid="button-refresh-recommendations"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-4">
              <div className="aspect-[3/4] bg-muted animate-pulse rounded-lg" />
              <div className="space-y-2">
                <div className="h-4 bg-muted animate-pulse rounded" />
                <div className="h-3 bg-muted animate-pulse rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product, index) => (
              <div key={product.id} className="space-y-3" style={{ animationDelay: `${index * 100}ms` }}>
                <ProductCard
                  {...product}
                  onClick={onProductClick}
                  onAddToCart={onAddToCart}
                  onFavoriteToggle={onFavoriteToggle}
                />
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Why we recommend: </span>
                    {product.reason}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {products.length === 0 && (
            <div className="text-center py-12">
              <Sparkles className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground mb-2">No recommendations yet</p>
              <p className="text-sm text-muted-foreground">
                Browse and favorite some products to get personalized AI picks
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
