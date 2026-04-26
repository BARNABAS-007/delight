import { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/services/api';
import { useCart } from '@/context/CartContext';
import SpeedStreak from '@/components/SpeedStreak';
import { Colors, Spacing, Brutalist } from '@/constants/theme';

export default function RestaurantDetail() {
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: string }>();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState(0);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [reserveSuccess, setReserveSuccess] = useState(false);

  const { addToCart, itemCount, cart, streakVisible } = useCart();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  const isDineout = mode === 'dineout';

  useEffect(() => {
    api.getRestaurant(id as string)
      .then((rest: any) => setRestaurant(rest))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const cartTotal = cart.pricing?.customer_total ?? 0;

  const handleAddItem = (item: any) => {
    setAdding(item.id);
    const success = addToCart(
      {
        id: id as string,
        name: restaurant.name,
        image: restaurant.image,
        lat: restaurant.lat,
        lng: restaurant.lng,
      },
      {
        item_id: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        image: item.image,
      }
    );
    setTimeout(() => setAdding(null), 300);
  };

  const handleReserve = () => {
    setReserveSuccess(true);
    setTimeout(() => setReserveSuccess(false), 3000);
  };

  const heroOpacity = scrollY.interpolate({ inputRange: [0, 200], outputRange: [1, 0], extrapolate: 'clamp' });

  if (loading) return <View style={s.loader}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  if (!restaurant) return <View style={s.loader}><Text style={s.errTxt}>Restaurant not found</Text></View>;

  const cats = restaurant.menu_categories || [];

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <SpeedStreak visible={streakVisible} />

      {/* Back + Cart Header */}
      <View style={s.topBar}>
        <TouchableOpacity testID="back-btn" style={s.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity testID="cart-btn" style={s.cartBtn} onPress={() => router.push('/(tabs)/cart')}>
          <Ionicons name="bag-outline" size={22} color={Colors.primaryFg} />
          {itemCount > 0 && <View style={s.badge}><Text style={s.badgeTxt}>{itemCount}</Text></View>}
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        {/* Hero */}
        <Animated.View style={[s.heroWrap, { opacity: heroOpacity }]}>
          <LinearGradient colors={['#F8CB46', '#897541']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={s.heroContent}>
            <Text style={s.heroName}>{restaurant.name}</Text>
            <Text style={s.heroCuisine}>{restaurant.cuisine?.join(' · ')}</Text>
          </View>
        </Animated.View>

        {/* Info Card */}
        <View style={s.infoCard}>
          <View style={s.infoRow}>
            <InfoPill icon="star" text={`${restaurant.rating ?? '4.5'}`} />
            <InfoPill icon="flash-sharp" text={restaurant.delivery_time ?? '25 min'} />
            <InfoPill icon="bicycle-outline" text={`₹${restaurant.delivery_fee ?? '30'}`} />
          </View>
          {restaurant.description && <Text style={s.desc}>{restaurant.description}</Text>}
        </View>

        {/* ── Dineout: Reservation ── */}
        {isDineout && (
          <View style={s.reserveCard}>
            <Text style={s.reserveTitle}>Reserve a Table</Text>
            <Text style={s.reserveNote}>Book now for guaranteed seating. No wait.</Text>
            <TouchableOpacity
              testID="reserve-btn"
              style={[s.reserveBtn, reserveSuccess && s.reserveBtnSuccess]}
              onPress={handleReserve}
              activeOpacity={0.85}
            >
              <Text style={s.reserveBtnTxt}>
                {reserveSuccess ? '✓ RESERVED!' : 'BOOK TABLE'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Category Tabs */}
        {!isDineout && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll} contentContainerStyle={s.catContent}>
            {cats.map((cat: any, i: number) => (
              <TouchableOpacity
                key={cat.id} testID={`category-${cat.id}`}
                style={[s.catChip, activeCategory === i && s.catChipActive]}
                onPress={() => setActiveCategory(i)}
              >
                <Text style={[s.catTxt, activeCategory === i && s.catTxtActive]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Menu Items */}
        {!isDineout && cats.map((cat: any, ci: number) => (
          ci === activeCategory && cat.items.map((item: any) => (
            <View key={item.id} testID={`menu-item-${item.id}`} style={s.menuItem}>
              <View style={s.menuInfo}>
                <View style={s.menuTop}>
                  <Text style={s.menuName}>{item.name}</Text>
                  {item.is_popular && (
                    <View style={s.popularBadge}><Text style={s.popularTxt}>BEST SELLER</Text></View>
                  )}
                </View>
                {item.description && <Text style={s.menuDesc} numberOfLines={2}>{item.description}</Text>}
                <View style={s.menuBottom}>
                  <Text style={s.menuPrice}>₹{item.price.toFixed(2)}</Text>
                  {item.is_available !== false ? (
                    <TouchableOpacity
                      testID={`add-item-${item.id}`}
                      style={s.addBtn}
                      onPress={() => handleAddItem(item)}
                      disabled={adding === item.id}
                      activeOpacity={0.85}
                    >
                      {adding === item.id ? (
                        <ActivityIndicator size="small" color={Colors.primaryFg} />
                      ) : (
                        <Text style={s.addBtnTxt}>ADD</Text>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <Text style={s.unavailable}>Unavailable</Text>
                  )}
                </View>
              </View>
            </View>
          ))
        ))}
        <View style={{ height: 100 }} />
      </Animated.ScrollView>

      {/* Bottom Cart Bar */}
      {itemCount > 0 && !isDineout && (
        <TouchableOpacity
          testID="view-cart-btn"
          style={[s.cartBar, { bottom: insets.bottom + 8 }]}
          onPress={() => router.push('/(tabs)/cart')}
        >
          <View style={s.cartBarLeft}>
            <View style={s.cartCountBadge}><Text style={s.cartCountTxt}>{itemCount}</Text></View>
            <Text style={s.cartBarTxt}>VIEW CART</Text>
          </View>
          <Text style={s.cartBarTotal}>₹{cartTotal.toFixed(2)}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function InfoPill({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={s.infoPill}>
      <Ionicons name={icon as any} size={14} color={Colors.primary} />
      <Text style={s.infoTxt}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  errTxt: { fontFamily: 'DMSans_400Regular', color: Colors.textSecondary, fontSize: 16 },

  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', zIndex: 10, padding: Spacing.screen, paddingTop: 16 },
  iconBtn: { width: 44, height: 44, backgroundColor: 'rgba(26,18,0,0.5)', alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  cartBtn: { width: 44, height: 44, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderRadius: 22, ...Brutalist, borderColor: Colors.secondary },
  badge: { position: 'absolute', top: -4, right: -4, width: 18, height: 18, backgroundColor: Colors.tertiary, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  badgeTxt: { fontFamily: 'DMSans_700Bold', fontSize: 10, color: '#001A20' },

  heroWrap: { height: 240, justifyContent: 'flex-end' },
  heroContent: { padding: 20, paddingBottom: 24 },
  heroName: { fontFamily: 'DMSans_700Bold', fontSize: 28, color: Colors.primaryFg },
  heroCuisine: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: 'rgba(26,18,0,0.6)', marginTop: 4 },

  infoCard: { padding: Spacing.screen, borderBottomWidth: 2, borderBottomColor: Colors.secondary, backgroundColor: Colors.surface },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  infoPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.border },
  infoTxt: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.textPrimary },
  desc: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },

  reserveCard: {
    margin: Spacing.screen, padding: 20,
    backgroundColor: Colors.surface,
    ...Brutalist, borderColor: Colors.tertiary, borderWidth: 1,
  },
  reserveTitle: { fontFamily: 'DMSans_700Bold', fontSize: 20, color: Colors.textPrimary, marginBottom: 6 },
  reserveNote: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary, marginBottom: 16 },
  reserveBtn: { height: 48, backgroundColor: Colors.tertiary, alignItems: 'center', justifyContent: 'center', ...Brutalist, borderColor: '#3CAFE0' },
  reserveBtnSuccess: { backgroundColor: Colors.success },
  reserveBtnTxt: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: '#001A20', letterSpacing: 2 },

  catScroll: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  catContent: { paddingHorizontal: Spacing.screen, gap: 8, paddingVertical: 12 },
  catChip: { paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border },
  catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.secondary, ...Brutalist },
  catTxt: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.textSecondary },
  catTxtActive: { color: Colors.primaryFg },

  menuItem: { flexDirection: 'row', padding: Spacing.screen, borderBottomWidth: 1, borderBottomColor: Colors.border },
  menuInfo: { flex: 1 },
  menuTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  menuName: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.textPrimary, flex: 1, paddingRight: 8 },
  popularBadge: { backgroundColor: Colors.primary, paddingHorizontal: 8, paddingVertical: 3 },
  popularTxt: { fontFamily: 'DMSans_700Bold', fontSize: 9, color: Colors.primaryFg, letterSpacing: 1 },
  menuDesc: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary, lineHeight: 17, marginBottom: 8 },
  menuBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  menuPrice: { fontFamily: 'DMSans_700Bold', fontSize: 17, color: Colors.primary },
  addBtn: { paddingHorizontal: 20, paddingVertical: 8, backgroundColor: Colors.primary, ...Brutalist, borderColor: Colors.secondary },
  addBtnTxt: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.primaryFg, letterSpacing: 1 },
  unavailable: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary },

  cartBar: {
    position: 'absolute', left: Spacing.screen, right: Spacing.screen,
    height: 56, backgroundColor: Colors.primary,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, ...Brutalist, borderColor: Colors.secondary,
  },
  cartBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cartCountBadge: { width: 24, height: 24, backgroundColor: 'rgba(26,18,0,0.2)', alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  cartCountTxt: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.primaryFg },
  cartBarTxt: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.primaryFg, letterSpacing: 1 },
  cartBarTotal: { fontFamily: 'DMSans_700Bold', fontSize: 18, color: Colors.primaryFg },
});
