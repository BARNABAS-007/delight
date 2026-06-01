import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, ActivityIndicator, TextInput, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const C = {
  primary: '#4F46E5',
  primaryContainer: '#E2DFFF',
  secondary: '#006C49',
  error: '#BA1A1A',
  surface: '#FFFFFF',
  background: '#F9F9F9',
  onSurface: '#1B1B1B',
  onSurfaceVariant: '#464555',
  outlineVariant: '#C7C4D8',
  surfaceContainerHigh: '#E8E8E8',
  onPrimary: '#FFFFFF',
};

export default function OwnerAccount() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '', description: '', delivery_time: '', delivery_fee: '',
    min_order: '', price_range: '',
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('restaurants').select('*')
      .eq('owner_id', user.user_id).single();
    if (data) {
      setRestaurant(data);
      setEditForm({
        name: data.name || '',
        description: data.description || '',
        delivery_time: data.delivery_time || '',
        delivery_fee: String(data.delivery_fee || ''),
        min_order: String(data.min_order || ''),
        price_range: data.price_range || '',
      });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const toggleRestaurant = async () => {
    if (!restaurant) return;
    const newStatus = !restaurant.is_active;
    setRestaurant({ ...restaurant, is_active: newStatus });
    await supabase.from('restaurants')
      .update({ is_active: newStatus })
      .eq('id', restaurant.id);
  };

  const saveProfile = async () => {
    if (!restaurant) return;
    setSaving(true);
    const { error } = await supabase.from('restaurants').update({
      name: editForm.name,
      description: editForm.description,
      delivery_time: editForm.delivery_time,
      delivery_fee: parseFloat(editForm.delivery_fee) || 0,
      min_order: parseFloat(editForm.min_order) || 0,
      price_range: editForm.price_range,
    }).eq('id', restaurant.id);
    setSaving(false);
    if (error) {
      Alert.alert('Error', 'Failed to save changes.');
    } else {
      setShowEditModal(false);
      load();
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        await logout();
        router.replace('/(auth)/login');
      }},
    ]);
  };

  if (loading) return (
    <View style={[s.container, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
      <ActivityIndicator color={C.primary} size="large" />
    </View>
  );

  if (!restaurant) {
    return (
      <View style={[s.container, { paddingTop: insets.top, backgroundColor: C.background }]}>
        <View style={s.header}>
          <Text style={s.headerTitle}>Account</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: C.primaryContainer, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Ionicons name="restaurant" size={36} color={C.primary} />
          </View>
          <Text style={{ fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20, color: C.onSurface, textAlign: 'center' }}>Dhaba Storefront Inactive</Text>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: C.onSurfaceVariant, textAlign: 'center', marginTop: 8, lineHeight: 20, marginBottom: 20 }}>
            You haven't set up your Dhaba on Delight yet. Please visit the **Home** tab to activate your Dhaba storefront instantly!
          </Text>
          
          <TouchableOpacity style={[s.logoutBtn, { width: '100%' }]} onPress={handleLogout} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={20} color={C.error} />
            <Text style={s.logoutTxt}>Logout from Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Account</Text>
        <View style={s.avatar}>
          <Ionicons name="person" size={18} color={C.primary} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Profile Card */}
        <View style={s.profileCard}>
          <View style={s.profileAvatar}>
            <Ionicons name="person" size={32} color={C.primary} />
          </View>
          <Text style={s.profileName}>{user?.name || 'Restaurant Owner'}</Text>
          <Text style={s.profileEmail}>{user?.email}</Text>
          <Text style={s.profileRole}>Restaurant Owner</Text>
        </View>

        {/* Restaurant Info Section */}
        {restaurant && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Restaurant Details</Text>
              <TouchableOpacity onPress={() => setShowEditModal(true)}>
                <Ionicons name="create-outline" size={20} color={C.primary} />
              </TouchableOpacity>
            </View>

            <View style={s.card}>
              <InfoRow icon="restaurant-outline" label="Name" value={restaurant.name} />
              <InfoRow icon="fast-food-outline" label="Cuisine" value={restaurant.cuisine?.join(', ') || '-'} />
              <InfoRow icon="time-outline" label="Delivery Time" value={restaurant.delivery_time || '-'} />
              <InfoRow icon="cash-outline" label="Delivery Fee" value={`₹${restaurant.delivery_fee || 0}`} />
              <InfoRow icon="cart-outline" label="Min Order" value={`₹${restaurant.min_order || 0}`} />
              <InfoRow icon="pricetags-outline" label="Price Range" value={restaurant.price_range || '-'} last />
            </View>
          </View>
        )}

        {/* Restaurant Status */}
        {restaurant && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Restaurant Status</Text>
            <View style={s.card}>
              <View style={s.toggleRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={[s.statusDot, {
                    backgroundColor: restaurant.is_active ? C.secondary : C.error
                  }]} />
                  <View>
                    <Text style={s.toggleLabel}>
                      {restaurant.is_active ? 'Restaurant is Open' : 'Restaurant is Closed'}
                    </Text>
                    <Text style={s.toggleSub}>
                      {restaurant.is_active ? 'Accepting orders' : 'Not accepting orders'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={restaurant.is_active}
                  onValueChange={toggleRestaurant}
                  thumbColor={restaurant.is_active ? C.secondary : '#ccc'}
                  trackColor={{ false: '#E2E2E2', true: C.secondary + '44' }}
                />
              </View>
            </View>
          </View>
        )}

        {/* Quick Stats */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Quick Actions</Text>
          <View style={s.card}>
            <ActionRow icon="notifications-outline" label="Notifications" sub="Order alerts, updates" onPress={() => {}} />
            <ActionRow icon="shield-checkmark-outline" label="Privacy & Security" sub="Password, data" onPress={() => {}} />
            <ActionRow icon="help-circle-outline" label="Help & Support" sub="FAQs, contact us" onPress={() => {}} />
            <ActionRow icon="document-text-outline" label="Terms & Conditions" sub="Legal information" onPress={() => {}} last />
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color={C.error} />
          <Text style={s.logoutTxt}>Logout</Text>
        </TouchableOpacity>

        <Text style={s.version}>Delight v1.0.0</Text>
      </ScrollView>

      {/* Edit Restaurant Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={ms.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={ms.sheet}
          >
            <View style={ms.sheetHeader}>
              <Text style={ms.sheetTitle}>Edit Restaurant</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={C.onSurface} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
              <Text style={ms.label}>RESTAURANT NAME</Text>
              <TextInput
                style={ms.input}
                value={editForm.name}
                onChangeText={v => setEditForm(p => ({ ...p, name: v }))}
                placeholder="Restaurant name"
                placeholderTextColor={C.onSurfaceVariant}
              />

              <Text style={ms.label}>DESCRIPTION</Text>
              <TextInput
                style={[ms.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
                value={editForm.description}
                onChangeText={v => setEditForm(p => ({ ...p, description: v }))}
                placeholder="Describe your restaurant"
                placeholderTextColor={C.onSurfaceVariant}
                multiline
              />

              <Text style={ms.label}>DELIVERY TIME</Text>
              <TextInput
                style={ms.input}
                value={editForm.delivery_time}
                onChangeText={v => setEditForm(p => ({ ...p, delivery_time: v }))}
                placeholder="e.g. 30-40 min"
                placeholderTextColor={C.onSurfaceVariant}
              />

              <Text style={ms.label}>DELIVERY FEE (₹)</Text>
              <TextInput
                style={ms.input}
                value={editForm.delivery_fee}
                onChangeText={v => setEditForm(p => ({ ...p, delivery_fee: v }))}
                keyboardType="decimal-pad"
                placeholder="e.g. 2.99"
                placeholderTextColor={C.onSurfaceVariant}
              />

              <Text style={ms.label}>MINIMUM ORDER (₹)</Text>
              <TextInput
                style={ms.input}
                value={editForm.min_order}
                onChangeText={v => setEditForm(p => ({ ...p, min_order: v }))}
                keyboardType="decimal-pad"
                placeholder="e.g. 15.00"
                placeholderTextColor={C.onSurfaceVariant}
              />

              <Text style={ms.label}>PRICE RANGE</Text>
              <View style={ms.priceRangeRow}>
                {['$', '$$', '$$$', '$$$$'].map(pr => (
                  <TouchableOpacity
                    key={pr}
                    style={[ms.priceChip, editForm.price_range === pr && ms.priceChipActive]}
                    onPress={() => setEditForm(p => ({ ...p, price_range: pr }))}
                  >
                    <Text style={[ms.priceChipTxt, editForm.price_range === pr && ms.priceChipTxtActive]}>
                      {pr}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={ms.saveBtn} onPress={saveProfile} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color={C.onPrimary} />
                ) : (
                  <Text style={ms.saveBtnTxt}>SAVE CHANGES</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

function InfoRow({ icon, label, value, last }: { icon: string; label: string; value: string; last?: boolean }) {
  return (
    <View style={[s.infoRow, !last && { borderBottomWidth: 1, borderBottomColor: C.outlineVariant + '20' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Ionicons name={icon as any} size={18} color={C.onSurfaceVariant} />
        <Text style={s.infoLabel}>{label}</Text>
      </View>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

function ActionRow({ icon, label, sub, onPress, last }: { icon: string; label: string; sub: string; onPress: () => void; last?: boolean }) {
  return (
    <TouchableOpacity
      style={[s.actionRow, !last && { borderBottomWidth: 1, borderBottomColor: C.outlineVariant + '20' }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon as any} size={20} color={C.onSurfaceVariant} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={s.actionLabel}>{label}</Text>
        <Text style={s.actionSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={C.outlineVariant} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, height: 56, backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.outlineVariant + '40',
  },
  headerTitle: { fontFamily: 'DMSans_700Bold', fontSize: 20, color: C.primary },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.primaryContainer, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: C.primary + '30',
  },

  profileCard: {
    alignItems: 'center', paddingVertical: 32, marginHorizontal: 24, marginTop: 16,
    backgroundColor: C.surface, borderRadius: 16,
    borderWidth: 1, borderColor: C.outlineVariant + '30',
  },
  profileAvatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: C.primaryContainer, alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  profileName: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 22, color: C.onSurface },
  profileEmail: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: C.onSurfaceVariant, marginTop: 4 },
  profileRole: {
    fontFamily: 'DMSans_700Bold', fontSize: 11, color: C.primary,
    backgroundColor: C.primaryContainer, paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 100, marginTop: 8, letterSpacing: 0.5, overflow: 'hidden',
  },

  section: { paddingHorizontal: 24, marginTop: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: C.onSurface, marginBottom: 12 },

  card: {
    backgroundColor: C.surface, borderRadius: 12,
    borderWidth: 1, borderColor: C.outlineVariant + '30',
    overflow: 'hidden',
  },

  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  infoLabel: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: C.onSurfaceVariant },
  infoValue: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: C.onSurface },

  toggleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 16,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  toggleLabel: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: C.onSurface },
  toggleSub: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: C.onSurfaceVariant, marginTop: 2 },

  actionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 16,
  },
  actionLabel: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: C.onSurface },
  actionSub: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: C.onSurfaceVariant, marginTop: 2 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    marginHorizontal: 24, marginTop: 32, paddingVertical: 16,
    backgroundColor: C.surface, borderRadius: 12,
    borderWidth: 1, borderColor: C.error + '30',
  },
  logoutTxt: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: C.error },
  version: {
    fontFamily: 'DMSans_400Regular', fontSize: 12, color: C.onSurfaceVariant,
    textAlign: 'center', marginTop: 16,
  },
});

const ms = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 24, borderBottomWidth: 1, borderBottomColor: C.outlineVariant + '30',
  },
  sheetTitle: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20, color: C.onSurface },
  label: {
    fontFamily: 'DMSans_700Bold', fontSize: 11, color: C.onSurfaceVariant,
    letterSpacing: 1.2, marginBottom: 8, marginTop: 20,
  },
  input: {
    height: 48, backgroundColor: C.background, borderWidth: 1, borderColor: C.outlineVariant + '60',
    borderRadius: 8, paddingHorizontal: 14,
    fontFamily: 'DMSans_400Regular', fontSize: 15, color: C.onSurface,
  },
  priceRangeRow: { flexDirection: 'row', gap: 10 },
  priceChip: {
    flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center',
    backgroundColor: C.background, borderWidth: 1, borderColor: C.outlineVariant + '60',
  },
  priceChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  priceChipTxt: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: C.onSurfaceVariant },
  priceChipTxtActive: { color: C.onPrimary },
  saveBtn: {
    marginTop: 32, height: 52, backgroundColor: C.primary,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  saveBtnTxt: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: C.onPrimary, letterSpacing: 1 },
});
