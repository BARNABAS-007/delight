import { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Animated, Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/services/api';
import { useCart } from '@/context/CartContext';
import SpeedStreak from '@/components/SpeedStreak';
import { Colors, Spacing, Radius } from '@/constants/theme';

export default function RestaurantDetail() {
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: string }>();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState(0);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [reserveSuccess, setReserveSuccess] = useState(false);

  const { addToCart, itemCount, grandTotal, streakVisible } = useCart();
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

  const cartTotal = grandTotal ?? 0;

  const handleAddItem = (item: any) => {
    setAdding(item.id);
    addToCart(
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
  const heroScale = scrollY.interpolate({ inputRange: [-200, 0], outputRange: [1.5, 1], extrapolate: 'clamp' });

  if (loading) return <View style={s.loader}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  if (!restaurant) return <View style={s.loader}><Text style={s.errTxt}>Restaurant not found</Text></View>;

  const cats = restaurant.menu_categories || [];

  return (
    <View style={s.container}>
      <SpeedStreak visible={streakVisible} />

      {/* Back + Cart Header */}
      <View style={[s.topBar, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity testID="back-btn" style={s.iconBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color={Colors.primaryFg} />
        </TouchableOpacity>
        <TouchableOpacity testID="cart-btn" style={s.cartBtn} onPress={() => router.push('/(tabs)/cart')} activeOpacity={0.8}>
          <Ionicons name="bag-outline" size={22} color={Colors.primaryFg} />
          {itemCount > 0 && <View style={s.badge}><Text style={s.badgeTxt}>{itemCount}</Text></View>}
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Hero */}
        <Animated.View style={[s.heroWrap, { transform: [{ scale: heroScale }] }]}>
          {restaurant.image ? (
            <Image source={{ uri: restaurant.image }} style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.surface }]} />
          )}
          <LinearGradient colors={['transparent', 'rgba(5,5,5,0.9)', Colors.background]} style={StyleSheet.absoluteFill} />
          <Animated.View style={[s.heroContent, { opacity: heroOpacity }]}>
            <Text style={s.heroName}>{restaurant.name}</Text>
            <Text style={s.heroCuisine}>{restaurant.cuisine?.join(' · ')}</Text>
          </Animated.View>
        </Animated.View>

        {restaurant.is_open === false && (
          <View style={s.closedBanner}>
            <Ionicons name="alert-circle" size={16} color="#FFF" />
            <Text style={s.closedBannerTxt}>CURRENTLY CLOSED — NOT ACCEPTING ORDERS</Text>
          </View>
        )}

        {/* Info Card */}
        <View style={s.infoCard}>
          <View style={s.infoRow}>
            <InfoPill icon="star" text={`${restaurant.rating ?? '4.5'}`} />
            <InfoPill icon="time-outline" text={restaurant.delivery_time ?? '25 min'} />
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
                activeOpacity={0.8}
              >
                <Text style={[s.catTxt, activeCategory === i && s.catTxtActive]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Menu Items — render only the active category's items */}
        {!isDineout && (() => {
          const activeCat = cats[activeCategory];
          if (!activeCat) return null;
          return (activeCat.items ?? []).map((item: any) => (
            <View key={item.id} testID={`menu-item-${item.id}`} style={s.menuItem}>
              <View style={s.menuInfo}>
                <View style={s.menuTop}>
                  <View style={s.vegIcon}><View style={s.vegDot}/></View>
                  <View style={s.lovedBadge}>
                    <Ionicons name="heart" size={12} color="#EF4444" />
                    <Text style={s.lovedTxt}>loved by many</Text>
                  </View>
                </View>
                <Text style={s.menuName}>{item.name}</Text>
                {item.description && <Text style={s.menuDesc} numberOfLines={2}>{item.description}</Text>}
                <Text style={s.menuPrice}>₹{item.price.toFixed(2)}</Text>
              </View>

              <View style={s.menuImageCol}>
                <View style={s.menuImageWrapper}>
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={StyleSheet.absoluteFillObject} />
                  ) : (
                    <View style={{ flex: 1, backgroundColor: '#F4F6F0' }} />
                  )}
                </View>
                {item.is_available !== false && restaurant.is_open !== false ? (
                  <View style={s.addBtnWrapper}>
                    <TouchableOpacity
                      testID={`add-item-${item.id}`}
                      style={s.addBtnLight}
                      onPress={() => handleAddItem(item)}
                      disabled={adding === item.id}
                      activeOpacity={0.85}
                    >
                      {adding === item.id ? (
                        <ActivityIndicator size="small" color={Colors.accent} />
                      ) : (
                        <Text style={s.addBtnTxtLight}>Add</Text>
                      )}
                    </TouchableOpacity>
                    <Text style={s.addBtnSubTxt}>Options</Text>
                  </View>
                ) : (
                  <Text style={s.unavailable}>{restaurant.is_open === false ? 'Closed' : 'Unavailable'}</Text>
                )}
              </View>
            </View>
          ));
        })()}
      </Animated.ScrollView>

      {/* Bottom Cart Bar */}
      {itemCount > 0 && !isDineout && (
        <TouchableOpacity
          testID="view-cart-btn"
          style={[s.cartBar, { bottom: insets.bottom + 16 }]}
          onPress={() => router.push('/(tabs)/cart')}
          activeOpacity={0.9}
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
      <Ionicons name={icon as any} size={14} color={Colors.textSecondary} />
      <Text style={s.infoTxt}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  errTxt: { fontFamily: 'DMSans_400Regular', color: Colors.textSecondary, fontSize: 16 },

  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', zIndex: 10, paddingHorizontal: Spacing.screen },
  iconBtn: { width: 44, height: 44, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  cartBtn: { width: 44, height: 44, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  badge: { position: 'absolute', top: -2, right: -2, width: 20, height: 20, backgroundColor: Colors.primary, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  badgeTxt: { fontFamily: 'DMSans_700Bold', fontSize: 11, color: Colors.primaryFg },

  heroWrap: { height: 280, justifyContent: 'flex-end', backgroundColor: Colors.surface },
  heroContent: { padding: Spacing.screen, paddingBottom: 24, zIndex: 10 },
  heroName: { fontFamily: 'DMSans_700Bold', fontSize: 32, color: '#FFF' },
  heroCuisine: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 4, letterSpacing: 0.5 },

  infoCard: { paddingHorizontal: Spacing.screen, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.background },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  infoPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: Colors.surface, borderRadius: Radius.sm },
  infoTxt: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textPrimary },
  desc: { fontFamily: 'DMSans_400Regular', fontSize: 15, color: Colors.textSecondary, lineHeight: 22 },

  reserveCard: {
    margin: Spacing.screen, padding: 24,
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border,
  },
  reserveTitle: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 24, color: Colors.textPrimary, marginBottom: 8 },
  reserveNote: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textSecondary, marginBottom: 20 },
  reserveBtn: { height: 50, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.sm },
  reserveBtnSuccess: { backgroundColor: Colors.success },
  reserveBtnTxt: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.primaryFg, letterSpacing: 1 },

  catScroll: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  catContent: { paddingHorizontal: Spacing.screen, gap: 12, paddingVertical: 16 },
  catChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catTxt: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textPrimary },
  catTxtActive: { color: Colors.primaryFg, fontFamily: 'DMSans_700Bold' },

  menuItem: { flexDirection: 'row', padding: 16, marginBottom: 16, marginHorizontal: Spacing.screen, backgroundColor: Colors.surface, borderRadius: Radius.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  menuInfo: { flex: 1, paddingRight: 16 },
  menuTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  vegIcon: { width: 14, height: 14, borderWidth: 1, borderColor: Colors.accent, alignItems: 'center', justifyContent: 'center', borderRadius: 2 },
  vegDot: { width: 6, height: 6, backgroundColor: Colors.accent, borderRadius: 3 },
  lovedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF2F2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  lovedTxt: { fontFamily: 'DMSans_500Medium', fontSize: 10, color: '#EF4444' },
  menuName: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.textPrimary, marginBottom: 4 },
  menuDesc: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginBottom: 12 },
  menuPrice: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.textPrimary },
  
  menuImageCol: { width: 110, alignItems: 'center' },
  menuImageWrapper: { width: 110, height: 110, borderRadius: Radius.md, backgroundColor: '#F4F6F0', overflow: 'hidden', marginBottom: -16 },
  addBtnWrapper: { alignItems: 'center' },
  addBtnLight: { width: 80, height: 36, backgroundColor: '#FFF', borderWidth: 1, borderColor: Colors.accent, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  addBtnTxtLight: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.accent },
  addBtnSubTxt: { fontFamily: 'DMSans_400Regular', fontSize: 10, color: Colors.textSecondary, marginTop: 4 },
  unavailable: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textSecondary },

  cartBar: {
    position: 'absolute', left: Spacing.screen, right: Spacing.screen,
    height: 60, backgroundColor: Colors.primary,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, borderRadius: Radius.sm,
  },
  cartBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cartCountBadge: { width: 28, height: 28, backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  cartCountTxt: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.primaryFg },
  cartBarTxt: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.primaryFg, letterSpacing: 1 },
  cartBarTotal: { fontFamily: 'DMSans_700Bold', fontSize: 18, color: Colors.primaryFg },
  closedBanner: { backgroundColor: Colors.error, paddingVertical: 12, paddingHorizontal: Spacing.screen, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  closedBannerTxt: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: '#FFF', letterSpacing: 1 },
});
