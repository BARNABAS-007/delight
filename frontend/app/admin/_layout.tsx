import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#050505' } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="restaurants" />
    </Stack>
  );
}
