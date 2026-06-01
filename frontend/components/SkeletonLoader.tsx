import { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, Dimensions } from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';

const { width } = Dimensions.get('window');

// Pulse animation — no external deps, works on web & native
function SkeletonBox({ width: w, height, style }: { width?: any; height: number; style?: any }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: w || '100%',
          height,
          backgroundColor: Colors.border,
          borderRadius: Radius.sm,
          opacity,
        },
        style,
      ]}
    />
  );
}

interface SkeletonProps {
  type?: 'restaurantCard' | 'dineoutCard' | 'searchResult';
}

export function SkeletonLoader({ type = 'restaurantCard' }: SkeletonProps) {
  if (type === 'searchResult') {
    return (
      <View style={s.searchResultCard}>
        <SkeletonBox width={90} height={90} style={{ borderRadius: 0 }} />
        <View style={s.searchResultInfo}>
          <SkeletonBox height={18} width="70%" />
          <View style={{ height: 8 }} />
          <SkeletonBox height={13} width="45%" />
          <View style={{ height: 8 }} />
          <SkeletonBox height={13} width="60%" />
        </View>
      </View>
    );
  }

  return (
    <View style={s.card}>
      <SkeletonBox height={200} style={{ borderRadius: Radius.sm }} />
      <View style={s.cardBody}>
        <View style={s.cardRow}>
          <View style={{ flex: 1, gap: 8 }}>
            <SkeletonBox height={22} width="65%" />
            <SkeletonBox height={14} width="40%" />
          </View>
          <SkeletonBox width={52} height={24} style={{ marginLeft: 12 }} />
        </View>
        {type === 'dineoutCard' && (
          <View style={{ marginTop: 12 }}>
            <SkeletonBox height={14} width="55%" />
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { marginBottom: 32 },
  cardBody: { paddingTop: 16 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  searchResultCard: {
    flexDirection: 'row',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  searchResultInfo: { flex: 1, padding: 12, justifyContent: 'center' },
});
