import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

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

export function ReservationCartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartReservation[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('reservationCart');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const saveToStorage = useCallback((items: CartReservation[]) => {
    localStorage.setItem('reservationCart', JSON.stringify(items));
  }, []);

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
      saveToStorage(newItems);
      return newItems;
    });
  }, [saveToStorage]);

  const removeFromCart = useCallback((experienceId: string) => {
    setCartItems(prev => {
      const newItems = prev.filter(item => item.experienceId !== experienceId);
      saveToStorage(newItems);
      return newItems;
    });
  }, [saveToStorage]);

  const clearCart = useCallback(() => {
    setCartItems([]);
    localStorage.removeItem('reservationCart');
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
