import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/services/api';
import { Colors, Spacing } from '@/constants/theme';

const STEPS = [
  { key: 'pending', label: 'Order Placed', icon: 'receipt-outline' },
  { key: 'confirmed', label: 'Confirmed', icon: 'checkmark-circle-outline' },
  { key: 'preparing', label: 'Preparing', icon: 'restaurant-outline' },
  { key: 'out_for_delivery', label: 'On the Way', icon: 'bicycle-outline' },
  { key: 'delivered', label: 'Delivered', icon: 'home-outline' },
];

export default function OrderTracking() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const load = useCallback(async () => {
    try {
      const data: any = await api.getOrder(id as string);
      setOrder(data);
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, [id]);

  useEffect(() => { load(); }, []);

  const stepIndex = STEPS.findIndex(s => s.key === order?.status);
  const isCancelled = order?.status === 'cancelled';

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity testID="back-btn" onPress={() => router.push('/(tabs)/orders')}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={s.title}>Order Tracking</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} /> : !order ? (
        <View style={s.center}><Text style={s.errTxt}>Order not found</Text></View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
        >
          {/* Order Header */}
          <View style={s.orderHead}>
            <Image source={{ uri: order.restaurant_image }} style={s.restImg} />
            <View style={s.orderInfo}>
              <Text style={s.restName}>{order.restaurant_name}</Text>
              <Text style={s.orderNum}>{order.order_number}</Text>
              <Text style={s.orderDate}>{new Date(order.created_at).toLocaleString()}</Text>
            </View>
          </View>

          {/* Status Tracker */}
          {!isCancelled ? (
            <View style={s.tracker}>
              <Text style={s.trackerLabel}>DELIVERY STATUS</Text>
              {STEPS.map((step, i) => {
                const done = i <= stepIndex;
                const active = i === stepIndex;
                return (
                  <View key={step.key} style={s.step}>
                    <View style={s.stepLeft}>
                      <View style={[s.stepDot, done && s.stepDotDone, active && s.stepDotActive]}>
                        <Ionicons name={step.icon as any} size={14} color={done ? Colors.primaryFg : Colors.textSecondary} />
                      </View>
                      {i < STEPS.length - 1 && <View style={[s.stepLine, done && i < stepIndex && s.stepLineDone]} />}
                    </View>
                    <Text style={[s.stepLabel, done && s.stepLabelDone]}>{step.label}</Text>
                    {active && <View style={s.activeBadge}><Text style={s.activeTxt}>NOW</Text></View>}
                  </View>
                );
              })}
              <View style={s.etaBox}>
                <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
                <Text style={s.etaTxt}>Estimated: {order.estimated_delivery}</Text>
              </View>
            </View>
          ) : (
            <View style={s.cancelledBox}>
              <Ionicons name="close-circle-outline" size={48} color={Colors.error} />
              <Text style={s.cancelledTxt}>Order Cancelled</Text>
            </View>
          )}

          {/* Items */}
          <View style={s.itemsSection}>
            <Text style={s.sectionLabel}>ITEMS ORDERED</Text>
            {order.items.map((item: any) => (
              <View key={item.item_id} testID={`order-item-${item.item_id}`} style={s.itemRow}>
                <Text style={s.itemQty}>{item.quantity}x</Text>
                <Text style={s.itemName}>{item.name}</Text>
                <Text style={s.itemPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
              </View>
            ))}
          </View>

          {/* Price Summary */}
          <View style={s.priceSection}>
            <Text style={s.sectionLabel}>PAYMENT SUMMARY</Text>
            <View style={s.priceRow}><Text style={s.priceLabel}>Subtotal</Text><Text style={s.priceVal}>${order.subtotal?.toFixed(2)}</Text></View>
            <View style={s.priceRow}><Text style={s.priceLabel}>Delivery</Text><Text style={s.priceVal}>${order.delivery_fee?.toFixed(2)}</Text></View>
            <View style={[s.priceRow, s.totalRow]}>
              <Text style={s.totalLabel}>Total</Text>
              <Text testID="order-total" style={s.totalVal}>${order.total?.toFixed(2)}</Text>
            </View>
            <Text style={s.paymentMethod}>Paid via: {order.payment_method === 'cod' ? 'Cash on Delivery' : 'Card'}</Text>
          </View>

          {/* Delivery Address */}
          <View style={s.addressSection}>
            <Text style={s.sectionLabel}>DELIVERY ADDRESS</Text>
            <Text style={s.address}>{order.delivery_address}</Text>
          </View>

          <TouchableOpacity testID="back-orders-btn" style={s.backBtn} onPress={() => router.push('/(tabs)/orders')}>
            <Text style={s.backBtnTxt}>BACK TO ORDERS</Text>
          </TouchableOpacity>
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.screen, paddingVertical: 16 },
  title: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 22, color: Colors.textPrimary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errTxt: { fontFamily: 'DMSans_400Regular', color: Colors.textSecondary, fontSize: 16 },
  orderHead: { flexDirection: 'row', alignItems: 'center', padding: Spacing.screen, borderBottomWidth: 1, borderBottomColor: Colors.border },
  restImg: { width: 56, height: 56, resizeMode: 'cover', marginRight: 14 },
  orderInfo: {},
  restName: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 18, color: Colors.textPrimary },
  orderNum: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  orderDate: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary },
  tracker: { padding: Spacing.screen, borderBottomWidth: 1, borderBottomColor: Colors.border },
  trackerLabel: { fontFamily: 'DMSans_700Bold', fontSize: 11, color: Colors.textSecondary, letterSpacing: 2, marginBottom: 20 },
  step: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 0 },
  stepLeft: { alignItems: 'center', marginRight: 14, width: 32 },
  stepDot: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  stepDotDone: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  stepDotActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  stepLine: { width: 2, height: 28, backgroundColor: Colors.border, marginVertical: 3 },
  stepLineDone: { backgroundColor: Colors.primary },
  stepLabel: { flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 15, color: Colors.textSecondary, paddingTop: 6 },
  stepLabelDone: { color: Colors.textPrimary, fontFamily: 'DMSans_500Medium' },
  activeBadge: { backgroundColor: Colors.success, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6 },
  activeTxt: { fontFamily: 'DMSans_700Bold', fontSize: 10, color: '#050505', letterSpacing: 1 },
  etaBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, padding: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  etaTxt: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textSecondary },
  cancelledBox: { padding: Spacing.screen, alignItems: 'center', gap: 12 },
  cancelledTxt: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 22, color: Colors.error },
  itemsSection: { padding: Spacing.screen, borderBottomWidth: 1, borderBottomColor: Colors.border },
  sectionLabel: { fontFamily: 'DMSans_700Bold', fontSize: 11, color: Colors.textSecondary, letterSpacing: 2, marginBottom: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  itemQty: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.textSecondary, width: 28 },
  itemName: { flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textPrimary },
  itemPrice: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textPrimary },
  priceSection: { padding: Spacing.screen, borderBottomWidth: 1, borderBottomColor: Colors.border },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  priceLabel: { fontFamily: 'DMSans_400Regular', fontSize: 15, color: Colors.textSecondary },
  priceVal: { fontFamily: 'DMSans_500Medium', fontSize: 15, color: Colors.textPrimary },
  totalRow: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12, marginTop: 4 },
  totalLabel: { fontFamily: 'DMSans_700Bold', fontSize: 18, color: Colors.textPrimary },
  totalVal: { fontFamily: 'DMSans_700Bold', fontSize: 20, color: Colors.textPrimary },
  paymentMethod: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 8 },
  addressSection: { padding: Spacing.screen, borderBottomWidth: 1, borderBottomColor: Colors.border },
  address: { fontFamily: 'DMSans_400Regular', fontSize: 15, color: Colors.textPrimary, lineHeight: 22 },
  backBtn: { margin: Spacing.screen, height: 48, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  backBtnTxt: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.textPrimary, letterSpacing: 1 },
});
