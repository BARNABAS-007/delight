import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  FlatList, Image, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/services/api';
import { Colors, Spacing } from '@/constants/theme';

const PRICE_RANGES = ['All', '$', '$$', '$$$', '$$$$'];
const MIN_RATINGS = [0, 4.0, 4.5, 4.8];

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [priceFilter, setPriceFilter] = useState('All');
  const [ratingFilter, setRatingFilter] = useState(0);
  const [searched, setSearched] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const doSearch = useCallback(async (q = query, price = priceFilter, rating = ratingFilter) => {
    setLoading(true); setSearched(true);
    try {
      const params: any = {};
      if (q.trim()) params.search = q.trim();
      if (price !== 'All') params.price_range = price;
      if (rating > 0) params.min_rating = String(rating);
      const data: any = await api.getRestaurants(params);
      setResults(data);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, [query, priceFilter, ratingFilter]);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.title}>Discover</Text>
      </View>

      {/* Search Input */}
      <View style={s.inputRow}>
        <Ionicons name="search" size={18} color={Colors.textSecondary} style={{ marginRight: 10 }} />
        <TextInput
          testID="search-input"
          style={s.input} placeholder="Restaurants, cuisine, dish..."
          placeholderTextColor={Colors.textSecondary}
          value={query} onChangeText={setQuery}
          onSubmitEditing={() => doSearch()}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); doSearch(''); }}>
            <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Price Filters */}
      <View style={s.filterSection}>
        <Text style={s.filterLabel}>Price</Text>
        <View style={s.filterRow}>
          {PRICE_RANGES.map(p => (
            <TouchableOpacity key={p} testID={`price-filter-${p}`}
              style={[s.fChip, priceFilter === p && s.fChipActive]}
              onPress={() => { setPriceFilter(p); doSearch(query, p, ratingFilter); }}>
              <Text style={[s.fChipTxt, priceFilter === p && s.fChipTxtActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Rating Filters */}
      <View style={s.filterSection}>
        <Text style={s.filterLabel}>Min Rating</Text>
        <View style={s.filterRow}>
          {[{label:'All',val:0},{label:'4.0+',val:4.0},{label:'4.5+',val:4.5},{label:'4.8+',val:4.8}].map(item => (
            <TouchableOpacity key={item.val} testID={`rating-filter-${item.val}`}
              style={[s.fChip, ratingFilter === item.val && s.fChipActive]}
              onPress={() => { setRatingFilter(item.val); doSearch(query, priceFilter, item.val); }}>
              <Text style={[s.fChipTxt, ratingFilter === item.val && s.fChipTxtActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity testID="search-btn" style={s.searchBtn} onPress={() => doSearch()}>
        <Text style={s.searchBtnTxt}>SEARCH</Text>
      </TouchableOpacity>

      {/* Results */}
      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : searched ? (
        <FlatList
          data={results}
          keyExtractor={r => r.id}
          contentContainerStyle={{ padding: Spacing.screen }}
          ListEmptyComponent={<Text style={s.empty}>No restaurants found</Text>}
          renderItem={({ item: r }) => (
            <TouchableOpacity testID={`search-result-${r.id}`} style={s.resultCard}
              onPress={() => router.push(`/restaurant/${r.id}`)}>
              <Image source={{ uri: r.image }} style={s.resultImg} />
              <View style={s.resultInfo}>
                <Text style={s.resultName}>{r.name}</Text>
                <Text style={s.resultCuisine}>{r.cuisine?.join(' • ')}</Text>
                <View style={s.resultMeta}>
                  <Ionicons name="star" size={12} color="#FFD700" />
                  <Text style={s.metaTxt}>{r.rating} · {r.delivery_time} · {r.price_range}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      ) : (
        <View style={s.hint}>
          <Ionicons name="search-outline" size={48} color={Colors.border} />
          <Text style={s.hintTxt}>Search for your favorite food</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.screen, paddingBottom: 16, paddingTop: 8 },
  title: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 32, color: Colors.textPrimary },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.screen, height: 52, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 16, marginBottom: 16 },
  input: { flex: 1, color: Colors.textPrimary, fontFamily: 'DMSans_400Regular', fontSize: 16 },
  filterSection: { paddingHorizontal: Spacing.screen, marginBottom: 12 },
  filterLabel: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.textSecondary, letterSpacing: 1, marginBottom: 8 },
  filterRow: { flexDirection: 'row', gap: 8 },
  fChip: { paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: Colors.border, borderRadius: 100 },
  fChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  fChipTxt: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.textSecondary },
  fChipTxtActive: { color: Colors.primaryFg },
  searchBtn: { marginHorizontal: Spacing.screen, height: 48, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  searchBtnTxt: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.primaryFg, letterSpacing: 2 },
  empty: { fontFamily: 'DMSans_400Regular', color: Colors.textSecondary, fontSize: 16, textAlign: 'center', marginTop: 40 },
  resultCard: { flexDirection: 'row', marginBottom: 16, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  resultImg: { width: 90, height: 90, resizeMode: 'cover' },
  resultInfo: { flex: 1, padding: 12, justifyContent: 'center' },
  resultName: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 16, color: Colors.textPrimary, marginBottom: 4 },
  resultCuisine: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary, marginBottom: 6 },
  resultMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTxt: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary },
  hint: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  hintTxt: { fontFamily: 'DMSans_400Regular', fontSize: 16, color: Colors.textSecondary, marginTop: 16 },
});
