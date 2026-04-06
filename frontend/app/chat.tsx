import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/services/api';
import { Colors, Spacing } from '@/constants/theme';

const SESSION_KEY = 'delight_chat_session';

interface Msg { role: 'user' | 'assistant'; content: string; }

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const flatRef = useRef<FlatList>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    (async () => {
      let sid = await AsyncStorage.getItem(SESSION_KEY);
      if (!sid) {
        sid = `chat_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        await AsyncStorage.setItem(SESSION_KEY, sid);
      }
      setSessionId(sid);
      try {
        const history: any = await api.getChatHistory(sid);
        if (history?.length > 0) {
          setMessages(history.map((m: any) => ({ role: m.role, content: m.content })));
        } else {
          setMessages([{
            role: 'assistant',
            content: "Hi! I'm Delight's AI support assistant. I can help you with orders, restaurants, delivery issues, and more. How can I help you today?"
          }]);
        }
      } catch {
        setMessages([{
          role: 'assistant',
          content: "Hi! I'm Delight's AI support assistant. How can I help you today?"
        }]);
      }
    })();
  }, []);

  const send = async () => {
    if (!input.trim() || loading || !sessionId) return;
    const text = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setLoading(true);
    try {
      const res: any = await api.sendMessage(text, sessionId);
      setMessages(prev => [...prev, { role: 'assistant', content: res.response }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I could not process that. Please try again.' }]);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const QUICK_REPLIES = ['Track my order', 'Cancel order', 'Refund policy', 'Contact support'];

  return (
    <KeyboardAvoidingView style={[s.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.header}>
        <TouchableOpacity testID="back-btn" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={s.headerInfo}>
          <Text style={s.headerTitle}>AI Support</Text>
          <View style={s.onlineDot} />
        </View>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={s.msgList}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={[s.bubble, item.role === 'user' ? s.userBubble : s.aiBubble]}>
            {item.role === 'assistant' && (
              <View style={s.aiAvatar}><Text style={s.aiAvatarTxt}>D</Text></View>
            )}
            <View style={[s.bubbleInner, item.role === 'user' ? s.userInner : s.aiInner]}>
              <Text style={[s.bubbleTxt, item.role === 'user' && s.userTxt]}>{item.content}</Text>
            </View>
          </View>
        )}
        ListFooterComponent={loading ? (
          <View style={s.typingIndicator}>
            <View style={s.aiAvatar}><Text style={s.aiAvatarTxt}>D</Text></View>
            <View style={s.aiInner}>
              <ActivityIndicator size="small" color={Colors.textSecondary} />
            </View>
          </View>
        ) : null}
      />

      {/* Quick Replies */}
      {messages.length <= 2 && (
        <View style={s.quickReplies}>
          {QUICK_REPLIES.map(q => (
            <TouchableOpacity key={q} testID={`quick-reply-${q}`} style={s.qrChip}
              onPress={() => { setInput(q); }}>
              <Text style={s.qrTxt}>{q}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={[s.inputRow, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          testID="chat-input"
          style={s.input} placeholder="Type a message..."
          placeholderTextColor={Colors.textSecondary}
          value={input} onChangeText={setInput}
          onSubmitEditing={send} returnKeyType="send"
          multiline maxLength={500}
        />
        <TouchableOpacity testID="send-btn" style={[s.sendBtn, !input.trim() && s.sendBtnDisabled]}
          onPress={send} disabled={!input.trim() || loading}>
          <Ionicons name="send" size={18} color={input.trim() ? Colors.primaryFg : Colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.screen, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 18, color: Colors.textPrimary },
  onlineDot: { width: 8, height: 8, backgroundColor: Colors.success, borderRadius: 4 },
  msgList: { padding: Spacing.screen, gap: 12 },
  bubble: { flexDirection: 'row', maxWidth: '85%' },
  userBubble: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  aiBubble: { alignSelf: 'flex-start' },
  aiAvatar: { width: 32, height: 32, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderRadius: 16, marginRight: 8, flexShrink: 0 },
  aiAvatarTxt: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 14, color: Colors.primaryFg },
  bubbleInner: { padding: 14, maxWidth: '90%' },
  userInner: { backgroundColor: Colors.primary },
  aiInner: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  bubbleTxt: { fontFamily: 'DMSans_400Regular', fontSize: 15, color: Colors.textPrimary, lineHeight: 22 },
  userTxt: { color: Colors.primaryFg },
  typingIndicator: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.screen, paddingBottom: 8 },
  quickReplies: { paddingHorizontal: Spacing.screen, paddingBottom: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  qrChip: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border, borderRadius: 100 },
  qrTxt: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: Spacing.screen, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border, gap: 12 },
  input: { flex: 1, minHeight: 48, maxHeight: 100, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 16, paddingVertical: 12, color: Colors.textPrimary, fontFamily: 'DMSans_400Regular', fontSize: 15 },
  sendBtn: { width: 48, height: 48, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
});
