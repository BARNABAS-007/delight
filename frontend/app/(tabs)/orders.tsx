import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/services/api';
import { Colors, Spacing } from '@/constants/theme';

const STATUS_COLORS: Record<string, string> = {
  pending: '#A0A0A0', confirmed: '#4A90D9', preparing: '#F5A623',
  out_for_delivery: '#7ED321', delivered: Colors.success, cancelled: Colors.error,
};
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending', confirmed: 'Confirmed', preparing: 'Preparing',
  out_for_delivery: 'On the Way', delivered: 'Delivered', cancelled: 'Cancelled',
};

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const load = useCallback(async () => {
    try {
      const data: any = await api.getOrders();
      setOrders(data);
    } catch { setOrders([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, []);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.title}>My Orders</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={o => o.id}
          contentContainerStyle={{ paddingHorizontal: Spacing.screen, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="receipt-outline" size={56} color={Colors.border} />
              <Text style={s.emptyTitle}>No orders yet</Text>
              <Text style={s.emptySubtitle}>Your order history will appear here</Text>
              <TouchableOpacity testID="browse-restaurants-btn" style={s.browseBtn} onPress={() => router.push('/(tabs)')}>
                <Text style={s.browseBtnTxt}>BROWSE RESTAURANTS</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item: o }) => (
            <TouchableOpacity testID={`order-card-${o.id}`} style={s.card}
              onPress={() => router.push(`/order/${o.id}`)} activeOpacity={0.8}>
              <View style={s.cardHeader}>
                <View style={s.cardLeft}>
                  <Image source={{ uri: o.restaurant_image }} style={s.restImg} />
                  <View style={s.cardInfo}>
                    <Text style={s.restName} numberOfLines={1}>{o.restaurant_name}</Text>
                    <Text style={s.orderNum}>{o.order_number}</Text>
                    <Text style={s.orderDate}>{new Date(o.created_at).toLocaleDateString()}</Text>
                  </View>
                </View>
                <View style={[s.statusBadge, { backgroundColor: STATUS_COLORS[o.status] + '22', borderColor: STATUS_COLORS[o.status] }]}>
                  <Text style={[s.statusTxt, { color: STATUS_COLORS[o.status] }]}>
                    {STATUS_LABELS[o.status] || o.status}
                  </Text>
                </View>
              </View>
              <View style={s.cardFooter}>
                <Text style={s.itemCount}>{o.items?.length} item{o.items?.length !== 1 ? 's' : ''}</Text>
                <Text style={s.total}>${o.total?.toFixed(2)}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.screen, paddingBottom: 16, paddingTop: 8 },
  title: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 32, color: Colors.textPrimary },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyTitle: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 22, color: Colors.textPrimary, marginTop: 16 },
  emptySubtitle: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textSecondary, marginTop: 8, textAlign: 'center' },
  browseBtn: { marginTop: 24, height: 48, backgroundColor: Colors.primary, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  browseBtnTxt: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.primaryFg, letterSpacing: 1 },
  card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, marginBottom: 12, padding: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  restImg: { width: 52, height: 52, resizeMode: 'cover', marginRight: 12 },
  cardInfo: { flex: 1 },
  restName: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.textPrimary },
  orderNum: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  orderDate: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderRadius: 100 },
  statusTxt: { fontFamily: 'DMSans_700Bold', fontSize: 11 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12 },
  itemCount: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary },
  total: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.textPrimary },
});
