import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Switch, Alert, ActivityIndicator,
  Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/constants/theme';

const EMPTY_ITEM = {
  name: '', description: '', price: '', image: '',
  is_available: true, is_popular: false, dietary: [] as string[],
};

export default function RestaurantInventory() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [restaurant, setRestaurant] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingCatIdx, setEditingCatIdx] = useState<number>(-1);
  const [itemForm, setItemForm] = useState({ ...EMPTY_ITEM });
  const [newCatName, setNewCatName] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('restaurants').select('*').eq('id', id).single();
    if (!error && data) {
      setRestaurant(data);
      setCategories(data.menu_categories || []);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, []);

  // ── Persist categories to Supabase ──────────────────────────────
  const persist = async (updated: any[]) => {
    setSaving(true);
    const { error } = await supabase
      .from('restaurants')
      .update({ menu_categories: updated })
      .eq('id', id);
    setSaving(false);
    if (error) Alert.alert('Error', 'Failed to save. Try again.');
    return !error;
  };

  // ── Category operations ─────────────────────────────────────────
  const addCategory = async () => {
    if (!newCatName.trim()) return;
    const catId = newCatName.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
    const updated = [...categories, { id: catId, name: newCatName.trim(), items: [] }];
    if (await persist(updated)) { setCategories(updated); setNewCatName(''); setShowCatModal(false); }
  };

  const deleteCategory = (catIdx: number) => {
    Alert.alert('Delete Category', 'Delete this category and all its items?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const updated = categories.filter((_, i) => i !== catIdx);
        if (await persist(updated)) setCategories(updated);
      }},
    ]);
  };

  // ── Item operations ─────────────────────────────────────────────
  const openAddItem = (catIdx: number) => {
    setEditingCatIdx(catIdx);
    setEditingItem(null);
    setItemForm({ ...EMPTY_ITEM });
    setShowItemModal(true);
  };

  const openEditItem = (catIdx: number, item: any) => {
    setEditingCatIdx(catIdx);
    setEditingItem(item);
    setItemForm({
      name: item.name,
      description: item.description || '',
      price: String(item.price),
      image: item.image || '',
      is_available: item.is_available ?? true,
      is_popular: item.is_popular ?? false,
      dietary: item.dietary || [],
    });
    setShowItemModal(true);
  };

  const saveItem = async () => {
    if (!itemForm.name || !itemForm.price) {
      Alert.alert('Error', 'Name and price are required.');
      return;
    }
    const price = parseFloat(itemForm.price);
    if (isNaN(price) || price <= 0) { Alert.alert('Error', 'Enter a valid price.'); return; }

    const newItem = {
      id: editingItem?.id || `item_${Date.now()}`,
      name: itemForm.name.trim(),
      description: itemForm.description.trim(),
      price,
      image: itemForm.image.trim(),
      is_available: itemForm.is_available,
      is_popular: itemForm.is_popular,
      dietary: itemForm.dietary,
    };

    const updated = categories.map((cat, ci) => {
      if (ci !== editingCatIdx) return cat;
      const items = editingItem
        ? cat.items.map((it: any) => it.id === editingItem.id ? newItem : it)
        : [...cat.items, newItem];
      return { ...cat, items };
    });

    if (await persist(updated)) { setCategories(updated); setShowItemModal(false); }
  };

  const toggleAvailable = async (catIdx: number, item: any) => {
    const updated = categories.map((cat, ci) => {
      if (ci !== catIdx) return cat;
      return {
        ...cat,
        items: cat.items.map((it: any) =>
          it.id === item.id ? { ...it, is_available: !it.is_available } : it
        ),
      };
    });
    setCategories(updated);
    await persist(updated);
  };

  const deleteItem = (catIdx: number, item: any) => {
    Alert.alert('Delete Item', `Delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const updated = categories.map((cat, ci) => {
          if (ci !== catIdx) return cat;
          return { ...cat, items: cat.items.filter((it: any) => it.id !== item.id) };
        });
        if (await persist(updated)) setCategories(updated);
      }},
    ]);
  };

  const toggleDietary = (tag: string) => {
    setItemForm(prev => ({
      ...prev,
      dietary: prev.dietary.includes(tag)
        ? prev.dietary.filter(d => d !== tag)
        : [...prev.dietary, tag],
    }));
  };

  if (loading) return (
    <View style={[s.container, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
      <ActivityIndicator color={Colors.primary} size="large" />
    </View>
  );

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.title} numberOfLines={1}>{restaurant?.name}</Text>
          <Text style={s.subtitle}>Menu Inventory</Text>
        </View>
        {saving && <ActivityIndicator color={Colors.primary} size="small" />}
        <TouchableOpacity style={s.addCatBtn} onPress={() => setShowCatModal(true)}>
          <Ionicons name="add" size={20} color={Colors.primaryFg} />
          <Text style={s.addCatTxt}>Category</Text>
        </TouchableOpacity>
      </View>

      {/* Stats bar */}
      <View style={s.statsBar}>
        <View style={s.stat}>
          <Text style={s.statVal}>{categories.length}</Text>
          <Text style={s.statLabel}>Categories</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.stat}>
          <Text style={s.statVal}>{categories.reduce((n, c) => n + c.items.length, 0)}</Text>
          <Text style={s.statLabel}>Total Items</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.stat}>
          <Text style={[s.statVal, { color: Colors.success }]}>
            {categories.reduce((n, c) => n + c.items.filter((i: any) => i.is_available).length, 0)}
          </Text>
          <Text style={s.statLabel}>Available</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.stat}>
          <Text style={[s.statVal, { color: Colors.error }]}>
            {categories.reduce((n, c) => n + c.items.filter((i: any) => !i.is_available).length, 0)}
          </Text>
          <Text style={s.statLabel}>Unavailable</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.screen, paddingBottom: 60 }}>
        {categories.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="restaurant-outline" size={64} color={Colors.border} />
            <Text style={s.emptyTxt}>No categories yet</Text>
            <Text style={s.emptySubTxt}>Tap "+ Category" to add your first menu section</Text>
          </View>
        ) : (
          categories.map((cat, catIdx) => (
            <View key={cat.id} style={s.categoryBlock}>
              {/* Category Header */}
              <View style={s.catHeader}>
                <Text style={s.catName}>{cat.name}</Text>
                <Text style={s.catCount}>{cat.items.length} items</Text>
                <View style={s.catActions}>
                  <TouchableOpacity style={s.catActionBtn} onPress={() => openAddItem(catIdx)}>
                    <Ionicons name="add-circle-outline" size={22} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={s.catActionBtn} onPress={() => deleteCategory(catIdx)}>
                    <Ionicons name="trash-outline" size={20} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Items */}
              {cat.items.length === 0 ? (
                <TouchableOpacity style={s.emptyItems} onPress={() => openAddItem(catIdx)}>
                  <Ionicons name="add" size={20} color={Colors.textSecondary} />
                  <Text style={s.emptyItemsTxt}>Add first item to {cat.name}</Text>
                </TouchableOpacity>
              ) : (
                cat.items.map((item: any) => (
                  <View key={item.id} style={[s.itemRow, !item.is_available && s.itemRowUnavailable]}>
                    <View style={s.itemInfo}>
                      <View style={s.itemNameRow}>
                        <Text style={[s.itemName, !item.is_available && { color: Colors.textSecondary }]}>
                          {item.name}
                        </Text>
                        {item.is_popular && (
                          <View style={s.popularBadge}>
                            <Text style={s.popularTxt}>★ POPULAR</Text>
                          </View>
                        )}
                      </View>
                      {item.description ? (
                        <Text style={s.itemDesc} numberOfLines={1}>{item.description}</Text>
                      ) : null}
                      <Text style={s.itemPrice}>₹{item.price?.toFixed(2)}</Text>
                      {item.dietary?.length > 0 && (
                        <View style={s.dietaryRow}>
                          {item.dietary.map((d: string) => (
                            <View key={d} style={s.dietaryBadge}>
                              <Text style={s.dietaryTxt}>{d}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                    <View style={s.itemControls}>
                      <Switch
                        value={item.is_available}
                        onValueChange={() => toggleAvailable(catIdx, item)}
                        thumbColor={item.is_available ? Colors.primary : Colors.border}
                        trackColor={{ false: Colors.surface, true: Colors.primary + '44' }}
                      />
                      <TouchableOpacity style={s.itemActionBtn} onPress={() => openEditItem(catIdx, item)}>
                        <Ionicons name="create-outline" size={18} color={Colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={s.itemActionBtn} onPress={() => deleteItem(catIdx, item)}>
                        <Ionicons name="trash-outline" size={18} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* ── Add Category Modal ────────────────────────────────── */}
      <Modal visible={showCatModal} animationType="slide" transparent>
        <View style={ms.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={ms.sheet}>
            <View style={ms.sheetHeader}>
              <Text style={ms.sheetTitle}>New Category</Text>
              <TouchableOpacity onPress={() => setShowCatModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <View style={{ padding: Spacing.screen }}>
              <Text style={ms.label}>Category Name</Text>
              <TextInput
                style={ms.input}
                placeholder="e.g. Starters, Biryanis, Desserts"
                placeholderTextColor={Colors.textSecondary}
                value={newCatName}
                onChangeText={setNewCatName}
                autoFocus
              />
              <TouchableOpacity style={ms.saveBtn} onPress={addCategory}>
                <Text style={ms.saveBtnTxt}>ADD CATEGORY</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ── Add/Edit Item Modal ───────────────────────────────── */}
      <Modal visible={showItemModal} animationType="slide" transparent>
        <View style={ms.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[ms.sheet, { maxHeight: '92%' }]}>
            <View style={ms.sheetHeader}>
              <Text style={ms.sheetTitle}>{editingItem ? 'Edit Item' : 'New Item'}</Text>
              <TouchableOpacity onPress={() => setShowItemModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.screen, paddingBottom: 32 }}>
              {/* Name */}
              <Text style={ms.label}>Item Name *</Text>
              <TextInput style={ms.input} placeholder="e.g. Chicken Biryani"
                placeholderTextColor={Colors.textSecondary}
                value={itemForm.name} onChangeText={v => setItemForm(p => ({ ...p, name: v }))} />

              {/* Price */}
              <Text style={ms.label}>Price (₹) *</Text>
              <TextInput style={ms.input} placeholder="e.g. 320"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="decimal-pad"
                value={itemForm.price} onChangeText={v => setItemForm(p => ({ ...p, price: v }))} />

              {/* Description */}
              <Text style={ms.label}>Description</Text>
              <TextInput style={[ms.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
                placeholder="Short description..."
                placeholderTextColor={Colors.textSecondary}
                multiline value={itemForm.description}
                onChangeText={v => setItemForm(p => ({ ...p, description: v }))} />

              {/* Image URL */}
              <Text style={ms.label}>Image URL</Text>
              <TextInput style={ms.input} placeholder="https://..."
                placeholderTextColor={Colors.textSecondary}
                value={itemForm.image} onChangeText={v => setItemForm(p => ({ ...p, image: v }))} />

              {/* Toggles */}
              <View style={ms.toggleRow}>
                <Text style={ms.label}>Available</Text>
                <Switch
                  value={itemForm.is_available}
                  onValueChange={v => setItemForm(p => ({ ...p, is_available: v }))}
                  thumbColor={itemForm.is_available ? Colors.primary : Colors.border}
                  trackColor={{ false: Colors.surface, true: Colors.primary + '44' }}
                />
              </View>
              <View style={ms.toggleRow}>
                <Text style={ms.label}>Mark as Popular ★</Text>
                <Switch
                  value={itemForm.is_popular}
                  onValueChange={v => setItemForm(p => ({ ...p, is_popular: v }))}
                  thumbColor={itemForm.is_popular ? Colors.primary : Colors.border}
                  trackColor={{ false: Colors.surface, true: Colors.primary + '44' }}
                />
              </View>

              {/* Dietary Tags */}
              <Text style={ms.label}>Dietary Tags</Text>
              <View style={ms.tagsRow}>
                {['vegetarian', 'vegan', 'gluten_free', 'spicy'].map(tag => (
                  <TouchableOpacity key={tag} style={[ms.tag, itemForm.dietary.includes(tag) && ms.tagActive]}
                    onPress={() => toggleDietary(tag)}>
                    <Text style={[ms.tagTxt, itemForm.dietary.includes(tag) && ms.tagTxtActive]}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={ms.saveBtn} onPress={saveItem} disabled={saving}>
                {saving
                  ? <ActivityIndicator color={Colors.primaryFg} />
                  : <Text style={ms.saveBtnTxt}>{editingItem ? 'UPDATE ITEM' : 'ADD ITEM'}</Text>}
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.screen, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 18, color: Colors.textPrimary },
  subtitle: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary },
  addCatBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 8 },
  addCatTxt: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.primaryFg },
  statsBar: { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: 12 },
  stat: { flex: 1, alignItems: 'center' },
  statVal: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 22, color: Colors.textPrimary },
  statLabel: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: Colors.border },
  categoryBlock: { marginBottom: 24, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  catHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.background },
  catName: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.textPrimary, flex: 1 },
  catCount: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary, marginRight: 8 },
  catActions: { flexDirection: 'row', gap: 4 },
  catActionBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  itemRowUnavailable: { opacity: 0.5 },
  itemInfo: { flex: 1 },
  itemNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemName: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.textPrimary },
  itemDesc: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  itemPrice: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.primary, marginTop: 4 },
  dietaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  dietaryBadge: { paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: Colors.border },
  dietaryTxt: { fontFamily: 'DMSans_400Regular', fontSize: 10, color: Colors.textSecondary },
  popularBadge: { backgroundColor: Colors.primary + '22', paddingHorizontal: 6, paddingVertical: 2 },
  popularTxt: { fontFamily: 'DMSans_700Bold', fontSize: 9, color: Colors.primary },
  itemControls: { flexDirection: 'column', alignItems: 'center', gap: 4 },
  itemActionBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyTxt: { fontFamily: 'DMSans_700Bold', fontSize: 18, color: Colors.textSecondary, marginTop: 16 },
  emptySubTxt: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textSecondary, marginTop: 8, textAlign: 'center' },
  emptyItems: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, justifyContent: 'center' },
  emptyItemsTxt: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textSecondary },
});

const ms = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.screen, borderBottomWidth: 1, borderBottomColor: Colors.border },
  sheetTitle: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20, color: Colors.textPrimary },
  label: { fontFamily: 'DMSans_700Bold', fontSize: 12, color: Colors.textSecondary, letterSpacing: 1, marginBottom: 8, marginTop: 16 },
  input: { height: 48, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, color: Colors.textPrimary, fontFamily: 'DMSans_400Regular', fontSize: 15 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border },
  tagActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tagTxt: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.textSecondary },
  tagTxtActive: { color: Colors.primaryFg },
  saveBtn: { marginTop: 24, height: 56, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  saveBtnTxt: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.primaryFg, letterSpacing: 2 },
});
