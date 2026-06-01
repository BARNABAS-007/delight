import React, {
  createContext, useContext, useState, useRef, ReactNode, useEffect,
} from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { calculatePricing, PricingBreakdown, setPlatformFee } from '@/lib/pricingEngine';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

const CART_STORAGE_KEY = '@delight_cart_v2';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CartItem {
  item_id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface RestaurantBucket {
  restaurant_id: string;
  restaurant_name: string;
  restaurant_image?: string;
  restaurant_lat?: number;
  restaurant_lng?: number;
  items: CartItem[];
  pricing: PricingBreakdown | null;
}

export interface CartState {
  buckets: RestaurantBucket[];
}

interface CartCtx {
  cart: CartState;
  addToCart: (
    restaurant: { id: string; name: string; image?: string; lat?: number; lng?: number },
    item: CartItem
  ) => void;
  removeFromCart: (restaurantId: string, item_id: string) => void;
  updateQty: (restaurantId: string, item_id: string, qty: number) => void;
  clearCart: () => void;
  clearBucket: (restaurantId: string) => void;
  itemCount: number;
  bucketCount: number;
  grandTotal: number;
  streakVisible: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const EMPTY_CART: CartState = { buckets: [] };

const recalcBucket = (bucket: RestaurantBucket): RestaurantBucket => {
  if (bucket.items.length === 0) return { ...bucket, pricing: null };
  const base = bucket.items.reduce((s, i) => s + i.price * i.quantity, 0);
  return { ...bucket, pricing: calculatePricing(bucket.restaurant_id, base) };
};

// ── Context ───────────────────────────────────────────────────────────────────

const CartContext = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCartRaw] = useState<CartState>(EMPTY_CART);
  const [hydrated, setHydrated] = useState(false);
  const [streakVisible, setStreakVisible] = useState(false);
  const streakTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Persist on every change ───────────────────────────────────────────────
  const setCart = (updater: CartState | ((prev: CartState) => CartState)) => {
    setCartRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  // ── Hydrate from AsyncStorage on mount ────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(CART_STORAGE_KEY)
      .then(raw => {
        if (raw) {
          const saved: CartState = JSON.parse(raw);
          // Re-run pricing in case platform fee changed while app was closed
          const refreshed: CartState = {
            buckets: saved.buckets.map(b => recalcBucket(b)),
          };
          setCartRaw(refreshed);
        }
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  // ── Sync platform fee from Supabase ───────────────────────────────────────
  useEffect(() => {
    supabase.from('settings').select('global_platform_fee').single().then(({ data }) => {
      if (data) {
        setPlatformFee(data.global_platform_fee);
        setCart(prev => ({
          buckets: prev.buckets.map(b => recalcBucket(b)),
        }));
      }
    });

    const sub = supabase
      .channel('public:settings')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'settings' }, payload => {
        if (payload.new?.global_platform_fee !== undefined) {
          setPlatformFee(payload.new.global_platform_fee);
          setCart(prev => ({ buckets: prev.buckets.map(b => recalcBucket(b)) }));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, []);

  // ── Speed Streak animation ────────────────────────────────────────────────
  const triggerStreak = () => {
    setStreakVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (streakTimer.current) clearTimeout(streakTimer.current);
    streakTimer.current = setTimeout(() => setStreakVisible(false), 450);
  };

  // ── Add to Cart ───────────────────────────────────────────────────────────
  const addToCart = (
    restaurant: { id: string; name: string; image?: string; lat?: number; lng?: number },
    item: CartItem
  ) => {
    setCart(prev => {
      const existingIdx = prev.buckets.findIndex(b => b.restaurant_id === restaurant.id);

      if (existingIdx >= 0) {
        // Add to existing bucket
        const bucket = prev.buckets[existingIdx];
        const existingItem = bucket.items.find(i => i.item_id === item.item_id);
        const newItems = existingItem
          ? bucket.items.map(i =>
              i.item_id === item.item_id ? { ...i, quantity: i.quantity + item.quantity } : i
            )
          : [...bucket.items, item];

        const updatedBucket = recalcBucket({ ...bucket, items: newItems });
        const newBuckets = [...prev.buckets];
        newBuckets[existingIdx] = updatedBucket;
        return { buckets: newBuckets };
      } else {
        // Create new bucket for this restaurant
        const newBucket = recalcBucket({
          restaurant_id: restaurant.id,
          restaurant_name: restaurant.name,
          restaurant_image: restaurant.image,
          restaurant_lat: restaurant.lat,
          restaurant_lng: restaurant.lng,
          items: [item],
          pricing: null,
        });
        return { buckets: [...prev.buckets, newBucket] };
      }
    });

    triggerStreak();
  };

  // ── Remove single item ────────────────────────────────────────────────────
  const removeFromCart = (restaurantId: string, item_id: string) => {
    setCart(prev => {
      const newBuckets = prev.buckets
        .map(b => {
          if (b.restaurant_id !== restaurantId) return b;
          const newItems = b.items.filter(i => i.item_id !== item_id);
          if (newItems.length === 0) return null; // Mark for removal
          return recalcBucket({ ...b, items: newItems });
        })
        .filter(Boolean) as RestaurantBucket[];
      return { buckets: newBuckets };
    });
  };

  // ── Update quantity ───────────────────────────────────────────────────────
  const updateQty = (restaurantId: string, item_id: string, qty: number) => {
    if (qty <= 0) { removeFromCart(restaurantId, item_id); return; }
    setCart(prev => ({
      buckets: prev.buckets.map(b => {
        if (b.restaurant_id !== restaurantId) return b;
        const newItems = b.items.map(i => i.item_id === item_id ? { ...i, quantity: qty } : i);
        return recalcBucket({ ...b, items: newItems });
      }),
    }));
  };

  // ── Clear one restaurant bucket ───────────────────────────────────────────
  const clearBucket = (restaurantId: string) => {
    setCart(prev => ({
      buckets: prev.buckets.filter(b => b.restaurant_id !== restaurantId),
    }));
  };

  // ── Clear everything ──────────────────────────────────────────────────────
  const clearCart = () => {
    setCart(EMPTY_CART);
    AsyncStorage.removeItem(CART_STORAGE_KEY).catch(() => {});
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const itemCount = cart.buckets.reduce(
    (sum, b) => sum + b.items.reduce((s, i) => s + i.quantity, 0), 0
  );
  const bucketCount = cart.buckets.length;
  const grandTotal = cart.buckets.reduce(
    (sum, b) => sum + (b.pricing?.customer_total ?? 0), 0
  );

  return (
    <CartContext.Provider value={{
      cart, addToCart, removeFromCart, updateQty,
      clearCart, clearBucket,
      itemCount, bucketCount, grandTotal,
      streakVisible,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be inside CartProvider');
  return ctx;
};
