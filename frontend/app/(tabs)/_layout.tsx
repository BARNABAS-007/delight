import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { Colors } from '@/constants/theme';

function CustomTabBar({ state, descriptors, navigation }: any) {
  const tabs = [
    { name: 'index', icon: 'home', label: 'Home' },
    { name: 'search', icon: 'search', label: 'Search' },
    { name: 'cart', icon: 'bag-outline', label: 'Cart' },
    { name: 'orders', icon: 'receipt-outline', label: 'Orders' },
    { name: 'profile', icon: 'person-outline', label: 'Profile' },
  ];

  return (
    <View style={s.bar}>
      {state.routes.map((route: any, index: number) => {
        const tab = tabs[index];
        if (!tab) return null;
        const focused = state.index === index;
        return (
          <TouchableOpacity
            key={route.key}
            testID={`tab-${tab.name}`}
            style={s.tab}
            onPress={() => navigation.navigate(route.name)}
          >
            <Ionicons
              name={(focused ? tab.icon.replace('-outline', '') : tab.icon) as any}
              size={24}
              color={focused ? Colors.primary : Colors.textSecondary}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="cart" />
      <Tabs.Screen name="orders" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row', backgroundColor: '#000000',
    borderTopWidth: 1, borderTopColor: Colors.border,
    paddingBottom: 20, paddingTop: 12, paddingHorizontal: 8,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 48 },
});
