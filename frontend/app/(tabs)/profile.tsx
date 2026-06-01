import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, Alert, TextInput, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { Colors, Spacing, Radius } from '@/constants/theme';

export default function Profile() {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const isAdmin = user?.role === 'admin' || user?.role === 'chef_admin';

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/(auth)/login');
    } catch (e: any) {
      Alert.alert('Logout Failed', e.message || 'Please try again.');
    }
  };

  const MENU_ITEMS = [
    { icon: 'receipt-outline', label: 'Order History', onPress: () => router.push('/(tabs)/orders') },
    { icon: 'location-outline', label: 'Saved Addresses', onPress: () => router.push('/(tabs)/addresses') },
    { icon: 'chatbubble-outline', label: 'AI Support Chat', onPress: () => router.push('/chat') },
  ];

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.brand}>firstmeal</Text>
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
            {isAdmin && (
              <View style={s.adminBadge}><Text style={s.adminBadgeTxt}>{user?.role === 'chef_admin' ? 'CHEF ADMIN' : 'ADMIN'}</Text></View>
            )}
          </View>
        </View>

        {/* Admin Panel */}
        {isAdmin && (
          <TouchableOpacity testID="admin-panel-btn" style={s.adminCard} onPress={() => router.push('/admin')} activeOpacity={0.8}>
            <View style={s.adminCardLeft}>
              <Ionicons name="shield-checkmark-outline" size={24} color={Colors.primary} />
              <Text style={s.adminCardTxt}>Admin Panel</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}



        {/* Developer Bypass */}
        <TouchableOpacity style={[s.adminCard, { borderColor: Colors.primary }]} onPress={() => router.push('/owner/dashboard' as any)} activeOpacity={0.8}>
          <View style={s.adminCardLeft}>
            <Ionicons name="build-outline" size={24} color={Colors.primary} />
            <Text style={s.adminCardTxt}>Go to Owner Dashboard</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
        </TouchableOpacity>

        {/* Menu */}
        <View style={s.menuSection}>
          {MENU_ITEMS.map((item, i) => (
            <TouchableOpacity testID={`profile-menu-${i}`} key={item.label} style={s.menuItem} onPress={item.onPress} activeOpacity={0.7}>
              <View style={s.menuLeft}>
                <Ionicons name={item.icon as any} size={20} color={Colors.textSecondary} />
                <Text style={s.menuLabel}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.border} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity testID="logout-btn" style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={s.logoutTxt}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={s.version}>firstmeal v1.0 · Hunger x Speed</Text>
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: { paddingHorizontal: Spacing.screen, paddingTop: 8, paddingBottom: 8 },
  brand: { fontFamily: 'DMSans_700Bold', fontSize: 24, color: Colors.textPrimary, letterSpacing: -1 },

  userCard: {
    flexDirection: 'row', alignItems: 'center', margin: Spacing.screen, padding: 20,
    backgroundColor: Colors.surface, borderRadius: Radius.sm, borderColor: Colors.border, borderWidth: 1,
  },
  avatar: { width: 64, height: 64, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 16, borderRadius: 32 },
  avatarImg: { width: 64, height: 64, borderRadius: 32, resizeMode: 'cover' },
  avatarTxt: { fontFamily: 'DMSans_700Bold', fontSize: 28, color: Colors.primaryFg },
  userInfo: { flex: 1 },
  userName: { fontFamily: 'DMSans_700Bold', fontSize: 20, color: Colors.textPrimary },
  userEmail: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  adminBadge: { marginTop: 6, alignSelf: 'flex-start', backgroundColor: Colors.primary, paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.sm },
  adminBadgeTxt: { fontFamily: 'DMSans_700Bold', fontSize: 10, color: Colors.primaryFg, letterSpacing: 1 },

  adminCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: Spacing.screen, marginBottom: 12, padding: 16,
    backgroundColor: Colors.surface, borderRadius: Radius.sm, borderColor: Colors.border, borderWidth: 1,
  },
  adminCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  adminCardTxt: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.primary },



  menuSection: {
    marginHorizontal: Spacing.screen, backgroundColor: Colors.surface,
    borderRadius: Radius.sm, borderColor: Colors.border, borderWidth: 1, marginBottom: 16, overflow: 'hidden',
  },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  menuLabel: { fontFamily: 'DMSans_500Medium', fontSize: 16, color: Colors.textPrimary },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: Spacing.screen, padding: 16 },
  logoutTxt: { fontFamily: 'DMSans_500Medium', fontSize: 16, color: Colors.error },
  version: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary, textAlign: 'center', marginTop: 8 },
});
