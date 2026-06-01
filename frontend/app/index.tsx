import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/theme';

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Check for Google OAuth callback in URL (web)
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash.includes('session_id=')) {
        router.replace('/callback');
        return;
      }
    }

    if (!loading) {
      if (!user) {
        router.replace('/(auth)/login');
        return;
      }

      // Role-based routing
      switch (user.role) {
        case 'admin':
          router.replace('/admin/index' as any);
          break;
        case 'restaurant_owner':
          router.replace('/owner' as any);
          break;
        case 'chef_admin':
        case 'customer':
        default:
          router.replace('/(tabs)');
          break;
      }
    }
  }, [loading, user]);

  return (
    <View style={s.c}>
      <ActivityIndicator size="large" color={Colors.primary} />
      {!loading && user && (
        <Text style={s.t}>Signing you in as {user.role}…</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#050505', alignItems: 'center', justifyContent: 'center', gap: 16 },
  t: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#666', marginTop: 8 },
});
