import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Switch, Alert, ActivityIndicator, Image,
  Modal, KeyboardAvoidingView, Platform, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const C = {
  primary: '#4F46E5',
  primaryContainer: '#E2DFFF',
  secondary: '#006C49',
  tertiary: '#885500',
  error: '#BA1A1A',
  surface: '#FFFFFF',
  background: '#F9F9F9',
  onSurface: '#1B1B1B',
  onSurfaceVariant: '#464555',
  outlineVariant: '#C7C4D8',
  surfaceContainerHigh: '#E8E8E8',
  onPrimary: '#FFFFFF',
};

const EMPTY_ITEM = {
  name: '', description: '', price: '', image: '',
  is_available: true, is_popular: false, dietary: [] as string[],
};

export default function OwnerInventory() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [restaurant, setRestaurant] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingCatIdx, setEditingCatIdx] = useState<number>(-1);
  const [itemForm, setItemForm] = useState({ ...EMPTY_ITEM });
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newCatName, setNewCatName] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('restaurants').select('*')
      .eq('owner_id', user.user_id).single();
    if (!error && data) {
      setRestaurant(data);
      setCategories(data.menu_categories || []);
    }
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // ── Persist to Supabase ────────────────────────────────────
  const persist = async (updated: any[]) => {
    setSaving(true);
    const { error } = await supabase
      .from('restaurants')
      .update({ menu_categories: updated })
      .eq('id', restaurant.id);
    setSaving(false);
    if (error) {
      Alert.alert('Error', 'Failed to save changes. Please try again.');
      return false;
    }
    return true;
  };

  // ── Category Operations ────────────────────────────────────
  const addCategory = async () => {
    if (!newCatName.trim()) return;
    const catId = newCatName.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
    const updated = [...categories, { id: catId, name: newCatName.trim(), items: [] }];
    if (await persist(updated)) {
      setCategories(updated);
      setNewCatName('');
      setShowCatModal(false);
    }
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

  // ── Item Operations ────────────────────────────────────────
  const openAddItem = () => {
    setEditingItem(null);
    setEditingCatIdx(-1);
    setItemForm({ ...EMPTY_ITEM });
    setSelectedCategory(categories.length > 0 ? categories[0].id : '');
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
    setSelectedCategory(categories[catIdx]?.id || '');
    setShowItemModal(true);
  };

  const saveItem = async () => {
    if (!itemForm.name.trim()) {
      Alert.alert('Error', 'Item name is required.');
      return;
    }
    const price = parseFloat(itemForm.price);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Enter a valid price.');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a category.');
      return;
    }

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

    let updated: any[];

    if (editingItem) {
      // Editing existing item
      const targetCatIdx = categories.findIndex(c => c.id === selectedCategory);
      if (targetCatIdx === editingCatIdx) {
        // Same category — just update
        updated = categories.map((cat, ci) => {
          if (ci !== editingCatIdx) return cat;
          return { ...cat, items: cat.items.map((it: any) => it.id === editingItem.id ? newItem : it) };
        });
      } else {
        // Moving to different category — remove from old, add to new
        updated = categories.map((cat, ci) => {
          if (ci === editingCatIdx) {
            return { ...cat, items: cat.items.filter((it: any) => it.id !== editingItem.id) };
          }
          if (ci === targetCatIdx) {
            return { ...cat, items: [...cat.items, newItem] };
          }
          return cat;
        });
      }
    } else {
      // Adding new item
      const targetCatIdx = categories.findIndex(c => c.id === selectedCategory);
      updated = categories.map((cat, ci) => {
        if (ci !== targetCatIdx) return cat;
        return { ...cat, items: [...cat.items, newItem] };
      });
    }

    if (await persist(updated)) {
      setCategories(updated);
      setShowItemModal(false);
    }
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

  // ── Filtered items ─────────────────────────────────────────
  const allItems: { item: any; catIdx: number; catName: string }[] = [];
  categories.forEach((cat, ci) => {
    (cat.items || []).forEach((item: any) => {
      if (activeCategory !== 'all' && cat.id !== activeCategory) return;
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return;
      allItems.push({ item, catIdx: ci, catName: cat.name });
    });
  });

  if (loading) return (
    <View style={[s.container, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
      <ActivityIndicator color={C.primary} size="large" />
    </View>
  );

  if (!restaurant) {
    return (
      <View style={[s.container, { paddingTop: insets.top, backgroundColor: C.background }]}>
        <View style={s.header}>
          <Text style={s.headerTitle}>Inventory</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: C.primaryContainer, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Ionicons name="restaurant" size={36} color={C.primary} />
          </View>
          <Text style={{ fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20, color: C.onSurface, textAlign: 'center' }}>Dhaba Storefront Inactive</Text>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: C.onSurfaceVariant, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
            You haven't set up your Dhaba on Delight yet. Please visit the **Home** tab to activate your Dhaba storefront instantly!
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Inventory</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {saving && <ActivityIndicator size="small" color={C.primary} />}
          <View style={s.avatar}>
            <Ionicons name="person" size={18} color={C.primary} />
          </View>
        </View>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={18} color={C.onSurfaceVariant} />
        <TextInput
          style={s.searchInput}
          placeholder="Search specific items..."
          placeholderTextColor={C.onSurfaceVariant + '80'}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={C.onSurfaceVariant} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filter Chips */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chipsRow}
      >
        <TouchableOpacity
          style={[s.chip, activeCategory === 'all' && s.chipActive]}
          onPress={() => setActiveCategory('all')}
        >
          <Text style={[s.chipTxt, activeCategory === 'all' && s.chipTxtActive]}>All Items</Text>
        </TouchableOpacity>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[s.chip, activeCategory === cat.id && s.chipActive]}
            onPress={() => setActiveCategory(cat.id)}
          >
            <Text style={[s.chipTxt, activeCategory === cat.id && s.chipTxtActive]}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={s.chipAdd} onPress={() => setShowCatModal(true)}>
          <Ionicons name="add" size={16} color={C.primary} />
          <Text style={[s.chipTxt, { color: C.primary }]}>Add</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Items List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.primary} />
        }
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
      >
        {allItems.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="fast-food-outline" size={48} color={C.outlineVariant} />
            <Text style={s.emptyTitle}>No items found</Text>
            <Text style={s.emptySub}>
              {search ? 'Try a different search term' : 'Tap + to add your first menu item'}
            </Text>
          </View>
        ) : (
          allItems.map(({ item, catIdx, catName }) => (
            <TouchableOpacity
              key={item.id}
              style={s.itemCard}
              onPress={() => openEditItem(catIdx, item)}
              onLongPress={() => deleteItem(catIdx, item)}
              activeOpacity={0.7}
            >
              {/* Item Image */}
              <View style={s.itemImageWrap}>
                {item.image ? (
                  <Image source={{ uri: item.image }} style={s.itemImage} />
                ) : (
                  <View style={[s.itemImage, s.itemImagePlaceholder]}>
                    <Ionicons name="image-outline" size={24} color={C.outlineVariant} />
                  </View>
                )}
              </View>

              {/* Item Info */}
              <View style={s.itemInfo}>
                <Text style={s.itemName} numberOfLines={1}>{item.name}</Text>
                <Text style={s.itemPrice}>₹ {item.price?.toFixed(2)}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <Text style={[s.stockLabel, {
                    color: item.is_available ? C.secondary : C.error,
                  }]}>
                    {item.is_available ? 'IN STOCK' : 'OUT OF STOCK'}
                  </Text>
                  <Switch
                    value={item.is_available}
                    onValueChange={() => toggleAvailable(catIdx, item)}
                    thumbColor={item.is_available ? C.secondary : '#ccc'}
                    trackColor={{ false: '#E2E2E2', true: C.secondary + '44' }}
                    style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                  />
                </View>
              </View>

              {/* Edit chevron */}
              <Ionicons name="chevron-forward" size={18} color={C.outlineVariant} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          ))
        )}

        {/* Category Management (at bottom) */}
        {categories.length > 0 && activeCategory !== 'all' && (
          <TouchableOpacity
            style={s.deleteCatBtn}
            onPress={() => {
              const idx = categories.findIndex(c => c.id === activeCategory);
              if (idx >= 0) deleteCategory(idx);
            }}
          >
            <Ionicons name="trash-outline" size={16} color={C.error} />
            <Text style={s.deleteCatTxt}>Delete this category</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={openAddItem} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color={C.onPrimary} />
      </TouchableOpacity>

      {/* ── Add Category Modal ──────────────────────────────── */}
      <Modal visible={showCatModal} animationType="slide" transparent>
        <View style={ms.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={ms.sheet}
          >
            <View style={ms.sheetHeader}>
              <Text style={ms.sheetTitle}>Add Category</Text>
              <TouchableOpacity onPress={() => setShowCatModal(false)}>
                <Ionicons name="close" size={24} color={C.onSurface} />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 24 }}>
              <Text style={ms.label}>CATEGORY NAME</Text>
              <TextInput
                style={ms.input}
                placeholder="e.g. Starters, Biryani, Desserts"
                placeholderTextColor={C.onSurfaceVariant + '80'}
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

      {/* ── Add/Edit Item Modal ─────────────────────────────── */}
      <Modal visible={showItemModal} animationType="slide" transparent>
        <View style={ms.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[ms.sheet, { maxHeight: '92%' }]}
          >
            <View style={ms.sheetHeader}>
              <Text style={ms.sheetTitle}>{editingItem ? 'Edit Item' : 'Add New Item'}</Text>
              <TouchableOpacity onPress={() => setShowItemModal(false)}>
                <Ionicons name="close" size={24} color={C.onSurface} />
              </TouchableOpacity>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
            >
              {/* Photo Section */}
              <Text style={ms.sectionLabel}>ITEM PHOTO</Text>
              <View style={ms.photoSection}>
                {itemForm.image ? (
                  <Image source={{ uri: itemForm.image }} style={ms.photoPreview} />
                ) : (
                  <View style={ms.photoPlaceholder}>
                    <Ionicons name="camera-outline" size={32} color={C.outlineVariant} />
                    <Text style={ms.photoHint}>Add item photo</Text>
                    <Text style={ms.photoFormat}>JPG, PNG or WEBP (Max 5MB)</Text>
                  </View>
                )}
              </View>
              <TextInput
                style={ms.input}
                placeholder="Image URL (https://...)"
                placeholderTextColor={C.onSurfaceVariant + '80'}
                value={itemForm.image}
                onChangeText={v => setItemForm(p => ({ ...p, image: v }))}
              />

              {/* Basic Information */}
              <Text style={[ms.sectionLabel, { marginTop: 24 }]}>BASIC INFORMATION</Text>
              <Text style={ms.label}>ITEM NAME *</Text>
              <TextInput
                style={ms.input}
                placeholder="e.g. Paneer Butter Masala"
                placeholderTextColor={C.onSurfaceVariant + '80'}
                value={itemForm.name}
                onChangeText={v => setItemForm(p => ({ ...p, name: v }))}
              />

              <Text style={ms.label}>DESCRIPTION</Text>
              <TextInput
                style={[ms.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
                placeholder="Briefly describe the ingredients and flavor profile..."
                placeholderTextColor={C.onSurfaceVariant + '80'}
                multiline
                value={itemForm.description}
                onChangeText={v => setItemForm(p => ({ ...p, description: v }))}
              />

              {/* Pricing */}
              <Text style={[ms.sectionLabel, { marginTop: 24 }]}>PRICING</Text>
              <Text style={ms.label}>PRICE (₹) *</Text>
              <TextInput
                style={ms.input}
                placeholder="e.g. 320"
                placeholderTextColor={C.onSurfaceVariant + '80'}
                keyboardType="decimal-pad"
                value={itemForm.price}
                onChangeText={v => setItemForm(p => ({ ...p, price: v }))}
              />

              {/* Availability */}
              <Text style={[ms.sectionLabel, { marginTop: 24 }]}>AVAILABILITY</Text>
              <View style={ms.toggleRow}>
                <View>
                  <Text style={ms.toggleLabel}>Available for order</Text>
                  <Text style={ms.toggleSub}>Customers can see and order this item</Text>
                </View>
                <Switch
                  value={itemForm.is_available}
                  onValueChange={v => setItemForm(p => ({ ...p, is_available: v }))}
                  thumbColor={itemForm.is_available ? C.secondary : '#ccc'}
                  trackColor={{ false: '#E2E2E2', true: C.secondary + '44' }}
                />
              </View>
              <View style={ms.toggleRow}>
                <View>
                  <Text style={ms.toggleLabel}>Mark as Popular ★</Text>
                  <Text style={ms.toggleSub}>Highlight as a bestseller</Text>
                </View>
                <Switch
                  value={itemForm.is_popular}
                  onValueChange={v => setItemForm(p => ({ ...p, is_popular: v }))}
                  thumbColor={itemForm.is_popular ? C.primary : '#ccc'}
                  trackColor={{ false: '#E2E2E2', true: C.primary + '44' }}
                />
              </View>

              {/* Category */}
              <Text style={[ms.sectionLabel, { marginTop: 24 }]}>CATEGORY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {categories.map(cat => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[ms.catChip, selectedCategory === cat.id && ms.catChipActive]}
                      onPress={() => setSelectedCategory(cat.id)}
                    >
                      <Text style={[ms.catChipTxt, selectedCategory === cat.id && ms.catChipTxtActive]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Dietary Tags */}
              <Text style={[ms.sectionLabel, { marginTop: 16 }]}>DIETARY TAGS</Text>
              <View style={ms.tagsRow}>
                {['vegetarian', 'vegan', 'gluten_free', 'spicy'].map(tag => (
                  <TouchableOpacity
                    key={tag}
                    style={[ms.tag, itemForm.dietary.includes(tag) && ms.tagActive]}
                    onPress={() => {
                      setItemForm(p => ({
                        ...p,
                        dietary: p.dietary.includes(tag)
                          ? p.dietary.filter(d => d !== tag)
                          : [...p.dietary, tag],
                      }));
                    }}
                  >
                    <Text style={[ms.tagTxt, itemForm.dietary.includes(tag) && ms.tagTxtActive]}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Action Buttons */}
              <View style={ms.actionRow}>
                <TouchableOpacity
                  style={ms.cancelBtn}
                  onPress={() => setShowItemModal(false)}
                >
                  <Text style={ms.cancelBtnTxt}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[ms.saveBtn, { flex: 1 }]}
                  onPress={saveItem}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color={C.onPrimary} />
                  ) : (
                    <Text style={ms.saveBtnTxt}>{editingItem ? 'Save Item' : 'Save Item'}</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Delete button for editing */}
              {editingItem && (
                <TouchableOpacity
                  style={ms.deleteBtn}
                  onPress={() => {
                    setShowItemModal(false);
                    setTimeout(() => deleteItem(editingCatIdx, editingItem), 300);
                  }}
                >
                  <Ionicons name="trash-outline" size={16} color={C.error} />
                  <Text style={ms.deleteBtnTxt}>Delete Item</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
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

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 24, marginTop: 16, marginBottom: 12,
    backgroundColor: C.surface, borderRadius: 12,
    borderWidth: 1, borderColor: C.outlineVariant + '60',
    paddingHorizontal: 14, height: 44,
  },
  searchInput: {
    flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 14, color: C.onSurface,
  },

  chipsRow: { paddingHorizontal: 24, gap: 8, paddingBottom: 12 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100,
    backgroundColor: C.surfaceContainerHigh,
  },
  chipActive: { backgroundColor: C.primary },
  chipTxt: { fontFamily: 'DMSans_700Bold', fontSize: 12, color: C.onSurfaceVariant, letterSpacing: 0.3 },
  chipTxtActive: { color: C.onPrimary },
  chipAdd: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100,
    borderWidth: 1, borderColor: C.primary + '40', borderStyle: 'dashed',
  },

  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyTitle: { fontFamily: 'DMSans_700Bold', fontSize: 17, color: C.onSurfaceVariant, marginTop: 16 },
  emptySub: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: C.onSurfaceVariant + '99', marginTop: 6, textAlign: 'center' },

  itemCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: 12, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: C.outlineVariant + '30',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4,
    elevation: 1,
  },
  itemImageWrap: { marginRight: 14 },
  itemImage: { width: 64, height: 64, borderRadius: 10 },
  itemImagePlaceholder: {
    backgroundColor: C.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center',
  },
  itemInfo: { flex: 1 },
  itemName: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: C.onSurface },
  itemPrice: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: C.secondary, marginTop: 2 },
  stockLabel: { fontFamily: 'DMSans_700Bold', fontSize: 10, letterSpacing: 0.8 },

  deleteCatBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 16, paddingVertical: 14, borderRadius: 10,
    borderWidth: 1, borderColor: C.error + '30',
  },
  deleteCatTxt: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: C.error },

  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12,
    elevation: 8,
  },
});

