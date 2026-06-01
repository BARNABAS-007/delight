import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Colors, Spacing, Radius } from '@/constants/theme';

const STATUS_COLORS: Record<string, string> = {
  pending: '#F5A623', confirmed: '#4A90D9', preparing: '#9b59b6',
  out_for_delivery: '#7ED321', delivered: Colors.success, cancelled: Colors.error,
};

export default function OwnerDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [restaurant, setRestaurant] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const { data: rest } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.user_id)
        .single();

      setRestaurant(rest);

      if (rest) {
        const { data: ords } = await supabase
          .from('orders')
          .select('*')
          .eq('restaurant_id', rest.id)
          .order('created_at', { ascending: false })
          .limit(30);
        setOrders(ords || []);
      }
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, [user]);

  const createDemoRestaurant = async () => {
    if (!user) return;
    setLoading(true);
    
    const demoCategories = [
      { id: "cat_1", name: "Starters", items: [{ id: "item_1", name: "Chicken Tikka", price: 250, is_available: true, description: "Spicy and tender", dietary: [], image: "" }] },
      { id: "cat_2", name: "Biryani", items: [{ id: "item_2", name: "Hyderabadi Chicken Biryani", price: 350, is_available: true, description: "Authentic dum biryani", dietary: [], image: "" }] },
    ];
    
    const { data, error } = await supabase.from('restaurants').insert([{
      name: `${user.name || 'My'} Restaurant`,
      owner_id: user.user_id,
      cuisine: ["Biryani", "North Indian"],
      is_active: true,
      menu_categories: demoCategories,
      rating: 4.5,
      delivery_time: "20-30 mins"
    }]).select().single();
    
    if (error) {
      console.error("Create Restaurant Error:", error);
      Alert.alert('Error', `Failed to create demo restaurant: ${error.message || JSON.stringify(error)}`);
      setLoading(false);
    } else {
      setRestaurant(data);
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => { load(); }, [load]);

  // Realtime subscription
  useEffect(() => {
    if (!restaurant) return;

    const subscription = supabase
      .channel('owner_orders_channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `restaurant_id=eq.${restaurant.id}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setOrders(prev => [payload.new, ...prev]);
          // TODO: Play sound here for new order!
        } else if (payload.eventType === 'UPDATE') {
          setOrders(prev => prev.map(o => o.id === payload.new.id ? payload.new : o));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [restaurant]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    // 1. Immediately mark this button as "loading"
    setUpdatingIds(prev => new Set(prev).add(orderId));

    // 2. Optimistically update the order status in local state
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    
    // 3. Persist to Supabase in the background
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    // 4. Remove loading indicator regardless of outcome
    setUpdatingIds(prev => { const s = new Set(prev); s.delete(orderId); return s; });

    if (error) {
      Alert.alert('Error', 'Could not update order status.');
      load(); // Revert on failure
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const totalRevenue = orders
    .filter(o => o.status === 'delivered')
    .reduce((s, o) => s + (o.total_amount || o.total || 0), 0);

  const activeOrders = orders.filter(o =>
    !['delivered', 'cancelled'].includes(o.status)
  ).length;

  if (loading) return (
    <View style={[s.container, { alignItems: 'center', justifyContent: 'center' }]}>
      <ActivityIndicator color={Colors.primary} size="large" />
    </View>
  );

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.greeting}>Welcome back,</Text>
          <Text style={s.name}>{user?.name || 'Owner'}</Text>
        </View>
        <TouchableOpacity testID="logout-btn" onPress={handleLogout} style={s.logoutBtn}>
          <Ionicons name="log-out-outline" size={24} color={Colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {!restaurant ? (
          <View style={s.noRestaurant}>
            <Ionicons name="restaurant-outline" size={64} color={Colors.border} />
            <Text style={s.noRestTxt}>No restaurant linked to your account</Text>
            <Text style={s.noRestSub}>Ask the admin to assign your restaurant to your account, or create a demo one to test the flow.</Text>
            
            <TouchableOpacity style={s.createDemoBtn} onPress={createDemoRestaurant} activeOpacity={0.8}>
              <Text style={s.createDemoBtnTxt}>Create Demo Restaurant</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Restaurant Banner */}
            <View style={s.restaurantBanner}>
              <View style={s.bannerInfo}>
                <Text style={s.restName}>{restaurant.name}</Text>
                <Text style={s.restCuisine}>{restaurant.cuisine?.join(' · ')}</Text>
                <View style={[s.statusPill, { backgroundColor: restaurant.is_active ? Colors.success + '22' : Colors.error + '22' }]}>
                  <View style={[s.statusDot, { backgroundColor: restaurant.is_active ? Colors.success : Colors.error }]} />
                  <Text style={[s.statusPillTxt, { color: restaurant.is_active ? Colors.success : Colors.error }]}>
                    {restaurant.is_active ? 'OPEN' : 'CLOSED'}
                  </Text>
                </View>
              </View>
              <Text style={s.restRating}>⭐ {restaurant.rating || 'New'}</Text>
            </View>

            {/* Stats */}
            <View style={s.statsGrid}>
              {[
                { label: 'Total Orders', value: orders.length, icon: 'receipt-outline', color: Colors.primary },
                { label: 'Active Now', value: activeOrders, icon: 'bicycle-outline', color: '#F5A623' },
                { label: 'Delivered', value: orders.filter(o => o.status === 'delivered').length, icon: 'checkmark-circle-outline', color: Colors.success },
                { label: 'Revenue (₹)', value: `₹${totalRevenue.toFixed(0)}`, icon: 'cash-outline', color: '#4CAF50' },
              ].map(stat => (
                <View key={stat.label} style={s.statCard}>
                  <Ionicons name={stat.icon as any} size={22} color={stat.color} />
                  <Text style={[s.statVal, { color: stat.color }]}>{stat.value}</Text>
                  <Text style={s.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>

            {/* Quick Actions */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>QUICK ACTIONS</Text>
              <TouchableOpacity
                style={s.actionCard}
                onPress={() => router.push(`/admin/inventory/${restaurant.id}` as any)}
                activeOpacity={0.8}
              >
                <View style={[s.actionIcon, { backgroundColor: '#4CAF5022' }]}>
                  <Ionicons name="list-outline" size={24} color="#4CAF50" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.actionTitle}>Manage Inventory</Text>
                  <Text style={s.actionSub}>Add, edit items · Toggle availability</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity style={s.actionCard} activeOpacity={0.8}>
                <View style={[s.actionIcon, { backgroundColor: Colors.primary + '22' }]}>
                  <Ionicons name="toggle-outline" size={24} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.actionTitle}>
                    {restaurant.is_active ? 'Close Restaurant' : 'Open Restaurant'}
                  </Text>
                  <Text style={s.actionSub}>Toggle your restaurant open/closed status</Text>
                </View>
                <Switch restaurant={restaurant} onToggle={load} />
              </TouchableOpacity>
            </View>

            {/* Live Orders Queue */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>LIVE ORDERS ({activeOrders} active)</Text>
              {orders.length === 0 ? (
                <View style={s.emptyOrders}>
                  <Ionicons name="receipt-outline" size={40} color={Colors.border} />
                  <Text style={s.emptyTxt}>No orders yet</Text>
                </View>
              ) : (
                orders.slice(0, 15).map(o => (
                  <View key={o.id} style={[s.orderCard, o.status === 'pending' && s.orderCardPending]}>
                    <View style={s.orderRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.orderNum}>{o.id.split('-')[1] || o.id.slice(0,8)}</Text>
                        <Text style={s.orderTime}>{new Date(o.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                        
                        {/* Order Items List */}
                        <View style={s.orderItemsList}>
                          {o.items?.map((item: any, idx: number) => (
                            <Text key={idx} style={s.orderItemText}>
                              <Text style={s.orderItemQty}>{item.quantity}x </Text>
                              {item.name}
                            </Text>
                          ))}
                        </View>
                      </View>
                      
                      <View style={{ alignItems: 'flex-end', justifyContent: 'flex-start' }}>
                        <View style={[s.badge, { backgroundColor: STATUS_COLORS[o.status] + '22', borderColor: STATUS_COLORS[o.status] }]}>
                          <Text style={[s.badgeTxt, { color: STATUS_COLORS[o.status] }]}>{o.status?.replace('_', ' ').toUpperCase()}</Text>
                        </View>
                        <Text style={s.orderTotal}>₹{(o.total_amount || o.total || 0).toFixed(0)}</Text>
                        <Text style={s.orderItemsCount}>{o.items?.length} item{o.items?.length !== 1 ? 's' : ''}</Text>
                      </View>
                    </View>

                    {/* Action Buttons based on status */}
                    {o.status === 'pending' && (
                      <View style={s.actionRow}>
                        <OrderActionBtn
                          label="✓  ACCEPT ORDER"
                          color={Colors.primary}
                          isUpdating={updatingIds.has(o.id)}
                          onPress={() => updateOrderStatus(o.id, 'preparing')}
                        />
                      </View>
                    )}

                    {o.status === 'confirmed' && (
                      <View style={s.actionRow}>
                        <OrderActionBtn
                          label="👨‍🍳  START PREPARING"
                          color="#9b59b6"
                          isUpdating={updatingIds.has(o.id)}
                          onPress={() => updateOrderStatus(o.id, 'preparing')}
                        />
                      </View>
                    )}

                    {o.status === 'preparing' && (
                      <View style={s.actionRow}>
                        <OrderActionBtn
                          label="🚀  MARK DISPATCHED"
                          color="#7ED321"
                          isUpdating={updatingIds.has(o.id)}
                          onPress={() => updateOrderStatus(o.id, 'out_for_delivery')}
                        />
                      </View>
                    )}

                    {o.status === 'out_for_delivery' && (
                      <View style={s.actionRow}>
                        <OrderActionBtn
                          label="🎉  MARK DELIVERED"
                          color={Colors.success}
                          isUpdating={updatingIds.has(o.id)}
                          onPress={() => updateOrderStatus(o.id, 'delivered')}
                        />
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// Optimistic action button — dims + spins the instant it's tapped
function OrderActionBtn({ label, color, isUpdating, onPress }: {
  label: string;
  color: string;
  isUpdating: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[s.statusBtn, { backgroundColor: color, opacity: isUpdating ? 0.6 : 1 }]}
      onPress={onPress}
      disabled={isUpdating}
      activeOpacity={0.75}
    >
      {isUpdating ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <Text style={s.statusBtnTxt}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

// Inline restaurant open/close toggle
function Switch({ restaurant, onToggle }: { restaurant: any; onToggle: () => void }) {
  const [toggling, setToggling] = useState(false);
  const toggle = async () => {
    setToggling(true);
    await supabase.from('restaurants').update({ is_active: !restaurant.is_active }).eq('id', restaurant.id);
    onToggle();
    setToggling(false);
  };
  if (toggling) return <ActivityIndicator size="small" color={Colors.primary} />;
  return (
    <TouchableOpacity onPress={toggle}>
      <Ionicons
        name={restaurant.is_active ? 'radio-button-on' : 'radio-button-off'}
        size={28}
        color={restaurant.is_active ? Colors.success : Colors.error}
      />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.screen, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  greeting: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary },
  name: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 22, color: Colors.textPrimary },
  logoutBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  restaurantBanner: { flexDirection: 'row', alignItems: 'center', margin: Spacing.screen, padding: 16, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm },
  bannerInfo: { flex: 1 },
  restName: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20, color: Colors.textPrimary },
  restCuisine: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  restRating: { fontFamily: 'DMSans_700Bold', fontSize: 18, color: Colors.textPrimary },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, alignSelf: 'flex-start', marginTop: 8 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillTxt: { fontFamily: 'DMSans_700Bold', fontSize: 11, letterSpacing: 1 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.screen, gap: 12, marginBottom: 8 },
  statCard: { flex: 1, minWidth: '44%', backgroundColor: Colors.surface, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, padding: 16, alignItems: 'center', gap: 6 },
  statVal: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 24, color: Colors.textPrimary },
  statLabel: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.textSecondary, textAlign: 'center' },
  section: { paddingHorizontal: Spacing.screen, marginTop: 24, marginBottom: 8 },
  sectionLabel: { fontFamily: 'DMSans_700Bold', fontSize: 11, color: Colors.textSecondary, letterSpacing: 2, marginBottom: 12 },
  actionCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, backgroundColor: Colors.surface, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, marginBottom: 10 },
  actionIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24 },
  actionTitle: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.textPrimary },
  actionSub: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  
  orderCard: { backgroundColor: Colors.surface, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, padding: 16, marginBottom: 12 },
  orderCardPending: { borderColor: '#F5A623', borderWidth: 2, backgroundColor: '#F5A62308' },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderNum: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.textPrimary },
  orderTime: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  orderItemsList: { marginTop: 12, paddingRight: 16 },
  orderItemText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textPrimary, marginBottom: 4 },
  orderItemQty: { fontFamily: 'DMSans_700Bold', color: Colors.textSecondary },
  
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderRadius: Radius.sm, marginBottom: 6 },
  badgeTxt: { fontFamily: 'DMSans_700Bold', fontSize: 10, letterSpacing: 0.5 },
  orderTotal: { fontFamily: 'DMSans_700Bold', fontSize: 18, color: Colors.textPrimary, textAlign: 'right' },
  orderItemsCount: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginTop: 2 },
  
  actionRow: { marginTop: 16, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 16 },
  statusBtn: { height: 44, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  statusBtnTxt: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.primaryFg, letterSpacing: 1 },

  noRestaurant: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 32 },
  noRestTxt: { fontFamily: 'DMSans_700Bold', fontSize: 18, color: Colors.textSecondary, marginTop: 16, textAlign: 'center' },
  noRestSub: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textSecondary, marginTop: 8, textAlign: 'center' },
  createDemoBtn: { marginTop: 24, backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: Radius.sm },
  createDemoBtnTxt: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.primaryFg },
  
  emptyOrders: { alignItems: 'center', paddingVertical: 60, backgroundColor: Colors.surface, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border },
  emptyTxt: { fontFamily: 'DMSans_500Medium', fontSize: 15, color: Colors.textSecondary, marginTop: 12 },
});
