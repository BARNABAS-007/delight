import { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/theme';

export default function Callback() {
  const { loginWithGoogle } = useAuth();
  const router = useRouter();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const extractSessionId = () => {
      if (typeof window !== 'undefined') {
        const hash = window.location.hash;
        const match = hash.match(/session_id=([^&]+)/);
        if (match) return decodeURIComponent(match[1]);
      }
      return null;
    };

    const sessionId = extractSessionId();
    if (!sessionId) {
      router.replace('/(auth)/login');
      return;
    }

    loginWithGoogle(sessionId)
      .then(() => router.replace('/(tabs)'))
      .catch(() => router.replace('/(auth)/login'));
  }, []);

  return (
    <View style={s.c}>
      <Text style={s.brand}>DELIGHT</Text>
      <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 32 }} />
      <Text style={s.txt}>Signing you in...</Text>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  brand: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 42, color: Colors.primary, letterSpacing: 8 },
  txt: { fontFamily: 'DMSans_400Regular', color: Colors.textSecondary, fontSize: 16, marginTop: 16 },
});
