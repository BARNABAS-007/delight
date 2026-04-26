import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getRestaurantConfig, setRestaurantConfig, getPlatformFee, setPlatformFee,
  getAllRestaurantConfigs, RestaurantFinance,
} from '@/lib/pricingEngine';
import { api } from '@/services/api';
import { Colors, Spacing, Brutalist } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

export default function AdminSettings() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformFee, setPFState] = useState(getPlatformFee());
  const [saved, setSaved] = useState<string | null>(null);
  const [configs, setConfigs] = useState<Record<string, RestaurantFinance>>({});

  // Guard: admin only
  useEffect(() => {
    if (user && user.role !== 'admin' && user.role !== 'chef_admin') {
      Alert.alert('Access Denied', 'Admin credentials required.');
      router.replace('/(tabs)');
    }
  }, [user]);

  useEffect(() => {
    (async () => {
      try {
        const data: any = await api.adminGetRestaurants();
        setRestaurants(data);

        // Fetch live configs from Supabase
        const { data: dbConfigs } = await supabase.from('restaurant_finance').select('*');
        const initial: Record<string, RestaurantFinance> = {};
        
        data.forEach((r: any) => {
          const liveCfg = dbConfigs?.find(c => c.restaurant_id === r.id);
          if (liveCfg) {
            initial[r.id] = { ...getRestaurantConfig(r.id), ...liveCfg };
          } else {
            initial[r.id] = getRestaurantConfig(r.id);
          }
        });
        setConfigs(initial);
      } catch (e) {
        console.error(e);
      }
      finally { setLoading(false); }
    })();
  }, []);

  const updateField = (rid: string, field: keyof RestaurantFinance, value: any) => {
    setConfigs(prev => ({
      ...prev,
      [rid]: { ...prev[rid], [field]: value },
    }));
  };

  const saveRestaurant = async (rid: string) => {
    const cfg = configs[rid];
    try {
      await supabase.from('restaurant_finance').upsert({
        restaurant_id: rid,
        packaging_fee: cfg.packaging_fee,
        gst_percent: cfg.gst_percent,
        commission_rate: cfg.commission_rate,
      }, { onConflict: 'restaurant_id' });
      
      setRestaurantConfig(cfg);
      setSaved(rid);
      setTimeout(() => setSaved(null), 2000);
    } catch {
      Alert.alert('Error', 'Failed to save to Supabase');
    }
  };

  const savePlatformFee = async () => {
    try {
      // Updates the only row in settings table
      await supabase.from('settings').update({ global_platform_fee: platformFee }).neq('global_platform_fee', -1);
      setPlatformFee(platformFee);
      setSaved('platform');
      setTimeout(() => setSaved(null), 2000);
    } catch {
      Alert.alert('Error', 'Failed to save platform fee');
    }
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} testID="settings-back-btn">
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={s.title}>Finance Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} /> : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* ── Global Platform Fee ── */}
          <View style={s.globalCard}>
            <Text style={s.globalLabel}>⚡ GLOBAL PLATFORM FEE</Text>
            <Text style={s.globalNote}>Applied to every order. Change here = instant effect.</Text>
            <View style={s.feeRow}>
              <TouchableOpacity style={s.feeBtn} onPress={() => setPFState(f => Math.max(0, parseFloat((f - 0.5).toFixed(2))))}>
                <Ionicons name="remove" size={20} color={Colors.primaryFg} />
              </TouchableOpacity>
              <Text style={s.feeVal}>₹{platformFee.toFixed(2)}</Text>
              <TouchableOpacity style={s.feeBtn} onPress={() => setPFState(f => parseFloat((f + 0.5).toFixed(2)))}>
                <Ionicons name="add" size={20} color={Colors.primaryFg} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              testID="save-platform-fee-btn"
              style={[s.saveBtn, saved === 'platform' && s.savedBtn]}
              onPress={savePlatformFee}>
              <Text style={s.saveBtnTxt}>
                {saved === 'platform' ? '✓ SAVED' : 'SET PLATFORM FEE'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Per-Restaurant Configs ── */}
          <Text style={s.sectionLabel}>PER-RESTAURANT CONTROLS</Text>
          {restaurants.map(r => {
            const cfg = configs[r.id] || getRestaurantConfig(r.id);
            return (
              <View key={r.id} style={s.restCard} testID={`finance-card-${r.id}`}>
                <Text style={s.restName}>{r.name}</Text>
                <Text style={s.restCat}>{r.cuisine?.join(' • ')}</Text>

                {/* Packaging Fee */}
                <Row label="Packaging Fee (₹)" value={`₹${cfg.packaging_fee}`}>
                  <View style={s.nudgeRow}>
                    <Nudge label="−₹5" onPress={() => updateField(r.id, 'packaging_fee', Math.max(0, cfg.packaging_fee - 5))} />
                    <Text style={s.nudgeVal}>₹{cfg.packaging_fee}</Text>
                    <Nudge label="+₹5" onPress={() => updateField(r.id, 'packaging_fee', cfg.packaging_fee + 5)} />
                  </View>
                </Row>

                {/* GST Tier */}
                <Row label="GST Tier">
                  <View style={s.toggleRow}>
                    {([5, 12] as const).map(pct => (
                      <TouchableOpacity
                        key={pct}
                        testID={`gst-toggle-${r.id}-${pct}`}
                        style={[s.toggleBtn, cfg.gst_percent === pct && s.toggleBtnActive]}
                        onPress={() => updateField(r.id, 'gst_percent', pct)}>
                        <Text style={[s.toggleTxt, cfg.gst_percent === pct && s.toggleTxtActive]}>
                          {pct}% GST
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Row>

                {/* Commission Rate */}
                <Row label="Commission Rate">
                  <View style={s.nudgeRow}>
                    <Nudge label="−1%" onPress={() => updateField(r.id, 'commission_rate', parseFloat(Math.max(0, cfg.commission_rate - 0.01).toFixed(2)))} />
                    <Text style={s.nudgeVal}>{(cfg.commission_rate * 100).toFixed(0)}%</Text>
                    <Nudge label="+1%" onPress={() => updateField(r.id, 'commission_rate', parseFloat(Math.min(0.5, cfg.commission_rate + 0.01).toFixed(2)))} />
                  </View>
                </Row>

                {/* Profit Preview */}
                <View style={s.profitPreview}>
                  <Text style={s.profitLabel}>If base ₹100:</Text>
                  <Text style={s.profitVal}>
                    Your profit ≈ ₹{(100 - (100 * cfg.commission_rate) + platformFee).toFixed(2)}
                  </Text>
                </View>

                <TouchableOpacity
                  testID={`save-finance-btn-${r.id}`}
                  style={[s.saveBtn, saved === r.id && s.savedBtn]}
                  onPress={() => saveRestaurant(r.id)}>
                  <Text style={s.saveBtnTxt}>
                    {saved === r.id ? '✓ SAVED' : 'SAVE SETTINGS'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function Row({ label, children }: { label: string; value?: string; children?: any }) {
  return (
    <View style={rs.row}>
      <Text style={rs.label}>{label}</Text>
      {children}
    </View>
  );
}

function Nudge({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={rs.nudge} onPress={onPress}>
      <Text style={rs.nudgeTxt}>{label}</Text>
    </TouchableOpacity>
  );
}

const rs = StyleSheet.create({
  row: { marginBottom: 14 },
  label: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.textSecondary, marginBottom: 6, letterSpacing: 0.5 },
  nudgeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nudge: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.border },
  nudgeTxt: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.textPrimary },
  nudgeVal: { fontFamily: 'DMSans_700Bold', fontSize: 18, color: Colors.textPrimary, minWidth: 50, textAlign: 'center' },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.adminBg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.screen, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#2A2000' },
  title: { fontFamily: 'DMSans_700Bold', fontSize: 20, color: Colors.adminFg, letterSpacing: 1 },

  globalCard: {
    margin: Spacing.screen, padding: 20,
    backgroundColor: '#2A1A00',
    ...Brutalist,
    borderColor: Colors.primary,
  },
  globalLabel: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.primary, letterSpacing: 2, marginBottom: 4 },
  globalNote: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#A08030', marginBottom: 16 },
  feeRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 16 },
  feeBtn: { width: 40, height: 40, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  feeVal: { fontFamily: 'DMSans_700Bold', fontSize: 32, color: Colors.primary, minWidth: 80, textAlign: 'center' },

  sectionLabel: { fontFamily: 'DMSans_700Bold', fontSize: 11, color: Colors.textSecondary, letterSpacing: 2, paddingHorizontal: Spacing.screen, marginBottom: 12 },

  restCard: {
    marginHorizontal: Spacing.screen, marginBottom: 16, padding: 16,
    backgroundColor: '#221500',
    ...Brutalist,
    borderColor: Colors.secondary,
  },
  restName: { fontFamily: 'DMSans_700Bold', fontSize: 17, color: Colors.primary, marginBottom: 2 },
  restCat: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary, marginBottom: 16 },

  toggleRow: { flexDirection: 'row', gap: 8 },
  toggleBtn: { paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: Colors.secondary },
  toggleBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  toggleTxt: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.textSecondary },
  toggleTxtActive: { color: Colors.primaryFg, fontFamily: 'DMSans_700Bold' },

  profitPreview: { backgroundColor: '#1A1200', padding: 10, marginBottom: 14, borderLeftWidth: 3, borderLeftColor: Colors.tertiary },
  profitLabel: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.textSecondary },
  profitVal: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.tertiary },

  saveBtn: { backgroundColor: Colors.primary, height: 44, alignItems: 'center', justifyContent: 'center' },
  savedBtn: { backgroundColor: Colors.success },
  saveBtnTxt: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.primaryFg, letterSpacing: 1.5 },
});
