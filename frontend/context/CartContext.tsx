import React, {
  createContext, useContext, useState, useRef, ReactNode, useEffect
} from 'react';
import { Alert, Modal, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { calculatePricing, PricingBreakdown, setPlatformFee } from '@/lib/pricingEngine';
import { Colors, Brutalist, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export interface CartItem {
  item_id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface CartState {
  restaurant_id: string | null;
  restaurant_name: string;
  restaurant_image?: string;
  restaurant_lat?: number;
  restaurant_lng?: number;
  items: CartItem[];
  pricing: PricingBreakdown | null;
}

interface CartCtx {
  cart: CartState;
  addToCart: (restaurant: { id: string; name: string; image?: string; lat?: number; lng?: number }, item: CartItem) => boolean;
  removeFromCart: (item_id: string) => void;
  updateQty: (item_id: string, qty: number) => void;
  clearCart: () => void;
  itemCount: number;
  // Speed Streak animation trigger
  streakVisible: boolean;
}

const EMPTY_CART: CartState = {
  restaurant_id: null,
  restaurant_name: '',
  items: [],
  pricing: null,
};

const CartContext = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartState>(EMPTY_CART);
  const [streakVisible, setStreakVisible] = useState(false);
  const streakTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [showHardBlock, setShowHardBlock] = useState<{ visible: boolean; restaurant: any; item: CartItem | null }>({ visible: false, restaurant: null, item: null });

  const triggerStreak = () => {
    setStreakVisible(true);
    if (streakTimer.current) clearTimeout(streakTimer.current);
    streakTimer.current = setTimeout(() => setStreakVisible(false), 450);
  };

  const recalcPricing = (restaurantId: string, items: CartItem[]): PricingBreakdown | null => {
    if (!restaurantId || items.length === 0) return null;
    const base = items.reduce((s, i) => s + i.price * i.quantity, 0);
    return calculatePricing(restaurantId, base);
  };

  useEffect(() => {
    // 1. Fetch initial fee
    supabase.from('settings').select('global_platform_fee').single().then(({ data }) => {
      if (data) {
        setPlatformFee(data.global_platform_fee);
        setCart(prev => {
          if (!prev.restaurant_id || prev.items.length === 0) return prev;
          return { ...prev, pricing: recalcPricing(prev.restaurant_id, prev.items) };
        });
      }
    });

    // 2. Realtime listener
    const sub = supabase
      .channel('public:settings')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'settings' }, payload => {
        if (payload.new && payload.new.global_platform_fee !== undefined) {
          setPlatformFee(payload.new.global_platform_fee);
          // Force UI to re-render the cart with the new platform fee
          setCart(prev => {
            if (!prev.restaurant_id || prev.items.length === 0) return prev;
            return { ...prev, pricing: recalcPricing(prev.restaurant_id, prev.items) };
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, []);

  const addToCart = (
    restaurant: { id: string; name: string; image?: string; lat?: number; lng?: number },
    item: CartItem
  ): boolean => {
    let blocked = false;

    setCart(prev => {
      // Hard-block: different restaurant
      if (prev.restaurant_id && prev.restaurant_id !== restaurant.id && prev.items.length > 0) {
        blocked = true;
        return prev;
      }

      const existing = prev.items.find(i => i.item_id === item.item_id);
      let newItems: CartItem[];

      if (existing) {
        newItems = prev.items.map(i =>
          i.item_id === item.item_id ? { ...i, quantity: i.quantity + item.quantity } : i
        );
      } else {
        newItems = [...prev.items, item];
      }

      const pricing = recalcPricing(restaurant.id, newItems);

      return {
        restaurant_id: restaurant.id,
        restaurant_name: restaurant.name,
        restaurant_image: restaurant.image,
        restaurant_lat: restaurant.lat,
        restaurant_lng: restaurant.lng,
        items: newItems,
        pricing,
      };
    });

    if (blocked) {
      setShowHardBlock({ visible: true, restaurant, item });
      return false;
    }

    triggerStreak();
    return true;
  };

  const removeFromCart = (item_id: string) => {
    setCart(prev => {
      const newItems = prev.items.filter(i => i.item_id !== item_id);
      if (newItems.length === 0) return EMPTY_CART;
      const pricing = recalcPricing(prev.restaurant_id!, newItems);
      return { ...prev, items: newItems, pricing };
    });
  };

  const updateQty = (item_id: string, qty: number) => {
    if (qty <= 0) { removeFromCart(item_id); return; }
    setCart(prev => {
      const newItems = prev.items.map(i =>
        i.item_id === item_id ? { ...i, quantity: qty } : i
      );
      const pricing = recalcPricing(prev.restaurant_id!, newItems);
      return { ...prev, items: newItems, pricing };
    });
  };

  const clearCart = () => setCart(EMPTY_CART);

  const itemCount = cart.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQty, clearCart, itemCount, streakVisible }}>
      {children}
      <Modal visible={showHardBlock.visible} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>⚡ DIFFERENT KITCHEN</Text>
            <Text style={s.modalBody}>
              You have items from '{cart.restaurant_name}' in your cart. You can only order from one kitchen at a time to ensure delivery speed.
            </Text>
            <TouchableOpacity 
              style={s.modalBtnClear}
              onPress={() => {
                const pendingRest = showHardBlock.restaurant;
                const pendingItem = showHardBlock.item;
                setShowHardBlock({ visible: false, restaurant: null, item: null });
                clearCart();
                // We use setTimeout to ensure state clears first before re-adding
                if (pendingRest && pendingItem) {
                  setTimeout(() => {
                    addToCart(pendingRest, pendingItem);
                  }, 100);
                }
              }}
            >
              <Text style={s.modalBtnClearTxt}>Clear Cart & Switch Kitchens</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={s.modalBtnCancel}
              onPress={() => setShowHardBlock({ visible: false, restaurant: null, item: null })}
            >
              <Text style={s.modalBtnCancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </CartContext.Provider>
  );
}

const s = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: Spacing.screen },
  modalBox: { backgroundColor: Colors.surface, padding: 24, width: '100%', ...Brutalist, borderColor: Colors.secondary, borderWidth: 2 },
  modalTitle: { fontFamily: 'DMSans_700Bold', fontSize: 18, color: Colors.primary, marginBottom: 12, letterSpacing: 1 },
  modalBody: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textSecondary, marginBottom: 24, lineHeight: 22 },
  modalBtnClear: { backgroundColor: Colors.primary, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', ...Brutalist, borderColor: Colors.secondary, marginBottom: 12 },
  modalBtnClearTxt: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.primaryFg },
  modalBtnCancel: { backgroundColor: 'transparent', paddingVertical: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.secondary, ...Brutalist },
  modalBtnCancelTxt: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.textSecondary },
});

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be inside CartProvider');
  return ctx;
};
