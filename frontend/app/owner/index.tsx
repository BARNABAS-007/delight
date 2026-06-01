import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Dimensions, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const C = {
  primary: '#4F46E5',
  primaryContainer: '#E2DFFF',
  secondary: '#006C49',
  tertiary: '#885500',
  error: '#BA1A1A',
  surface: '#FFFFFF',
  background: '#F9F9F9',
  onSurface: '#1B1B1B',
  onSurfaceVariant: '#464555',
  outlineVariant: '#C7C4D8',
  surfaceContainerHigh: '#E8E8E8',
  onPrimary: '#FFFFFF',
};

const { width: SCREEN_W } = Dimensions.get('window');

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function formatDate() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function OwnerHome() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [restaurant, setRestaurant] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingRestaurant, setSavingRestaurant] = useState(false);

  const createDefaultRestaurant = async () => {
    if (!user) return;
    setSavingRestaurant(true);
    
    const defaultCategories = [
      {
        id: "cat_starters_" + Date.now(),
        name: "Starters 🍢",
        items: [
          {
            id: "item_ct_" + Date.now() + "_1",
            name: "Chicken Tikka",
            price: 280,
            is_available: true,
            is_popular: true,
            description: "Juicy boneless chicken pieces marinated in spiced yogurt and grilled in traditional clay oven.",
            image: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=400&q=80",
            dietary: ["spicy"]
          },
          {
            id: "item_pt_" + Date.now() + "_2",
            name: "Paneer Tikka",
            price: 240,
            is_available: true,
            is_popular: false,
            description: "Fresh cottage cheese blocks marinated in rich tandoori marinade and cooked to gold edges.",
            image: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=400&q=80",
            dietary: ["vegetarian", "spicy"]
          },
          {
            id: "item_hbk_" + Date.now() + "_3",
            name: "Hara Bhara Kabab",
            price: 180,
            is_available: true,
            is_popular: false,
            description: "Tender pan-fried patties crafted with fresh spinach, green peas, and hand-ground herbs.",
            image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=400&q=80",
            dietary: ["vegetarian", "vegan"]
          }
        ]
      },
      {
        id: "cat_main_" + Date.now(),
        name: "Main Course 🍲",
        items: [
          {
            id: "item_bc_" + Date.now() + "_4",
            name: "Butter Chicken",
            price: 340,
            is_available: true,
            is_popular: true,
            description: "Classic tender chicken simmered in rich, velvety tomato and cashew cream gravy with aromatic butter.",
            image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=400&q=80",
            dietary: []
          },
          {
            id: "item_pbm_" + Date.now() + "_5",
            name: "Paneer Butter Masala",
            price: 290,
            is_available: true,
            is_popular: true,
            description: "Succulent paneer cubes simmered in a mildly sweet, butter-laden tomato gravy with dried fenugreek.",
            image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=400&q=80",
            dietary: ["vegetarian"]
          },
          {
            id: "item_dm_" + Date.now() + "_6",
            name: "Dal Makhani",
            price: 220,
            is_available: true,
            is_popular: false,
            description: "Whole black lentils and red kidney beans slow-cooked overnight, finished with butter and fresh cream.",
            image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80",
            dietary: ["vegetarian"]
          }
        ]
      },
      {
        id: "cat_breads_" + Date.now(),
        name: "Indian Breads 🫓",
        items: [
          {
            id: "item_bn_" + Date.now() + "_7",
            name: "Butter Naan",
            price: 50,
            is_available: true,
            is_popular: false,
            description: "Fluffy and buttery classic leavened tandoori flatbread.",
            image: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?auto=format&fit=crop&w=400&q=80",
            dietary: ["vegetarian"]
          },
          {
            id: "item_gn_" + Date.now() + "_8",
            name: "Garlic Naan",
            price: 60,
            is_available: true,
            is_popular: true,
            description: "Aromatic leavened flatbread topped with minced garlic butter and fresh cilantro.",
            image: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?auto=format&fit=crop&w=400&q=80",
            dietary: ["vegetarian"]
          }
        ]
      },
      {
        id: "cat_desserts_" + Date.now(),
        name: "Desserts 🍨",
        items: [
          {
            id: "item_gj_" + Date.now() + "_9",
            name: "Gulab Jamun",
            price: 80,
            is_available: true,
            is_popular: false,
            description: "Delectable fried milk-solid dumplings soaked warm in sweet cardamom and rose sugar syrup.",
            image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=400&q=80",
            dietary: ["vegetarian"]
          }
        ]
      },
      {
        id: "cat_drinks_" + Date.now(),
        name: "Beverages 🥤",
        items: [
          {
            id: "item_ml_" + Date.now() + "_10",
            name: "Masala Lassi",
            price: 90,
            is_available: true,
            is_popular: false,
            description: "Rich, chilled whipped yogurt blended with toasted cumin, fresh mint, and mild black salt.",
            image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80",
            dietary: ["vegetarian"]
          }
        ]
      }
    ];

    try {
      const { data, error } = await supabase.from('restaurants').insert([{
        name: `${user.name || 'Sher-e-Dhaba'}`,
        owner_id: user.user_id,
        cuisine: ["Punjabi", "North Indian", "Tandoori"],
        description: "Authentic tandoori delicacies and rich north indian curries prepared with legendary dhaba warmth.",
        is_active: true,
        menu_categories: defaultCategories,
        rating: 4.8,
        review_count: 128,
        delivery_time: "25-35 mins",
        delivery_fee: 30,
        min_order: 150,
        price_range: "$$"
      }]).select().single();

      if (error) {
        Alert.alert('Error', `Failed to register your Dhaba: ${error.message}`);
      } else {
        setRestaurant(data);
        Alert.alert('Success 🎉', 'Your Dhaba storefront has been successfully registered and pre-loaded!');
      }
    } catch (err: any) {
      Alert.alert('Error', `An unexpected error occurred: ${err.message}`);
    } finally {
      setSavingRestaurant(false);
    }
  };

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
          .limit(50);
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
      .channel('owner_home_orders')
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

  // Computed stats
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayOrders = orders.filter(o => new Date(o.created_at) >= todayStart);
  const todayRevenue = todayOrders
    .filter(o => o.status === 'delivered')
    .reduce((s, o) => s + (o.total_amount || o.total || 0), 0);
  const activeOrders = orders.filter(o =>
    !['delivered', 'cancelled'].includes(o.status)
  );
  const preparingCount = activeOrders.filter(o =>
    ['confirmed', 'preparing'].includes(o.status)
  ).length;
  const readyCount = activeOrders.filter(o => o.status === 'ready').length;
  const pendingCount = activeOrders.filter(o => o.status === 'pending').length;

  // Avg prep time (mock — would need timestamps per status change)
  const avgPrepTime = activeOrders.length > 0 ? Math.max(12, Math.min(25, activeOrders.length * 2 + 8)) : 0;

  // Weekly revenue for sparkline
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekRevenue = weekDays.map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    const next = new Date(d); next.setDate(next.getDate() + 1);
    return orders
      .filter(o => o.status === 'delivered' && new Date(o.created_at) >= d && new Date(o.created_at) < next)
      .reduce((s, o) => s + (o.total_amount || o.total || 0), 0);
  });
  const maxRev = Math.max(...weekRevenue, 1);

  // Peak hour sales
  const peakHourMap: Record<number, number> = {};
  todayOrders.forEach(o => {
    const h = new Date(o.created_at).getHours();
    peakHourMap[h] = (peakHourMap[h] || 0) + (o.total_amount || o.total || 0);
  });
  const peakHour = Object.entries(peakHourMap).sort((a, b) => Number(b[1]) - Number(a[1]))[0];

  if (loading) return (
    <View style={[s.container, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
      <ActivityIndicator color={C.primary} size="large" />
    </View>
  );

  if (!restaurant) {
    return (
      <View style={[s.container, { paddingTop: insets.top, backgroundColor: C.background }]}>
        {/* Header */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Delight Dashboard</Text>
          </View>
          <TouchableOpacity style={s.logoutMini} onPress={async () => { await supabase.auth.signOut(); router.replace('/(auth)/login'); }}>
            <Ionicons name="log-out-outline" size={20} color={C.error} />
          </TouchableOpacity>
        </View>
        
        <ScrollView contentContainerStyle={s.setupScroll} showsVerticalScrollIndicator={false}>
          <View style={s.setupCard}>
            <View style={s.setupIconWrap}>
              <Ionicons name="restaurant" size={48} color={C.primary} />
            </View>
            <Text style={s.setupTitle}>Welcome to Delight! 👋</Text>
            <Text style={s.setupSub}>
              Let's get your digital storefront up and running. In just one click, we'll set up your premium restaurant dashboard complete with a pre-loaded authentic menu!
            </Text>
            
            <View style={s.setupFeatures}>
              <View style={s.setupFeatureRow}>
                <View style={s.featureIcon}>
                  <Ionicons name="fast-food-outline" size={20} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.featureTitle}>Pre-loaded Authentic Menu</Text>
                  <Text style={s.featureDesc}>Starters, main courses, and drinks already set up so you can start selling immediately.</Text>
                </View>
              </View>
              
              <View style={s.setupFeatureRow}>
                <View style={s.featureIcon}>
                  <Ionicons name="receipt-outline" size={20} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.featureTitle}>Real-time Order Desk</Text>
                  <Text style={s.featureDesc}>Accept, cook, and track orders with smart timers and status steps.</Text>
                </View>
              </View>
              
              <View style={s.setupFeatureRow}>
                <View style={s.featureIcon}>
                  <Ionicons name="trending-up-outline" size={20} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.featureTitle}>Business Insights</Text>
                  <Text style={s.featureDesc}>Track daily earnings, weekly sales trends, and peak dining hours.</Text>
                </View>
              </View>
            </View>
            
            <TouchableOpacity style={s.setupBtn} onPress={createDefaultRestaurant} disabled={savingRestaurant}>
              {savingRestaurant ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={s.setupBtnTxt}>🚀 Activate My Dhaba Storefront</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Delight Dashboard</Text>
        </View>
        <View style={s.avatar}>
          <Ionicons name="person" size={18} color={C.primary} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.primary} />
        }
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Greeting */}
        <View style={s.greetingSection}>
          <Text style={s.greeting}>{getGreeting()},</Text>
          <Text style={s.ownerName}>{user?.name || 'Owner'} 👑</Text>
          <Text style={s.dateText}>{formatDate()}</Text>
        </View>

        {/* Today's Earnings Card */}
        <View style={s.earningsCard}>
          <Text style={s.cardLabel}>TODAY'S EARNINGS</Text>
          <Text style={s.earningsAmount}>₹{todayRevenue.toLocaleString('en-IN')}</Text>
          {/* Mini sparkline */}
          <View style={s.sparkline}>
            {weekRevenue.map((val, i) => (
              <View key={i} style={s.sparkCol}>
                <View style={[s.sparkBar, {
                  height: Math.max(4, (val / maxRev) * 40),
                  backgroundColor: i === 6 ? C.primary : C.outlineVariant,
                }]} />
                <Text style={s.sparkLabel}>{weekDays[i].charAt(0)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Stats Row */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statLabel}>ACTIVE ORDERS</Text>
            <Text style={s.statValue}>{activeOrders.length}</Text>
            <Text style={s.statSub}>{preparingCount} preparing · {readyCount} ready</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statLabel}>AVG. PREP TIME</Text>
            <Text style={s.statValue}>{avgPrepTime}m</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="checkmark-circle" size={14} color={C.secondary} />
              <Text style={[s.statSub, { color: C.secondary }]}>On track</Text>
            </View>
          </View>
        </View>

        {/* Active Orders Section */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Active Orders</Text>
            <TouchableOpacity onPress={() => router.push('/owner/orders' as any)}>
              <Text style={s.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          {activeOrders.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="receipt-outline" size={40} color={C.outlineVariant} />
              <Text style={s.emptyText}>No active orders right now</Text>
            </View>
          ) : (
            activeOrders.slice(0, 5).map(o => (
              <View key={o.id} style={s.orderRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={s.orderItemName}>
                      {o.items?.[0]?.name || 'Order'}
                      {o.items?.length > 1 ? ` + ${o.items.length - 1} more` : ''}
                    </Text>
                    <View style={[s.statusPill, {
                      backgroundColor: o.status === 'pending' ? '#FEF3C7' :
                        o.status === 'preparing' || o.status === 'confirmed' ? '#D1FAE5' :
                        o.status === 'ready' ? '#FDDCAB' : C.primaryContainer,
                    }]}>
                      <Text style={[s.statusText, {
                        color: o.status === 'pending' ? '#92400E' :
                          o.status === 'preparing' || o.status === 'confirmed' ? '#065F46' :
                          o.status === 'ready' ? '#92400E' : C.primary,
                      }]}>{o.status?.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={s.orderDetails}>
                    #{o.order_number || o.id.slice(0, 8)} · Items: {o.items?.length || 0} · ₹{(o.total_amount || o.total || 0).toFixed(0)}
                  </Text>
                </View>
                <Text style={s.orderTime}>
                  {getTimeAgo(o.created_at)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Sales Trends */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Sales Trends</Text>
          <Text style={s.trendsSub}>Last 7 Days Performance</Text>
          <View style={s.chartContainer}>
            {weekRevenue.map((val, i) => (
              <View key={i} style={s.chartCol}>
                <View style={[s.chartBar, {
                  height: Math.max(8, (val / maxRev) * 120),
                  backgroundColor: i === 6 ? C.primary : `${C.primary}44`,
                }]} />
                <Text style={s.chartLabel}>{weekDays[i]}</Text>
              </View>
            ))}
          </View>
          {peakHour && (
            <View style={s.peakRow}>
              <Text style={s.peakLabel}>Peak Hour Sales</Text>
              <Text style={s.peakValue}>₹{Number(peakHour[1]).toLocaleString('en-IN')}</Text>
            </View>
          )}
          <View style={s.peakRow}>
            <Text style={s.peakLabel}>Order Frequency</Text>
            <Text style={[s.peakValue, { color: todayOrders.length > 5 ? C.error : C.secondary }]}>
              {todayOrders.length > 5 ? 'High' : todayOrders.length > 0 ? 'Medium' : 'Low'}
            </Text>
          </View>

          <TouchableOpacity style={s.viewAnalyticsBtn} onPress={() => {}}>
            <Text style={s.viewAnalyticsTxt}>View Detailed Analytics</Text>
            <Ionicons name="arrow-forward" size={16} color={C.onPrimary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function getTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
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
  greetingSection: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 },
  greeting: { fontFamily: 'DMSans_400Regular', fontSize: 16, color: C.onSurfaceVariant },
  ownerName: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 28, color: C.onSurface, marginTop: 2 },
  dateText: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: C.onSurfaceVariant, marginTop: 4 },

  earningsCard: {
    marginHorizontal: 24, backgroundColor: C.surface, borderRadius: 12,
    padding: 20, borderWidth: 1, borderColor: C.outlineVariant + '30',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8,
    elevation: 2,
  },
  cardLabel: {
    fontFamily: 'DMSans_700Bold', fontSize: 11, color: C.onSurfaceVariant,
    letterSpacing: 1.5, marginBottom: 8,
  },
  earningsAmount: {
    fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 36, color: C.onSurface,
    letterSpacing: -1,
  },
  sparkline: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 16, height: 56 },
  sparkCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  sparkBar: { width: '100%', borderRadius: 3, minHeight: 4 },
  sparkLabel: { fontFamily: 'DMSans_400Regular', fontSize: 10, color: C.onSurfaceVariant, marginTop: 4 },

  statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, marginTop: 16 },
  statCard: {
    flex: 1, backgroundColor: C.surface, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: C.outlineVariant + '30',
  },
  statLabel: {
    fontFamily: 'DMSans_700Bold', fontSize: 10, color: C.onSurfaceVariant,
    letterSpacing: 1.2, marginBottom: 8,
  },
  statValue: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 28, color: C.onSurface },
  statSub: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: C.onSurfaceVariant, marginTop: 4 },

  section: { paddingHorizontal: 24, marginTop: 28 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontFamily: 'DMSans_700Bold', fontSize: 18, color: C.onSurface },
  viewAll: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: C.primary },
  trendsSub: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: C.onSurfaceVariant, marginTop: 4, marginBottom: 16 },

  orderRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.outlineVariant + '30',
  },
  orderItemName: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: C.onSurface },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontFamily: 'DMSans_700Bold', fontSize: 9, letterSpacing: 0.5 },
  orderDetails: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: C.onSurfaceVariant, marginTop: 4 },
  orderTime: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: C.onSurfaceVariant },

  emptyState: {
    alignItems: 'center', paddingVertical: 40, backgroundColor: C.surface,
    borderRadius: 12, borderWidth: 1, borderColor: C.outlineVariant + '30',
  },
  emptyText: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: C.onSurfaceVariant, marginTop: 12 },

  chartContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 150, marginBottom: 20 },
  chartCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  chartBar: { width: '70%', borderRadius: 4, minHeight: 8 },
  chartLabel: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: C.onSurfaceVariant, marginTop: 6 },

  peakRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.outlineVariant + '20',
  },
  peakLabel: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: C.onSurfaceVariant },
  peakValue: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: C.onSurface },

  viewAnalyticsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 20, backgroundColor: C.primary, borderRadius: 12,
    paddingVertical: 14,
  },
  viewAnalyticsTxt: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: C.onPrimary },
  
  setupScroll: { paddingBottom: 40 },
  setupCard: {
    marginHorizontal: 24, marginVertical: 32, padding: 24,
    backgroundColor: C.surface, borderRadius: 16,
    borderWidth: 1, borderColor: C.outlineVariant + '40',
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12,
    elevation: 3,
  },
  setupIconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: C.primaryContainer, alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  setupTitle: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 24, color: C.onSurface, textAlign: 'center' },
  setupSub: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: C.onSurfaceVariant, textAlign: 'center', marginTop: 10, lineHeight: 20 },
  setupFeatures: { width: '100%', gap: 16, marginVertical: 24 },
  setupFeatureRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  featureIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: C.primaryContainer, alignItems: 'center', justifyContent: 'center' },
  featureTitle: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: C.onSurface },
  featureDesc: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: C.onSurfaceVariant, marginTop: 2, lineHeight: 16 },
  setupBtn: {
    width: '100%', height: 52, borderRadius: 12, backgroundColor: C.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8,
    elevation: 4,
  },
  setupBtnTxt: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: '#FFF', letterSpacing: 0.5 },
  logoutMini: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9F9F9' },
});
