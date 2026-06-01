import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F4F6F9' } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="restaurants" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="inventory/[id]" />
    </Stack>
  );
}
