import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export interface CartReservation {
  experienceId: string;
  experienceName: string;
  date: string;
  time: string;
  partySize: number;
  price: string;
  customerInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  specialRequests?: string;
  locationId?: string;
  reservationType?: string;
}

interface ReservationCartContextType {
  cartItems: CartReservation[];
  addToCart: (reservation: CartReservation) => void;
  removeFromCart: (experienceId: string) => void;
  clearCart: () => void;
  isInCart: (experienceId: string) => boolean;
  getCartItem: (experienceId: string) => CartReservation | undefined;
  cartCount: number;
}

const ReservationCartContext = createContext<ReservationCartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'reservationCart';

export function ReservationCartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartReservation[]>([]);
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(CART_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setCartItems(parsed);
          }
        }
      } catch {
      }
      setHasLoadedFromStorage(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && hasLoadedFromStorage) {
      try {
        if (cartItems.length > 0) {
          localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
        } else {
          localStorage.removeItem(CART_STORAGE_KEY);
        }
      } catch {
      }
    }
  }, [cartItems, hasLoadedFromStorage]);

  const addToCart = useCallback((reservation: CartReservation) => {
    setCartItems(prev => {
      const existingIndex = prev.findIndex(item => item.experienceId === reservation.experienceId);
      let newItems: CartReservation[];
      if (existingIndex >= 0) {
        newItems = [...prev];
        newItems[existingIndex] = reservation;
      } else {
        newItems = [...prev, reservation];
      }
      return newItems;
    });
  }, []);

  const removeFromCart = useCallback((experienceId: string) => {
    setCartItems(prev => prev.filter(item => item.experienceId !== experienceId));
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const isInCart = useCallback((experienceId: string) => {
    return cartItems.some(item => item.experienceId === experienceId);
  }, [cartItems]);

  const getCartItem = useCallback((experienceId: string) => {
    return cartItems.find(item => item.experienceId === experienceId);
  }, [cartItems]);

  return (
    <ReservationCartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        clearCart,
        isInCart,
        getCartItem,
        cartCount: cartItems.length,
      }}
    >
      {children}
    </ReservationCartContext.Provider>
  );
}

export function useReservationCart() {
  const context = useContext(ReservationCartContext);
  if (context === undefined) {
    throw new Error('useReservationCart must be used within a ReservationCartProvider');
  }
  return context;
}
