import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Image, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Colors, Spacing } from '@/constants/theme';

export default function Profile() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    api.getCart().then((cart: any) => {
      setCartCount(cart?.items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0);
    }).catch(() => {});
  }, []);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/login'); } },
    ]);
  };

  const MENU_ITEMS = [
    { icon: 'receipt-outline', label: 'Order History', onPress: () => router.push('/(tabs)/orders') },
    { icon: 'chatbubble-outline', label: 'AI Support Chat', onPress: () => router.push('/chat') },
    { icon: 'card-outline', label: 'Payment Methods', onPress: () => {} },
    { icon: 'location-outline', label: 'Saved Addresses', onPress: () => {} },
    { icon: 'heart-outline', label: 'Favourites', onPress: () => {} },
    { icon: 'settings-outline', label: 'Settings', onPress: () => {} },
  ];

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.brand}>DELIGHT</Text>
        </View>

        {/* User Card */}
        <View testID="user-profile-card" style={s.userCard}>
          <View style={s.avatar}>
            {user?.picture ? (
              <Image source={{ uri: user.picture }} style={s.avatarImg} />
            ) : (
              <Text style={s.avatarTxt}>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</Text>
            )}
          </View>
          <View style={s.userInfo}>
            <Text style={s.userName}>{user?.name || 'User'}</Text>
            <Text style={s.userEmail}>{user?.email}</Text>
            {user?.role === 'admin' && (
              <View style={s.adminBadge}><Text style={s.adminBadgeTxt}>ADMIN</Text></View>
            )}
          </View>
        </View>

        {/* Admin Panel */}
        {user?.role === 'admin' && (
          <TouchableOpacity testID="admin-panel-btn" style={s.adminCard} onPress={() => router.push('/admin/index')}>
            <View style={s.adminCardLeft}>
              <Ionicons name="shield-checkmark-outline" size={24} color={Colors.primary} />
              <Text style={s.adminCardTxt}>Admin Panel</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Menu */}
        <View style={s.menuSection}>
          {MENU_ITEMS.map((item, i) => (
            <TouchableOpacity testID={`profile-menu-${i}`} key={item.label} style={s.menuItem} onPress={item.onPress}>
              <View style={s.menuLeft}>
                <Ionicons name={item.icon as any} size={20} color={Colors.textSecondary} />
                <Text style={s.menuLabel}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.border} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity testID="logout-btn" style={s.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={s.logoutTxt}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={s.version}>Delight v1.0 · Premium Food Delivery</Text>
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.screen, paddingTop: 8, paddingBottom: 8 },
  brand: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 24, color: Colors.primary, letterSpacing: 4 },
  userCard: { flexDirection: 'row', alignItems: 'center', margin: Spacing.screen, padding: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  avatar: { width: 64, height: 64, backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginRight: 16, overflow: 'hidden' },
  avatarImg: { width: 64, height: 64, resizeMode: 'cover' },
  avatarTxt: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 28, color: Colors.primary },
  userInfo: { flex: 1 },
  userName: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20, color: Colors.textPrimary },
  userEmail: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  adminBadge: { marginTop: 6, alignSelf: 'flex-start', backgroundColor: Colors.primary, paddingHorizontal: 8, paddingVertical: 2 },
  adminBadgeTxt: { fontFamily: 'DMSans_700Bold', fontSize: 10, color: Colors.primaryFg, letterSpacing: 1 },
  adminCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: Spacing.screen, marginBottom: 8, padding: 16, backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.primary },
  adminCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  adminCardTxt: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.primary },
  menuSection: { marginHorizontal: Spacing.screen, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, marginBottom: 16 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  menuLabel: { fontFamily: 'DMSans_500Medium', fontSize: 16, color: Colors.textPrimary },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: Spacing.screen, padding: 16 },
  logoutTxt: { fontFamily: 'DMSans_500Medium', fontSize: 16, color: Colors.error },
  version: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary, textAlign: 'center', marginTop: 8 },
});
