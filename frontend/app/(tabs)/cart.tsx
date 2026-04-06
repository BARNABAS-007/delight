import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/services/api';
import { Colors, Spacing } from '@/constants/theme';

export default function CartScreen() {
  const [cart, setCart] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const loadCart = useCallback(async () => {
    try {
      const data: any = await api.getCart();
      setCart(data);
    } catch { setCart(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadCart(); }, []);

  const updateQty = async (itemId: string, qty: number) => {
    setUpdating(itemId);
    try {
      const updated: any = await api.updateCartItem(itemId, qty);
      setCart(updated);
    } catch (e: any) { Alert.alert('Error', e?.detail || 'Failed to update'); }
    finally { setUpdating(null); }
  };

  const clearCart = () => {
    Alert.alert('Clear Cart', 'Remove all items?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => {
        await api.clearCart(); await loadCart();
      }},
    ]);
  };

  const items = cart?.items || [];
  const subtotal = items.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
  const deliveryFee = items.length > 0 ? 2.99 : 0;
  const total = subtotal + deliveryFee;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.title}>Cart</Text>
        {items.length > 0 && (
          <TouchableOpacity testID="clear-cart-btn" onPress={clearCart}>
            <Text style={s.clearTxt}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
      ) : items.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="bag-outline" size={64} color={Colors.border} />
          <Text style={s.emptyTitle}>Your cart is empty</Text>
          <Text style={s.emptySubtitle}>Add items from a restaurant to get started</Text>
          <TouchableOpacity testID="browse-btn" style={s.browseBtn} onPress={() => router.push('/(tabs)')}>
            <Text style={s.browseBtnTxt}>BROWSE RESTAURANTS</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={s.restHeader}>
            <Image source={{ uri: cart?.restaurant_image }} style={s.restImg} />
            <Text style={s.restName}>{cart?.restaurant_name}</Text>
          </View>

          <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
            {items.map((item: any) => (
              <View testID={`cart-item-${item.item_id}`} key={item.item_id} style={s.item}>
                <Image source={{ uri: item.image }} style={s.itemImg} />
                <View style={s.itemInfo}>
                  <Text style={s.itemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={s.itemPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
                  <Text style={s.itemUnit}>${item.price.toFixed(2)} each</Text>
                </View>
                <View style={s.qtyRow}>
                  <TouchableOpacity testID={`dec-${item.item_id}`} style={s.qtyBtn}
                    onPress={() => updateQty(item.item_id, item.quantity - 1)}
                    disabled={updating === item.item_id}>
                    <Ionicons name="remove" size={16} color={Colors.primary} />
                  </TouchableOpacity>
                  {updating === item.item_id ? (
                    <ActivityIndicator size="small" color={Colors.primary} style={{ width: 28 }} />
                  ) : (
                    <Text testID={`qty-${item.item_id}`} style={s.qty}>{item.quantity}</Text>
                  )}
                  <TouchableOpacity testID={`inc-${item.item_id}`} style={s.qtyBtn}
                    onPress={() => updateQty(item.item_id, item.quantity + 1)}
                    disabled={updating === item.item_id}>
                    <Ionicons name="add" size={16} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={s.summary}>
            <View style={s.summaryRow}><Text style={s.summaryLabel}>Subtotal</Text><Text style={s.summaryVal}>${subtotal.toFixed(2)}</Text></View>
            <View style={s.summaryRow}><Text style={s.summaryLabel}>Delivery</Text><Text style={s.summaryVal}>${deliveryFee.toFixed(2)}</Text></View>
            <View style={[s.summaryRow, s.totalRow]}>
              <Text style={s.totalLabel}>Total</Text>
              <Text testID="cart-total" style={s.totalVal}>${total.toFixed(2)}</Text>
            </View>
            <TouchableOpacity testID="checkout-btn" style={s.checkoutBtn}
              onPress={() => router.push('/checkout')}>
              <Text style={s.checkoutBtnTxt}>PROCEED TO CHECKOUT</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.screen, paddingBottom: 16, paddingTop: 8 },
  title: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 32, color: Colors.textPrimary },
  clearTxt: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.error },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.screen },
  emptyTitle: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 22, color: Colors.textPrimary, marginTop: 16 },
  emptySubtitle: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textSecondary, marginTop: 8, textAlign: 'center' },
  browseBtn: { marginTop: 24, height: 48, backgroundColor: Colors.primary, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  browseBtnTxt: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.primaryFg, letterSpacing: 1 },
  restHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.screen, paddingBottom: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, marginBottom: 8 },
  restImg: { width: 40, height: 40, resizeMode: 'cover', borderRadius: 4 },
  restName: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.textPrimary },
  list: { flex: 1 },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.screen, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  itemImg: { width: 60, height: 60, resizeMode: 'cover', marginRight: 12 },
  itemInfo: { flex: 1 },
  itemName: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.textPrimary },
  itemPrice: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.textPrimary, marginTop: 4 },
  itemUnit: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 10, paddingVertical: 8 },
  qtyBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  qty: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.textPrimary, width: 28, textAlign: 'center' },
  summary: { padding: Spacing.screen, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontFamily: 'DMSans_400Regular', fontSize: 15, color: Colors.textSecondary },
  summaryVal: { fontFamily: 'DMSans_500Medium', fontSize: 15, color: Colors.textPrimary },
  totalRow: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12, marginTop: 4, marginBottom: 16 },
  totalLabel: { fontFamily: 'DMSans_700Bold', fontSize: 18, color: Colors.textPrimary },
  totalVal: { fontFamily: 'DMSans_700Bold', fontSize: 22, color: Colors.textPrimary },
  checkoutBtn: { height: 56, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  checkoutBtnTxt: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.primaryFg, letterSpacing: 2 },
});
