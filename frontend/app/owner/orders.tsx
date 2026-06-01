import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const C = {
  primary: '#4F46E5',
  primaryContainer: '#E2DFFF',
  onPrimaryContainer: '#DAD7FF',
  secondary: '#006C49',
  secondaryContainer: '#6CF8BB',
  tertiary: '#885500',
  tertiaryContainer: '#FFD4A4',
  error: '#BA1A1A',
  errorContainer: '#FFDAD6',
  surface: '#FFFFFF',
  background: '#F9F9F9',
  onSurface: '#1B1B1B',
  onSurfaceVariant: '#464555',
  outlineVariant: '#C7C4D8',
  surfaceContainerHigh: '#E8E8E8',
  onPrimary: '#FFFFFF',
  onSecondary: '#FFFFFF',
  onTertiary: '#FFFFFF',
};

type TabKey = 'New' | 'Preparing' | 'Ready' | 'Past';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'New', label: 'New' },
  { key: 'Preparing', label: 'Preparing' },
  { key: 'Ready', label: 'Ready' },
  { key: 'Past', label: 'Past' },
];

function statusForTab(tab: TabKey): string[] {
  switch (tab) {
    case 'New': return ['pending'];
    case 'Preparing': return ['confirmed', 'preparing'];
    case 'Ready': return ['ready'];
    case 'Past': return ['delivered', 'cancelled', 'out_for_delivery'];
  }
}

function getTimeElapsed(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '00:01';
  const hrs = Math.floor(mins / 60);
  const m = mins % 60;
  if (hrs > 0) return `${hrs}:${String(m).padStart(2, '0')}:00`;
  return `${String(m).padStart(2, '0')}:${String(Math.floor((diff % 60000) / 1000)).padStart(2, '0')}`;
}

