import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCart, RestaurantBucket } from '@/context/CartContext';
import SpeedStreak from '@/components/SpeedStreak';
import { Colors, Spacing, Radius } from '@/constants/theme';

export default function CartScreen() {
  const { cart, updateQty, clearCart, clearBucket, itemCount, bucketCount, grandTotal, streakVisible } = useCart();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleClearAll = () => {
    Alert.alert('Clear Entire Cart', 'Remove all items from all restaurants?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: clearCart },
    ]);
  };

  const handleClearBucket = (bucket: RestaurantBucket) => {
    Alert.alert(`Remove ${bucket.restaurant_name}?`, `Remove all items from this restaurant.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => clearBucket(bucket.restaurant_id) },
    ]);
  };

  const isEmpty = cart.buckets.length === 0;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <SpeedStreak visible={streakVisible} />

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Your Meal</Text>
          {!isEmpty && <Text style={s.subtitle}>{itemCount} items · {bucketCount} restaurant{bucketCount !== 1 ? 's' : ''}</Text>}
        </View>
        {!isEmpty && <TouchableOpacity testID="clear-all-btn" onPress={handleClearAll}><Text style={s.clearAllTxt}>Clear All</Text></TouchableOpacity>}
      </View>

      {/* Multi-rider banner */}
      {bucketCount > 1 && (
        <View style={s.multiNoteBanner}>
          <Ionicons name="bicycle-outline" size={16} color={Colors.primary} />
          <Text style={s.multiNoteTxt}>{bucketCount} separate riders will deliver your meal simultaneously</Text>
        </View>
      )}

      {isEmpty ? (
        <View style={s.empty}>
          <Ionicons name="bag-outline" size={64} color={Colors.border} />
          <Text style={s.emptyTitle}>Your cart is empty</Text>
          <Text style={s.emptySubtitle}>Browse restaurants and add items to get started</Text>
          <TouchableOpacity testID="browse-btn" style={s.browseBtn} onPress={() => router.push('/(tabs)')} activeOpacity={0.8}>
            <Text style={s.browseBtnTxt}>BROWSE RESTAURANTS</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView style={s.list} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
            {cart.buckets.map((bucket, bi) => (
              <View key={bucket.restaurant_id} style={s.bucket}>
                {/* Bucket Header */}
                <View style={s.bucketHeader}>
                  <View style={s.bucketHeaderLeft}>
                    <View style={s.bucketIcon}><Ionicons name="restaurant" size={16} color={Colors.primary} /></View>
                    <View>
                      <Text style={s.bucketName}>{bucket.restaurant_name}</Text>
                      <Text style={s.bucketMeta}>Rider {bi + 1} of {bucketCount} · {bucket.items.reduce((s, i) => s + i.quantity, 0)} item(s)</Text>
                    </View>
                  </View>
                  <TouchableOpacity testID={`remove-bucket-${bucket.restaurant_id}`} onPress={() => handleClearBucket(bucket)} style={s.trashBtn}>
                    <Ionicons name="trash-outline" size={16} color={Colors.error} />
                  </TouchableOpacity>
                </View>

                {/* Items */}
                {bucket.items.map(item => (
                  <View testID={`cart-item-${item.item_id}`} key={item.item_id} style={s.item}>
                    <View style={s.itemInfo}>
                      <Text style={s.itemName} numberOfLines={1}>{item.name}</Text>
                      <Text style={s.itemPrice}>₹{(item.price * item.quantity).toFixed(0)}</Text>
                      <Text style={s.itemUnit}>₹{item.price.toFixed(0)} each</Text>
                    </View>
                    <View style={s.qtyRow}>
                      <TouchableOpacity testID={`dec-${item.item_id}`} style={s.qtyBtn} onPress={() => updateQty(bucket.restaurant_id, item.item_id, item.quantity - 1)}>
                        <Ionicons name="remove" size={16} color={Colors.primary} />
                      </TouchableOpacity>
                      <Text testID={`qty-${item.item_id}`} style={s.qty}>{item.quantity}</Text>
                      <TouchableOpacity testID={`inc-${item.item_id}`} style={s.qtyBtn} onPress={() => updateQty(bucket.restaurant_id, item.item_id, item.quantity + 1)}>
                        <Ionicons name="add" size={16} color={Colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                {/* Per-restaurant pricing */}
                {bucket.pricing && (
                  <View style={s.bucketPricing}>
                    <PRow label="Subtotal" value={`₹${bucket.pricing.base.toFixed(0)}`} />
                    {bucket.pricing.packaging_fee > 0 && <PRow label="Packaging" value={`₹${bucket.pricing.packaging_fee.toFixed(0)}`} />}
                    <PRow label={`GST (${bucket.pricing.gst_percent}%)`} value={`₹${bucket.pricing.gst_amount.toFixed(0)}`} />
                    <PRow label="Platform Fee" value={`₹${bucket.pricing.platform_fee.toFixed(0)}`} />
                    <View style={s.bucketTotal}>
                      <Text style={s.bucketTotalLabel}>This kitchen total</Text>
                      <Text style={s.bucketTotalVal}>₹{bucket.pricing.customer_total.toFixed(0)}</Text>
                    </View>
                  </View>
                )}

                {/* Add more shortcut */}
                <TouchableOpacity style={s.addMoreBtn} onPress={() => router.push(`/restaurant/${bucket.restaurant_id}` as any)} activeOpacity={0.8}>
                  <Ionicons name="add-circle-outline" size={15} color={Colors.primary} />
                  <Text style={s.addMoreTxt}>Add more from {bucket.restaurant_name}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          {/* Grand Total + Checkout */}
          <View style={[s.summary, { paddingBottom: insets.bottom + 16 }]}>
            <View style={s.grandRow}>
              <View>
                <Text style={s.grandLabel}>{bucketCount > 1 ? `Grand Total (${bucketCount} restaurants)` : 'Total'}</Text>
                {bucketCount > 1 && <Text style={s.grandNote}>Incl. delivery for {bucketCount} riders</Text>}
              </View>
              <Text testID="cart-total" style={s.grandVal}>₹{grandTotal.toFixed(0)}</Text>
            </View>
            <TouchableOpacity testID="checkout-btn" style={s.checkoutBtn} onPress={() => router.push('/checkout')} activeOpacity={0.8}>
              <Text style={s.checkoutBtnTxt}>
                {bucketCount > 1 ? `CHECKOUT ${bucketCount} ORDERS · ₹${grandTotal.toFixed(0)}` : 'PROCEED TO CHECKOUT'}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

function PRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.priceRow}>
      <Text style={s.priceLabel}>{label}</Text>
      <Text style={s.priceVal}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: Spacing.screen, paddingBottom: 12, paddingTop: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontFamily: 'DMSans_700Bold', fontSize: 26, color: Colors.textPrimary },
  subtitle: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  clearAllTxt: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.error, marginTop: 6 },
  multiNoteBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: Spacing.screen, marginVertical: 10, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: Colors.surface, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.primary + '44' },
  multiNoteTxt: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.textPrimary, flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.screen },
  emptyTitle: { fontFamily: 'DMSans_700Bold', fontSize: 20, color: Colors.textPrimary, marginTop: 16 },
  emptySubtitle: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textSecondary, marginTop: 8, textAlign: 'center' },
  browseBtn: { marginTop: 24, height: 48, backgroundColor: Colors.primary, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.sm },
  browseBtnTxt: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.primaryFg, letterSpacing: 1 },
  list: { flex: 1 },
  bucket: { marginTop: 12, marginHorizontal: Spacing.screen, backgroundColor: Colors.surface, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  bucketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surfaceLight },
  bucketHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  bucketIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary + '22', alignItems: 'center', justifyContent: 'center' },
  bucketName: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.textPrimary },
  bucketMeta: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  trashBtn: { padding: 6 },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  itemInfo: { flex: 1 },
  itemName: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.textPrimary },
  itemPrice: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.primary, marginTop: 2 },
  itemUnit: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.textSecondary },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 5, borderRadius: Radius.sm, borderColor: Colors.border, borderWidth: 1, backgroundColor: Colors.background },
  qtyBtn: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  qty: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.textPrimary, width: 24, textAlign: 'center' },
  bucketPricing: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  priceLabel: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary },
  priceVal: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.textPrimary },
  bucketTotal: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 8, marginTop: 4, marginBottom: 10 },
  bucketTotalLabel: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.textPrimary },
  bucketTotalVal: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.primary },
  addMoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  addMoreTxt: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.primary },
  summary: { paddingHorizontal: Spacing.screen, paddingTop: 14, backgroundColor: Colors.surface, borderTopWidth: 2, borderTopColor: Colors.border },
  grandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  grandLabel: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.textPrimary },
  grandNote: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  grandVal: { fontFamily: 'DMSans_700Bold', fontSize: 24, color: Colors.primary },
  checkoutBtn: { height: 56, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.sm },
  checkoutBtnTxt: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.primaryFg, letterSpacing: 1 },
});
