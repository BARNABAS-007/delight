import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Image, TouchableOpacity,
  RefreshControl, ActivityIndicator, TextInput, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Colors, Spacing, FontSize } from '@/constants/theme';

const CUISINES = ['All','Fine Dining','Japanese','Burgers','Indian','Italian','Sushi','Pizza'];
const BANNERS = [
  { id:'1', title:'Premium Dining', sub:'Up to 30% off fine dining tonight', image:'https://images.unsplash.com/photo-1611309454921-16cef3438ee0?w=800&q=80' },
  { id:'2', title:'Sushi Night', sub:'Fresh from Tsukiji, delivered to you', image:'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=800&q=80' },
];

export default function Home() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cuisine, setCuisine] = useState('All');
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const load = useCallback(async (c = 'All') => {
    try {
      const params: any = {};
      if (c !== 'All') params.cuisine = c;
      const data: any = await api.getRestaurants(params);
      setRestaurants(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(cuisine); }, [cuisine]);

  const onRefresh = () => { setRefreshing(true); load(cuisine); };

  const selectCuisine = (c: string) => { setCuisine(c); setLoading(true); };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.brand}>DELIGHT</Text>
            <Text style={s.location}><Ionicons name="location-outline" size={12} color={Colors.textSecondary} /> New York, NY</Text>
          </View>
          <TouchableOpacity testID="header-chat-btn" style={s.iconBtn} onPress={() => router.push('/chat')}>
            <Ionicons name="chatbubble-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <TouchableOpacity testID="search-bar" style={s.searchBar} onPress={() => router.push('/(tabs)/search')}>
          <Ionicons name="search" size={18} color={Colors.textSecondary} />
          <Text style={s.searchPH}>Search restaurants, cuisine...</Text>
        </TouchableOpacity>

        {/* Hero Banners */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.bannersScroll} pagingEnabled>
          {BANNERS.map(b => (
            <View key={b.id} style={s.bannerCard}>
              <Image source={{ uri: b.image }} style={s.bannerImg} />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={s.bannerGrad}>
                <Text style={s.bannerTitle}>{b.title}</Text>
                <Text style={s.bannerSub}>{b.sub}</Text>
              </LinearGradient>
            </View>
          ))}
        </ScrollView>

        {/* Cuisine Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filtersScroll} contentContainerStyle={s.filtersContent}>
          {CUISINES.map(c => (
            <TouchableOpacity key={c} testID={`cuisine-filter-${c}`} style={[s.chip, cuisine === c && s.chipActive]} onPress={() => selectCuisine(c)}>
              <Text style={[s.chipTxt, cuisine === c && s.chipTxtActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Section Title */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>
            {cuisine === 'All' ? 'All Restaurants' : cuisine}
          </Text>
          <Text style={s.sectionCount}>{restaurants.length} places</Text>
        </View>

        {/* Restaurants */}
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : (
          restaurants.map(r => <RestaurantCard key={r.id} restaurant={r} onPress={() => router.push(`/restaurant/${r.id}`)} />)
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function RestaurantCard({ restaurant: r, onPress }: any) {
  return (
    <TouchableOpacity testID={`restaurant-card-${r.id}`} style={s.card} onPress={onPress} activeOpacity={0.8}>
      <Image source={{ uri: r.image }} style={s.cardImg} />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={s.cardGrad} />
      {r.is_popular && <View style={s.badge}><Text style={s.badgeTxt}>POPULAR</Text></View>}
      <View style={s.cardBody}>
        <View style={s.cardRow}>
          <Text style={s.cardName} numberOfLines={1}>{r.name}</Text>
          <View style={s.ratingBadge}>
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text style={s.ratingTxt}>{r.rating}</Text>
          </View>
        </View>
        <Text style={s.cardCuisine}>{r.cuisine?.join(' • ')}</Text>
        <View style={s.cardMeta}>
          <Text style={s.metaTxt}><Ionicons name="time-outline" size={12} /> {r.delivery_time}</Text>
          <Text style={s.metaDot}>·</Text>
          <Text style={s.metaTxt}>${r.delivery_fee} delivery</Text>
          <Text style={s.metaDot}>·</Text>
          <Text style={s.metaTxt}>{r.price_range}</Text>
        </View>
        {r.tags?.length > 0 && (
          <View style={s.tagsRow}>
            {r.tags.slice(0,3).map((t: string) => (
              <View key={t} style={s.tag}><Text style={s.tagTxt}>{t}</Text></View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.screen, paddingVertical: 16 },
  brand: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 24, color: Colors.primary, letterSpacing: 4 },
  location: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: Spacing.screen, height: 48, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 16, marginBottom: 20 },
  searchPH: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textSecondary },
  bannersScroll: { marginBottom: 20 },
  bannerCard: { width: 320, height: 180, marginLeft: Spacing.screen, overflow: 'hidden' },
  bannerImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  bannerGrad: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: 16 },
  bannerTitle: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20, color: Colors.primary },
  bannerSub: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  filtersScroll: { marginBottom: 24 },
  filtersContent: { paddingHorizontal: Spacing.screen, gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border, borderRadius: 100, backgroundColor: Colors.surface },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipTxt: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.textSecondary },
  chipTxtActive: { color: Colors.primaryFg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.screen, marginBottom: 16 },
  sectionTitle: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 22, color: Colors.textPrimary },
  sectionCount: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary },
  card: { marginHorizontal: Spacing.screen, marginBottom: 20, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  cardImg: { width: '100%', height: 200, resizeMode: 'cover' },
  cardGrad: { position: 'absolute', left: 0, right: 0, top: 100, height: 100 },
  badge: { position: 'absolute', top: 12, right: 12, backgroundColor: Colors.primary, paddingHorizontal: 10, paddingVertical: 4 },
  badgeTxt: { fontFamily: 'DMSans_700Bold', fontSize: 10, color: Colors.primaryFg, letterSpacing: 1 },
  cardBody: { padding: 14, backgroundColor: Colors.surface },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardName: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 18, color: Colors.textPrimary, flex: 1 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1A1A00', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  ratingTxt: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: '#FFD700' },
  cardCuisine: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary, marginBottom: 8 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaTxt: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary },
  metaDot: { color: Colors.border, fontSize: 12 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: Colors.border, borderRadius: 100 },
  tagTxt: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.textSecondary },
});
