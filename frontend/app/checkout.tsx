import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/services/api';
import { Colors, Spacing } from '@/constants/theme';

const PAYMENT_METHODS = [
  { id: 'cod', label: 'Cash on Delivery', icon: 'cash-outline' },
  { id: 'card', label: 'Card (Demo)', icon: 'card-outline' },
];

export default function Checkout() {
  const [address, setAddress] = useState('');
  const [payment, setPayment] = useState('cod');
  const [cart, setCart] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    api.getCart().then((data: any) => setCart(data)).finally(() => setLoading(false));
  }, []);

  const items = cart?.items || [];
  const subtotal = items.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
  const deliveryFee = 2.99;
  const total = subtotal + deliveryFee;

  const placeOrder = async () => {
    if (!address.trim()) { Alert.alert('Address required', 'Please enter your delivery address'); return; }
    setPlacing(true);
    try {
      const order: any = await api.placeOrder({ delivery_address: address, payment_method: payment });
      router.replace(`/order/${order.id}`);
    } catch (e: any) {
      Alert.alert('Order Failed', e?.detail || 'Something went wrong. Please try again.');
    } finally { setPlacing(false); }
  };

  return (
    <KeyboardAvoidingView style={[s.flex, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.header}>
        <TouchableOpacity testID="back-btn" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={s.title}>Checkout</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} /> : (
        <ScrollView style={s.flex} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          {/* Order From */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>ORDER FROM</Text>
            <Text style={s.restName}>{cart?.restaurant_name}</Text>
          </View>

          {/* Items Summary */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>ITEMS</Text>
            {items.map((item: any) => (
              <View key={item.item_id} style={s.itemRow}>
                <Text style={s.itemQty}>{item.quantity}x</Text>
                <Text style={s.itemName} numberOfLines={1}>{item.name}</Text>
                <Text style={s.itemPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
              </View>
            ))}
          </View>

          {/* Delivery Address */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>DELIVERY ADDRESS</Text>
            <TextInput
              testID="address-input"
              style={s.input} placeholder="Enter your full delivery address"
              placeholderTextColor={Colors.textSecondary}
              value={address} onChangeText={setAddress}
              multiline numberOfLines={3} textAlignVertical="top"
            />
          </View>

          {/* Payment */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>PAYMENT METHOD</Text>
            {PAYMENT_METHODS.map(pm => (
              <TouchableOpacity testID={`payment-${pm.id}`} key={pm.id}
                style={[s.paymentOption, payment === pm.id && s.paymentActive]}
                onPress={() => setPayment(pm.id)}>
                <Ionicons name={pm.icon as any} size={20} color={payment === pm.id ? Colors.primary : Colors.textSecondary} />
                <Text style={[s.paymentLabel, payment === pm.id && s.paymentLabelActive]}>{pm.label}</Text>
                {payment === pm.id && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
              </TouchableOpacity>
            ))}
            {payment === 'card' && (
              <View style={s.demoNotice}>
                <Ionicons name="information-circle-outline" size={16} color={Colors.textSecondary} />
                <Text style={s.demoNoticeTxt}>Card payment is in demo mode. Stripe integration can be added later.</Text>
              </View>
            )}
          </View>

          {/* Price Summary */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>PRICE SUMMARY</Text>
            <View style={s.summaryRow}><Text style={s.summaryLabel}>Subtotal</Text><Text style={s.summaryVal}>${subtotal.toFixed(2)}</Text></View>
            <View style={s.summaryRow}><Text style={s.summaryLabel}>Delivery Fee</Text><Text style={s.summaryVal}>${deliveryFee.toFixed(2)}</Text></View>
            <View style={[s.summaryRow, s.totalRow]}>
              <Text style={s.totalLabel}>Total</Text>
              <Text testID="checkout-total" style={s.totalVal}>${total.toFixed(2)}</Text>
            </View>
          </View>
        </ScrollView>
      )}

      <View style={[s.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity testID="place-order-btn" style={[s.orderBtn, placing && s.orderBtnDisabled]}
          onPress={placeOrder} disabled={placing || loading}>
          {placing ? <ActivityIndicator color={Colors.primaryFg} /> : <Text style={s.orderBtnTxt}>PLACE ORDER · ${total.toFixed(2)}</Text>}
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
  sectionLabel: { fontFamily: 'DMSans_700Bold', fontSize: 11, color: Colors.textSecondary, letterSpacing: 2, marginBottom: 12 },
  restName: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20, color: Colors.textPrimary },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  itemQty: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.textSecondary, width: 28 },
  itemName: { flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textPrimary },
  itemPrice: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textPrimary },
  input: { height: 80, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 16, paddingVertical: 12, color: Colors.textPrimary, fontFamily: 'DMSans_400Regular', fontSize: 15 },
  paymentOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 10, backgroundColor: Colors.surface },
  paymentActive: { borderColor: Colors.primary, backgroundColor: '#0D0D0D' },
  paymentLabel: { flex: 1, fontFamily: 'DMSans_500Medium', fontSize: 15, color: Colors.textSecondary },
  paymentLabelActive: { color: Colors.textPrimary },
  demoNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8, padding: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  demoNoticeTxt: { flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontFamily: 'DMSans_400Regular', fontSize: 15, color: Colors.textSecondary },
  summaryVal: { fontFamily: 'DMSans_500Medium', fontSize: 15, color: Colors.textPrimary },
  totalRow: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12, marginTop: 4 },
  totalLabel: { fontFamily: 'DMSans_700Bold', fontSize: 18, color: Colors.textPrimary },
  totalVal: { fontFamily: 'DMSans_700Bold', fontSize: 20, color: Colors.textPrimary },
  footer: { paddingHorizontal: Spacing.screen, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  orderBtn: { height: 56, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  orderBtnDisabled: { opacity: 0.6 },
  orderBtnTxt: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.primaryFg, letterSpacing: 1 },
});
