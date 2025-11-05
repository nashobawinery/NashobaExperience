import { useState } from "react";
import WelcomeScreen from "@/components/WelcomeScreen";
import ProductCard from "@/components/ProductCard";
import ProductFilters from "@/components/ProductFilters";
import BottomNav from "@/components/BottomNav";
import ShoppingCartPanel from "@/components/ShoppingCartPanel";
import FavoritesPanel from "@/components/FavoritesPanel";
import AIRecommendations from "@/components/AIRecommendations";
import TriviaPopup from "@/components/TriviaPopup";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const mockProducts = [
  {
    id: '1',
    name: 'Reserve Cabernet Sauvignon',
    category: 'Wine',
    price: 34.99,
    description: 'Rich and full-bodied with notes of dark cherry, oak, and subtle vanilla undertones',
    image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
    wineColor: 'red',
    sweetness: 'dry',
  },
  {
    id: '2',
    name: 'Aged Apple Brandy',
    category: 'Spirits',
    price: 45.00,
    description: 'Smooth and refined with hints of caramel and oak',
    image: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=400&q=80',
  },
  {
    id: '3',
    name: 'Chardonnay Reserve',
    category: 'Wine',
    price: 28.99,
    description: 'Crisp and elegant with notes of citrus and mineral',
    image: 'https://images.unsplash.com/photo-1474722883778-792e7990302f?w=400&q=80',
    wineColor: 'white',
    sweetness: 'dry',
  },
  {
    id: '4',
    name: 'Sparkling Rosé',
    category: 'Wine',
    price: 32.99,
    description: 'Delicate bubbles with strawberry and floral notes',
    image: 'https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=400&q=80',
    wineColor: 'rosé',
    sweetness: 'off-dry',
  },
  {
    id: '5',
    name: 'Blueberry Hard Cider',
    category: 'Beer',
    price: 12.99,
    description: 'Refreshing cider with natural blueberry flavor',
    image: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=400&q=80',
  },
  {
    id: '6',
    name: 'Peach Bellini Can',
    category: 'Canned Cocktails',
    price: 8.99,
    description: 'Ready-to-drink sparkling cocktail with peach',
    image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80',
  },
];

const mockTriviaQuestions = [
  {
    id: '1',
    question: 'What region of France is Cabernet Sauvignon most famously associated with?',
    answers: ['Burgundy', 'Bordeaux', 'Champagne', 'Loire Valley'],
    correctIndex: 1,
    explanation: 'Bordeaux is the most famous region for Cabernet Sauvignon, particularly in the left bank areas like Pauillac and Margaux.',
  },
  {
    id: '2',
    question: 'At what temperature should red wine typically be served?',
    answers: ['Ice cold (40°F)', 'Refrigerator temp (45°F)', 'Cool room temp (55-65°F)', 'Warm (75°F)'],
    correctIndex: 2,
    explanation: 'Red wine is best served slightly below room temperature, around 55-65°F, to bring out its full flavor profile.',
  },
];

