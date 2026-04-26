import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Brutalist } from '@/constants/theme';
import { useCart } from '@/context/CartContext';
import SpeedStreak from '@/components/SpeedStreak';
import { useState } from 'react';

function CustomTabBar({ state, descriptors, navigation }: any) {
  const { itemCount, streakVisible } = useCart();

  const tabs = [
    { name: 'index', icon: 'home', label: 'Home' },
    { name: 'search', icon: 'search', label: 'Search' },
    { name: 'cart', icon: 'bag-outline', label: 'Cart' },
    { name: 'orders', icon: 'receipt-outline', label: 'Orders' },
    { name: 'profile', icon: 'person-outline', label: 'Profile' },
  ];

  return (
    <View style={s.barOuter}>
      <SpeedStreak visible={streakVisible} />
      <View style={s.bar}>
        {state.routes.map((route: any, index: number) => {
          const tab = tabs[index];
          if (!tab) return null;
          const focused = state.index === index;
          const isCart = tab.name === 'cart';
          return (
            <TouchableOpacity
              key={route.key}
              testID={`tab-${tab.name}`}
              style={[s.tab, focused && s.tabActive]}
              onPress={() => navigation.navigate(route.name)}
              activeOpacity={0.7}
            >
              <View>
                <Ionicons
                  name={(focused ? tab.icon.replace('-outline', '') : tab.icon) as any}
                  size={22}
                  color={focused ? Colors.primary : Colors.textSecondary}
                />
                {isCart && itemCount > 0 && (
                  <View style={s.badge}>
                    <Text style={s.badgeTxt}>{itemCount}</Text>
                  </View>
                )}
              </View>
              <Text style={[s.label, focused && s.labelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: Colors.background } }}
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
  barOuter: { position: 'relative' },
  bar: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderTopWidth: 2, borderTopColor: Colors.secondary,
    paddingBottom: 24, paddingTop: 10, paddingHorizontal: 8,
  },
  tab: {
    flex: 1, alignItems: 'center', justifyContent: 'center', height: 48,
    paddingVertical: 4,
  },
  tabActive: {},
  label: {
    fontFamily: 'DMSans_500Medium', fontSize: 10, color: Colors.textSecondary,
    marginTop: 2,
  },
  labelActive: { color: Colors.primary, fontFamily: 'DMSans_700Bold' },
  badge: {
    position: 'absolute', top: -6, right: -10,
    backgroundColor: Colors.tertiary, width: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeTxt: { fontFamily: 'DMSans_700Bold', fontSize: 9, color: '#001A20' },
});
