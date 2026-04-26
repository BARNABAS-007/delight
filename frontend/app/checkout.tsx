import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCart } from '@/context/CartContext';
import { bookRapidoDelivery } from '@/services/rapidoBridge';
import { Colors, Spacing, Brutalist } from '@/constants/theme';
import SpeedStreak from '@/components/SpeedStreak';

const PAYMENT_METHODS = [
  { id: 'cod', label: 'Cash on Delivery', icon: 'cash-outline' },
  { id: 'upi', label: 'UPI (Demo)', icon: 'phone-portrait-outline' },
  { id: 'card', label: 'Card (Demo)', icon: 'card-outline' },
];

export default function Checkout() {
  const [address, setAddress] = useState('');
  const [payment, setPayment] = useState('cod');
  const [placing, setPlacing] = useState(false);
  const [streakFire, setStreakFire] = useState(false);

  const { cart, clearCart } = useCart();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const items = cart.items;
  const pricing = cart.pricing;

  const placeOrder = async () => {
    if (!address.trim()) {
      Alert.alert('Address Required', 'Please enter your delivery address');
      return;
    }
    setPlacing(true);

    try {
      // 1. Create pending order (simulate SQL insert)
      const orderId = `ORD-${Date.now()}`;

      // 2. Trigger Rapido Parcel API
      const rapidoResponse = await bookRapidoDelivery({
        order_id: orderId,
        pickup: {
          lat: cart.restaurant_lat ?? 16.5062,
          lng: cart.restaurant_lng ?? 80.6480,
          address: cart.restaurant_name,
        },
        dropoff: {
          lat: 16.5100,
          lng: 80.6450,
          address: address,
        },
        customer_name: 'Customer',
        customer_phone: '+91-00000-00000',
        package_description: `${items.length} items from ${cart.restaurant_name}`,
      });

      // 3. Fire streak animation
      setStreakFire(true);
      setTimeout(() => setStreakFire(false), 500);

      // 4. Clear cart and route to tracking
      clearCart();
      router.replace(`/order/${orderId}?rapido=${rapidoResponse.booking_id}&est=${rapidoResponse.estimated_minutes}`);

    } catch (e: any) {
      Alert.alert('Order Failed', e?.message || 'Something went wrong.');
    } finally { setPlacing(false); }
  };

  if (items.length === 0) {
    return (
      <View style={[s.flex, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <Ionicons name="bag-outline" size={64} color={Colors.border} />
        <Text style={s.emptyTxt}>Your cart is empty</Text>
        <TouchableOpacity style={s.backBtn} onPress={() => router.replace('/(tabs)')}>
          <Text style={s.backBtnTxt}>BROWSE RESTAURANTS</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={[s.flex, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SpeedStreak visible={streakFire} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity testID="back-btn" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={s.title}>Checkout</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={s.flex} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Order From */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>ORDER FROM</Text>
          <Text style={s.restName}>{cart.restaurant_name}</Text>
        </View>

        {/* Items */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>ITEMS ({items.length})</Text>
          {items.map(item => (
            <View key={item.item_id} style={s.itemRow}>
              <Text style={s.itemQty}>{item.quantity}×</Text>
              <Text style={s.itemName} numberOfLines={1}>{item.name}</Text>
              <Text style={s.itemPrice}>₹{(item.price * item.quantity).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Address */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>DELIVERY ADDRESS</Text>
          <TextInput
            testID="address-input"
            style={s.input}
            placeholder="Enter your full delivery address"
            placeholderTextColor={Colors.textSecondary}
            value={address}
            onChangeText={setAddress}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Payment */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>PAYMENT METHOD</Text>
          {PAYMENT_METHODS.map(pm => (
            <TouchableOpacity
              testID={`payment-${pm.id}`}
              key={pm.id}
              style={[s.paymentOption, payment === pm.id && s.paymentActive]}
              onPress={() => setPayment(pm.id)}
            >
              <Ionicons name={pm.icon as any} size={20} color={payment === pm.id ? Colors.primary : Colors.textSecondary} />
              <Text style={[s.paymentLabel, payment === pm.id && s.paymentLabelActive]}>{pm.label}</Text>
              {payment === pm.id && <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Pricing Breakdown (from Engine) ── */}
        {pricing && (
          <View style={[s.section, s.pricingCard]}>
            <Text style={s.sectionLabel}>PRICE BREAKDOWN</Text>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 10, color: Colors.tertiary, marginBottom: 10 }}>
              Data Source: hyncyecefokfoarusyzl
            </Text>

            <PriceRow label="Base Amount" value={`₹${pricing.base.toFixed(2)}`} />
            
            {pricing.packaging_fee === 0 || !pricing.packaging_fee ? (
              <PriceRow 
                label="Packaging Fee" 
                value="NO PACKAGING FEE" 
                valueStyle={{ color: Colors.success, fontFamily: 'DMSans_700Bold' }} 
              />
            ) : (
              <PriceRow label="Packaging Fee" value={`₹${pricing.packaging_fee.toFixed(2)}`} />
            )}

            <PriceRow label={`GST (${pricing.gst_percent}%)`} value={`₹${pricing.gst_amount.toFixed(2)}`} />
            <PriceRow label="Platform Fee" value={`₹${pricing.platform_fee.toFixed(2)}`} />

            <View style={s.divider} />
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total</Text>
              <Text testID="checkout-total" style={s.totalVal}>₹{pricing.customer_total.toFixed(2)}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Pay Button ── */}
      <View style={[s.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          testID="place-order-btn"
          style={[s.orderBtn, placing && s.orderBtnDisabled]}
          onPress={placeOrder}
          disabled={placing}
          activeOpacity={0.85}
        >
          {placing ? (
            <ActivityIndicator color={Colors.primaryFg} />
          ) : (
            <Text style={s.orderBtnTxt}>
              PAY · ₹{pricing?.customer_total.toFixed(2) ?? '0.00'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function PriceRow({ label, value, valueStyle }: { label: string; value: string; valueStyle?: any }) {
  return (
    <View style={s.priceRow}>
      <Text style={s.priceLabel}>{label}</Text>
      <Text style={[s.priceVal, valueStyle]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.screen, paddingVertical: 16 },
  title: { fontFamily: 'DMSans_700Bold', fontSize: 20, color: Colors.textPrimary },

  section: { paddingHorizontal: Spacing.screen, marginBottom: 24 },
  sectionLabel: { fontFamily: 'DMSans_700Bold', fontSize: 11, color: Colors.textSecondary, letterSpacing: 2, marginBottom: 10 },
  restName: { fontFamily: 'DMSans_700Bold', fontSize: 20, color: Colors.textPrimary },

  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  itemQty: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.textSecondary, width: 30 },
  itemName: { flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textPrimary },
  itemPrice: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textPrimary },

  input: {
    height: 80, backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 12, color: Colors.textPrimary,
    fontFamily: 'DMSans_400Regular', fontSize: 15,
  },

  paymentOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderWidth: 1, borderColor: Colors.border,
    marginBottom: 10, backgroundColor: Colors.surface,
  },
  paymentActive: { borderColor: Colors.primary, backgroundColor: Colors.surfaceLight, ...Brutalist, borderColor: Colors.secondary },
  paymentLabel: { flex: 1, fontFamily: 'DMSans_500Medium', fontSize: 15, color: Colors.textSecondary },
  paymentLabelActive: { color: Colors.textPrimary },

  pricingCard: {
    backgroundColor: Colors.surface, padding: 16,
    marginHorizontal: Spacing.screen, marginBottom: 20,
    ...Brutalist, borderColor: Colors.secondary,
    borderWidth: 1,
  },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  priceLabel: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textSecondary },
  priceVal: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textPrimary },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontFamily: 'DMSans_700Bold', fontSize: 18, color: Colors.textPrimary },
  totalVal: { fontFamily: 'DMSans_700Bold', fontSize: 22, color: Colors.primary },

  footer: { paddingHorizontal: Spacing.screen, paddingTop: 12, borderTopWidth: 2, borderTopColor: Colors.secondary },
  orderBtn: {
    height: 56, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...Brutalist, borderColor: Colors.secondary,
  },
  orderBtnDisabled: { opacity: 0.6 },
  orderBtnTxt: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.primaryFg, letterSpacing: 2 },

  emptyTxt: { fontFamily: 'DMSans_700Bold', fontSize: 18, color: Colors.textSecondary, marginTop: 16 },
  backBtn: { marginTop: 20, height: 48, backgroundColor: Colors.primary, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', ...Brutalist, borderColor: Colors.secondary },
  backBtnTxt: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.primaryFg, letterSpacing: 1 },
});