export default function GuestApp() {
  const { toast } = useToast();
  const [guestName, setGuestName] = useState("");
  const [hasStarted, setHasStarted] = useState(false);
  const [activeTab, setActiveTab] = useState("browse");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [priceRange, setPriceRange] = useState("all");
  const [wineColor, setWineColor] = useState("all");
  const [sweetness, setSweetness] = useState("all");
  
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoriteNotes, setFavoriteNotes] = useState<Record<string, string>>({});
  const [cartItems, setCartItems] = useState<Record<string, number>>({});
  const [viewHistory, setViewHistory] = useState<Record<string, number>>({});
  
  const [showTrivia, setShowTrivia] = useState(false);
  const [triviaScore, setTriviaScore] = useState(0);
  const [triviaAnswered, setTriviaAnswered] = useState(0);
  const [askedQuestions, setAskedQuestions] = useState<string[]>([]);
  const [triviaCredit, setTriviaCredit] = useState(0);

  const handleStart = (name: string) => {
    setGuestName(name);
    setHasStarted(true);
    toast({
      title: `Welcome, ${name}!`,
      description: "Let's find your perfect selection",
    });
  };

  const handleFavoriteToggle = (id: string) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const handleUpdateNote = (id: string, note: string) => {
    setFavoriteNotes(prev => ({ ...prev, [id]: note }));
  };

  const handleAddToCart = (id: string) => {
    setCartItems(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    toast({
      title: "Added to cart",
      description: mockProducts.find(p => p.id === id)?.name,
    });
  };

  const handleUpdateQuantity = (id: string, quantity: number) => {
    if (quantity === 0) {
      const newItems = { ...cartItems };
      delete newItems[id];
      setCartItems(newItems);
    } else {
      setCartItems(prev => ({ ...prev, [id]: quantity }));
    }
  };

  const handleProductClick = (id: string) => {
    setViewHistory(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const handleTriviaAnswer = (correct: boolean) => {
    if (correct) {
      setTriviaScore(prev => prev + 1);
    }
    setTriviaAnswered(prev => {
      const newCount = prev + 1;
      if (newCount === 10 && triviaScore + (correct ? 1 : 0) === 10) {
        setTriviaCredit(5);
        toast({
          title: "🎉 Perfect Score!",
          description: "$5 credit added to your cart!",
        });
      }
      return newCount;
    });
    setShowTrivia(false);
  };

  const filteredProducts = mockProducts.filter(product => {
    if (searchQuery && !product.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (selectedCategory !== 'all' && product.category !== selectedCategory) {
      return false;
    }
    if (selectedCategory === 'Wine') {
      if (wineColor !== 'all' && product.wineColor !== wineColor) {
        return false;
      }
      if (sweetness !== 'all' && product.sweetness !== sweetness) {
        return false;
      }
    }
    if (priceRange !== 'all') {
      const [min, max] = priceRange.split('-').map(Number);
      if (max) {
        if (product.price < min || product.price > max) return false;
      } else {
        if (product.price < min) return false;
      }
    }
    return true;
  });

  const cartItemsArray = Object.entries(cartItems).map(([id, quantity]) => {
    const product = mockProducts.find(p => p.id === id)!;
    return {
      id,
      name: product.name,
      category: product.category,
      price: product.price,
      quantity,
    };
  });

  const favoritesArray = favorites.map(id => {
    const product = mockProducts.find(p => p.id === id)!;
    return {
      id,
      name: product.name,
      category: product.category,
      price: product.price,
      image: product.image,
      note: favoriteNotes[id],
    };
  });

  const nextTrivia = mockTriviaQuestions.find(q => !askedQuestions.includes(q.id));

  if (!hasStarted) {
    return <WelcomeScreen onStart={handleStart} />;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-card border-b border-card-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-2xl font-medium">Welcome, {guestName}</h1>
              <p className="text-sm text-muted-foreground">Tasting Session</p>
            </div>
            {nextTrivia && triviaAnswered < 10 && (
              <Button
                variant="outline"
                onClick={() => {
                  setShowTrivia(true);
                  setAskedQuestions(prev => [...prev, nextTrivia.id]);
                }}
                data-testid="button-start-trivia"
              >
                Try Trivia
                {triviaScore > 0 && (
                  <span className="ml-2 text-xs">({triviaScore}/{triviaAnswered})</span>
                )}
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'browse' && (
          <div className="space-y-6">
            <ProductFilters
              searchQuery={searchQuery}
              selectedCategory={selectedCategory}
              sortBy={sortBy}
              priceRange={priceRange}
              wineColor={wineColor}
              sweetness={sweetness}
              onSearchChange={setSearchQuery}
              onCategoryChange={setSelectedCategory}
              onSortChange={setSortBy}
              onPriceRangeChange={setPriceRange}
              onWineColorChange={setWineColor}
              onSweetnessChange={setSweetness}
              onClearFilters={() => {
                setSelectedCategory('all');
                setPriceRange('all');
                setWineColor('all');
                setSweetness('all');
              }}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  {...product}
                  isFavorite={favorites.includes(product.id)}
                  viewCount={viewHistory[product.id]}
                  onFavoriteToggle={handleFavoriteToggle}
                  onAddToCart={handleAddToCart}
                  onClick={handleProductClick}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'favorites' && (
          <div className="max-w-2xl mx-auto">
            <FavoritesPanel
              favorites={favoritesArray}
              onUpdateNote={handleUpdateNote}
              onRemoveFavorite={handleFavoriteToggle}
              onAddToCart={handleAddToCart}
              onEmailFavorites={() => {
                toast({
                  title: "Email sent!",
                  description: "Check your inbox for your favorites and notes",
                });
              }}
            />
          </div>
        )}

        {activeTab === 'recommendations' && (
          <AIRecommendations
            products={[]}
            onRefresh={() => {
              toast({
                title: "Recommendations refreshed",
                description: "Analyzing your preferences...",
              });
            }}
            onProductClick={handleProductClick}
            onAddToCart={handleAddToCart}
            onFavoriteToggle={handleFavoriteToggle}
          />
        )}

        {activeTab === 'cart' && (
          <div className="max-w-2xl mx-auto">
            <ShoppingCartPanel
              items={cartItemsArray}
              triviaCredit={triviaCredit}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={(id) => handleUpdateQuantity(id, 0)}
              onCheckout={() => {
                toast({
                  title: "Order sent!",
                  description: "Staff will prepare your order shortly",
                });
              }}
            />
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto text-center py-12">
            <h2 className="font-serif text-3xl mb-4">Profile & Feedback</h2>
            <p className="text-muted-foreground mb-6">Complete your tasting and share your experience</p>
            <Button size="lg">Complete Survey</Button>
          </div>
        )}
      </main>

      <BottomNav
        activeTab={activeTab}
        cartCount={Object.values(cartItems).reduce((a, b) => a + b, 0)}
        favoritesCount={favorites.length}
        onTabChange={setActiveTab}
      />

      {showTrivia && nextTrivia && (
        <TriviaPopup
          question={nextTrivia}
          currentScore={triviaScore}
          totalAnswered={triviaAnswered}
          onAnswer={handleTriviaAnswer}
          onClose={() => setShowTrivia(false)}
        />
      )}
    </div>
  );
}
