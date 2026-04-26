import React from 'react';
import { View, StyleSheet, Animated, useWindowDimensions } from 'react-native';
import { useEffect, useRef } from 'react';
import { Colors } from '@/constants/theme';

interface SpeedStreakProps {
  visible: boolean;
}

/**
 * SpeedStreak — 2px Electric Cyan gradient line that translates X: -100% → 100% in 400ms.
 * Trigger by setting visible=true; auto-completes and hides.
 */
export default function SpeedStreak({ visible }: SpeedStreakProps) {
  const { width } = useWindowDimensions();
  const translateX = useRef(new Animated.Value(-width)).current;

  useEffect(() => {
    if (visible) {
      translateX.setValue(-width);
      Animated.timing(translateX, {
        toValue: width,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, width]);

  if (!visible) return null;

  return (
    <View style={s.container} pointerEvents="none">
      <Animated.View style={[s.streak, { width, transform: [{ translateX }] }]} />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    overflow: 'hidden',
    height: 3,
  },
  streak: {
    height: 3,
    backgroundColor: Colors.tertiary, // Electric Cyan #64E0FF
    // Gradient effect via shadow glow
    shadowColor: Colors.tertiary,
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
});
