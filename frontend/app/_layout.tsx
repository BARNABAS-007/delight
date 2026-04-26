import '../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { FeedbackProvider } from '@/context/FeedbackContext';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_700Bold, Inter_900Black } from '@expo-google-fonts/inter';
import {
  DMSans_400Regular, DMSans_500Medium, DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import * as SplashScreen from 'expo-splash-screen';
import { Colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
    Inter_900Black,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <AuthProvider>
      <CartProvider>
        <FeedbackProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="restaurant/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="checkout" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="order/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="chat" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="admin/index" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="admin/restaurants" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="admin/settings" options={{ animation: 'slide_from_right' }} />
          </Stack>
        </FeedbackProvider>
      </CartProvider>
    </AuthProvider>
  );
}
