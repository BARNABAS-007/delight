import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius } from '@/constants/theme';
import { useCart } from '@/context/CartContext';
import { useRouter } from 'expo-router';

// ── Tab definitions ───────────────────────────────────────────────────────────
const TABS = [
  { name: 'index',   route: '/(tabs)',          icon: 'home-outline',      iconActive: 'home',          label: 'Home'    },
  { name: 'search',  route: '/(tabs)/search',   icon: 'search-outline',    iconActive: 'search',        label: 'Search'  },
  { name: 'orders',  route: '/(tabs)/orders',   icon: 'receipt-outline',   iconActive: 'receipt',       label: 'Orders'  },
  { name: 'profile', route: '/(tabs)/profile',  icon: 'person-outline',    iconActive: 'person',        label: 'Profile' },
];

// ── Custom bottom tab bar ─────────────────────────────────────────────────────
function CustomTabBar({ state, navigation }: any) {
  const { itemCount, grandTotal } = useCart();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const bottomPad = Math.max(insets.bottom, 8);

  return (
    <View style={[s.barOuter, { paddingBottom: bottomPad }]} pointerEvents="box-none">

      {/* ── Floating Cart Widget (shown only when cart has items) ── */}
      {itemCount > 0 && (
        <TouchableOpacity
          testID="floating-cart-btn"
          style={s.floatingCart}
          activeOpacity={0.9}
          onPress={() => router.push('/(tabs)/cart')}
        >
          <View style={s.cartLeft}>
            <View style={s.cartBadge}>
              <Text style={s.cartBadgeTxt}>{itemCount}</Text>
            </View>
            <Text style={s.floatingCartTxt}>View Cart</Text>
          </View>
          <View style={s.cartRight}>
            <Text style={s.cartTotal}>₹{(grandTotal ?? 0).toFixed(0)}</Text>
            <View style={s.cartArrow}>
              <Ionicons name="arrow-forward" size={16} color={Colors.error} />
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* ── Pill Tab Bar ── */}
      <View style={s.pillBar}>
        {TABS.map((tab, i) => {
          const focused = state.index === i;
          return (
            <TouchableOpacity
              key={tab.name}
              testID={`tab-${tab.name}`}
              style={[s.tabItem, focused && s.tabItemActive]}
              onPress={() => navigation.navigate(tab.name)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={(focused ? tab.iconActive : tab.icon) as any}
                size={20}
                color={focused ? Colors.primary : Colors.textSecondary}
              />
              {focused && (
                <Text style={s.tabLabel}>{tab.label}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: Colors.background } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="orders" />
      <Tabs.Screen name="profile" />
      {/* Hidden from tab bar but still accessible via router */}
      <Tabs.Screen name="cart" options={{ href: null }} />
      <Tabs.Screen name="addresses" options={{ href: null }} />
    </Tabs>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  barOuter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    // Transparent so home content shows through
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    gap: 10,
    // Prevent the outer wrapper from blocking touches in its transparent area
    ...(Platform.OS === 'web' ? {} : {}),
  },

  // Floating cart
  floatingCart: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: Colors.textPrimary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: Radius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 10,
  },
  cartLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cartBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.error,
    alignItems: 'center', justifyContent: 'center',
  },
  cartBadgeTxt: { fontFamily: 'DMSans_700Bold', fontSize: 12, color: '#FFF' },
  floatingCartTxt: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: '#FFF', letterSpacing: 0.3 },
  cartRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cartTotal: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: 'rgba(255,255,255,0.85)' },
  cartArrow: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
  },

  // Pill bar
  pillBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.full,
    padding: 6,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: Radius.full,
  },
  tabItemActive: {
    backgroundColor: Colors.primary + '15', // 15% opacity tint
  },
  tabLabel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 13,
    color: Colors.primary,
  },
});
