import { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function Callback() {
  const router = useRouter();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
    });
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
