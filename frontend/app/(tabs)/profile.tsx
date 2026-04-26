import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, Alert, TextInput, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useCart } from '@/context/CartContext';
import { Colors, Spacing, Brutalist } from '@/constants/theme';

export default function Profile() {
  const { user, logout } = useAuth();
  const { submitFeedback, getAvgRating, entries } = useFeedback();
  const { itemCount } = useCart();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [feedbackModal, setFeedbackModal] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'student' | 'lecturer'>('student');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const isAdmin = user?.role === 'admin' || user?.role === 'chef_admin';

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/login'); } },
    ]);
  };

  const openFeedback = (type: 'student' | 'lecturer') => {
    setFeedbackType(type);
    setRating(5);
    setComment('');
    setFeedbackModal(true);
  };

  const handleSubmitFeedback = () => {
    if (!comment.trim()) { Alert.alert('Required', 'Please write a comment'); return; }
    submitFeedback({ type: feedbackType, rating, comment });
    setFeedbackModal(false);
    Alert.alert('Thank You! ⚡', 'Your feedback helps us improve firstmeal.');
  };

  const MENU_ITEMS = [
    { icon: 'receipt-outline', label: 'Order History', onPress: () => router.push('/(tabs)/orders') },
    { icon: 'chatbubble-outline', label: 'AI Support Chat', onPress: () => router.push('/chat') },
    { icon: 'card-outline', label: 'Payment Methods', onPress: () => {} },
    { icon: 'location-outline', label: 'Saved Addresses', onPress: () => {} },
    { icon: 'heart-outline', label: 'Favourites', onPress: () => {} },
    { icon: 'settings-outline', label: 'Settings', onPress: () => {} },
  ];

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.brand}>firstmeal</Text>
        </View>

        {/* User Card */}
        <View testID="user-profile-card" style={s.userCard}>
          <View style={s.avatar}>
            {user?.picture ? (
              <Image source={{ uri: user.picture }} style={s.avatarImg} />
            ) : (
              <Text style={s.avatarTxt}>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</Text>
            )}
          </View>
          <View style={s.userInfo}>
            <Text style={s.userName}>{user?.name || 'User'}</Text>
            <Text style={s.userEmail}>{user?.email}</Text>
            {isAdmin && (
              <View style={s.adminBadge}><Text style={s.adminBadgeTxt}>{user?.role === 'chef_admin' ? 'CHEF ADMIN' : 'ADMIN'}</Text></View>
            )}
          </View>
        </View>

        {/* Admin Panel */}
        {isAdmin && (
          <TouchableOpacity testID="admin-panel-btn" style={s.adminCard} onPress={() => router.push('/admin/index')}>
            <View style={s.adminCardLeft}>
              <Ionicons name="shield-checkmark-outline" size={24} color={Colors.primary} />
              <Text style={s.adminCardTxt}>Admin Panel</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}

        {/* ── Institutional Feedback ── */}
        <View style={s.feedbackSection}>
          <Text style={s.feedbackTitle}>⚡ INSTITUTIONAL FEEDBACK</Text>
          <Text style={s.feedbackNote}>{entries.length} responses · Avg {getAvgRating() || '—'}/5</Text>
          <View style={s.feedbackBtns}>
            <TouchableOpacity
              testID="feedback-student-btn"
              style={s.feedbackBtn}
              onPress={() => openFeedback('student')}
              activeOpacity={0.85}
            >
              <Ionicons name="school" size={18} color={Colors.primaryFg} />
              <Text style={s.feedbackBtnTxt}>Student</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="feedback-lecturer-btn"
              style={[s.feedbackBtn, s.feedbackBtnAlt]}
              onPress={() => openFeedback('lecturer')}
              activeOpacity={0.85}
            >
              <Ionicons name="person" size={18} color={Colors.primary} />
              <Text style={[s.feedbackBtnTxt, s.feedbackBtnTxtAlt]}>Lecturer</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu */}
        <View style={s.menuSection}>
          {MENU_ITEMS.map((item, i) => (
            <TouchableOpacity testID={`profile-menu-${i}`} key={item.label} style={s.menuItem} onPress={item.onPress}>
              <View style={s.menuLeft}>
                <Ionicons name={item.icon as any} size={20} color={Colors.textSecondary} />
                <Text style={s.menuLabel}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.border} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity testID="logout-btn" style={s.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={s.logoutTxt}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={s.version}>firstmeal v1.0 · Hunger x Speed</Text>
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Feedback Modal ── */}
      <Modal visible={feedbackModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>
                {feedbackType === 'student' ? '🎓 Student Feedback' : '👨‍🏫 Lecturer Feedback'}
              </Text>
              <TouchableOpacity onPress={() => setFeedbackModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Stars */}
            <View style={s.starsRow}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={32}
                    color={star <= rating ? Colors.primary : Colors.border}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              testID="feedback-comment-input"
              style={s.commentInput}
              placeholder="Share your experience with firstmeal..."
              placeholderTextColor={Colors.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={comment}
              onChangeText={setComment}
            />

            <TouchableOpacity testID="submit-feedback-btn" style={s.submitBtn} onPress={handleSubmitFeedback}>
              <Text style={s.submitBtnTxt}>SUBMIT FEEDBACK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: { paddingHorizontal: Spacing.screen, paddingTop: 8, paddingBottom: 8 },
  brand: { fontFamily: 'DMSans_700Bold', fontSize: 24, color: Colors.textPrimary, letterSpacing: -1 },

  userCard: {
    flexDirection: 'row', alignItems: 'center', margin: Spacing.screen, padding: 20,
    backgroundColor: Colors.surface, ...Brutalist, borderColor: Colors.secondary, borderWidth: 1,
  },
  avatar: { width: 64, height: 64, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 16, borderRadius: 32 },
  avatarImg: { width: 64, height: 64, borderRadius: 32, resizeMode: 'cover' },
  avatarTxt: { fontFamily: 'DMSans_700Bold', fontSize: 28, color: Colors.primaryFg },
  userInfo: { flex: 1 },
  userName: { fontFamily: 'DMSans_700Bold', fontSize: 20, color: Colors.textPrimary },
  userEmail: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  adminBadge: { marginTop: 6, alignSelf: 'flex-start', backgroundColor: Colors.primary, paddingHorizontal: 10, paddingVertical: 3, ...Brutalist, borderColor: Colors.secondary },
  adminBadgeTxt: { fontFamily: 'DMSans_700Bold', fontSize: 10, color: Colors.primaryFg, letterSpacing: 1 },

  adminCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: Spacing.screen, marginBottom: 12, padding: 16,
    backgroundColor: Colors.adminBg, ...Brutalist, borderColor: Colors.primary, borderWidth: 1,
  },
  adminCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  adminCardTxt: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.primary },

  feedbackSection: {
    marginHorizontal: Spacing.screen, marginBottom: 16, padding: 16,
    backgroundColor: Colors.surface, ...Brutalist, borderColor: Colors.tertiary, borderWidth: 1,
  },
  feedbackTitle: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.textPrimary, letterSpacing: 1, marginBottom: 4 },
  feedbackNote: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary, marginBottom: 12 },
  feedbackBtns: { flexDirection: 'row', gap: 10 },
  feedbackBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 42, backgroundColor: Colors.primary },
  feedbackBtnTxt: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.primaryFg, letterSpacing: 0.5 },
  feedbackBtnAlt: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.primary },
  feedbackBtnTxtAlt: { color: Colors.primary },

  menuSection: {
    marginHorizontal: Spacing.screen, backgroundColor: Colors.surface,
    ...Brutalist, borderColor: Colors.secondary, borderWidth: 1, marginBottom: 16,
  },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  menuLabel: { fontFamily: 'DMSans_500Medium', fontSize: 16, color: Colors.textPrimary },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: Spacing.screen, padding: 16 },
  logoutTxt: { fontFamily: 'DMSans_500Medium', fontSize: 16, color: Colors.error },
  version: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary, textAlign: 'center', marginTop: 8 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: Colors.surface, padding: 24, paddingBottom: 40,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontFamily: 'DMSans_700Bold', fontSize: 18, color: Colors.textPrimary },
  starsRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 20 },
  commentInput: {
    height: 100, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 16, paddingVertical: 12, fontFamily: 'DMSans_400Regular', fontSize: 15,
    color: Colors.textPrimary, marginBottom: 16,
  },
  submitBtn: { height: 50, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Brutalist, borderColor: Colors.secondary },
  submitBtnTxt: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.primaryFg, letterSpacing: 2 },
});
