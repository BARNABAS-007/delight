import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/constants/theme';

export type Address = {
  id: string;
  label: string;
  address: string;
  latitude?: number;
  longitude?: number;
};

export default function Addresses() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [newLabel, setNewLabel] = useState('Home');
  const [newAddress, setNewAddress] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  // Store exact coords for saving
  const [detectedLat, setDetectedLat] = useState<number | null>(null);
  const [detectedLng, setDetectedLng] = useState<number | null>(null);

  const LABELS = ['Home', 'Work', 'Other'];

  // ── Accurate GPS + reverse geocode via OpenStreetMap Nominatim ────────────
  const handleDetectLocation = async () => {
    setGpsLoading(true);
    setDetectedLat(null);
    setDetectedLng(null);

    try {
      // 1. Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please go to Settings → Apps → FIRSTMEAL → Permissions and enable Location.',
        );
        setGpsLoading(false);
        return;
      }

      // 2. Get high-accuracy position
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });

      const { latitude, longitude } = loc.coords;
      setDetectedLat(latitude);
      setDetectedLng(longitude);

      // 3. Reverse geocode with OpenStreetMap Nominatim (free, very accurate)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
        {
          headers: {
            // Nominatim requires a User-Agent
            'User-Agent': 'FIRSTMEAL-App/1.0',
            'Accept-Language': 'en',
          },
        },
      );

      if (!response.ok) throw new Error('Geocoding failed');
      const data = await response.json();

      // Build a clean, full address from Nominatim response
      const a = data.address || {};
      const parts: string[] = [];

      // House number + road
      if (a.house_number && a.road) parts.push(`${a.house_number}, ${a.road}`);
      else if (a.road) parts.push(a.road);
      else if (a.amenity) parts.push(a.amenity);
      else if (a.building) parts.push(a.building);

      // Neighbourhood / suburb
      if (a.neighbourhood) parts.push(a.neighbourhood);
      else if (a.suburb) parts.push(a.suburb);
      else if (a.quarter) parts.push(a.quarter);

      // Village / town / city
      const city = a.city || a.town || a.village || a.municipality || '';
      if (city) parts.push(city);

      // State district
      if (a.state_district && a.state_district !== city) parts.push(a.state_district);

      // State
      if (a.state) parts.push(a.state);

      // Postal code
      if (a.postcode) parts.push(a.postcode);

      const fullAddress = parts.length > 0 ? parts.join(', ') : data.display_name;
      setNewAddress(fullAddress);

    } catch (e: any) {
      // Fallback: try expo built-in geocoder
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const { latitude, longitude } = loc.coords;
        setDetectedLat(latitude);
        setDetectedLng(longitude);

        const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geo.length > 0) {
          const g = geo[0];
          const parts = [
            g.streetNumber && g.street ? `${g.streetNumber} ${g.street}` : g.street,
            g.district,
            g.city,
            g.region,
            g.postalCode,
          ].filter(Boolean);
          setNewAddress(parts.join(', '));
        }
      } catch {
        Alert.alert('GPS Error', 'Could not detect your location. Please enter it manually.');
      }
    } finally {
      setGpsLoading(false);
    }
  };

  // ── Load saved addresses ──────────────────────────────────────────────────
  useEffect(() => { loadAddresses(); }, []);

  const loadAddresses = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('saved_addresses')
        .eq('user_id', user.user_id)
        .single();
      if (error) throw error;
      setAddresses(data?.saved_addresses || []);
    } catch (e) {
      console.error('Error loading addresses:', e);
    } finally {
      setLoading(false);
    }
  };

  // ── Save address with GPS coords to Supabase ──────────────────────────────
  const saveAddress = async () => {
    if (!newAddress.trim()) {
      Alert.alert('Required', 'Please enter or detect an address');
      return;
    }
    setSaving(true);

    const newAddr: Address = {
      id: Math.random().toString(36).substring(2, 9),
      label: newLabel,
      address: newAddress.trim(),
      // Include GPS coords if available — used by restaurant for routing
      ...(detectedLat !== null && detectedLng !== null
        ? { latitude: detectedLat, longitude: detectedLng }
        : {}),
    };

    const updated = [...addresses, newAddr];

    try {
      const { error } = await supabase
        .from('users')
        .update({ saved_addresses: updated })
        .eq('user_id', user?.user_id);

      if (error) throw error;
      setAddresses(updated);
      setShowForm(false);
      setNewAddress('');
      setNewLabel('Home');
      setDetectedLat(null);
      setDetectedLng(null);
      Alert.alert('✓ Saved', `${newLabel} address saved successfully.`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not save address');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete address ────────────────────────────────────────────────────────
  const deleteAddress = async (id: string) => {
    const updated = addresses.filter(a => a.id !== id);
    setAddresses(updated);
    try {
      await supabase
        .from('users')
        .update({ saved_addresses: updated })
        .eq('user_id', user?.user_id);
    } catch {
      Alert.alert('Error', 'Could not delete address');
      loadAddresses();
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[s.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.8} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Saved Addresses</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* ── Saved address cards ── */}
            {addresses.map(addr => (
              <View key={addr.id} style={s.addressCard}>
                <View style={s.addrLeft}>
                  <View style={s.iconWrapper}>
                    <Ionicons
                      name={addr.label === 'Home' ? 'home' : addr.label === 'Work' ? 'briefcase' : 'location'}
                      size={20}
                      color={Colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.addrLabel}>{addr.label}</Text>
                    <Text style={s.addrText}>{addr.address}</Text>
                    {/* Show GPS badge if coordinates are saved */}
                    {addr.latitude && addr.longitude ? (
                      <View style={s.gpsBadge}>
                        <Ionicons name="navigate" size={10} color={Colors.primary} />
                        <Text style={s.gpsBadgeTxt}>GPS verified</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <TouchableOpacity onPress={() => deleteAddress(addr.id)} style={s.deleteBtn}>
                  <Ionicons name="trash-outline" size={20} color={Colors.error} />
                </TouchableOpacity>
              </View>
            ))}

            {/* ── Add button ── */}
            {!showForm && (
              <TouchableOpacity style={s.addBtn} onPress={() => setShowForm(true)} activeOpacity={0.8}>
                <Ionicons name="add" size={24} color={Colors.primaryFg} />
                <Text style={s.addBtnTxt}>ADD NEW ADDRESS</Text>
              </TouchableOpacity>
            )}

            {/* ── Add form ── */}
            {showForm && (
              <View style={s.formCard}>
                <Text style={s.formTitle}>Add New Address</Text>

                {/* Label chips */}
                <View style={s.labelRow}>
                  {LABELS.map(l => (
                    <TouchableOpacity
                      key={l}
                      style={[s.labelChip, newLabel === l && s.labelChipActive]}
                      onPress={() => setNewLabel(l)}
                    >
                      <Text style={[s.labelChipTxt, newLabel === l && s.labelChipTxtActive]}>{l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Address input with embedded GPS button */}
                <View style={[s.inputWrapper, detectedLat !== null && s.inputWrapperGps]}>
                  <TextInput
                    style={s.input}
                    placeholder="Complete Address"
                    placeholderTextColor={Colors.textSecondary}
                    value={newAddress}
                    onChangeText={t => {
                      setNewAddress(t);
                      // User edited manually → clear stored coords
                      setDetectedLat(null);
                      setDetectedLng(null);
                    }}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                  {/* GPS icon button — top right inside input */}
                  <TouchableOpacity
                    style={[s.inputGpsBtn, detectedLat !== null && s.inputGpsBtnActive]}
                    onPress={handleDetectLocation}
                    activeOpacity={0.7}
                    disabled={gpsLoading}
                  >
                    {gpsLoading ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <Ionicons
                        name="navigate"
                        size={17}
                        color={detectedLat !== null ? '#fff' : Colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                </View>

                {/* GPS coords confirmation strip */}
                {detectedLat !== null && detectedLng !== null && (
                  <View style={s.coordsStrip}>
                    <Ionicons name="checkmark-circle" size={13} color={Colors.success} />
                    <Text style={s.coordsTxt}>
                      GPS locked · {detectedLat.toFixed(5)}, {detectedLng.toFixed(5)}
                    </Text>
                  </View>
                )}

                {/* Actions */}
                <View style={s.formActions}>
                  <TouchableOpacity
                    style={s.cancelBtn}
                    onPress={() => {
                      setShowForm(false);
                      setNewAddress('');
                      setDetectedLat(null);
                      setDetectedLng(null);
                    }}
                  >
                    <Text style={s.cancelBtnTxt}>CANCEL</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.saveBtn} onPress={saveAddress} disabled={saving}>
                    {saving
                      ? <ActivityIndicator size="small" color="#FFF" />
                      : <Text style={s.saveBtnTxt}>SAVE</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.screen, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20, color: Colors.textPrimary },
  content: { padding: Spacing.screen, paddingBottom: 60 },

  // Address cards
  addressCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, backgroundColor: Colors.surface,
    borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, marginBottom: 12,
  },
  addrLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconWrapper: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  addrLabel: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.textPrimary, marginBottom: 2 },
  addrText: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  gpsBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  gpsBadgeTxt: { fontFamily: 'DMSans_500Medium', fontSize: 10, color: Colors.primary },
  deleteBtn: { padding: 8 },

  // Add button
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 56, backgroundColor: Colors.primary,
    borderRadius: Radius.sm, marginTop: 12,
  },
  addBtnTxt: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.primaryFg, letterSpacing: 1 },

  // Form card
  formCard: {
    backgroundColor: Colors.surface, padding: 16,
    borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, marginTop: 12,
  },
  formTitle: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.textPrimary, marginBottom: 16 },
  labelRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  labelChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, borderWidth: 1, borderColor: Colors.border },
  labelChipActive: { backgroundColor: Colors.textPrimary, borderColor: Colors.textPrimary },
  labelChipTxt: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.textSecondary },
  labelChipTxtActive: { color: Colors.background, fontFamily: 'DMSans_700Bold' },

  // Input + GPS
  inputWrapper: {
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.sm, marginBottom: 8,
    flexDirection: 'row', alignItems: 'flex-start', position: 'relative',
  },
  inputWrapperGps: {
    borderColor: Colors.primary,
    borderWidth: 1.5,
  },
  input: {
    flex: 1, padding: 12, minHeight: 90,
    fontFamily: 'DMSans_400Regular', color: Colors.textPrimary,
    paddingRight: 50, textAlignVertical: 'top',
  },
  inputGpsBtn: {
    position: 'absolute', top: 10, right: 10,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.primary + '18',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.primary + '55',
  },
  inputGpsBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },

  // GPS coords confirmation
  coordsStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginBottom: 12, paddingHorizontal: 2,
  },
  coordsTxt: {
    fontFamily: 'DMSans_500Medium', fontSize: 11,
    color: Colors.success,
  },

  // Form actions
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 4 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 12 },
  cancelBtnTxt: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.textSecondary },
  saveBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: Radius.sm, minWidth: 80, alignItems: 'center',
  },
  saveBtnTxt: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.primaryFg },
});