function getTimeAgoLabel(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default function OwnerOrders() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [restaurant, setRestaurant] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('New');
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  // Timer refresh
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const { data: rest } = await supabase
        .from('restaurants').select('*')
        .eq('owner_id', user.user_id).single();
      setRestaurant(rest);

      if (rest) {
        const { data: ords } = await supabase
          .from('orders').select('*')
          .eq('restaurant_id', rest.id)
          .order('created_at', { ascending: false })
          .limit(100);
        setOrders(ords || []);
      }
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Real-time subscription
  useEffect(() => {
    if (!restaurant) return;
    const sub = supabase
      .channel('owner_orders_rt')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'orders',
        filter: `restaurant_id=eq.${restaurant.id}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setOrders(prev => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setOrders(prev => prev.map(o => o.id === payload.new.id ? payload.new : o));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [restaurant]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingIds(prev => new Set(prev).add(orderId));
    // Optimistic update
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));

    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    setUpdatingIds(prev => { const s = new Set(prev); s.delete(orderId); return s; });

    if (error) {
      Alert.alert('Error', 'Failed to update order status.');
      load(); // Revert
    }
  };

  const filtered = orders.filter(o => statusForTab(activeTab).includes(o.status));
  const activeCount = orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length;

  const tabCounts: Record<TabKey, number> = {
    New: orders.filter(o => statusForTab('New').includes(o.status)).length,
    Preparing: orders.filter(o => statusForTab('Preparing').includes(o.status)).length,
    Ready: orders.filter(o => statusForTab('Ready').includes(o.status)).length,
    Past: orders.filter(o => statusForTab('Past').includes(o.status)).length,
  };

  if (loading) return (
    <View style={[s.container, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
      <ActivityIndicator color={C.primary} size="large" />
    </View>
  );

  if (!restaurant) {
    return (
      <View style={[s.container, { paddingTop: insets.top, backgroundColor: C.background }]}>
        <View style={s.header}>
          <Text style={s.headerTitle}>Delight Dashboard</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: C.primaryContainer, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Ionicons name="restaurant" size={36} color={C.primary} />
          </View>
          <Text style={{ fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20, color: C.onSurface, textAlign: 'center' }}>Dhaba Storefront Inactive</Text>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: C.onSurfaceVariant, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
            You haven't set up your Dhaba on Delight yet. Please visit the **Home** tab to activate your Dhaba storefront instantly!
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Delight Dashboard</Text>
        <View style={s.avatar}>
          <Ionicons name="person" size={18} color={C.primary} />
        </View>
      </View>

      {/* Filter Section */}
      <View style={s.filterSection}>
        <View style={s.filterHeader}>
          <Text style={s.filterTitle}>Order Tracking</Text>
          <View style={s.activeBadge}>
            <Text style={s.activeBadgeTxt}>{activeCount} Active</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsRow}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[s.tab, activeTab === tab.key && s.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.8}
            >
              <Text style={[s.tabTxt, activeTab === tab.key && s.tabTxtActive]}>
                {tab.label}
                {tabCounts[tab.key] > 0 && tab.key !== 'Past' && (
                  <Text style={{ opacity: activeTab === tab.key ? 0.8 : 0.6 }}>
                    {' '}({tabCounts[tab.key]})
                  </Text>
                )}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Orders List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.primary} />
        }
        contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
      >
        {filtered.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons
              name={activeTab === 'Past' ? 'time-outline' : 'receipt-outline'}
              size={48} color={C.outlineVariant}
            />
            <Text style={s.emptyTitle}>
              {activeTab === 'Past' ? 'No past orders yet' : `No ${activeTab.toLowerCase()} orders`}
            </Text>
            <Text style={s.emptySub}>
              {activeTab === 'New' ? 'New orders will appear here in real-time' :
               activeTab === 'Preparing' ? 'Accept orders to start preparing them' :
               activeTab === 'Ready' ? 'Orders marked as ready will appear here' :
               'Completed orders will show up here'}
            </Text>
          </View>
        ) : (
          filtered.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              tab={activeTab}
              isUpdating={updatingIds.has(order.id)}
              onAccept={() => updateStatus(order.id, 'preparing')}
              onDecline={() => {
                Alert.alert('Decline Order', `Decline order #${order.order_number || order.id.slice(0, 8)}?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Decline', style: 'destructive', onPress: () => updateStatus(order.id, 'cancelled') },
                ]);
              }}
              onMarkReady={() => updateStatus(order.id, 'ready')}
              onComplete={() => updateStatus(order.id, 'delivered')}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function OrderCard({ order, tab, isUpdating, onAccept, onDecline, onMarkReady, onComplete }: {
  order: any;
  tab: TabKey;
  isUpdating: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onMarkReady: () => void;
  onComplete: () => void;
}) {
  const borderColor = tab === 'Preparing' ? C.secondary :
                       tab === 'Ready' ? C.tertiary :
                       'transparent';

  return (
    <View style={[
      s.orderCard,
      tab === 'Preparing' && { borderLeftWidth: 4, borderLeftColor: C.secondary + '80' },
      tab === 'Ready' && { borderLeftWidth: 4, borderLeftColor: C.tertiary + '80' },
    ]}>
      {/* Header */}
      <View style={s.orderHeader}>
        <View>
          <Text style={[s.orderNumber, {
            color: tab === 'Preparing' ? C.secondary :
                   tab === 'Ready' ? C.tertiary : C.primary,
          }]}>
            #{order.order_number || order.id.slice(0, 8)}
          </Text>
          <Text style={s.customerName}>{order.user_name || order.user_email || 'Customer'}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          {tab === 'New' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="timer-outline" size={16} color={C.error} />
              <Text style={s.timerText}>{getTimeElapsed(order.created_at)}</Text>
            </View>
          )}
          {tab === 'Preparing' && (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="flame-outline" size={16} color={C.onSurfaceVariant} />
                <Text style={s.timerTextMuted}>{getTimeElapsed(order.created_at)}</Text>
              </View>
              <Text style={[s.statusLabel, { color: C.secondary }]}>PREPARING</Text>
            </>
          )}
          {tab === 'Ready' && (
            <Text style={[s.statusLabel, { color: C.tertiary }]}>READY</Text>
          )}
          {tab === 'Past' && (
            <View style={[s.pastBadge, {
              backgroundColor: order.status === 'delivered' ? C.secondary + '18' :
                               order.status === 'cancelled' ? C.error + '18' : C.primaryContainer,
            }]}>
              <Text style={[s.pastBadgeTxt, {
                color: order.status === 'delivered' ? C.secondary :
                       order.status === 'cancelled' ? C.error : C.primary,
              }]}>{order.status?.toUpperCase()}</Text>
            </View>
          )}
          <Text style={s.timeAgo}>{getTimeAgoLabel(order.created_at)}</Text>
        </View>
      </View>

      {/* Items */}
      <View style={s.itemsList}>
        {(order.items || []).map((item: any, i: number) => (
          <View key={i} style={s.itemRow}>
            <Text style={s.itemText}>{item.quantity}x {item.name}</Text>
            <Text style={s.itemPrice}>₹{((item.price || 0) * (item.quantity || 1)).toFixed(0)}</Text>
          </View>
        ))}
      </View>

      {/* Total */}
      <View style={s.totalRow}>
        <Text style={s.totalLabel}>TOTAL AMOUNT</Text>
        <Text style={s.totalValue}>₹{(order.total_amount || order.total || 0).toFixed(2)}</Text>
      </View>

      {/* Action Buttons */}
      {tab === 'New' && (
        <View style={s.actionRow}>
          <TouchableOpacity
            style={[s.btn, s.btnDecline]}
            onPress={onDecline}
            disabled={isUpdating}
            activeOpacity={0.8}
          >
            <Text style={s.btnDeclineTxt}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.btn, s.btnAccept, isUpdating && { opacity: 0.6 }]}
            onPress={onAccept}
            disabled={isUpdating}
            activeOpacity={0.8}
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color={C.onPrimary} />
            ) : (
              <Text style={s.btnAcceptTxt}>Accept</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {tab === 'Preparing' && (
        <TouchableOpacity
          style={[s.btn, s.btnReady, isUpdating && { opacity: 0.6 }]}
          onPress={onMarkReady}
          disabled={isUpdating}
          activeOpacity={0.8}
        >
          {isUpdating ? (
            <ActivityIndicator size="small" color={C.onSecondary} />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="checkmark-circle-outline" size={18} color={C.onSecondary} />
              <Text style={s.btnReadyTxt}>Mark as Ready</Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {tab === 'Ready' && (
        <TouchableOpacity
          style={[s.btn, s.btnComplete, isUpdating && { opacity: 0.6 }]}
          onPress={onComplete}
          disabled={isUpdating}
          activeOpacity={0.8}
        >
          {isUpdating ? (
            <ActivityIndicator size="small" color={C.onTertiary} />
          ) : (
            <Text style={s.btnCompleteTxt}>Complete Order</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, height: 56, backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.outlineVariant + '40',
  },
  headerTitle: { fontFamily: 'DMSans_700Bold', fontSize: 20, color: C.primary },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.primaryContainer, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: C.primary + '30',
  },

  filterSection: {
    backgroundColor: C.background, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8,
    borderBottomWidth: 1, borderBottomColor: C.outlineVariant + '20',
  },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  filterTitle: { fontFamily: 'DMSans_700Bold', fontSize: 20, color: C.onSurface },
  activeBadge: {
    backgroundColor: C.primary, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100,
  },
  activeBadgeTxt: { fontFamily: 'DMSans_700Bold', fontSize: 12, color: C.onPrimary, letterSpacing: 0.3 },

  tabsRow: { gap: 8, paddingBottom: 8 },
  tab: {
    paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12,
    backgroundColor: C.surfaceContainerHigh,
  },
  tabActive: {
    backgroundColor: C.primary,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
    elevation: 4,
  },
  tabTxt: {
    fontFamily: 'DMSans_700Bold', fontSize: 12, color: C.onSurfaceVariant, letterSpacing: 0.5,
  },
  tabTxtActive: { color: C.onPrimary },

  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyTitle: { fontFamily: 'DMSans_700Bold', fontSize: 17, color: C.onSurfaceVariant, marginTop: 16 },
  emptySub: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: C.onSurfaceVariant + '99', marginTop: 6, textAlign: 'center' },

  orderCard: {
    backgroundColor: C.surface, borderRadius: 12, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: C.outlineVariant + '30',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6,
    elevation: 1,
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  orderNumber: { fontFamily: 'DMSans_700Bold', fontSize: 14, letterSpacing: 0.5 },
  customerName: { fontFamily: 'DMSans_700Bold', fontSize: 18, color: C.onSurface, marginTop: 2 },
  timerText: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: C.error },
  timerTextMuted: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: C.onSurfaceVariant },
  statusLabel: { fontFamily: 'DMSans_700Bold', fontSize: 11, letterSpacing: 0.8, marginTop: 4 },
  timeAgo: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: C.onSurfaceVariant + '99', marginTop: 2 },

  pastBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  pastBadgeTxt: { fontFamily: 'DMSans_700Bold', fontSize: 10, letterSpacing: 0.5 },

  itemsList: { marginBottom: 12 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  itemText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: C.onSurfaceVariant },
  itemPrice: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: C.onSurfaceVariant },

  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.outlineVariant + '40',
    borderStyle: 'dashed', marginBottom: 12,
  },
  totalLabel: {
    fontFamily: 'DMSans_700Bold', fontSize: 10, color: C.onSurfaceVariant,
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  totalValue: { fontFamily: 'DMSans_700Bold', fontSize: 20, color: C.onSurface },

  actionRow: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnDecline: { backgroundColor: C.surfaceContainerHigh },
  btnDeclineTxt: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: C.onSurface, letterSpacing: 0.3 },
  btnAccept: {
    backgroundColor: C.primary,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8,
    elevation: 4,
  },
  btnAcceptTxt: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: C.onPrimary, letterSpacing: 0.3 },
  btnReady: {
    backgroundColor: C.secondary, flex: 0, width: '100%', height: 48, borderRadius: 8,
    shadowColor: C.secondary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8,
    elevation: 4,
  },
  btnReadyTxt: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: C.onSecondary, letterSpacing: 0.3 },
  btnComplete: {
    backgroundColor: C.tertiary, flex: 0, width: '100%', height: 48, borderRadius: 8,
  },
  btnCompleteTxt: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: C.onTertiary, letterSpacing: 0.3 },
});
