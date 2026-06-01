import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { bookRapidoDelivery } from '@/services/rapidoBridge';
import { Colors, Spacing, Radius } from '@/constants/theme';

const PAYMENT_METHODS = [
  { id: 'cod', label: 'Cash on Delivery', icon: 'cash-outline' },
  { id: 'upi', label: 'UPI (Demo)', icon: 'phone-portrait-outline' },
  { id: 'card', label: 'Card (Demo)', icon: 'card-outline' },
];

export default function Checkout() {
  const [address, setAddress] = useState('');
  const [deliveryLat, setDeliveryLat] = useState<number | null>(null);
  const [deliveryLng, setDeliveryLng] = useState<number | null>(null);
  const [payment, setPayment] = useState('cod');
  const [placing, setPlacing] = useState(false);
  const [placingStep, setPlacingStep] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [saveNew, setSaveNew] = useState(false);
  const [newLabel, setNewLabel] = useState('Home');
  const [gpsLoading, setGpsLoading] = useState(false);

  const { cart, clearCart, bucketCount, grandTotal } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const buckets = cart.buckets;

  useEffect(() => {
    if (user) {
      supabase.from('users').select('saved_addresses').eq('user_id', user.user_id).single()
        .then(({ data }) => setSavedAddresses(data?.saved_addresses || []));
    }
  }, [user]);

  const handleDetectLocation = async () => {
    setGpsLoading(true);
    setDeliveryLat(null);
    setDeliveryLng(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please enable Location services to auto-detect your delivery address.',
        );
        setGpsLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });

      const { latitude, longitude } = loc.coords;
      setDeliveryLat(latitude);
      setDeliveryLng(longitude);

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'FIRSTMEAL-App/1.0',
            'Accept-Language': 'en',
          },
        },
      );

      if (!response.ok) throw new Error('Geocoding failed');
      const data = await response.json();

      const a = data.address || {};
      const parts: string[] = [];

      if (a.house_number && a.road) parts.push(`${a.house_number}, ${a.road}`);
      else if (a.road) parts.push(a.road);
      else if (a.amenity) parts.push(a.amenity);
      else if (a.building) parts.push(a.building);

      if (a.neighbourhood) parts.push(a.neighbourhood);
      else if (a.suburb) parts.push(a.suburb);
      else if (a.quarter) parts.push(a.quarter);

      const city = a.city || a.town || a.village || a.municipality || '';
      if (city) parts.push(city);

      if (a.state_district && a.state_district !== city) parts.push(a.state_district);
      if (a.state) parts.push(a.state);
      if (a.postcode) parts.push(a.postcode);

      const fullAddress = parts.length > 0 ? parts.join(', ') : data.display_name;
      setAddress(fullAddress);

    } catch (e: any) {
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const { latitude, longitude } = loc.coords;
        setDeliveryLat(latitude);
        setDeliveryLng(longitude);

        const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geo.length > 0) {
          const g = geo[0];
          const parts = [
            g.streetNumber && g.street ? `${g.streetNumber} ${g.street}` : g.street,
            g.district,
            g.city,
            g.region,
            g.postalCode,
          ].filter(Boolean);
          setAddress(parts.join(', '));
        }
      } catch {
        Alert.alert('GPS Error', 'Could not detect your location. Please enter it manually.');
      }
    } finally {
      setGpsLoading(false);
    }
  };

  const placeOrder = async () => {
    if (!address.trim()) {
      Alert.alert('Address Required', 'Please enter your delivery address');
      return;
    }
    if (!user) {
      Alert.alert('Not Logged In', 'Please log in to place an order');
      return;
    }
    if (buckets.length === 0) return;
    setPlacing(true);

    const placedOrderIds: string[] = [];

    try {
      for (let i = 0; i < buckets.length; i++) {
        const bucket = buckets[i];
        setPlacingStep(`Placing order ${i + 1} of ${buckets.length} (${bucket.restaurant_name})…`);

        const orderId = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

        // ── INSERT order into Supabase ─────────────────────────────────────
        const { error: insertError } = await supabase.from('orders').insert({
          id: orderId,
          user_id: user.user_id,
          restaurant_id: bucket.restaurant_id,
          restaurant_name: bucket.restaurant_name,
          items: bucket.items.map(i => ({
            item_id: i.item_id,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
          })),
          status: 'pending',
          delivery_address: address.trim(),
          // Exact GPS coords for restaurant routing
          ...(deliveryLat !== null && deliveryLng !== null
            ? { delivery_lat: deliveryLat, delivery_lng: deliveryLng }
            : {}),
          payment_method: payment,
          base_amount: bucket.pricing?.base ?? 0,
          packaging_fee: bucket.pricing?.packaging_fee ?? 0,
          gst_amount: bucket.pricing?.gst_amount ?? 0,
          platform_fee: bucket.pricing?.platform_fee ?? 0,
          total_amount: bucket.pricing?.customer_total ?? 0,
        });

        if (insertError) throw new Error(`Order for ${bucket.restaurant_name} failed: ${insertError.message}`);

        // ── Trigger Rapido (non-blocking per order) ────────────────────────
        try {
          const rapidoRes = await bookRapidoDelivery({
            order_id: orderId,
            pickup: { lat: bucket.restaurant_lat ?? 16.5062, lng: bucket.restaurant_lng ?? 80.6480, address: bucket.restaurant_name },
            // Use exact GPS coords if available, otherwise fall back to default
            dropoff: {
              lat: deliveryLat ?? 16.5100,
              lng: deliveryLng ?? 80.6450,
              address: address,
            },
            customer_name: user.name || 'Customer',
            customer_phone: user.phone || '+91-00000-00000',
            package_description: `${bucket.items.length} item(s) from ${bucket.restaurant_name}`,
          });
          await supabase.from('orders').update({
            rapido_booking: rapidoRes.booking_id,
            estimated_minutes: rapidoRes.estimated_minutes,
            status: 'confirmed',
          }).eq('id', orderId);
        } catch {
          await supabase.from('orders').update({ status: 'confirmed' }).eq('id', orderId);
        }

        placedOrderIds.push(orderId);
      }

      if (saveNew && address.trim()) {
        const newAddr = {
          id: Math.random().toString(36).substring(2, 9),
          label: newLabel,
          address: address.trim(),
          ...(deliveryLat !== null && deliveryLng !== null
            ? { latitude: deliveryLat, longitude: deliveryLng }
            : {}),
        };
        const updated = [...savedAddresses, newAddr];
        supabase.from('users').update({ saved_addresses: updated }).eq('user_id', user.user_id).then();
      }

      clearCart();

      // ── Haptic Success ────────────────────────────────────────────────
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      // ── Navigate ───────────────────────────────────────────────────────
      if (placedOrderIds.length === 1) {
        // Single restaurant → go directly to live tracking
        router.replace(`/order/${placedOrderIds[0]}` as any);
      } else {
        // Multi-restaurant → go to order history where all orders are listed
        router.replace('/(tabs)/orders' as any);
      }

    } catch (e: any) {
      Alert.alert('Order Failed', e?.message || 'Something went wrong. Please try again.');
    } finally {
      setPlacing(false);
      setPlacingStep('');
    }
  };

  if (buckets.length === 0) {
    return (
      <View style={[s.flex, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <Ionicons name="bag-outline" size={64} color={Colors.border} />
        <Text style={s.emptyTxt}>Your cart is empty</Text>
        <TouchableOpacity style={s.backBtn} onPress={() => router.replace('/(tabs)')} activeOpacity={0.8}>
          <Text style={s.backBtnTxt}>BROWSE RESTAURANTS</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={[s.flex, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity testID="back-btn" onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Checkout</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={s.flex} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>

        {/* Multi-rider notice */}
        {bucketCount > 1 && (
          <View style={[s.section, s.multiNotice]}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
            <Text style={s.multiNoticeTxt}>
              Placing {bucketCount} separate orders with {bucketCount} riders — all delivered to the same address.
            </Text>
          </View>
        )}

        {/* Order Summary per bucket */}
        {buckets.map((bucket, i) => (
          <View key={bucket.restaurant_id} style={s.section}>
            <Text style={s.sectionLabel}>
              {bucketCount > 1 ? `ORDER ${i + 1} — ${bucket.restaurant_name.toUpperCase()}` : 'ORDER FROM'}
            </Text>
            {bucketCount === 1 && <Text style={s.restName}>{bucket.restaurant_name}</Text>}

            {bucket.items.map(item => (
              <View key={item.item_id} style={s.itemRow}>
                <Text style={s.itemQty}>{item.quantity}×</Text>
                <Text style={s.itemName} numberOfLines={1}>{item.name}</Text>
                <Text style={s.itemPrice}>₹{(item.price * item.quantity).toFixed(0)}</Text>
              </View>
            ))}

            {bucket.pricing && (
              <View style={s.miniPricing}>
                <View style={s.miniPricingRow}>
                  <Text style={s.miniLabel}>Kitchen Total</Text>
                  <Text style={s.miniVal}>₹{bucket.pricing.customer_total.toFixed(0)}</Text>
                </View>
              </View>
            )}
          </View>
        ))}

        {/* Delivery Address — shared */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>DELIVERY ADDRESS {bucketCount > 1 ? '(SAME FOR ALL ORDERS)' : ''}</Text>
          
          {savedAddresses.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {savedAddresses.map(addr => (
                <TouchableOpacity
                  key={addr.id}
                  style={[s.addrChip, address === addr.address && s.addrChipActive]}
                  onPress={() => {
                    setAddress(addr.address);
                    // Populate GPS coords if this address has them
                    if (addr.latitude && addr.longitude) {
                      setDeliveryLat(addr.latitude);
                      setDeliveryLng(addr.longitude);
                    } else {
                      setDeliveryLat(null);
                      setDeliveryLng(null);
                    }
                  }}
                >
                  <Ionicons
                    name={addr.label === 'Home' ? 'home' : addr.label === 'Work' ? 'briefcase' : 'location'}
                    size={14}
                    color={address === addr.address ? Colors.background : Colors.primary}
                  />
                  <Text style={[s.addrChipTxt, address === addr.address && s.addrChipTxtActive]}>
                    {addr.label}
                    {addr.latitude ? ' 📍' : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Address input with embedded GPS button */}
          <View style={[s.inputWrapper, deliveryLat !== null && s.inputWrapperGps]}>
            <TextInput
              testID="address-input"
              style={s.input}
              placeholder="Enter your full delivery address"
              placeholderTextColor={Colors.textSecondary}
              value={address}
              onChangeText={t => {
                setAddress(t);
                // Clear GPS coords if user edits manually
                setDeliveryLat(null);
                setDeliveryLng(null);
              }}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            {/* GPS icon button — top right inside input */}
            <TouchableOpacity
              style={[s.inputGpsBtn, deliveryLat !== null && s.inputGpsBtnActive]}
              onPress={handleDetectLocation}
              activeOpacity={0.7}
              disabled={gpsLoading}
            >
              {gpsLoading ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons
                  name="navigate"
                  size={17}
                  color={deliveryLat !== null ? '#fff' : Colors.primary}
                />
              )}
            </TouchableOpacity>
          </View>

          {/* GPS confirmation strip */}
          {deliveryLat !== null && deliveryLng !== null && (
            <View style={s.gpsConfirm}>
              <Ionicons name="checkmark-circle" size={13} color={Colors.success} />
              <Text style={s.gpsConfirmTxt}>
                GPS verified · {deliveryLat.toFixed(5)}, {deliveryLng.toFixed(5)}
              </Text>
            </View>
          )}

          {address.trim() !== '' && !savedAddresses.some(a => a.address === address.trim()) && (
            <View style={s.saveRow}>
              <TouchableOpacity style={s.checkbox} onPress={() => setSaveNew(!saveNew)} activeOpacity={0.8}>
                <Ionicons name={saveNew ? 'checkbox' : 'square-outline'} size={22} color={Colors.primary} />
                <Text style={s.checkboxTxt}>Save for later</Text>
              </TouchableOpacity>
              {saveNew && (
                <View style={s.labelChips}>
                  {['Home', 'Work', 'Other'].map(l => (
                    <TouchableOpacity 
                      key={l} 
                      style={[s.miniLabelChip, newLabel === l && s.miniLabelChipActive]} 
                      onPress={() => setNewLabel(l)}
                    >
                      <Text style={[s.miniLabelChipTxt, newLabel === l && s.miniLabelChipTxtActive]}>{l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Payment Method */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>PAYMENT METHOD</Text>
          {PAYMENT_METHODS.map(pm => (
            <TouchableOpacity
              testID={`payment-${pm.id}`}
              key={pm.id}
              style={[s.paymentOption, payment === pm.id && s.paymentActive]}
              onPress={() => setPayment(pm.id)}
              activeOpacity={0.8}
            >
              <Ionicons name={pm.icon as any} size={20} color={payment === pm.id ? Colors.primary : Colors.textSecondary} />
              <Text style={[s.paymentLabel, payment === pm.id && s.paymentLabelActive]}>{pm.label}</Text>
              {payment === pm.id && <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Grand Total */}
        <View style={[s.section, s.grandCard]}>
          <Text style={s.sectionLabel}>BILLING SUMMARY</Text>
          {buckets.map(b => b.pricing && (
            <View key={b.restaurant_id} style={s.grandRow}>
              <Text style={s.grandRestName} numberOfLines={1}>{b.restaurant_name}</Text>
              <Text style={s.grandRestVal}>₹{b.pricing.customer_total.toFixed(0)}</Text>
            </View>
          ))}
          {bucketCount > 1 && <View style={s.divider} />}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Grand Total</Text>
            <Text testID="checkout-total" style={s.totalVal}>₹{grandTotal.toFixed(0)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Confirm Button */}
      <View style={[s.footer, { paddingBottom: insets.bottom + 16 }]}>
        {placing && placingStep ? (
          <Text style={s.placingNote}>{placingStep}</Text>
        ) : null}
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
              {bucketCount > 1
                ? `CONFIRM ${bucketCount} ORDERS · ₹${grandTotal.toFixed(0)}`
                : `CONFIRM ORDER · ₹${grandTotal.toFixed(0)}`
              }
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.screen, paddingVertical: 16 },
  title: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 22, color: Colors.textPrimary },
  section: { paddingHorizontal: Spacing.screen, marginBottom: 24 },
  sectionLabel: { fontFamily: 'DMSans_700Bold', fontSize: 11, color: Colors.textSecondary, letterSpacing: 1.5, marginBottom: 10, textTransform: 'uppercase' },
  restName: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 22, color: Colors.textPrimary, marginBottom: 12 },
  multiNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: Colors.surface, paddingVertical: 12, paddingHorizontal: 14, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.primary + '44', marginTop: 8 },
  multiNoticeTxt: { flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textPrimary, lineHeight: 18 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: Colors.border },
  itemQty: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.textSecondary, width: 28 },
  itemName: { flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textPrimary },
  itemPrice: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textPrimary },
  miniPricing: { marginTop: 8 },
  miniPricingRow: { flexDirection: 'row', justifyContent: 'space-between' },
  miniLabel: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.textSecondary },
  miniVal: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.primary },
  addrChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100, borderWidth: 1, borderColor: Colors.border, marginRight: 8 },
  addrChipActive: { backgroundColor: Colors.textPrimary, borderColor: Colors.textPrimary },
  addrChipTxt: { fontFamily: 'DMSans_700Bold', fontSize: 12, color: Colors.textSecondary },
  addrChipTxtActive: { color: Colors.background },
  saveRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  checkbox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkboxTxt: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textPrimary },
  labelChips: { flexDirection: 'row', gap: 6 },
  miniLabelChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, borderWidth: 1, borderColor: Colors.border },
  miniLabelChipActive: { backgroundColor: Colors.textPrimary, borderColor: Colors.textPrimary },
  miniLabelChipTxt: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: Colors.textSecondary },
  miniLabelChipTxtActive: { color: Colors.background },
  inputWrapper: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.sm, marginBottom: 8,
    flexDirection: 'row', alignItems: 'flex-start', position: 'relative',
  },
  inputWrapperGps: {
    borderColor: Colors.primary,
    borderWidth: 1.5,
  },
  input: {
    flex: 1, paddingHorizontal: 16, paddingVertical: 12, minHeight: 90,
    fontFamily: 'DMSans_400Regular', color: Colors.textPrimary, fontSize: 15,
    paddingRight: 50, textAlignVertical: 'top',
  },
  inputGpsBtn: {
    position: 'absolute', top: 10, right: 10,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.primary + '18',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.primary + '55',
  },
  inputGpsBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  gpsConfirm: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  gpsConfirmTxt: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: Colors.success },
  paymentOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: 10, backgroundColor: Colors.surface, borderRadius: Radius.sm },
  paymentActive: { borderColor: Colors.primary },
  paymentLabel: { flex: 1, fontFamily: 'DMSans_500Medium', fontSize: 15, color: Colors.textSecondary },
  paymentLabelActive: { color: Colors.textPrimary, fontFamily: 'DMSans_700Bold' },
  grandCard: { backgroundColor: Colors.surface, padding: 18, marginHorizontal: Spacing.screen, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border },
  grandRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  grandRestName: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textSecondary, flex: 1, paddingRight: 8 },
  grandRestVal: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textPrimary },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.textPrimary },
  totalVal: { fontFamily: 'DMSans_700Bold', fontSize: 22, color: Colors.primary },
  footer: { paddingHorizontal: Spacing.screen, paddingTop: 14, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
  placingNote: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary, textAlign: 'center', marginBottom: 8 },
  orderBtn: { height: 56, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.sm },
  orderBtnDisabled: { opacity: 0.6 },
  orderBtnTxt: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.primaryFg, letterSpacing: 1 },
  emptyTxt: { fontFamily: 'DMSans_500Medium', fontSize: 18, color: Colors.textSecondary, marginTop: 16 },
  backBtn: { marginTop: 24, height: 48, backgroundColor: Colors.primary, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.sm },
  backBtnTxt: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.primaryFg, letterSpacing: 1 },
});
