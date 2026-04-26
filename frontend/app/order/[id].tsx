import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getRapidoStatus, RAPIDO_STATUS_LABELS, RAPIDO_STATUS_STEP,
  RapidoStatus,
} from '@/services/rapidoBridge';
import { Colors, Spacing, Brutalist } from '@/constants/theme';
import SpeedStreak from '@/components/SpeedStreak';

const STEPS = ['Confirmed', 'Assigned', 'Out for Delivery', 'Delivered'];

export default function OrderTracking() {
  const { id, rapido, est } = useLocalSearchParams<{ id: string; rapido?: string; est?: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [status, setStatus] = useState<RapidoStatus>('pending');
  const [minutes, setMinutes] = useState(parseInt(est ?? '8', 10));
  const [captain, setCaptain] = useState<string | null>(null);
  
  const [streakFire, setStreakFire] = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;

  // ── Poll Rapido status every 3 seconds ──────────────────────────────────────
  useEffect(() => {
    if (!rapido) return;

    const poll = async () => {
      try {
        const res = await getRapidoStatus(rapido);
        setStatus(prev => {
          if (prev !== 'out_for_delivery' && res.status === 'out_for_delivery') {
            setStreakFire(true);
            setTimeout(() => setStreakFire(false), 500);
          }
          return res.status;
        });
        setMinutes(res.estimated_minutes);
        if (res.captain_name) setCaptain(res.captain_name);

        const step = RAPIDO_STATUS_STEP[res.status] ?? 0;
        const progress = Math.min(step / (STEPS.length - 1), 1);
        Animated.spring(progressAnim, {
          toValue: progress,
          useNativeDriver: false,
        }).start();

        if (res.status === 'delivered') {
          clearInterval(interval);
        }
      } catch { }
    };

    const interval = setInterval(poll, 3000);
    poll(); // Initial

    return () => clearInterval(interval);
  }, [rapido]);

  const currentStep = RAPIDO_STATUS_STEP[status] ?? 0;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <SpeedStreak visible={streakFire} />
      
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity testID="back-btn" onPress={() => router.replace('/(tabs)')}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={s.title}>Order #{id?.slice(-6)}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* ── ETA Badge ── */}
      <View style={s.etaCard}>
        <Text style={s.etaLabel}>ESTIMATED DELIVERY</Text>
        <View style={s.etaRow}>
          <Text style={s.etaTime}>{minutes}</Text>
          <Text style={s.etaUnit}>min</Text>
        </View>
        <Text style={s.statusLabel}>{RAPIDO_STATUS_LABELS[status]}</Text>
      </View>

      {/* ── Progress Bar ── */}
      <View style={s.progressSection}>
        <View style={s.progressTrack}>
          <Animated.View
            style={[
              s.progressFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>

        {/* Step dots */}
        <View style={s.stepsRow}>
          {STEPS.map((step, i) => (
            <View key={step} style={s.stepCol}>
              <View style={[s.stepDot, i <= currentStep && s.stepDotActive]}>
                {i <= currentStep && (
                  <Ionicons name="checkmark" size={12} color={Colors.primaryFg} />
                )}
              </View>
              <Text style={[s.stepLabel, i <= currentStep && s.stepLabelActive]}>{step}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Captain Info ── */}
      {currentStep >= 1 && captain && (
        <View style={s.captainCard}>
          <View style={s.captainAvatar}>
            <Ionicons name="bicycle" size={24} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.captainName}>{captain}</Text>
            <Text style={s.captainRole}>Rapido Captain</Text>
          </View>
          <TouchableOpacity style={s.callBtn}>
            <Ionicons name="call" size={20} color={Colors.primaryFg} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Order Details ── */}
      <View style={s.detailCard}>
        <Text style={s.detailLabel}>ORDER ID</Text>
        <Text style={s.detailVal}>{id}</Text>
        {rapido && (
          <>
            <Text style={[s.detailLabel, { marginTop: 12 }]}>RAPIDO BOOKING</Text>
            <Text style={s.detailVal}>{rapido}</Text>
          </>
        )}
      </View>

      {/* ── Back to Home ── */}
      <View style={s.footer}>
        <TouchableOpacity
          testID="home-btn"
          style={s.homeBtn}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={s.homeBtnTxt}>BACK TO HOME</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: Spacing.screen },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
  title: { fontFamily: 'DMSans_700Bold', fontSize: 18, color: Colors.textPrimary },

  etaCard: {
    alignItems: 'center', padding: 24, marginBottom: 24,
    backgroundColor: Colors.surface,
    ...Brutalist, borderColor: Colors.secondary, borderWidth: 1,
  },
  etaLabel: { fontFamily: 'DMSans_700Bold', fontSize: 11, color: Colors.textSecondary, letterSpacing: 2, marginBottom: 8 },
  etaRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 8 },
  etaTime: { fontFamily: 'DMSans_700Bold', fontSize: 56, color: Colors.primary },
  etaUnit: { fontFamily: 'DMSans_500Medium', fontSize: 20, color: Colors.textSecondary },
  statusLabel: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.tertiary },

  progressSection: { marginBottom: 24 },
  progressTrack: {
    height: 6, backgroundColor: Colors.surfaceLight, borderRadius: 3, overflow: 'hidden',
    marginBottom: 16, borderWidth: 1, borderColor: Colors.border,
  },
  progressFill: {
    height: '100%', backgroundColor: Colors.tertiary, borderRadius: 3,
  },
  stepsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stepCol: { alignItems: 'center', flex: 1 },
  stepDot: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.surfaceLight, borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  stepDotActive: { backgroundColor: Colors.primary, borderColor: Colors.secondary },
  stepLabel: { fontFamily: 'DMSans_400Regular', fontSize: 10, color: Colors.textSecondary, textAlign: 'center' },
  stepLabelActive: { fontFamily: 'DMSans_700Bold', color: Colors.textPrimary },

  captainCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, marginBottom: 20,
    backgroundColor: Colors.surface,
    ...Brutalist, borderColor: Colors.secondary, borderWidth: 1,
  },
  captainAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.surfaceLight, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.primary,
  },
  captainName: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.textPrimary },
  captainRole: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary },
  callBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },

  detailCard: {
    padding: 16, backgroundColor: Colors.surfaceLight,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 20,
  },
  detailLabel: { fontFamily: 'DMSans_700Bold', fontSize: 11, color: Colors.textSecondary, letterSpacing: 2 },
  detailVal: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textPrimary, marginTop: 4 },

  footer: { marginTop: 'auto', paddingBottom: 32 },
  homeBtn: {
    height: 52, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...Brutalist, borderColor: Colors.secondary,
  },
  homeBtnTxt: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.primaryFg, letterSpacing: 2 },
});
