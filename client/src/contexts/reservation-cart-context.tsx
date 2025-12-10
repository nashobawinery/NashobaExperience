import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export interface CustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface CartReservation {
  experienceId: string;
  experienceName: string;
  date: string;
  time: string;
  partySize: number;
  price: string;
  customerInfo: CustomerInfo;
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
  customerInfo: CustomerInfo;
  setCustomerInfo: (info: CustomerInfo) => void;
  resetCustomerInfo: () => void;
}

const ReservationCartContext = createContext<ReservationCartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'reservationCart';

const DEFAULT_CUSTOMER_INFO: CustomerInfo = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
};

interface CartStorage {
  items: CartReservation[];
  customerInfo: CustomerInfo;
}

export function ReservationCartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartReservation[]>([]);
  const [customerInfo, setCustomerInfoState] = useState<CustomerInfo>(DEFAULT_CUSTOMER_INFO);
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(CART_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setCartItems(parsed);
          } else if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.items)) {
              setCartItems(parsed.items);
            }
            if (parsed.customerInfo) {
              setCustomerInfoState(parsed.customerInfo);
            }
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
        const hasItems = cartItems.length > 0;
        const hasCustomerInfo = customerInfo.firstName || customerInfo.lastName || customerInfo.email || customerInfo.phone;
        
        if (hasItems || hasCustomerInfo) {
          const storage: CartStorage = { items: cartItems, customerInfo };
          localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(storage));
        } else {
          localStorage.removeItem(CART_STORAGE_KEY);
        }
      } catch {
      }
    }
  }, [cartItems, customerInfo, hasLoadedFromStorage]);

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
    setCustomerInfoState(DEFAULT_CUSTOMER_INFO);
  }, []);

  const isInCart = useCallback((experienceId: string) => {
    return cartItems.some(item => item.experienceId === experienceId);
  }, [cartItems]);

  const getCartItem = useCallback((experienceId: string) => {
    return cartItems.find(item => item.experienceId === experienceId);
  }, [cartItems]);

  const setCustomerInfo = useCallback((info: CustomerInfo) => {
    setCustomerInfoState(info);
  }, []);

  const resetCustomerInfo = useCallback(() => {
    setCustomerInfoState(DEFAULT_CUSTOMER_INFO);
  }, []);

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
        customerInfo,
        setCustomerInfo,
        resetCustomerInfo,
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
