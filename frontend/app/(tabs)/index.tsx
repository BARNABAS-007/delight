import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions, Platform, Modal,
  TouchableWithoutFeedback, Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { supabase } from '@/lib/supabase';

// ── Categories — Vijayawada-relevant ────────────────────────────────────────
const CATEGORIES = [
  { id: 'All',       label: 'All',        emoji: '🍽️',  image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&q=80' },
  { id: 'Biryani',   label: 'Biryani',    emoji: '🍚',  image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=200&q=80' },
  { id: 'Shawarma',  label: 'Shawarma',   emoji: '🌯',  image: 'https://images.unsplash.com/photo-1626804475297-41609ea0eb49?w=200&q=80' },
  { id: 'Chicken',   label: 'Chicken',    emoji: '🍗',  image: 'https://images.unsplash.com/photo-1606628610487-1934c9c22d86?w=200&q=80' },
  { id: 'Kebab',     label: 'Kebab',      emoji: '🍢',  image: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=200&q=80' },
  { id: 'Dosa',      label: 'Dosa',       emoji: '🥞',  image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=200&q=80' },
  { id: 'Meals',     label: 'Meals',      emoji: '🍱',  image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=200&q=80' },
  { id: 'Thali',     label: 'Thali',      emoji: '🥘',  image: 'https://images.unsplash.com/photo-1631515242808-497c3fbd3972?w=200&q=80' },
  { id: 'Pizza',     label: 'Pizza',      emoji: '🍕',  image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&q=80' },
  { id: 'Burgers',   label: 'Burgers',    emoji: '🍔',  image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&q=80' },
  { id: 'Shakes',    label: 'Shakes',     emoji: '🥤',  image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=200&q=80' },
  { id: 'Sweets',    label: 'Sweets',     emoji: '🍮',  image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=200&q=80' },
  { id: 'Ice Cream', label: 'Ice Cream',  emoji: '🍦',  image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=200&q=80' },
];

const QUICK_FILTERS = ['Near & Fast', 'Under ₹200', 'Top Rated', 'Pure Veg', 'Open Now'];

const { width } = Dimensions.get('window');

export default function Home() {
  const [cuisine, setCuisine] = useState('All');
  const [locationName, setLocationName] = useState('Vijayawada');
  const [locationLabel, setLocationLabel] = useState('Home');
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<{ id: string; label: string; address: string }[]>([]);
  const [gpsLoading, setGpsLoading] = useState(false);
  const { user } = useAuth();
  const { itemCount } = useCart();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  // Load saved addresses when modal opens
  const loadSavedAddresses = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('users')
        .select('saved_addresses')
        .eq('user_id', user.user_id)
        .single();
      setSavedAddresses(data?.saved_addresses || []);
    } catch (_) {}
  };

  const handleOpenLocationPicker = () => {
    loadSavedAddresses();
    setLocationModalVisible(true);
  };

  const handleSelectAddress = (label: string, address: string) => {
    setLocationLabel(label);
    // Use the city/area part of the address for the subtitle
    const parts = address.split(',');
    setLocationName(parts[parts.length - 1]?.trim() || address);
    setLocationModalVisible(false);
  };

  const handleUseCurrentLocation = async () => {
    setGpsLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsLoading(false);
        return;
      }
      let loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });

      const { latitude, longitude } = loc.coords;

      // Try Nominatim reverse geocode
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'FIRSTMEAL-App/1.0',
              'Accept-Language': 'en',
            },
          },
        );

        if (response.ok) {
          const data = await response.json();
          const a = data.address || {};
          const locName = a.neighbourhood || a.suburb || a.quarter || a.city || a.town || a.village || 'My Location';
          setLocationLabel('Current');
          setLocationName(locName);
          setGpsLoading(false);
          setLocationModalVisible(false);
          return;
        }
      } catch (err) {
        console.warn('Nominatim failed in home screen, trying fallback:', err);
      }

      // Fallback to Expo reverseGeocodeAsync
      let geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geocode.length > 0) {
        setLocationLabel('Current');
        setLocationName(geocode[0].city || geocode[0].region || 'My Location');
      }
    } catch (_) {}
    setGpsLoading(false);
    setLocationModalVisible(false);
  };

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const fetchRestaurants = async (c: string, p: number = 1) => {
    const params: any = { page: p, pageSize: PAGE_SIZE };
    if (c !== 'All') params.cuisine = c;
    return await api.getRestaurants(params);
  };

  const { data: restaurants = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['restaurants', cuisine, page],
    queryFn: () => fetchRestaurants(cuisine, page),
    staleTime: 60_000,
  });

  const loadMore = async () => {
    const nextPage = page + 1;
    const more = await fetchRestaurants(cuisine, nextPage);
    if (more && more.length > 0) {
      setPage(nextPage);
    }
  };

  // Prefetch the most popular category
  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ['restaurants', 'Biryani'],
      queryFn: () => fetchRestaurants('Biryani'),
    });
  }, [queryClient]);

  // Get first letter of user's name/email for avatar
  const avatarLetter = (user?.email?.[0] ?? 'G').toUpperCase();

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity style={s.locationWrapper} activeOpacity={0.7} onPress={handleOpenLocationPicker}>
            <Ionicons name="location" size={18} color={Colors.primary} />
            <View>
              <View style={s.locationTitleRow}>
                <Text style={s.locationTitle}>{locationLabel}</Text>
                <Ionicons name="chevron-down" size={14} color={Colors.primary} />
              </View>
              <Text style={s.locationText} numberOfLines={1}>{locationName}</Text>
            </View>
          </TouchableOpacity>
          <View style={s.headerRight}>
            <TouchableOpacity testID="header-cart-btn" style={s.iconBtn} onPress={() => router.push('/(tabs)/cart')}>
              <Ionicons name="bag-outline" size={24} color={Colors.textPrimary} />
              {itemCount > 0 && (
                <View style={s.cartBadge}>
                  <Text style={s.cartBadgeTxt}>{itemCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity testID="header-profile-btn" style={s.iconBtn} onPress={() => router.push('/(tabs)/profile')}>
              <View style={s.profileAvatar}>
                <Text style={s.profileAvatarTxt}>{avatarLetter}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Search ── */}
        <TouchableOpacity testID="search-bar" style={s.searchBar} onPress={() => router.push('/(tabs)/search')} activeOpacity={0.8}>
          <Ionicons name="search" size={18} color={Colors.textSecondary} />
          <Text style={s.searchPH}>Search "manchurian" or a restaurant…</Text>
          <Ionicons name="mic-outline" size={18} color={Colors.primary} />
        </TouchableOpacity>

        {/* ── Brand Promise Strip ── */}
        <View style={s.promiseStrip}>
          <PromisePill icon="checkmark-circle-outline" text="Honest Pricing" />
          <View style={s.stripDivider} />
          <PromisePill icon="ban-outline" text="No Gimmicks" />
          <View style={s.stripDivider} />
          <PromisePill icon="restaurant-outline" text="Real Food" />
        </View>

        {/* ── Category Bubbles ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.filtersScroll}
          contentContainerStyle={s.filtersContent}
        >
          {CATEGORIES.map(c => (
            <TouchableOpacity
              key={c.id}
              testID={`cuisine-filter-${c.id}`}
              style={s.bubbleContainer}
              onPress={() => setCuisine(c.id)}
              activeOpacity={0.8}
            >
              <View style={[s.bubble, cuisine === c.id && s.bubbleActive]}>
                <Image source={{ uri: c.image }} style={s.bubbleImage} contentFit="cover" />
              </View>
              <Text style={[s.bubbleLabel, cuisine === c.id && s.bubbleLabelActive]}>
                {c.label}
              </Text>
              {cuisine === c.id && <View style={s.activeIndicator} />}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Quick Filter Pills ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.quickFiltersScroll}
          contentContainerStyle={s.quickFiltersContent}
        >
          {QUICK_FILTERS.map(f => (
            <TouchableOpacity key={f} style={s.quickFilterPill} activeOpacity={0.7}>
              <Text style={s.quickFilterTxt}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Section Header ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>
            {cuisine === 'All' ? 'All Restaurants' : cuisine}
          </Text>
          {!loading && (
            <Text style={s.sectionCount}>
              {restaurants.length} {restaurants.length === 1 ? 'place' : 'places'}
            </Text>
          )}
        </View>

        {/* ── Restaurant List ── */}
        <View style={s.listContainer}>
          {loading ? (
            <>
              <SkeletonLoader type="restaurantCard" />
              <SkeletonLoader type="restaurantCard" />
              <SkeletonLoader type="restaurantCard" />
            </>
          ) : restaurants.length === 0 ? (
            <View style={s.emptyState}>
              <Text style={s.emptyEmoji}>🍽️</Text>
              <Text style={s.emptyTitle}>No restaurants found</Text>
              <Text style={s.emptySubtitle}>
                No {cuisine === 'All' ? '' : cuisine + ' '}restaurants in your area yet.
              </Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => setCuisine('All')} activeOpacity={0.8}>
                <Text style={s.emptyBtnTxt}>Show All</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {restaurants.map(r => (
                <RestaurantCard
                  key={r.id}
                  restaurant={r}
                  onPress={() => router.push(`/restaurant/${r.id}`)}
                />
              ))}
              {/* Load More button */}
              <TouchableOpacity style={s.loadMoreBtn} onPress={loadMore} activeOpacity={0.8}>
                <Text style={s.loadMoreTxt}>Load More</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Location Picker Modal ── */}
      <Modal
        visible={locationModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setLocationModalVisible(false)}>
          <View style={s.modalOverlay} />
        </TouchableWithoutFeedback>

        <View style={[s.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
          {/* Handle */}
          <View style={s.modalHandle} />

          {/* Title */}
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Deliver to</Text>
            <TouchableOpacity onPress={() => setLocationModalVisible(false)} style={s.modalClose}>
              <Ionicons name="close" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Use Current Location */}
          <TouchableOpacity
            style={s.gpsRow}
            onPress={handleUseCurrentLocation}
            activeOpacity={0.8}
            disabled={gpsLoading}
          >
            <View style={s.gpsIconWrap}>
              {gpsLoading
                ? <ActivityIndicator size="small" color={Colors.primary} />
                : <Ionicons name="navigate" size={20} color={Colors.primary} />
              }
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.gpsTitle}>Use Current Location</Text>
              <Text style={s.gpsSub}>We'll detect your position via GPS</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>

          {/* Divider */}
          {savedAddresses.length > 0 && (
            <View style={s.modalDividerRow}>
              <View style={s.modalDividerLine} />
              <Text style={s.modalDividerTxt}>SAVED ADDRESSES</Text>
              <View style={s.modalDividerLine} />
            </View>
          )}

          {/* Saved Addresses List */}
          <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
            {savedAddresses.map(addr => (
              <TouchableOpacity
                key={addr.id}
                style={s.addrRow}
                onPress={() => handleSelectAddress(addr.label, addr.address)}
                activeOpacity={0.8}
              >
                <View style={s.addrIconWrap}>
                  <Ionicons
                    name={addr.label === 'Home' ? 'home' : addr.label === 'Work' ? 'briefcase' : 'location'}
                    size={18}
                    color={Colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.addrRowLabel}>{addr.label}</Text>
                  <Text style={s.addrRowText} numberOfLines={1}>{addr.address}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            ))}

            {savedAddresses.length === 0 && (
              <View style={s.noAddrWrap}>
                <Ionicons name="bookmark-outline" size={32} color={Colors.border} />
                <Text style={s.noAddrTxt}>No saved addresses yet</Text>
                <TouchableOpacity
                  onPress={() => { setLocationModalVisible(false); router.push('/(tabs)/addresses'); }}
                  style={s.addAddrBtn}
                >
                  <Text style={s.addAddrBtnTxt}>+ Add Address</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ── Brand Promise Pill ────────────────────────────────────────────────────────
function PromisePill({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={s.promisePill}>
      <Ionicons name={icon as any} size={14} color={Colors.primary} />
      <Text style={s.promiseTxt}>{text}</Text>
    </View>
  );
}

// ── Full-Width Restaurant Card ─────────────────────────────────────────────────
function RestaurantCard({ restaurant: r, onPress }: any) {
  const HONEST_QUOTES = [
    'HONEST PRICING',
    'REAL FOOD',
    'NO GIMMICKS',
    '0 HIDDEN FEES',
    'WHAT YOU SEE = WHAT YOU PAY',
  ];
  const quote = HONEST_QUOTES[(r.name?.length ?? 0) % HONEST_QUOTES.length];

  return (
    <TouchableOpacity
      testID={`restaurant-card-${r.id}`}
      style={s.card}
      onPress={onPress}
      activeOpacity={0.92}
    >
      {/* Image */}
      <View style={s.cardImgContainer}>
        {r.image ? (
          <Image
            source={{ uri: r.image }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            transition={300}
          />
        ) : (
          <View style={s.imagePlaceholder}>
            <Ionicons name="restaurant-outline" size={40} color={Colors.border} />
          </View>
        )}

        {/* Honest badge */}
        <View style={s.honestBadge}>
          <Text style={s.honestBadgeTxt}>{quote}</Text>
        </View>

        {/* Closed overlay */}
        {r.is_open === false && (
          <View style={s.closedOverlay}>
            <Text style={s.closedTxt}>CLOSED</Text>
          </View>
        )}
      </View>

      {/* Body */}
      <View style={s.cardBody}>
        <View style={s.cardBodyRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.cardName} numberOfLines={1}>{r.name}</Text>
            <Text style={s.cardCuisine} numberOfLines={1}>
              {Array.isArray(r.cuisine) ? r.cuisine.join(' · ') : r.cuisine}
            </Text>
          </View>
          <View style={s.ratingPill}>
            <Ionicons name="star" size={10} color="#FFF" />
            <Text style={s.ratingTxt}>{r.rating ?? '4.3'}</Text>
          </View>
        </View>

        <View style={s.cardFooter}>
          <View style={s.metaChip}>
            <Ionicons name="time-outline" size={12} color={Colors.textSecondary} />
            <Text style={s.metaTxt}>{r.delivery_time ?? '25–35 min'}</Text>
          </View>
          <View style={s.metaChip}>
            <Ionicons name="bicycle-outline" size={12} color={Colors.textSecondary} />
            <Text style={s.metaTxt}>₹{r.delivery_fee ?? '30'} delivery</Text>
          </View>
          {r.min_order && (
            <View style={s.metaChip}>
              <Ionicons name="pricetag-outline" size={12} color={Colors.textSecondary} />
              <Text style={s.metaTxt}>Min ₹{r.min_order}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: Colors.background },

  // Header
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.screen, paddingVertical: 14 },
  locationWrapper: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  locationTitleRow:{ flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationTitle:   { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.textPrimary },
  locationText:    { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 1, maxWidth: width * 0.4 },
  headerRight:     { flexDirection: 'row', alignItems: 'center', gap: 14 },

  // Location Modal
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet:      { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 12, maxHeight: '75%' },
  modalHandle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 16 },
  modalHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle:      { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20, color: Colors.textPrimary },
  modalClose:      { padding: 4 },
  // GPS row
  gpsRow:          { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderWidth: 1, borderColor: Colors.primary + '44', borderRadius: Radius.sm, paddingHorizontal: 14, marginBottom: 4, backgroundColor: Colors.primary + '08' },
  gpsIconWrap:     { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  gpsTitle:        { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.textPrimary },
  gpsSub:          { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  // Divider
  modalDividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 },
  modalDividerLine:{ flex: 1, height: 1, backgroundColor: Colors.border },
  modalDividerTxt: { fontFamily: 'DMSans_700Bold', fontSize: 10, color: Colors.textSecondary, letterSpacing: 1 },
  // Address rows
  addrRow:         { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  addrIconWrap:    { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  addrRowLabel:    { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.textPrimary },
  addrRowText:     { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  // Empty state
  noAddrWrap:      { alignItems: 'center', paddingVertical: 32 },
  noAddrTxt:       { fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textSecondary, marginTop: 10, marginBottom: 16 },
  addAddrBtn:      { paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1, borderColor: Colors.primary, borderRadius: Radius.full },
  addAddrBtnTxt:   { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.primary },
  iconBtn:         { position: 'relative', alignItems: 'center', justifyContent: 'center', padding: 4 },
  cartBadge:       { position: 'absolute', top: 0, right: 0, backgroundColor: Colors.error, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  cartBadgeTxt:    { fontFamily: 'DMSans_700Bold', fontSize: 9, color: '#FFF' },
  profileAvatar:   { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary + '22', borderWidth: 1.5, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  profileAvatarTxt:{ fontFamily: 'DMSans_700Bold', color: Colors.primary, fontSize: 14 },

  // Search
  searchBar:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: Spacing.screen, height: 48, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 14, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  searchPH:        { fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textSecondary, flex: 1 },

  // Brand Promise Strip
  promiseStrip:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: Spacing.screen, marginBottom: 20, paddingVertical: 10, paddingHorizontal: 16, backgroundColor: Colors.primary + '0D', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.primary + '22' },
  promisePill:     { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center' },
  promiseTxt:      { fontFamily: 'DMSans_700Bold', fontSize: 11, color: Colors.primary, letterSpacing: 0.3 },
  stripDivider:    { width: 1, height: 16, backgroundColor: Colors.primary + '33' },

  // Category bubbles
  filtersScroll:   { marginBottom: 20 },
  filtersContent:  { paddingHorizontal: Spacing.screen, gap: 14 },
  bubbleContainer: { alignItems: 'center', width: 68 },
  bubble:          { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3 },
  bubbleActive:    { borderWidth: 2.5, borderColor: Colors.primary },
  bubbleImage:     { width: '100%', height: '100%' },
  bubbleLabel:     { fontFamily: 'DMSans_500Medium', fontSize: 11, color: Colors.textSecondary, marginTop: 6, textAlign: 'center' },
  bubbleLabelActive: { fontFamily: 'DMSans_700Bold', color: Colors.primary },
  activeIndicator: { width: 16, height: 2.5, backgroundColor: Colors.primary, marginTop: 3, borderRadius: 2 },

  // Quick filters
  quickFiltersScroll:   { marginBottom: 20, marginTop: -4 },
  quickFiltersContent:  { paddingHorizontal: Spacing.screen, gap: 10 },
  quickFilterPill:      { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  quickFilterTxt:       { fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.textPrimary },

  // Section header
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: Spacing.screen, marginBottom: 14 },
  sectionTitle:  { fontFamily: 'DMSans_700Bold', fontSize: 18, color: Colors.textPrimary },
  sectionCount:  { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary },

  // List container — single column
  listContainer:   { paddingHorizontal: Spacing.screen },

  // Full-width card
  card:              { backgroundColor: Colors.surface, borderRadius: Radius.lg, overflow: 'hidden', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 },
  cardImgContainer:  { width: '100%', height: 180, backgroundColor: Colors.surfaceLight, position: 'relative' },
  imagePlaceholder:  { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceLight },
  honestBadge:       { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(15,23,42,0.82)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: Radius.sm },
  honestBadgeTxt:    { fontFamily: 'DMSans_700Bold', fontSize: 9, color: '#FFF', letterSpacing: 1.2 },
  closedOverlay:     { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.72)', alignItems: 'center', justifyContent: 'center' },
  closedTxt:         { fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.error, letterSpacing: 3 },

  cardBody:        { padding: 14 },
  cardBodyRow:     { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  cardName:        { fontFamily: 'DMSans_700Bold', fontSize: 17, color: Colors.textPrimary, marginBottom: 2 },
  cardCuisine:     { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary },
  ratingPill:      { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.success, paddingHorizontal: 7, paddingVertical: 3, borderRadius: Radius.sm, marginLeft: 8 },
  ratingTxt:       { fontFamily: 'DMSans_700Bold', fontSize: 11, color: '#FFF' },
  cardFooter:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaChip:        { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTxt:         { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary },

  // Empty state
  emptyState:    { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyEmoji:    { fontSize: 48, marginBottom: 16 },
  emptyTitle:    { fontFamily: 'DMSans_700Bold', fontSize: 18, color: Colors.textPrimary, marginBottom: 8 },
  emptySubtitle: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyBtn:      { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: Colors.primary, borderRadius: Radius.full },
  emptyBtnTxt:   { fontFamily: 'DMSans_700Bold', fontSize: 14, color: '#FFF' },
  loadMoreBtn: { backgroundColor: Colors.primary, paddingVertical: 12, borderRadius: Radius.md, alignItems: 'center', marginTop: 16 },
  loadMoreTxt: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: '#FFF' },
});
