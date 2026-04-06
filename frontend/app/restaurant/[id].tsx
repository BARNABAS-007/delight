import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Image, TouchableOpacity,
  ActivityIndicator, Alert, Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/services/api';
import { Colors, Spacing } from '@/constants/theme';

export default function RestaurantDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState(0);
  const [cart, setCart] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Promise.all([
      api.getRestaurant(id as string),
      api.getCart(),
    ]).then(([rest, cartData]: any) => {
      setRestaurant(rest);
      setCart(cartData);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const cartCount = cart?.items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0;
  const cartTotal = cart?.items?.reduce((s: number, i: any) => s + i.price * i.quantity, 0) || 0;

  const addItem = async (item: any) => {
    if (cart?.restaurant_id && cart.restaurant_id !== id && cart?.items?.length > 0) {
      Alert.alert('New Restaurant', 'Your cart has items from another restaurant. Clear it to add new items?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear & Add', onPress: async () => { await api.clearCart(); await doAdd(item); } },
      ]);
      return;
    }
    await doAdd(item);
  };

  const doAdd = async (item: any) => {
    setAdding(item.id);
    try {
      const updated: any = await api.addToCart({
        restaurant_id: id, restaurant_name: restaurant.name, restaurant_image: restaurant.image,
        item_id: item.id, name: item.name, price: item.price, quantity: 1, image: item.image,
      });
      setCart(updated);
    } catch (e: any) { Alert.alert('Error', e?.detail || 'Failed to add item'); }
    finally { setAdding(null); }
  };

  const heroOpacity = scrollY.interpolate({ inputRange: [0, 200], outputRange: [1, 0], extrapolate: 'clamp' });

  if (loading) return <View style={s.loader}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  if (!restaurant) return <View style={s.loader}><Text style={s.errTxt}>Restaurant not found</Text></View>;

  const cats = restaurant.menu_categories || [];

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Back + Cart Header */}
      <View style={s.topBar}>
        <TouchableOpacity testID="back-btn" style={s.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity testID="cart-btn" style={s.cartBtn} onPress={() => router.push('/(tabs)/cart')}>
          <Ionicons name="bag-outline" size={22} color={Colors.primary} />
          {cartCount > 0 && <View style={s.badge}><Text style={s.badgeTxt}>{cartCount}</Text></View>}
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        {/* Hero Image */}
        <Animated.View style={[s.heroWrap, { opacity: heroOpacity }]}>
          <Image source={{ uri: restaurant.cover_image || restaurant.image }} style={s.hero} />
          <LinearGradient colors={['transparent', 'rgba(5,5,5,0.9)']} style={s.heroGrad}>
            <Text style={s.heroName}>{restaurant.name}</Text>
            <Text style={s.heroCuisine}>{restaurant.cuisine?.join(' · ')}</Text>
          </LinearGradient>
        </Animated.View>

        {/* Restaurant Info */}
        <View style={s.infoCard}>
          <View style={s.infoRow}>
            <View style={s.infoItem}><Ionicons name="star" size={14} color="#FFD700" /><Text style={s.infoTxt}> {restaurant.rating} ({restaurant.review_count})</Text></View>
            <View style={s.infoItem}><Ionicons name="time-outline" size={14} color={Colors.textSecondary} /><Text style={s.infoTxt}> {restaurant.delivery_time}</Text></View>
            <View style={s.infoItem}><Ionicons name="bicycle-outline" size={14} color={Colors.textSecondary} /><Text style={s.infoTxt}> ${restaurant.delivery_fee}</Text></View>
            <View style={s.infoItem}><Text style={s.infoTxt}>{restaurant.price_range}</Text></View>
          </View>
          <Text style={s.desc}>{restaurant.description}</Text>
        </View>

        {/* Category Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll} contentContainerStyle={s.catContent}>
          {cats.map((cat: any, i: number) => (
            <TouchableOpacity key={cat.id} testID={`category-${cat.id}`}
              style={[s.catChip, activeCategory === i && s.catChipActive]}
              onPress={() => setActiveCategory(i)}>
              <Text style={[s.catTxt, activeCategory === i && s.catTxtActive]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Menu Items */}
        {cats.map((cat: any, ci: number) => (
          ci === activeCategory && cat.items.map((item: any) => (
            <View key={item.id} testID={`menu-item-${item.id}`} style={s.menuItem}>
              <Image source={{ uri: item.image }} style={s.menuImg} />
              <View style={s.menuInfo}>
                <View style={s.menuTop}>
                  <Text style={s.menuName}>{item.name}</Text>
                  {item.is_popular && <View style={s.popularBadge}><Text style={s.popularTxt}>POPULAR</Text></View>}
                </View>
                <Text style={s.menuDesc} numberOfLines={2}>{item.description}</Text>
                <View style={s.menuBottom}>
                  <Text style={s.menuPrice}>${item.price.toFixed(2)}</Text>
                  {item.is_available ? (
                    <TouchableOpacity testID={`add-item-${item.id}`}
                      style={s.addBtn} onPress={() => addItem(item)}
                      disabled={adding === item.id}>
                      {adding === item.id ? (
                        <ActivityIndicator size="small" color={Colors.primaryFg} />
                      ) : (
                        <Ionicons name="add" size={20} color={Colors.primaryFg} />
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
      {cartCount > 0 && (
        <TouchableOpacity testID="view-cart-btn" style={[s.cartBar, { bottom: insets.bottom + 8 }]}
          onPress={() => router.push('/(tabs)/cart')}>
          <View style={s.cartBarLeft}>
            <View style={s.cartCountBadge}><Text style={s.cartCountTxt}>{cartCount}</Text></View>
            <Text style={s.cartBarTxt}>VIEW CART</Text>
          </View>
          <Text style={s.cartBarTotal}>${cartTotal.toFixed(2)}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  errTxt: { fontFamily: 'DMSans_400Regular', color: Colors.textSecondary, fontSize: 16 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', zIndex: 10, padding: Spacing.screen, paddingTop: 16 },
  iconBtn: { width: 44, height: 44, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  cartBtn: { width: 44, height: 44, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  badge: { position: 'absolute', top: -4, right: -4, width: 18, height: 18, backgroundColor: Colors.primary, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  badgeTxt: { fontFamily: 'DMSans_700Bold', fontSize: 10, color: Colors.primaryFg },
  heroWrap: { height: 280, overflow: 'hidden' },
  hero: { width: '100%', height: '100%', resizeMode: 'cover' },
  heroGrad: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: 20, paddingBottom: 24 },
  heroName: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 28, color: Colors.primary },
  heroCuisine: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  infoCard: { padding: Spacing.screen, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 12 },
  infoItem: { flexDirection: 'row', alignItems: 'center' },
  infoTxt: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary },
  desc: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  catScroll: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  catContent: { paddingHorizontal: Spacing.screen, gap: 8, paddingVertical: 12 },
  catChip: { paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border, borderRadius: 100 },
  catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catTxt: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.textSecondary },
  catTxtActive: { color: Colors.primaryFg },
  menuItem: { flexDirection: 'row', padding: Spacing.screen, borderBottomWidth: 1, borderBottomColor: Colors.border },
  menuImg: { width: 90, height: 90, resizeMode: 'cover', marginRight: 14 },
  menuInfo: { flex: 1, justifyContent: 'space-between' },
  menuTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  menuName: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.textPrimary, flex: 1, paddingRight: 8 },
  popularBadge: { backgroundColor: '#1A1A00', paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#333300' },
  popularTxt: { fontFamily: 'DMSans_700Bold', fontSize: 9, color: '#FFD700', letterSpacing: 0.5 },
  menuDesc: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary, lineHeight: 17, marginBottom: 8 },
  menuBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  menuPrice: { fontFamily: 'DMSans_700Bold', fontSize: 17, color: Colors.textPrimary },
  addBtn: { width: 36, height: 36, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  unavailable: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary },
  cartBar: { position: 'absolute', left: Spacing.screen, right: Spacing.screen, height: 56, backgroundColor: Colors.primary, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  cartBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cartCountBadge: { width: 24, height: 24, backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  cartCountTxt: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.primaryFg },
  cartBarTxt: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.primaryFg, letterSpacing: 1 },
  cartBarTotal: { fontFamily: 'DMSans_700Bold', fontSize: 18, color: Colors.primaryFg },
});
