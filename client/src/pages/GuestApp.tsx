import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import WelcomeScreen from "@/components/WelcomeScreen";
import IntroductionModal from "@/components/IntroductionModal";
import TastingSurvey from "@/components/TastingSurvey";
import ProductCard from "@/components/ProductCard";
import ProductListItem from "@/components/ProductListItem";
import ProductFilters from "@/components/ProductFilters";
import ProductDetailModal from "@/components/ProductDetailModal";
import BottomNav from "@/components/BottomNav";
import ShoppingCartPanel from "@/components/ShoppingCartPanel";
import FavoritesPanel from "@/components/FavoritesPanel";
import AIRecommendations from "@/components/AIRecommendations";
import TriviaPopup from "@/components/TriviaPopup";
import FavoritesInfoPopup from "@/components/FavoritesInfoPopup";
import DiscountInfoPopup from "@/components/DiscountInfoPopup";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Heart, Trophy, Gift } from "lucide-react";
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
  
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [priceRange, setPriceRange] = useState("all");
  const [wineColor, setWineColor] = useState("all");
  const [sweetness, setSweetness] = useState("all");
  const [body, setBody] = useState("all");
  const [characteristics, setCharacteristics] = useState("all");
  
  const [showTrivia, setShowTrivia] = useState(false);
  const [showTriviaInfo, setShowTriviaInfo] = useState(false);
  const [showFavoritesInfo, setShowFavoritesInfo] = useState(false);
  const [showDiscountInfo, setShowDiscountInfo] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductDetail, setShowProductDetail] = useState(false);

  const hasStarted = !!sessionId;

  const { data: products = [], isLoading: productsLoading, isError: productsError, error: productsFetchError } = useQuery({
    queryKey: [
      "/api/products", 
      { 
        search: searchQuery, 
        category: selectedCategory, 
        // Only include wine filters in cache key when wine category is selected
        wineColor: selectedCategory === 'wine' ? wineColor : 'all',
        sweetness: selectedCategory === 'wine' ? sweetness : 'all',
        body: selectedCategory === 'wine' ? body : 'all',
        characteristics: selectedCategory === 'wine' ? characteristics : 'all',
        priceRange 
      }
    ],
    queryFn: async () => {
      const filters: any = {};
      if (searchQuery) filters.search = searchQuery;
      if (selectedCategory !== 'all') filters.category = selectedCategory;
      
      // Only include wine-specific filters when wine category is selected
      if (selectedCategory === 'wine') {
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
    retry: 2,
  });

  // Debounce search input - wait 400ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset wine-specific filters when switching away from wine category
  useEffect(() => {
    if (selectedCategory !== 'wine' && selectedCategory !== 'all') {
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

  const { data: triviaIntervalSeconds = 240 } = useQuery({
    queryKey: ['/api/settings/trivia_interval_seconds'],
    queryFn: async () => {
      const response = await fetch("/api/settings/trivia_interval_seconds");
      if (!response.ok) {
        if (response.status === 404) {
          return 240;
        }
        throw new Error("Failed to fetch trivia interval");
      }
      const data = await response.json();
      return data.value;
    },
  });

  // Auto-popup trivia: First question 1 minute after info popup, then at configured interval
  useEffect(() => {
    if (!sessionId || !nextTriviaQuestion || triviaScores.length >= 10 || showIntroduction || showTriviaInfo) {
      return;
    }

    // Check if info popup has been shown
    const hasSeenTriviaInfo = localStorage.getItem('hasSeenTriviaInfo');
    if (!hasSeenTriviaInfo) {
      return; // Wait for info popup to be shown first
    }

    // First question: Show 1 minute after info popup is dismissed
    if (triviaScores.length === 0) {
      const firstQuestionTimer = setTimeout(() => {
        if (nextTriviaQuestion && triviaScores.length === 0) {
          setShowTrivia(true);
        }
      }, 60000); // 1 minute

      return () => clearTimeout(firstQuestionTimer);
    }

    // Subsequent questions: Use configured interval
    const interval = setInterval(() => {
      if (nextTriviaQuestion && triviaScores.length < 10) {
        setShowTrivia(true);
      }
    }, triviaIntervalSeconds * 1000); // Convert seconds to milliseconds

    return () => clearInterval(interval);
  }, [sessionId, nextTriviaQuestion, triviaScores.length, showIntroduction, showTriviaInfo, triviaIntervalSeconds]);

  // Show trivia info popup after 5 seconds on first visit (after intro modal is closed)
  useEffect(() => {
    if (!sessionId || activeTab !== 'browse' || showIntroduction) {
      return;
    }

    // Check if popup has been shown before
    const hasSeenTriviaInfo = localStorage.getItem('hasSeenTriviaInfo');
    if (hasSeenTriviaInfo) {
      return;
    }

    // Show popup after 5 seconds
    const timer = setTimeout(() => {
      setShowTriviaInfo(true);
      localStorage.setItem('hasSeenTriviaInfo', 'true');
    }, 5000);

    return () => clearTimeout(timer);
  }, [sessionId, activeTab, showIntroduction]);

  // Show favorites info popup after 10 minutes on first visit (after intro modal is closed)
  useEffect(() => {
    if (!sessionId || showIntroduction) {
      return;
    }

    // Check if popup has been shown before
    const hasSeenFavoritesInfo = localStorage.getItem('hasSeenFavoritesInfo');
    if (hasSeenFavoritesInfo) {
      return;
    }

    // Show popup after 10 minutes
    const timer = setTimeout(() => {
      setShowFavoritesInfo(true);
      localStorage.setItem('hasSeenFavoritesInfo', 'true');
    }, 600000); // 10 minutes = 600000ms

    return () => clearTimeout(timer);
  }, [sessionId, showIntroduction]);

  // Show discount info popup after 25 minutes on first visit (after intro modal is closed)
  useEffect(() => {
    if (!sessionId || showIntroduction) {
      return;
    }

    // Check if popup has been shown before
    const hasSeenDiscountInfo = localStorage.getItem('hasSeenDiscountInfo');
    if (hasSeenDiscountInfo) {
      return;
    }

    // Show popup after 25 minutes
    const timer = setTimeout(() => {
      setShowDiscountInfo(true);
      localStorage.setItem('hasSeenDiscountInfo', 'true');
    }, 1500000); // 25 minutes = 1500000ms

    return () => clearTimeout(timer);
  }, [sessionId, showIntroduction]);

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

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-card border-b border-card-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="font-serif text-2xl font-medium">Welcome, {guestName}</h1>
              <p className="text-sm text-muted-foreground">Tasting Session</p>
              <p className="text-xs text-muted-foreground mt-1">
                Let's find the wines you are going to love. Use the search features below to select a category such as "Wine" and additional search options will appear such as sweetness levels.
              </p>
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
              searchQuery={searchInput}
              selectedCategory={selectedCategory}
              sortBy={sortBy}
              priceRange={priceRange}
              wineColor={wineColor}
              sweetness={sweetness}
              body={body}
              characteristics={characteristics}
              onSearchChange={setSearchInput}
              onCategoryChange={setSelectedCategory}
              onSortChange={setSortBy}
              onPriceRangeChange={setPriceRange}
              onWineColorChange={setWineColor}
              onSweetnessChange={setSweetness}
              onBodyChange={setBody}
              onCharacteristicsChange={setCharacteristics}
              onClearFilters={() => {
                setSearchInput('');
                setSelectedCategory('all');
                setPriceRange('all');
                setWineColor('all');
                setSweetness('all');
                setBody('all');
                setCharacteristics('all');
              }}
            />

            <div className="space-y-2 max-w-3xl mx-auto">
              {productsError ? (
                <div className="text-center py-12 bg-card rounded-lg border border-card-border">
                  <p className="text-lg text-destructive mb-2">Unable to load products</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {productsFetchError instanceof Error ? productsFetchError.message : 'An error occurred'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    The product catalog may not be available yet. Please contact staff for assistance.
                  </p>
                </div>
              ) : productsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading products...</p>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-lg border border-card-border">
                  <p className="text-lg text-muted-foreground mb-2">No products found</p>
                  <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
                </div>
              ) : (
                products.map(product => (
                  <ProductListItem
                    key={product.id}
                    id={product.id}
                    name={product.name}
                    category={product.category}
                    image={product.imageUrl || ''}
                    characteristics={product.characteristics || ''}
                    isFavorite={favoriteIds.has(product.id)}
                    onFavoriteToggle={handleFavoriteToggle}
                    onClick={handleProductClick}
                  />
                ))
              )}
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
                We hope you enjoyed exploring our products with our Interactive Tasting Companion. 
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

      {/* Trivia Info Popup */}
      <Dialog open={showTriviaInfo} onOpenChange={setShowTriviaInfo}>
        <DialogContent className="max-w-lg" data-testid="trivia-info-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Trophy className="w-7 h-7 text-primary" />
              Fun Facts & Rewards!
            </DialogTitle>
            <DialogDescription className="sr-only">
              Learn about our trivia rewards program
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <p className="text-base leading-relaxed">
              <strong>10 fun facts</strong> will appear during your tasting experience to test your knowledge!
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-primary/10 rounded-lg border border-primary/20">
                <Trophy className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">Perfect Score Reward</p>
                  <p className="text-sm text-muted-foreground">
                    Get <strong className="text-foreground">10 out of 10 correct</strong> and earn a <strong className="text-primary">$5.00 certificate</strong> for products purchased on this platform!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-chart-2/10 rounded-lg border border-chart-2/20">
                <Gift className="w-6 h-6 text-chart-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">Almost Perfect Reward</p>
                  <p className="text-sm text-muted-foreground">
                    Get <strong className="text-foreground">8 or 9 out of 10</strong> and receive an <strong className="text-chart-2">additional tasting chip</strong> to enjoy a complimentary tasting on us!
                  </p>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              Questions will appear automatically as you explore. Good luck! 🍷
            </p>

            <Button 
              onClick={() => setShowTriviaInfo(false)} 
              className="w-full"
              data-testid="button-close-trivia-info"
            >
              Got It!
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Favorites Info Popup */}
      {showFavoritesInfo && (
        <FavoritesInfoPopup onClose={() => setShowFavoritesInfo(false)} />
      )}

      {/* Discount Info Popup */}
      {showDiscountInfo && (
        <DiscountInfoPopup onClose={() => setShowDiscountInfo(false)} />
      )}
    </div>
  );
}
