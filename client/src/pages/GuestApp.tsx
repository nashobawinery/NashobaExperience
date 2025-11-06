import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import WelcomeScreen from "@/components/WelcomeScreen";
import IntroductionModal from "@/components/IntroductionModal";
import TastingSurvey from "@/components/TastingSurvey";
import ProductCard from "@/components/ProductCard";
import ProductFilters from "@/components/ProductFilters";
import ProductDetailModal from "@/components/ProductDetailModal";
import BottomNav from "@/components/BottomNav";
import ShoppingCartPanel from "@/components/ShoppingCartPanel";
import FavoritesPanel from "@/components/FavoritesPanel";
import AIRecommendations from "@/components/AIRecommendations";
import TriviaPopup from "@/components/TriviaPopup";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Heart } from "lucide-react";
import * as api from "@/lib/api";
import type { Product, TriviaQuestion } from "@shared/schema";
import type { SurveyData } from "@/components/TastingSurvey";

export default function GuestApp() {
  const { toast } = useToast();
  const [guestName, setGuestName] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("browse");
  const [showIntroduction, setShowIntroduction] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [priceRange, setPriceRange] = useState("all");
  const [wineColor, setWineColor] = useState("all");
  const [sweetness, setSweetness] = useState("all");
  const [body, setBody] = useState("all");
  const [characteristics, setCharacteristics] = useState("all");
  
  const [showTrivia, setShowTrivia] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductDetail, setShowProductDetail] = useState(false);

  const hasStarted = !!sessionId;

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: [
      "/api/products", 
      { 
        search: searchQuery, 
        category: selectedCategory, 
        // Only include wine filters in cache key when Wine category is selected
        wineColor: selectedCategory === 'Wine' ? wineColor : 'all',
        sweetness: selectedCategory === 'Wine' ? sweetness : 'all',
        body: selectedCategory === 'Wine' ? body : 'all',
        characteristics: selectedCategory === 'Wine' ? characteristics : 'all',
        priceRange 
      }
    ],
    queryFn: async () => {
      const filters: any = {};
      if (searchQuery) filters.search = searchQuery;
      if (selectedCategory !== 'all') filters.category = selectedCategory;
      
      // Only include wine-specific filters when Wine category is selected
      if (selectedCategory === 'Wine') {
        if (wineColor !== 'all') filters.wineColor = wineColor;
        if (sweetness !== 'all') filters.sweetness = sweetness;
        if (body !== 'all') filters.body = body;
        if (characteristics !== 'all') filters.characteristics = characteristics;
      }
      
      if (priceRange !== 'all') {
        const [min, max] = priceRange.split('-').map(Number);
        if (min) filters.minPrice = min;
        if (max) filters.maxPrice = max;
      }
      
      return api.getProducts(filters);
    },
    enabled: hasStarted,
  });

  // Reset wine-specific filters when switching away from Wine category
  useEffect(() => {
    if (selectedCategory !== 'Wine' && selectedCategory !== 'all') {
      setWineColor('all');
      setSweetness('all');
      setBody('all');
      setCharacteristics('all');
    }
  }, [selectedCategory]);

  const { data: favoritesData = [] } = useQuery({
    queryKey: ["/api/sessions", sessionId, "favorites"],
    queryFn: () => api.getFavorites(sessionId!),
    enabled: !!sessionId,
  });

  const { data: cartData = [] } = useQuery({
    queryKey: ["/api/sessions", sessionId, "cart"],
    queryFn: () => api.getCartItems(sessionId!),
    enabled: !!sessionId,
  });

  const { data: viewHistoryData = [] } = useQuery({
    queryKey: ["/api/sessions", sessionId, "views"],
    queryFn: () => api.getViewHistory(sessionId!),
    enabled: !!sessionId,
  });

  const { data: productNotes = [] } = useQuery({
    queryKey: ["/api/sessions", sessionId, "notes"],
    queryFn: () => api.getProductNotes(sessionId!),
    enabled: !!sessionId,
  });

  const { data: triviaScores = [] } = useQuery({
    queryKey: ["/api/sessions", sessionId, "trivia", "scores"],
    queryFn: () => api.getTriviaScores(sessionId!),
    enabled: !!sessionId,
  });

  const { data: nextTriviaQuestion } = useQuery({
    queryKey: ["/api/sessions", sessionId, "trivia", "next"],
    queryFn: () => api.getNextTriviaQuestion(sessionId!),
    enabled: !!sessionId,
  });

  // Auto-popup trivia every 4 minutes
  useEffect(() => {
    if (!sessionId || !nextTriviaQuestion || triviaScores.length >= 10) {
      return;
    }

    const interval = setInterval(() => {
      if (nextTriviaQuestion && triviaScores.length < 10) {
        setShowTrivia(true);
      }
    }, 240000); // 4 minutes in milliseconds

    return () => clearInterval(interval);
  }, [sessionId, nextTriviaQuestion, triviaScores.length]);

  const totalInteractions = favoritesData.length + viewHistoryData.length;
  const shouldFetchRecommendations = !!sessionId && totalInteractions >= 2;

  const { data: recommendationsData = [], isLoading: recommendationsLoading } = useQuery({
    queryKey: ["/api/sessions", sessionId, "recommendations"],
    queryFn: () => api.getRecommendations(sessionId!),
    enabled: shouldFetchRecommendations,
  });

  const createSessionMutation = useMutation({
    mutationFn: (name: string) => api.createSession(name),
    onSuccess: (session) => {
      setSessionId(session.id);
      setGuestName(session.guestName);
      setShowIntroduction(true);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start session",
        variant: "destructive",
      });
    },
  });

  const submitSurveyMutation = useMutation({
    mutationFn: (surveyData: SurveyData) => api.submitSurvey(sessionId!, surveyData),
    onSuccess: () => {
      setShowSurvey(false);
      toast({
        title: "Thank you!",
        description: "Your feedback helps us improve the experience",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit survey",
        variant: "destructive",
      });
    },
  });

  const addFavoriteMutation = useMutation({
    mutationFn: (productId: string) => api.addFavorite(sessionId!, productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId, "favorites"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add favorite",
        variant: "destructive",
      });
    },
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: (productId: string) => api.removeFavorite(sessionId!, productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId, "favorites"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove favorite",
        variant: "destructive",
      });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ favoriteId, note }: { favoriteId: string; note: string }) =>
      api.updateFavoriteNote(favoriteId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId, "favorites"] });
    },
  });

  const saveProductNoteMutation = useMutation({
    mutationFn: ({ productId, note }: { productId: string; note: string }) =>
      api.saveProductNote(sessionId!, productId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId, "notes"] });
    },
  });

  const addToCartMutation = useMutation({
    mutationFn: (productId: string) => api.addToCart(sessionId!, productId, 1),
    onSuccess: (_, productId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId, "cart"] });
      const product = products.find(p => p.id === productId);
      toast({
        title: "Added to cart",
        description: product?.name,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add to cart",
        variant: "destructive",
      });
    },
  });

  const updateCartQuantityMutation = useMutation({
    mutationFn: ({ cartItemId, quantity }: { cartItemId: string; quantity: number }) =>
      api.updateCartQuantity(cartItemId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId, "cart"] });
    },
  });

  const removeFromCartMutation = useMutation({
    mutationFn: (cartItemId: string) => api.removeFromCart(cartItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId, "cart"] });
    },
  });

  const recordViewMutation = useMutation({
    mutationFn: (productId: string) => api.recordView(sessionId!, productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId, "views"] });
    },
  });

  const recordTriviaAnswerMutation = useMutation({
    mutationFn: ({ questionId, isCorrect }: { questionId: string; isCorrect: boolean }) =>
      api.recordTriviaAnswer(sessionId!, questionId, isCorrect),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId, "trivia", "scores"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId, "trivia", "next"] });
    },
  });

  const emailCartMutation = useMutation({
    mutationFn: (cartData: { subtotal: number; discount: number; triviaCredit: number; total: number }) =>
      api.emailCart(sessionId!, cartData),
    onSuccess: () => {
      toast({
        title: "Order sent!",
        description: "Staff will prepare your order shortly",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send order email",
        variant: "destructive",
      });
    },
  });

  const emailFavoritesMutation = useMutation({
    mutationFn: (email: string) => api.emailFavorites(sessionId!, email),
    onSuccess: () => {
      toast({
        title: "Email sent!",
        description: "Check your inbox for your favorites and notes",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send favorites email",
        variant: "destructive",
      });
    },
  });

  const handleStart = (name: string) => {
    createSessionMutation.mutate(name);
  };

  const handleFavoriteToggle = (productId: string) => {
    const isFavorite = favoritesData.some(f => f.productId === productId);
    if (isFavorite) {
      removeFavoriteMutation.mutate(productId);
    } else {
      addFavoriteMutation.mutate(productId);
    }
  };

  const handleUpdateNote = (productId: string, note: string) => {
    const favorite = favoritesData.find(f => f.productId === productId);
    if (favorite) {
      updateNoteMutation.mutate({ favoriteId: favorite.id, note });
    }
  };

  const handleAddToCart = (productId: string) => {
    addToCartMutation.mutate(productId);
  };

  const handleUpdateQuantity = (cartItemId: string, quantity: number) => {
    if (quantity === 0) {
      removeFromCartMutation.mutate(cartItemId);
    } else {
      updateCartQuantityMutation.mutate({ cartItemId, quantity });
    }
  };

  const handleProductClick = (productId: string) => {
    recordViewMutation.mutate(productId);
    const product = products.find(p => p.id === productId);
    if (product) {
      setSelectedProduct(product);
      setShowProductDetail(true);
    }
  };

  const handleCloseProductDetail = () => {
    setShowProductDetail(false);
    setSelectedProduct(null);
  };

  const handleProductDetailFavorite = () => {
    if (selectedProduct) {
      handleFavoriteToggle(selectedProduct.id);
    }
  };

  const handleProductDetailAddToCart = () => {
    if (selectedProduct) {
      handleAddToCart(selectedProduct.id);
      toast({
        title: "Added to cart",
        description: `${selectedProduct.name} added to your cart`,
      });
    }
  };

  const handleProductDetailNoteUpdate = (note: string) => {
    if (selectedProduct) {
      saveProductNoteMutation.mutate({ productId: selectedProduct.id, note });
    }
  };

  const handleTriviaAnswer = (correct: boolean) => {
    if (nextTriviaQuestion) {
      recordTriviaAnswerMutation.mutate(
        { questionId: nextTriviaQuestion.id, isCorrect: correct },
        {
          onSuccess: () => {
            const newScore = triviaScores.filter(s => s.isCorrect).length + (correct ? 1 : 0);
            const newTotal = triviaScores.length + 1;
            
            if (newTotal === 10 && newScore === 10) {
              toast({
                title: "🎉 Perfect Score!",
                description: "$5 credit added to your cart!",
              });
            }
          },
        }
      );
    }
    setShowTrivia(false);
  };

  const handleRefreshRecommendations = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId, "recommendations"] });
  };

  const handleEmailFavorites = () => {
    const email = window.prompt("Enter your email address to receive your favorites:");
    if (email && email.trim()) {
      emailFavoritesMutation.mutate(email.trim());
    }
  };

  const handleCheckout = () => {
    const wineSpiritsCount = cartItemsArray
      .filter(item => ['Wine', 'Spirits'].includes(item.category))
      .reduce((sum, item) => sum + item.quantity, 0);

    const calculateDiscount = (count: number): number => {
      if (count >= 24) return 0.24;
      if (count >= 12) return 0.15;
      if (count >= 6) return 0.10;
      if (count >= 3) return 0.05;
      return 0;
    };

    const subtotal = cartItemsArray.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discountRate = calculateDiscount(wineSpiritsCount);
    const discountAmount = subtotal * discountRate;
    const afterDiscount = subtotal - discountAmount;
    const total = Math.max(0, afterDiscount - triviaCredit);

    emailCartMutation.mutate({
      subtotal,
      discount: discountAmount,
      triviaCredit,
      total,
    });
  };

  const viewHistoryMap = useMemo(() => {
    const map: Record<string, number> = {};
    viewHistoryData.forEach(vh => {
      map[vh.productId] = vh.viewCount;
    });
    return map;
  }, [viewHistoryData]);

  const favoriteIds = useMemo(() => {
    return new Set(favoritesData.map(f => f.productId));
  }, [favoritesData]);

  const productNotesMap = useMemo(() => {
    const map: Record<string, string> = {};
    productNotes.forEach(note => {
      map[note.productId] = note.note;
    });
    return map;
  }, [productNotes]);

  const favoritesArray = useMemo(() => {
    return favoritesData.map(fav => ({
      id: fav.productId,
      name: fav.product.name,
      category: fav.product.category,
      price: parseFloat(fav.product.price),
      image: fav.product.imageUrl || '',
      note: fav.note || undefined,
    }));
  }, [favoritesData]);

  const cartItemsArray = useMemo(() => {
    return cartData.map(item => ({
      id: item.id,
      productId: item.productId,
      name: item.product.name,
      category: item.product.category,
      price: parseFloat(item.product.price),
      quantity: item.quantity,
    }));
  }, [cartData]);

  const cartCount = useMemo(() => {
    return cartData.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartData]);

  const triviaScore = useMemo(() => {
    return triviaScores.filter(s => s.isCorrect).length;
  }, [triviaScores]);

  const triviaAnswered = triviaScores.length;

  const triviaCredit = useMemo(() => {
    if (triviaAnswered === 10 && triviaScore === 10) {
      return 5;
    }
    return 0;
  }, [triviaAnswered, triviaScore]);

  if (!hasStarted) {
    return <WelcomeScreen onStart={handleStart} />;
  }

  if (productsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-card border-b border-card-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="font-serif text-2xl font-medium">Welcome, {guestName}</h1>
              <p className="text-sm text-muted-foreground">Tasting Session</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setActiveTab('favorites')}
                data-testid="button-favorites-header"
                className="relative"
              >
                <Heart className={`w-5 h-5 ${favoritesData.length > 0 ? 'fill-primary text-primary' : ''}`} />
                {favoritesData.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {favoritesData.length}
                  </span>
                )}
              </Button>
            </div>
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
              body={body}
              characteristics={characteristics}
              onSearchChange={setSearchQuery}
              onCategoryChange={setSelectedCategory}
              onSortChange={setSortBy}
              onPriceRangeChange={setPriceRange}
              onWineColorChange={setWineColor}
              onSweetnessChange={setSweetness}
              onBodyChange={setBody}
              onCharacteristicsChange={setCharacteristics}
              onClearFilters={() => {
                setSelectedCategory('all');
                setPriceRange('all');
                setWineColor('all');
                setSweetness('all');
                setBody('all');
                setCharacteristics('all');
              }}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map(product => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  category={product.category}
                  price={parseFloat(product.price)}
                  description={product.description || ''}
                  image={product.imageUrl || ''}
                  isFavorite={favoriteIds.has(product.id)}
                  viewCount={viewHistoryMap[product.id]}
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
              onEmailFavorites={handleEmailFavorites}
            />
          </div>
        )}

        {activeTab === 'recommendations' && (
          <AIRecommendations
            products={recommendationsData.map(rec => ({
              id: rec.product.id,
              name: rec.product.name,
              category: rec.product.category,
              price: parseFloat(rec.product.price),
              image: rec.product.imageUrl || '',
              description: rec.product.description || '',
              reason: rec.reason,
            }))}
            isLoading={recommendationsLoading}
            onRefresh={handleRefreshRecommendations}
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
              onRemoveItem={(cartItemId) => handleUpdateQuantity(cartItemId, 0)}
              onCheckout={handleCheckout}
            />
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="bg-card rounded-lg p-8 border border-card-border space-y-6">
              <h2 className="font-serif text-4xl mb-4">Thank You, {guestName}!</h2>
              <p className="text-lg leading-relaxed">
                We hope you enjoyed exploring our wines, beers, and spirits with our Interactive Tasting Companion. 
                Your experience and feedback are invaluable to us.
              </p>
              <p className="text-muted-foreground">
                Please take a moment to share your thoughts by completing our quick survey. 
                Your input helps us improve the tasting experience for future guests.
              </p>
              <Button 
                size="lg" 
                onClick={() => setShowSurvey(true)}
                data-testid="button-complete-tasting"
                className="mt-4"
              >
                Take Survey
              </Button>
            </div>
          </div>
        )}
      </main>

      <BottomNav
        activeTab={activeTab}
        cartCount={cartCount}
        favoritesCount={favoritesData.length}
        onTabChange={setActiveTab}
      />

      {showTrivia && nextTriviaQuestion && (
        <TriviaPopup
          question={{
            ...nextTriviaQuestion,
            image: nextTriviaQuestion.image || undefined,
          }}
          currentScore={triviaScore}
          totalAnswered={triviaAnswered}
          onAnswer={handleTriviaAnswer}
          onClose={() => setShowTrivia(false)}
        />
      )}

      <ProductDetailModal
        product={selectedProduct}
        isOpen={showProductDetail}
        isFavorite={selectedProduct ? favoriteIds.has(selectedProduct.id) : false}
        note={selectedProduct ? (productNotesMap[selectedProduct.id] || '') : ''}
        onClose={handleCloseProductDetail}
        onFavoriteToggle={handleProductDetailFavorite}
        onAddToCart={handleProductDetailAddToCart}
        onUpdateNote={handleProductDetailNoteUpdate}
      />

      <IntroductionModal
        open={showIntroduction}
        onContinue={() => setShowIntroduction(false)}
        guestName={guestName}
      />

      <TastingSurvey
        open={showSurvey}
        onClose={() => setShowSurvey(false)}
        onSubmit={(data) => submitSurveyMutation.mutate(data)}
        submitting={submitSurveyMutation.isPending}
      />
    </div>
  );
}
