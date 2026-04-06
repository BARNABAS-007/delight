import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

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
      if (user) router.replace('/(tabs)');
      else router.replace('/(auth)/login');
    }
  }, [loading, user]);

  return (
    <View style={s.c}>
      <ActivityIndicator size="large" color="#FFFFFF" />
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#050505', alignItems: 'center', justifyContent: 'center' },
});
