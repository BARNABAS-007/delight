import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image,
  Modal, TextInput, ScrollView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/services/api';
import { Colors, Spacing } from '@/constants/theme';

const EMPTY_FORM = {
  name: '', cuisine: '', description: '', image: '', cover_image: '',
  rating: '4.5', review_count: '100', delivery_time: '30-40 min',
  delivery_fee: '2.99', min_order: '15', price_range: '$$', tags: '',
};

export default function AdminRestaurants() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const load = useCallback(async () => {
    try {
      const data: any = await api.adminGetRestaurants();
      setRestaurants(data);
    } catch { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (r: any) => {
    setEditing(r);
    setForm({
      name: r.name, cuisine: r.cuisine?.join(', '), description: r.description,
      image: r.image, cover_image: r.cover_image || '', rating: String(r.rating),
      review_count: String(r.review_count), delivery_time: r.delivery_time,
      delivery_fee: String(r.delivery_fee), min_order: String(r.min_order),
      price_range: r.price_range, tags: r.tags?.join(', ') || '',
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name || !form.cuisine) { Alert.alert('Error', 'Name and cuisine are required'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name, cuisine: form.cuisine.split(',').map(s => s.trim()),
        description: form.description, image: form.image, cover_image: form.cover_image,
        rating: parseFloat(form.rating) || 4.5, review_count: parseInt(form.review_count) || 100,
        delivery_time: form.delivery_time, delivery_fee: parseFloat(form.delivery_fee) || 2.99,
        min_order: parseFloat(form.min_order) || 15, price_range: form.price_range,
        tags: form.tags.split(',').map(s => s.trim()).filter(Boolean),
        menu_categories: editing?.menu_categories || [],
      };
      if (editing) await api.adminUpdateRestaurant(editing.id, payload);
      else await api.adminCreateRestaurant(payload);
      setShowModal(false);
      await load();
    } catch (e: any) { Alert.alert('Error', e?.detail || 'Save failed'); }
    finally { setSaving(false); }
  };

  const remove = (r: any) => {
    Alert.alert('Delete Restaurant', `Delete "${r.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await api.adminDeleteRestaurant(r.id);
        await load();
      }},
    ]);
  };

  const F = ({ label, fkey }: { label: string; fkey: keyof typeof EMPTY_FORM }) => (
    <View style={ms.field}>
      <Text style={ms.fieldLabel}>{label}</Text>
      <TextInput style={ms.fieldInput} placeholderTextColor={Colors.textSecondary}
        value={form[fkey]} onChangeText={v => setForm(prev => ({ ...prev, [fkey]: v }))} />
    </View>
  );

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity testID="back-btn" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={s.title}>Restaurants</Text>
        <TouchableOpacity testID="add-restaurant-btn" style={s.addBtn} onPress={openCreate}>
          <Ionicons name="add" size={24} color={Colors.primaryFg} />
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} /> : (
        <FlatList
          data={restaurants}
          keyExtractor={r => r.id}
          contentContainerStyle={{ padding: Spacing.screen }}
          renderItem={({ item: r }) => (
            <View testID={`admin-rest-${r.id}`} style={s.card}>
              <Image source={{ uri: r.image }} style={s.cardImg} />
              <View style={s.cardInfo}>
                <Text style={s.cardName} numberOfLines={1}>{r.name}</Text>
                <Text style={s.cardCuisine}>{r.cuisine?.join(' · ')}</Text>
                <Text style={s.cardStats}>{r.rating}★ · {r.price_range} · {r.delivery_time}</Text>
              </View>
              <View style={s.cardActions}>
                <TouchableOpacity testID={`edit-rest-${r.id}`} style={s.actionBtn} onPress={() => openEdit(r)}>
                  <Ionicons name="create-outline" size={18} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity testID={`delete-rest-${r.id}`} style={s.actionBtn} onPress={() => remove(r)}>
                  <Ionicons name="trash-outline" size={18} color={Colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={ms.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={ms.sheet}>
            <View style={ms.sheetHeader}>
              <Text style={ms.sheetTitle}>{editing ? 'Edit Restaurant' : 'Add Restaurant'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              <F label="Name *" fkey="name" />
              <F label="Cuisine (comma separated) *" fkey="cuisine" />
              <F label="Description" fkey="description" />
              <F label="Image URL" fkey="image" />
              <F label="Cover Image URL" fkey="cover_image" />
              <F label="Rating (e.g. 4.5)" fkey="rating" />
              <F label="Review Count" fkey="review_count" />
              <F label="Delivery Time (e.g. 30-40 min)" fkey="delivery_time" />
              <F label="Delivery Fee ($)" fkey="delivery_fee" />
              <F label="Min Order ($)" fkey="min_order" />
              <F label="Price Range ($, $$, $$$, $$$$)" fkey="price_range" />
              <F label="Tags (comma separated)" fkey="tags" />
              <TouchableOpacity testID="save-restaurant-btn" style={ms.saveBtn} onPress={save} disabled={saving}>
                {saving ? <ActivityIndicator color={Colors.primaryFg} /> : <Text style={ms.saveBtnTxt}>{editing ? 'UPDATE' : 'CREATE'}</Text>}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.screen, paddingVertical: 16 },
  title: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 22, color: Colors.textPrimary },
  addBtn: { width: 44, height: 44, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  card: { flexDirection: 'row', borderWidth: 1, borderColor: Colors.border, marginBottom: 10, overflow: 'hidden', backgroundColor: Colors.surface },
  cardImg: { width: 80, height: 80, resizeMode: 'cover' },
  cardInfo: { flex: 1, padding: 12 },
  cardName: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.textPrimary },
  cardCuisine: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  cardStats: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  cardActions: { justifyContent: 'center', paddingHorizontal: 12, gap: 12 },
  actionBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});

const ms = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.surface, maxHeight: '90%', borderTopWidth: 1, borderTopColor: Colors.border },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.screen, borderBottomWidth: 1, borderBottomColor: Colors.border },
  sheetTitle: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20, color: Colors.textPrimary },
  field: { paddingHorizontal: Spacing.screen, marginTop: 16 },
  fieldLabel: { fontFamily: 'DMSans_700Bold', fontSize: 12, color: Colors.textSecondary, letterSpacing: 1, marginBottom: 8 },
  fieldInput: { height: 48, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, color: Colors.textPrimary, fontFamily: 'DMSans_400Regular', fontSize: 15 },
  saveBtn: { marginHorizontal: Spacing.screen, marginTop: 24, height: 56, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  saveBtnTxt: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.primaryFg, letterSpacing: 2 },
});