const ms = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 24, borderBottomWidth: 1, borderBottomColor: C.outlineVariant + '30',
  },
  sheetTitle: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20, color: C.onSurface },

  sectionLabel: {
    fontFamily: 'DMSans_700Bold', fontSize: 13, color: C.primary,
    letterSpacing: 0.5, marginBottom: 12,
  },

  photoSection: { marginBottom: 12 },
  photoPreview: { width: '100%', height: 160, borderRadius: 12, backgroundColor: C.surfaceContainerHigh },
  photoPlaceholder: {
    width: '100%', height: 120, borderRadius: 12,
    backgroundColor: C.background, borderWidth: 1, borderColor: C.outlineVariant + '60',
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center',
  },
  photoHint: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: C.onSurfaceVariant, marginTop: 8 },
  photoFormat: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: C.onSurfaceVariant + '80', marginTop: 2 },

  label: {
    fontFamily: 'DMSans_700Bold', fontSize: 11, color: C.onSurfaceVariant,
    letterSpacing: 1.2, marginBottom: 8, marginTop: 12,
  },
  input: {
    height: 48, backgroundColor: C.background, borderWidth: 1, borderColor: C.outlineVariant + '60',
    borderRadius: 8, paddingHorizontal: 14,
    fontFamily: 'DMSans_400Regular', fontSize: 15, color: C.onSurface,
  },

  toggleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.outlineVariant + '15',
  },
  toggleLabel: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: C.onSurface },
  toggleSub: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: C.onSurfaceVariant, marginTop: 2 },

  catChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8,
    backgroundColor: C.background, borderWidth: 1, borderColor: C.outlineVariant + '60',
  },
  catChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  catChipTxt: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: C.onSurfaceVariant },
  catChipTxtActive: { color: C.onPrimary },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: C.outlineVariant + '60',
  },
  tagActive: { backgroundColor: C.primary, borderColor: C.primary },
  tagTxt: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: C.onSurfaceVariant },
  tagTxtActive: { color: C.onPrimary },

  actionRow: {
    flexDirection: 'row', gap: 12, marginTop: 32,
  },
  cancelBtn: {
    flex: 0.6, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.surfaceContainerHigh,
  },
  cancelBtnTxt: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: C.onSurface },
  saveBtn: {
    height: 52, backgroundColor: C.primary,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  saveBtnTxt: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: C.onPrimary, letterSpacing: 0.5 },

  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 20, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: C.error + '30',
  },
  deleteBtnTxt: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: C.error },
});
