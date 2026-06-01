import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/services/api';
import { Colors, Spacing } from '@/constants/theme';

const STATUS_OPTS = ['confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending', confirmed: 'Confirmed', preparing: 'Preparing',
  out_for_delivery: 'On the Way', delivered: 'Delivered', cancelled: 'Cancelled',
};
const STATUS_COLORS: Record<string, string> = {
  pending: '#A0A0A0', confirmed: '#4A90D9', preparing: '#F5A623',
  out_for_delivery: '#7ED321', delivered: Colors.success, cancelled: Colors.error,
};

export default function AdminDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const load = useCallback(async () => {
    try {
      const [o, r]: any = await Promise.all([api.adminGetOrders(), api.adminGetRestaurants()]);
      setOrders(o); setRestaurants(r);
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const updateStatus = async (orderId: string, status: string) => {
    setUpdatingOrder(orderId);
    try {
      await api.adminUpdateOrderStatus(orderId, status);
      await load();
    } catch (e: any) { }
    finally { setUpdatingOrder(null); }
  };

  const stats = [
    { label: 'Total Orders', value: orders.length, icon: 'receipt-outline' },
    { label: 'Restaurants', value: restaurants.length, icon: 'restaurant-outline' },
    { label: 'Active Orders', value: orders.filter(o => !['delivered','cancelled'].includes(o.status)).length, icon: 'bicycle-outline' },
    { label: 'Revenue', value: `$${orders.filter(o=>o.status==='delivered').reduce((s:number,o:any)=>s+o.total,0).toFixed(0)}`, icon: 'cash-outline' },
  ];

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity testID="back-btn" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={s.title}>Admin Panel</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} /> : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
        >
          {/* Stats */}
          <View style={s.statsGrid}>
            {stats.map(stat => (
              <View key={stat.label} testID={`stat-${stat.label}`} style={s.statCard}>
                <Ionicons name={stat.icon as any} size={22} color={Colors.textSecondary} />
                <Text style={s.statVal}>{stat.value}</Text>
                <Text style={s.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Restaurants Link */}
          <TouchableOpacity testID="manage-restaurants-btn" style={s.manageBtn}
            onPress={() => router.push('/admin/restaurants')}>
            <Ionicons name="restaurant-outline" size={20} color={Colors.primary} />
            <Text style={s.manageBtnTxt}>Manage Restaurants</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>

          {/* Inventory Link */}
          <TouchableOpacity testID="manage-inventory-btn" style={[s.manageBtn, { borderColor: '#4CAF50' }]}
            onPress={() => router.push('/admin/restaurants')}>
            <Ionicons name="list-outline" size={20} color="#4CAF50" />
            <Text style={[s.manageBtnTxt, { color: '#4CAF50' }]}>Manage Inventory</Text>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary }}>Select a restaurant →</Text>
          </TouchableOpacity>

          {/* Finance Settings Link */}
          <TouchableOpacity testID="finance-settings-btn" style={[s.manageBtn, { borderColor: Colors.primary }]}
            onPress={() => router.push('/admin/settings')}>
            <Ionicons name="cash-outline" size={20} color={Colors.primary} />
            <Text style={s.manageBtnTxt}>Finance Settings</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>

          {/* Orders */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>RECENT ORDERS ({orders.length})</Text>
            {orders.slice(0, 20).map(o => (
              <View testID={`admin-order-${o.id}`} key={o.id} style={s.orderCard}>
                <View style={s.orderTop}>
                  <View>
                    <Text style={s.orderNum}>{o.order_number}</Text>
                    <Text style={s.orderUser}>{o.user_name} · {o.restaurant_name}</Text>
                    <Text style={s.orderDate}>{new Date(o.created_at).toLocaleString()}</Text>
                  </View>
                  <View>
                    <View style={[s.statusBadge, { backgroundColor: STATUS_COLORS[o.status]+'22', borderColor: STATUS_COLORS[o.status] }]}>
                      <Text style={[s.statusTxt, { color: STATUS_COLORS[o.status] }]}>{STATUS_LABELS[o.status]}</Text>
                    </View>
                    <Text style={s.orderTotal}>${o.total?.toFixed(2)}</Text>
                  </View>
                </View>
                {o.status !== 'delivered' && o.status !== 'cancelled' && (
                  <View style={s.statusBtns}>
                    {STATUS_OPTS.filter(s => s !== o.status).slice(0,3).map(st => (
                      <TouchableOpacity testID={`status-btn-${o.id}-${st}`} key={st} style={s.statusBtn}
                        onPress={() => updateStatus(o.id, st)}
                        disabled={updatingOrder === o.id}>
                        {updatingOrder === o.id ? <ActivityIndicator size="small" color={Colors.primary} /> :
                          <Text style={s.statusBtnTxt}>{STATUS_LABELS[st]}</Text>}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
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
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.screen, gap: 12, marginBottom: 20 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, padding: 16, alignItems: 'center', gap: 8 },
  statVal: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 28, color: Colors.textPrimary },
  statLabel: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary, textAlign: 'center' },
  manageBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: Spacing.screen, padding: 16, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, marginBottom: 20 },
  manageBtnTxt: { flex: 1, fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.primary },
  section: { paddingHorizontal: Spacing.screen },
  sectionLabel: { fontFamily: 'DMSans_700Bold', fontSize: 11, color: Colors.textSecondary, letterSpacing: 2, marginBottom: 12 },
  orderCard: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, padding: 14, marginBottom: 10 },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  orderNum: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.textPrimary },
  orderUser: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  orderDate: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderRadius: 100, alignItems: 'center' },
  statusTxt: { fontFamily: 'DMSans_700Bold', fontSize: 11 },
  orderTotal: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.textPrimary, textAlign: 'right', marginTop: 6 },
  statusBtns: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statusBtn: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border },
  statusBtnTxt: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.textPrimary },
});
