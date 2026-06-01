import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import {
  getRapidoStatus, RAPIDO_STATUS_LABELS, RAPIDO_STATUS_STEP,
  RapidoStatus,
} from '@/services/rapidoBridge';
import { Colors, Spacing, Radius } from '@/constants/theme';
import SpeedStreak from '@/components/SpeedStreak';
import { useCart } from '@/context/CartContext';

const STEPS = ['Confirmed', 'Preparing', 'Out for Delivery', 'Delivered'];

const ORDER_STATUS_STEP: Record<string, number> = {
  pending: 0,
  confirmed: 0,
  preparing: 1,
  out_for_delivery: 2,
  delivered: 3,
  cancelled: -1,
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: '⏳ Waiting for restaurant…',
  confirmed: '✅ Order confirmed!',
  preparing: '👨‍🍳 Restaurant is preparing your order',
  out_for_delivery: '🚀 On the way to you!',
  delivered: '🎉 Delivered! Enjoy your meal',
  cancelled: '❌ Order cancelled',
};

export default function OrderTracking() {
  const { id, rapido, est } = useLocalSearchParams<{ id: string; rapido?: string; est?: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [orderStatus, setOrderStatus] = useState<string>('confirmed');
  const [orderData, setOrderData] = useState<any>(null);
  const [rapidoStatus, setRapidoStatus] = useState<RapidoStatus>('pending');
  const [minutes, setMinutes] = useState(parseInt(est ?? '30', 10));
  const [captain, setCaptain] = useState<string | null>(null);
  const [streakFire, setStreakFire] = useState(false);
  const { clearCart, addToCart } = useCart();

  const progressAnim = useRef(new Animated.Value(0)).current;

  // ── Load order from Supabase ──────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;

    const loadOrder = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          restaurants (
            name,
            image
          )
        `)
        .eq('id', id)
        .single();
        
      if (data) {
        const orderWithRest = {
          ...data,
          restaurant_name: (data.restaurants as any)?.name,
          restaurant_image: (data.restaurants as any)?.image
        };
        setOrderData(orderWithRest);
        setOrderStatus(data.status);
        if (data.estimated_minutes) setMinutes(data.estimated_minutes);
        animateTo(ORDER_STATUS_STEP[data.status] ?? 0);
      } else if (error) {
        console.error('Error loading order:', error);
      }
    };
    loadOrder();

    // ── Supabase Realtime subscription ────────────────────────────────────
    const channel = supabase
      .channel(`order-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` },
        (payload) => {
          const newStatus = payload.new.status;
          setOrderStatus(prev => {
            if (prev !== 'out_for_delivery' && newStatus === 'out_for_delivery') {
              setStreakFire(true);
              setTimeout(() => setStreakFire(false), 600);
            }
            return newStatus;
          });
          if (payload.new.estimated_minutes) setMinutes(payload.new.estimated_minutes);
          animateTo(ORDER_STATUS_STEP[newStatus] ?? 0);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  // ── Poll Rapido status every 5 seconds ────────────────────────────────────
  useEffect(() => {
    if (!rapido) return;

    const poll = async () => {
      try {
        const res = await getRapidoStatus(rapido);
        setRapidoStatus(res.status);
        setMinutes(res.estimated_minutes);
        if (res.captain_name) setCaptain(res.captain_name);
      } catch { }
    };

    const interval = setInterval(poll, 5000);
    poll();
    return () => clearInterval(interval);
  }, [rapido]);

  const animateTo = (step: number) => {
    const progress = Math.min(Math.max(step, 0) / (STEPS.length - 1), 1);
    Animated.spring(progressAnim, {
      toValue: progress,
      useNativeDriver: false,
      tension: 40,
      friction: 8,
    }).start();
  };

  const currentStep = ORDER_STATUS_STEP[orderStatus] ?? 0;
  const isCancelled = orderStatus === 'cancelled';
  const isDelivered = orderStatus === 'delivered';

  const handleReorder = () => {
    if (!orderData) return;
    clearCart();
    const rest = { 
      id: orderData.restaurant_id, 
      name: orderData.restaurant_name, 
      image: orderData.restaurant_image 
    };
    orderData.items?.forEach((item: any) => {
      addToCart(rest, item);
    });
    router.replace('/(tabs)/cart' as any);
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <SpeedStreak visible={streakFire} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity testID="back-btn" onPress={() => router.replace('/(tabs)')} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={s.title}>Order #{id?.slice(-8)}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── ETA / Status Card ── */}
        <View style={[s.etaCard, isCancelled && s.etaCardCancelled]}>
          <Text style={s.etaLabel}>
            {isCancelled ? 'ORDER STATUS' : isDelivered ? 'ORDER DELIVERED' : 'ESTIMATED DELIVERY'}
          </Text>
          {!isCancelled && !isDelivered && (
            <View style={s.etaRow}>
              <Text style={s.etaTime}>{minutes}</Text>
              <Text style={s.etaUnit}>min</Text>
            </View>
          )}
          {isDelivered && (
            <Text style={s.deliveredEmoji}>🎉</Text>
          )}
          <Text style={[s.statusLabel, isCancelled && { color: Colors.error }]}>
            {ORDER_STATUS_LABELS[orderStatus] || orderStatus}
          </Text>
        </View>

        {/* ── Progress Bar ── */}
        {!isCancelled && (
          <View style={s.progressSection}>
            <View style={s.progressTrack}>
              <Animated.View
                style={[
                  s.progressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                    backgroundColor: isDelivered ? Colors.success : Colors.primary,
                  },
                ]}
              />
            </View>

            <View style={s.stepsRow}>
              {STEPS.map((step, i) => (
                <View key={step} style={s.stepCol}>
                  <View style={[
                    s.stepDot,
                    i <= currentStep && s.stepDotActive,
                    i <= currentStep && isDelivered && s.stepDotDelivered,
                  ]}>
                    {i <= currentStep && (
                      <Ionicons name="checkmark" size={12} color={Colors.primaryFg} />
                    )}
                  </View>
                  <Text style={[s.stepLabel, i <= currentStep && s.stepLabelActive]}>{step}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Restaurant Name ── */}
        {orderData?.restaurant_name && (
          <View style={s.restCard}>
            <Ionicons name="restaurant-outline" size={18} color={Colors.primary} />
            <Text style={s.restCardTxt}>{orderData.restaurant_name}</Text>
          </View>
        )}

        {/* ── Captain Info (when assigned) ── */}
        {currentStep >= 2 && captain && (
          <View style={s.captainCard}>
            <View style={s.captainAvatar}>
              <Ionicons name="bicycle" size={24} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.captainName}>{captain}</Text>
              <Text style={s.captainRole}>Rapido Captain • On the way</Text>
            </View>
            <TouchableOpacity style={s.callBtn} activeOpacity={0.8}>
              <Ionicons name="call" size={20} color={Colors.primaryFg} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Order Items ── */}
        {orderData?.items?.length > 0 && (
          <View style={s.detailCard}>
            <Text style={s.detailLabel}>ORDER ITEMS</Text>
            {orderData.items.map((item: any, idx: number) => (
              <View key={idx} style={s.orderItem}>
                <Text style={s.orderItemQty}>{item.quantity}×</Text>
                <Text style={s.orderItemName}>{item.name}</Text>
                <Text style={s.orderItemPrice}>₹{(item.price * item.quantity).toFixed(0)}</Text>
              </View>
            ))}
            <View style={s.orderTotal}>
              <Text style={s.orderTotalLabel}>Total Paid</Text>
              <Text style={s.orderTotalVal}>₹{orderData.total_amount?.toFixed(0)}</Text>
            </View>
          </View>
        )}

        {/* ── Order Info ── */}
        <View style={s.detailCard}>
          <Text style={s.detailLabel}>ORDER DETAILS</Text>
          <InfoRow icon="receipt-outline" label="Order ID" value={id?.slice(-10) || '—'} />
          <InfoRow icon="location-outline" label="Deliver to" value={orderData?.delivery_address || '—'} />
          <InfoRow
            icon="card-outline"
            label="Payment"
            value={orderData?.payment_method?.toUpperCase() || '—'}
          />
          {rapido && (
            <InfoRow icon="bicycle-outline" label="Rapido Booking" value={rapido} />
          )}
        </View>

      </ScrollView>

      {/* ── Footer ── */}
      <View style={[s.footer, { paddingBottom: insets.bottom + 16 }]}>
        {(isDelivered || isCancelled) && (
          <TouchableOpacity
            style={[s.homeBtn, { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.primary, marginBottom: 12 }]}
            onPress={handleReorder}
            activeOpacity={0.85}
          >
            <Text style={[s.homeBtnTxt, { color: Colors.primary }]}>
              🔄 RE-ORDER THIS MEAL
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          testID="home-btn"
          style={[s.homeBtn, isDelivered && s.homeBtnSuccess]}
          onPress={() => router.replace('/(tabs)')}
          activeOpacity={0.85}
        >
          <Text style={s.homeBtnTxt}>
            {isDelivered ? '🏠 BACK TO HOME' : 'BACK TO HOME'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <Ionicons name={icon as any} size={16} color={Colors.textSecondary} style={{ marginRight: 10 }} />
      <View style={{ flex: 1 }}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoVal} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.screen, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { fontFamily: 'DMSans_700Bold', fontSize: 18, color: Colors.textPrimary },

  etaCard: {
    alignItems: 'center', padding: 28, margin: Spacing.screen,
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border,
  },
  etaCardCancelled: { borderColor: Colors.error },
  etaLabel: { fontFamily: 'DMSans_700Bold', fontSize: 11, color: Colors.textSecondary, letterSpacing: 2, marginBottom: 8 },
  etaRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 8 },
  etaTime: { fontFamily: 'DMSans_700Bold', fontSize: 56, color: Colors.primary },
  etaUnit: { fontFamily: 'DMSans_500Medium', fontSize: 20, color: Colors.textSecondary },
  deliveredEmoji: { fontSize: 48, marginBottom: 8 },
  statusLabel: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.primary, textAlign: 'center' },

  progressSection: { paddingHorizontal: Spacing.screen, marginBottom: 20 },
  progressTrack: {
    height: 6, backgroundColor: Colors.surfaceLight, borderRadius: 3, overflow: 'hidden',
    marginBottom: 16, borderWidth: 1, borderColor: Colors.border,
  },
  progressFill: { height: '100%', borderRadius: 3 },
  stepsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stepCol: { alignItems: 'center', flex: 1 },
  stepDot: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.surfaceLight, borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  stepDotActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  stepDotDelivered: { backgroundColor: Colors.success, borderColor: Colors.success },
  stepLabel: { fontFamily: 'DMSans_400Regular', fontSize: 10, color: Colors.textSecondary, textAlign: 'center' },
  stepLabelActive: { fontFamily: 'DMSans_700Bold', color: Colors.textPrimary },

  restCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: Spacing.screen, marginBottom: 16,
    padding: 14, backgroundColor: Colors.surface,
    borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border,
  },
  restCardTxt: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.textPrimary },

  captainCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginHorizontal: Spacing.screen, marginBottom: 16,
    padding: 16, backgroundColor: Colors.surface,
    borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.primary + '44',
  },
  captainAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.surfaceLight, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  captainName: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.textPrimary },
  captainRole: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  callBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },

  detailCard: {
    marginHorizontal: Spacing.screen, marginBottom: 16,
    padding: 16, backgroundColor: Colors.surface,
    borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border,
  },
  detailLabel: { fontFamily: 'DMSans_700Bold', fontSize: 11, color: Colors.textSecondary, letterSpacing: 2, marginBottom: 12 },

  orderItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  orderItemQty: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.textSecondary, width: 28 },
  orderItemName: { flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textPrimary },
  orderItemPrice: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textPrimary },
  orderTotal: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  orderTotalLabel: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.textPrimary },
  orderTotalVal: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.primary },

  infoRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoLabel: { fontFamily: 'DMSans_700Bold', fontSize: 11, color: Colors.textSecondary, letterSpacing: 1 },
  infoVal: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textPrimary, marginTop: 2 },

  footer: {
    paddingHorizontal: Spacing.screen, paddingTop: 16,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  homeBtn: {
    height: 52, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: Radius.sm,
  },
  homeBtnSuccess: { backgroundColor: Colors.success },
  homeBtnTxt: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.primaryFg, letterSpacing: 1 },
});
