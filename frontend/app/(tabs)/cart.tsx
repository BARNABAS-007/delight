import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCart } from '@/context/CartContext';
import SpeedStreak from '@/components/SpeedStreak';
import { Colors, Spacing, Brutalist } from '@/constants/theme';

export default function CartScreen() {
  const { cart, updateQty, removeFromCart, clearCart, itemCount, streakVisible } = useCart();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const items = cart.items;
  const pricing = cart.pricing;

  const handleClear = () => {
    Alert.alert('Clear Cart', 'Remove all items?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearCart },
    ]);
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <SpeedStreak visible={streakVisible} />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Cart</Text>
        {items.length > 0 && (
          <TouchableOpacity testID="clear-cart-btn" onPress={handleClear}>
            <Text style={s.clearTxt}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {items.length === 0 ? (
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
          {/* Restaurant */}
          <View style={s.restHeader}>
            <Ionicons name="restaurant" size={20} color={Colors.primary} />
            <Text style={s.restName}>{cart.restaurant_name}</Text>
          </View>

          {/* Items */}
          <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
            {items.map(item => (
              <View testID={`cart-item-${item.item_id}`} key={item.item_id} style={s.item}>
                <View style={s.itemInfo}>
                  <Text style={s.itemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={s.itemPrice}>₹{(item.price * item.quantity).toFixed(2)}</Text>
                  <Text style={s.itemUnit}>₹{item.price.toFixed(2)} each</Text>
                </View>
                <View style={s.qtyRow}>
                  <TouchableOpacity
                    testID={`dec-${item.item_id}`}
                    style={s.qtyBtn}
                    onPress={() => updateQty(item.item_id, item.quantity - 1)}
                  >
                    <Ionicons name="remove" size={16} color={Colors.primary} />
                  </TouchableOpacity>
                  <Text testID={`qty-${item.item_id}`} style={s.qty}>{item.quantity}</Text>
                  <TouchableOpacity
                    testID={`inc-${item.item_id}`}
                    style={s.qtyBtn}
                    onPress={() => updateQty(item.item_id, item.quantity + 1)}
                  >
                    <Ionicons name="add" size={16} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Pricing Summary */}
          <View style={s.summary}>
            {pricing && (
              <>
                <SummaryRow label="Base" value={`₹${pricing.base.toFixed(2)}`} />
                
                {pricing.packaging_fee === 0 || !pricing.packaging_fee ? (
                  <SummaryRow 
                    label="Packaging Fee" 
                    value="NO PACKAGING FEE" 
                    valueStyle={{ color: Colors.success, fontFamily: 'DMSans_700Bold' }} 
                  />
                ) : (
                  <SummaryRow label="Packaging" value={`₹${pricing.packaging_fee.toFixed(2)}`} />
                )}

                <SummaryRow label={`GST (${pricing.gst_percent}%)`} value={`₹${pricing.gst_amount.toFixed(2)}`} />
                <SummaryRow label="Platform Fee" value={`₹${pricing.platform_fee.toFixed(2)}`} />
                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>Total</Text>
                  <Text testID="cart-total" style={s.totalVal}>₹{pricing.customer_total.toFixed(2)}</Text>
                </View>
              </>
            )}
            <TouchableOpacity
              testID="checkout-btn"
              style={s.checkoutBtn}
              onPress={() => router.push('/checkout')}
            >
              <Text style={s.checkoutBtnTxt}>PROCEED TO CHECKOUT</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

function SummaryRow({ label, value, valueStyle }: { label: string; value: string; valueStyle?: any }) {
  return (
    <View style={s.summaryRow}>
      <Text style={s.summaryLabel}>{label}</Text>
      <Text style={[s.summaryVal, valueStyle]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.screen, paddingBottom: 16, paddingTop: 8 },
  title: { fontFamily: 'DMSans_700Bold', fontSize: 28, color: Colors.textPrimary },
  clearTxt: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.error },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.screen },
  emptyTitle: { fontFamily: 'DMSans_700Bold', fontSize: 20, color: Colors.textPrimary, marginTop: 16 },
  emptySubtitle: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textSecondary, marginTop: 8, textAlign: 'center' },
  browseBtn: { marginTop: 24, height: 48, backgroundColor: Colors.primary, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', ...Brutalist, borderColor: Colors.secondary },
  browseBtnTxt: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.primaryFg, letterSpacing: 1 },

  restHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.screen, paddingBottom: 14, gap: 10, borderBottomWidth: 2, borderBottomColor: Colors.secondary, marginBottom: 8 },
  restName: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.textPrimary },

  list: { flex: 1 },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.screen, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  itemInfo: { flex: 1 },
  itemName: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.textPrimary },
  itemPrice: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.primary, marginTop: 2 },
  itemUnit: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, paddingVertical: 6, ...Brutalist, borderColor: Colors.secondary, borderWidth: 1, backgroundColor: Colors.surface },
  qtyBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  qty: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.textPrimary, width: 28, textAlign: 'center' },

  summary: { padding: Spacing.screen, borderTopWidth: 2, borderTopColor: Colors.secondary, backgroundColor: Colors.surface },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryLabel: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textSecondary },
  summaryVal: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textPrimary },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10, marginTop: 6, marginBottom: 16 },
  totalLabel: { fontFamily: 'DMSans_700Bold', fontSize: 18, color: Colors.textPrimary },
  totalVal: { fontFamily: 'DMSans_700Bold', fontSize: 22, color: Colors.primary },

  checkoutBtn: { height: 56, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Brutalist, borderColor: Colors.secondary },
  checkoutBtnTxt: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.primaryFg, letterSpacing: 2 },
});
