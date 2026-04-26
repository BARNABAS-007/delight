import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Animated, useRef,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import SpeedStreak from '@/components/SpeedStreak';
import { Colors, Spacing, Brutalist } from '@/constants/theme';

type SectionMode = 'delivery' | 'dineout';

const CATEGORIES = [
  { id: 'All', icon: 'apps' },
  { id: 'Biryani', icon: 'restaurant' },
  { id: 'Pizza', icon: 'pizza' },
  { id: 'Burgers', icon: 'fast-food' },
  { id: 'Italian', icon: 'wine' },
  { id: 'Sushi', icon: 'fish' },
];

const BANNERS = [
  { id: '1', title: 'firstmeal', sub: 'Fresh from the kitchen, fast.', image: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800&q=80' },
  { id: '2', title: 'Dine in Style', sub: 'Reserve a table at top restaurants', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80' },
];

export default function Home() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [openCount, setOpenCount] = useState<number>(-2);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cuisine, setCuisine] = useState('All');
  const [mode, setMode] = useState<SectionMode>('delivery');
  const { user } = useAuth();
  const { itemCount, streakVisible } = useCart();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const load = useCallback(async (c = 'All') => {
    try {
      setOpenCount(-2); // -2 = Loading
      const params: any = {};
      if (c !== 'All') params.cuisine = c;
      
      await new Promise(r => setTimeout(r, 500)); // Explicit delay as requested
      
      const data: any = await api.getRestaurants(params);
      setRestaurants(data);
      // Dynamic "Chefs Online" — count open restaurants
      const open = data.filter((r: any) => r.is_open === true).length;
      setOpenCount(open > 0 ? open : data.length); // fallback: all if flag missing
    } catch (e) { 
      console.error(e); 
      setOpenCount(-1); // -1 = Offline
    }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(cuisine); }, [cuisine]);

  const selectCuisine = (c: string) => { setCuisine(c); setLoading(true); };

  const switchMode = (m: SectionMode) => setMode(m);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <SpeedStreak visible={streakVisible} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Header ── */}
        <View style={s.header}>
          <View>
            <Text style={s.brand}>firstmeal</Text>
            <Text style={s.location}><Ionicons name="location-sharp" size={12} color={Colors.primary} /> Vijayawada</Text>
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity testID="header-cart-btn" style={s.cartBtn} onPress={() => router.push('/(tabs)/cart')}>
              <Ionicons name="bag-outline" size={22} color={Colors.primaryFg} />
              {itemCount > 0 && (
                <View style={s.cartBadge}>
                  <Text style={s.cartBadgeTxt}>{itemCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity testID="header-profile-btn" style={s.iconBtn} onPress={() => router.push('/(tabs)/profile')}>
              <Ionicons name="person-circle-outline" size={36} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Mode Switcher: Delivery / Dineout ── */}
        <View style={s.modeBar}>
          {(['delivery', 'dineout'] as SectionMode[]).map(m => (
            <TouchableOpacity
              key={m}
              testID={`mode-${m}`}
              style={[s.modeBtn, mode === m && s.modeBtnActive]}
              onPress={() => switchMode(m)}>
              <Ionicons
                name={m === 'delivery' ? 'bicycle-outline' : 'restaurant-outline'}
                size={16}
                color={mode === m ? Colors.primaryFg : Colors.textSecondary}
              />
              <Text style={[s.modeTxt, mode === m && s.modeTxtActive]}>
                {m === 'delivery' ? 'Delivery' : 'Dineout'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Search ── */}
        <TouchableOpacity testID="search-bar" style={s.searchBar} onPress={() => router.push('/(tabs)/search')}>
          <Ionicons name="search" size={20} color={Colors.secondary} />
          <Text style={s.searchPH}>Hungry? Search chefs, dishes...</Text>
        </TouchableOpacity>

        {/* ── Chefs Online Badge ── */}
        <View style={s.onlineBadge}>
          <View style={[s.onlineDot, openCount === -1 && { backgroundColor: Colors.error }]} />
          <Text style={[s.onlineTxt, openCount === -1 && { color: Colors.error }]}>
            {openCount === -2 ? "Loading..." : openCount === -1 ? "Offline Mode" : `${openCount} Chefs Online`}
          </Text>
        </View>

        {/* ── Banners ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} pagingEnabled style={s.bannersScroll}>
          {BANNERS.map(b => (
            <View key={b.id} style={s.bannerCard}>
              <LinearGradient colors={['#F8CB46', '#897541']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              {/* Overlaid text */}
              <View style={s.bannerContent}>
                <Text style={s.bannerTitle}>{b.title}</Text>
                <Text style={s.bannerSub}>{b.sub}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* ── Categories ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filtersScroll} contentContainerStyle={s.filtersContent}>
          {CATEGORIES.map(c => (
            <TouchableOpacity key={c.id} testID={`cuisine-filter-${c.id}`} style={s.bubbleContainer} onPress={() => selectCuisine(c.id)}>
              <View style={[s.bubble, cuisine === c.id && s.bubbleActive]}>
                <Ionicons name={c.icon as any} size={26} color={cuisine === c.id ? Colors.primaryFg : Colors.secondary} />
              </View>
              <Text style={[s.bubbleLabel, cuisine === c.id && s.bubbleLabelActive]}>{c.id}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Section Title ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>
            {mode === 'dineout' ? 'Reserve a Table' : cuisine === 'All' ? 'The Hunger Feed' : cuisine}
          </Text>
          <Text style={s.sectionCount}>{restaurants.length} places</Text>
        </View>

        {/* ── Restaurant Cards ── */}
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : mode === 'dineout' ? (
          restaurants.map(r => (
            <DineoutCard key={r.id} restaurant={r} onPress={() => router.push(`/restaurant/${r.id}?mode=dineout`)} />
          ))
        ) : (
          restaurants.map(r => (
            <RestaurantCard key={r.id} restaurant={r} onPress={() => router.push(`/restaurant/${r.id}`)} />
          ))
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ── Delivery Card ─────────────────────────────────────────────────────────────
function RestaurantCard({ restaurant: r, onPress }: any) {
  return (
    <TouchableOpacity testID={`restaurant-card-${r.id}`} style={s.card} onPress={onPress} activeOpacity={0.85}>
      <View style={s.cardImgContainer}>
        <LinearGradient colors={['#F8CB46', '#897541']} style={[StyleSheet.absoluteFill, { opacity: 0.15 }]} />
        {r.image && (
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          <Ionicons name="image-outline" size={60} color={Colors.border} style={{ alignSelf: 'center', marginTop: 50 }} />
        )}
        <View style={s.deliveryBadge}>
          <Text style={s.deliveryBadgeTxt}>{r.delivery_time ?? '25-35 min'}</Text>
        </View>
        {!r.is_open && (
          <View style={s.closedOverlay}>
            <Text style={s.closedTxt}>CLOSED</Text>
          </View>
        )}
      </View>
      <View style={[s.cardBody, Brutalist as any]}>
        <View style={s.cardRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.cardName} numberOfLines={1}>{r.name}</Text>
            <Text style={s.cardCuisine}>{r.cuisine?.join(' • ')}</Text>
          </View>
          <View style={s.ratingPill}>
            <Ionicons name="star" size={13} color={Colors.primaryFg} />
            <Text style={s.ratingTxt}>{r.rating ?? '4.5'}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Dineout Card ──────────────────────────────────────────────────────────────
function DineoutCard({ restaurant: r, onPress }: any) {
  return (
    <TouchableOpacity testID={`dineout-card-${r.id}`} style={[s.card, s.dineoutCard]} onPress={onPress} activeOpacity={0.85}>
      <View style={[s.cardBody, Brutalist as any, { borderColor: Colors.tertiary }]}>
        <View style={s.cardRow}>
          <View style={{ flex: 1 }}>
            <View style={s.dineoutBadge}>
              <Text style={s.dineoutBadgeTxt}>DINE IN</Text>
            </View>
            <Text style={s.cardName} numberOfLines={1}>{r.name}</Text>
            <Text style={s.cardCuisine}>{r.cuisine?.join(' • ')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
        </View>
        <Text style={s.reserveHint}>Tap to reserve a table →</Text>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.screen, paddingVertical: 16 },
  brand: { fontFamily: 'DMSans_700Bold', fontSize: 26, color: Colors.textPrimary, letterSpacing: -1 },
  location: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cartBtn: { width: 40, height: 40, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderRadius: 8, ...Brutalist, borderColor: Colors.secondary },
  cartBadge: { position: 'absolute', top: -6, right: -6, backgroundColor: Colors.tertiary, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  cartBadgeTxt: { fontFamily: 'DMSans_700Bold', fontSize: 10, color: '#001A20' },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  modeBar: { flexDirection: 'row', marginHorizontal: Spacing.screen, marginBottom: 16, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', ...Brutalist, borderColor: Colors.secondary },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, backgroundColor: Colors.surface },
  modeBtnActive: { backgroundColor: Colors.primary },
  modeTxt: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.textSecondary },
  modeTxtActive: { color: Colors.primaryFg },

  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: Spacing.screen, height: 50, backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 18, marginBottom: 12, ...Brutalist, borderColor: Colors.secondary },
  searchPH: { fontFamily: 'DMSans_500Medium', fontSize: 15, color: Colors.textSecondary },

  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: Spacing.screen, marginBottom: 16 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  onlineTxt: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.textSecondary },

  bannersScroll: { marginBottom: 20 },
  bannerCard: { width: 300, height: 140, marginLeft: Spacing.screen, overflow: 'hidden', ...Brutalist, borderColor: Colors.secondary, borderWidth: 1, justifyContent: 'flex-end' },
  bannerContent: { padding: 16 },
  bannerTitle: { fontFamily: 'DMSans_700Bold', fontSize: 22, color: '#1A1200', letterSpacing: -0.5 },
  bannerSub: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#3A2A00', marginTop: 4 },

  filtersScroll: { marginBottom: 20 },
  filtersContent: { paddingHorizontal: Spacing.screen, gap: 14 },
  bubbleContainer: { alignItems: 'center' },
  bubble: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.surfaceLight, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  bubbleActive: { backgroundColor: Colors.primary, borderColor: Colors.secondary, ...Brutalist },
  bubbleLabel: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.textSecondary, marginTop: 6 },
  bubbleLabelActive: { fontFamily: 'DMSans_700Bold', color: Colors.textPrimary },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.screen, marginBottom: 14 },
  sectionTitle: { fontFamily: 'DMSans_700Bold', fontSize: 20, color: Colors.textPrimary },
  sectionCount: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.textSecondary },

  card: { marginHorizontal: Spacing.screen, marginBottom: 18, overflow: 'visible' },
  cardImgContainer: { width: '100%', height: 160, backgroundColor: Colors.surfaceLight, overflow: 'hidden', position: 'relative', justifyContent: 'center', alignItems: 'center' },
  deliveryBadge: { position: 'absolute', bottom: 10, left: 12, backgroundColor: Colors.primary, paddingHorizontal: 10, paddingVertical: 5, ...Brutalist, borderColor: Colors.secondary },
  deliveryBadgeTxt: { fontFamily: 'DMSans_700Bold', fontSize: 12, color: Colors.primaryFg },
  closedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  closedTxt: { fontFamily: 'DMSans_700Bold', fontSize: 18, color: '#FFFFFF', letterSpacing: 4 },

  cardBody: { padding: 14, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontFamily: 'DMSans_700Bold', fontSize: 17, color: Colors.textPrimary, marginBottom: 2 },
  cardCuisine: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary },
  ratingPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, paddingHorizontal: 10, paddingVertical: 5, ...Brutalist, borderColor: Colors.secondary },
  ratingTxt: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.primaryFg },

  dineoutCard: {},
  dineoutBadge: { alignSelf: 'flex-start', backgroundColor: Colors.tertiary, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 6 },
  dineoutBadgeTxt: { fontFamily: 'DMSans_700Bold', fontSize: 10, color: '#001A20', letterSpacing: 1.5 },
  reserveHint: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.tertiary, marginTop: 8 },
});
