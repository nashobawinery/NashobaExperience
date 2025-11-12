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
import PreferenceQuestionnaire from "@/components/PreferenceQuestionnaire";
import PreSurveyDialog from "@/components/PreSurveyDialog";
import TriviaPopup from "@/components/TriviaPopup";
import TriviaRewardsDialog from "@/components/TriviaRewardsDialog";
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
  const [showPreSurveyDialog, setShowPreSurveyDialog] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const [preSurveyActionsRequested, setPreSurveyActionsRequested] = useState<{
    order: boolean;
    email: boolean;
  }>({ order: false, email: false });
  
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [priceRange, setPriceRange] = useState("all");
  // Wine-specific filters
  const [wineColor, setWineColor] = useState("all");
  const [sweetness, setSweetness] = useState("all");
  const [body, setBody] = useState("all");
  const [characteristics, setCharacteristics] = useState("all");
  // Beer-specific filters
  const [beerStyle, setBeerStyle] = useState("all");
  const [beerColor, setBeerColor] = useState("all");
  const [beerBitterness, setBeerBitterness] = useState("all");
  // Spirits-specific filters
  const [spiritType, setSpiritType] = useState("all");
  const [spiritAging, setSpiritAging] = useState("all");
  const [spiritFlavor, setSpiritFlavor] = useState("all");
  
  const [showTrivia, setShowTrivia] = useState(false);
  const [showTriviaInfo, setShowTriviaInfo] = useState(false);
  const [showTriviaRewards, setShowTriviaRewards] = useState(false);
  const [triviaFinalScore, setTriviaFinalScore] = useState({ score: 0, total: 0 });
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
        // Wine filters - only when wine category selected
        wineColor: selectedCategory === 'wine' ? wineColor : 'all',
        sweetness: selectedCategory === 'wine' ? sweetness : 'all',
        body: selectedCategory === 'wine' ? body : 'all',
        characteristics: selectedCategory === 'wine' ? characteristics : 'all',
        // Beer filters - only when beer category selected
        beerStyle: selectedCategory === 'beer' ? beerStyle : 'all',
        beerColor: selectedCategory === 'beer' ? beerColor : 'all',
        beerBitterness: selectedCategory === 'beer' ? beerBitterness : 'all',
        // Spirits filters - only when spirits category selected
        spiritType: selectedCategory === 'spirits' ? spiritType : 'all',
        spiritAging: selectedCategory === 'spirits' ? spiritAging : 'all',
        spiritFlavor: selectedCategory === 'spirits' ? spiritFlavor : 'all',
        priceRange 
      }
    ],
    queryFn: async () => {
      const filters: any = {};
      if (searchQuery) filters.search = searchQuery;
      if (selectedCategory !== 'all') filters.category = selectedCategory;
      
      // Wine-specific filters
      if (selectedCategory === 'wine') {
        if (wineColor !== 'all') filters.wineColor = wineColor;
        if (sweetness !== 'all') filters.sweetness = sweetness;
        if (body !== 'all') filters.body = body;
        if (characteristics !== 'all') filters.characteristics = characteristics;
      }
      
      // Beer-specific filters
      if (selectedCategory === 'beer') {
        if (beerStyle !== 'all') filters.beerStyle = beerStyle;
        if (beerColor !== 'all') filters.beerColor = beerColor;
        if (beerBitterness !== 'all') filters.beerBitterness = beerBitterness;
      }
      
      // Spirits-specific filters
      if (selectedCategory === 'spirits') {
        if (spiritType !== 'all') filters.spiritType = spiritType;
        if (spiritAging !== 'all') filters.spiritAging = spiritAging;
        if (spiritFlavor !== 'all') filters.spiritFlavor = spiritFlavor;
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

  // Reset category-specific filters when switching categories
  useEffect(() => {
    // Reset wine filters when not in wine category
    if (selectedCategory !== 'wine') {
      setWineColor('all');
      setSweetness('all');
      setBody('all');
      setCharacteristics('all');
    }
    // Reset beer filters when not in beer category
    if (selectedCategory !== 'beer') {
      setBeerStyle('all');
      setBeerColor('all');
      setBeerBitterness('all');
    }
    // Reset spirits filters when not in spirits category
    if (selectedCategory !== 'spirits') {
      setSpiritType('all');
      setSpiritAging('all');
      setSpiritFlavor('all');
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

  const { data: sessionData } = useQuery({
    queryKey: ["/api/sessions", sessionId],
    queryFn: () => fetch(`/api/sessions/${sessionId}`).then(r => r.json()),
    enabled: !!sessionId,
  });

  const totalInteractions = favoritesData.length + viewHistoryData.length;
  const hasStatedPreferences = !!(sessionData?.preferredBeverageTypes?.length || sessionData?.wineColors?.length || sessionData?.flavorPreferences?.length || sessionData?.occasion);
  const shouldFetchRecommendations = !!sessionId && (totalInteractions >= 2 || hasStatedPreferences);

  const { data: recommendationsData = [], isLoading: recommendationsLoading } = useQuery({
    queryKey: ["/api/sessions", sessionId, "recommendations"],
    queryFn: () => api.getRecommendations(sessionId!),
    enabled: shouldFetchRecommendations,
  });

  const { data: videos = [], isLoading: videosLoading } = useQuery({
    queryKey: ["/api/videos"],
    queryFn: async () => {
      const response = await fetch("/api/videos?activeOnly=true");
      if (!response.ok) throw new Error("Failed to fetch videos");
      return response.json();
    },
    enabled: hasStarted,
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
    onError: (error) => {
      console.error("Failed to save product note:", error);
      toast({
        title: "Error",
        description: "Failed to save note",
        variant: "destructive",
      });
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

  const savePreferencesMutation = useMutation({
    mutationFn: (preferences: { beverageTypes: string[]; wineColors?: string[]; flavorPreferences: string[]; occasion?: string }) =>
      api.updateGuestPreferences(sessionId!, preferences.beverageTypes, preferences.flavorPreferences, preferences.wineColors, preferences.occasion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId, "recommendations"] });
      toast({
        title: "Preferences saved!",
        description: "Generating personalized recommendations for you",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save preferences",
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
    // Save to product_notes table (unified note system)
    saveProductNoteMutation.mutate({ productId, note });
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
            
            // Show rewards dialog when all 10 questions are answered
            if (newTotal === 10) {
              setTriviaFinalScore({ score: newScore, total: newTotal });
              setShowTriviaRewards(true);
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
      .filter(item => ['wine', 'spirits'].includes(item.category))
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

  const handlePreSurveyPlaceOrder = () => {
    setPreSurveyActionsRequested(prev => ({ ...prev, order: true }));
    
    const wineSpiritsCount = cartItemsArray
      .filter(item => ['wine', 'spirits'].includes(item.category))
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

  const handlePreSurveyEmailFavorites = (email: string) => {
    setPreSurveyActionsRequested(prev => ({ ...prev, email: true }));
    emailFavoritesMutation.mutate(email);
  };

  const handlePreSurveyComplete = () => {
    setShowPreSurveyDialog(false);
    setShowSurvey(true);
    setPreSurveyActionsRequested({ order: false, email: false });
  };

  useEffect(() => {
    if (showPreSurveyDialog) {
      emailCartMutation.reset();
      emailFavoritesMutation.reset();
      setPreSurveyActionsRequested({ order: false, email: false });
    }
  }, [showPreSurveyDialog]);

  useEffect(() => {
    const orderRequested = preSurveyActionsRequested.order;
    const emailRequested = preSurveyActionsRequested.email;
    
    if (!orderRequested && !emailRequested) {
      return;
    }

    const orderCompleted = !orderRequested || emailCartMutation.isSuccess;
    const emailCompleted = !emailRequested || emailFavoritesMutation.isSuccess;

    if (orderCompleted && emailCompleted) {
      setShowPreSurveyDialog(false);
      setShowSurvey(true);
      setPreSurveyActionsRequested({ order: false, email: false });
    }
  }, [
    preSurveyActionsRequested,
    emailCartMutation.isSuccess,
    emailFavoritesMutation.isSuccess,
  ]);

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
      // Fallback: read from product_notes first, then favorites.note for legacy data
      note: productNotesMap[fav.productId] || fav.note || undefined,
    }));
  }, [favoritesData, productNotesMap]);

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

  const getTriviaMessage = (percentage: number): string => {
    if (percentage === 100) {
      return "You're on your way to winning a $5.00 discount!";
    } else if (percentage >= 90) {
      return "Outstanding! Almost perfect!";
    } else if (percentage >= 80) {
      return "Excellent work! Keep it up!";
    } else if (percentage >= 70) {
      return "Great job! You're doing well!";
    } else if (percentage >= 60) {
      return "Good effort! Not bad at all!";
    } else if (percentage >= 50) {
      return "Not bad! Keep trying!";
    } else if (percentage >= 40) {
      return "You're learning! Keep going!";
    } else if (percentage >= 30) {
      return "Practice makes perfect!";
    } else if (percentage > 0) {
      return "Every expert was once a beginner!";
    } else {
      return "Give it another shot!";
    }
  };

  const triviaPercentage = useMemo(() => {
    if (triviaAnswered === 0) return 0;
    return Math.round((triviaScore / triviaAnswered) * 100);
  }, [triviaScore, triviaAnswered]);

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
              <p className="text-sm text-muted-foreground mt-1">
                Let's find the adult beverages you are going to love. Use the search features below to select a category such as "Wine" and additional search options will appear such as sweetness levels.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {triviaAnswered > 0 && (
                <div className="text-right" data-testid="trivia-score-display">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">
                        {triviaScore}/{triviaAnswered} Correct ({triviaPercentage}%)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getTriviaMessage(triviaPercentage)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
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
              beerStyle={beerStyle}
              beerColor={beerColor}
              beerBitterness={beerBitterness}
              spiritType={spiritType}
              spiritAging={spiritAging}
              spiritFlavor={spiritFlavor}
              onSearchChange={setSearchInput}
              onCategoryChange={setSelectedCategory}
              onSortChange={setSortBy}
              onPriceRangeChange={setPriceRange}
              onWineColorChange={setWineColor}
              onSweetnessChange={setSweetness}
              onBodyChange={setBody}
              onCharacteristicsChange={setCharacteristics}
              onBeerStyleChange={setBeerStyle}
              onBeerColorChange={setBeerColor}
              onBeerBitternessChange={setBeerBitterness}
              onSpiritTypeChange={setSpiritType}
              onSpiritAgingChange={setSpiritAging}
              onSpiritFlavorChange={setSpiritFlavor}
              onClearFilters={() => {
                setSearchInput('');
                setSelectedCategory('all');
                setPriceRange('all');
                setWineColor('all');
                setSweetness('all');
                setBody('all');
                setCharacteristics('all');
                setBeerStyle('all');
                setBeerColor('all');
                setBeerBitterness('all');
                setSpiritType('all');
                setSpiritAging('all');
                setSpiritFlavor('all');
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
              onReturnToProducts={() => setActiveTab('browse')}
            />
          </div>
        )}

        {activeTab === 'recommendations' && (
          !hasStatedPreferences && totalInteractions < 2 ? (
            <PreferenceQuestionnaire
              onSubmit={(preferences) => savePreferencesMutation.mutate(preferences)}
              isLoading={savePreferencesMutation.isPending}
            />
          ) : (
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
          )
        )}

        {activeTab === 'videos' && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h2 className="font-serif text-3xl font-medium mb-2">Educational Videos</h2>
              <p className="text-muted-foreground">
                Learn more about our products and the craft behind them
              </p>
            </div>

            {videosLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading videos...</p>
              </div>
            ) : videos.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-lg border border-card-border">
                <p className="text-lg text-muted-foreground mb-2">No videos available yet</p>
                <p className="text-sm text-muted-foreground">Check back soon for educational content</p>
              </div>
            ) : (
              <div className="space-y-6">
                {videos.map((video: any) => {
                  const getEmbedUrl = (url: string): string => {
                    if (!url) return '';
                    
                    // YouTube
                    const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
                    if (youtubeMatch) {
                      return `https://www.youtube.com/embed/${youtubeMatch[1]}?rel=0&modestbranding=1`;
                    }
                    
                    // Vimeo
                    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
                    if (vimeoMatch) {
                      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
                    }
                    
                    // Already an embed URL or direct video
                    return url;
                  };

                  const embedUrl = getEmbedUrl(video.videoUrl);
                  const isEmbeddable = embedUrl && (embedUrl.includes('youtube.com/embed') || embedUrl.includes('player.vimeo.com') || embedUrl.endsWith('.mp4') || embedUrl.endsWith('.webm'));

                  return (
                    <div 
                      key={video.id} 
                      className="bg-card rounded-lg border border-card-border overflow-hidden"
                      data-testid={`video-card-${video.id}`}
                    >
                      <div className="aspect-video bg-black relative">
                        {isEmbeddable ? (
                          <iframe
                            src={embedUrl}
                            title={video.title}
                            className="w-full h-full"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            data-testid={`video-player-${video.id}`}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-8">
                            <svg className="w-16 h-16 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                            <p className="text-sm text-muted-foreground text-center">
                              Video cannot be embedded. Click the link below to watch.
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="p-6">
                        <h3 className="font-serif text-xl font-medium mb-2">{video.title}</h3>
                        {video.description && (
                          <p className="text-muted-foreground mb-4">{video.description}</p>
                        )}
                        <a
                          href={video.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                          data-testid={`link-source-video-${video.id}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Open in new tab
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
                onClick={() => setShowPreSurveyDialog(true)}
                data-testid="button-complete-tasting"
                className="mt-4"
              >
                Complete Tasting Experience
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

      <TriviaRewardsDialog
        open={showTriviaRewards}
        onClose={() => setShowTriviaRewards(false)}
        score={triviaFinalScore.score}
        total={triviaFinalScore.total}
      />

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
        onContinue={() => {
          setShowIntroduction(false);
          // Show trivia info popup immediately after introduction closes
          setShowTriviaInfo(true);
        }}
        guestName={guestName}
      />

      <PreSurveyDialog
        open={showPreSurveyDialog}
        hasCartItems={cartItemsArray.length > 0}
        hasFavorites={favoritesData.length > 0}
        onPlaceOrder={handlePreSurveyPlaceOrder}
        onEmailFavorites={handlePreSurveyEmailFavorites}
        onComplete={handlePreSurveyComplete}
        isPlacingOrder={emailCartMutation.isPending}
        isEmailingFavorites={emailFavoritesMutation.isPending}
        orderError={emailCartMutation.isError ? (emailCartMutation.error as Error)?.message || "Failed to place order" : undefined}
        emailError={emailFavoritesMutation.isError ? (emailFavoritesMutation.error as Error)?.message || "Failed to send email" : undefined}
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
