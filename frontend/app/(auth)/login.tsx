import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Colors, Spacing, FontSize } from '@/constants/theme';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) { setError('Please fill all fields'); return; }
    setLoading(true); setError('');
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e?.detail || e?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  const handleGoogle = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = (process.env.EXPO_PUBLIC_BACKEND_URL || '') + '/callback';
    Linking.openURL(`https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`);
  };

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={s.flex} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Text style={s.brand}>DELIGHT</Text>
          <Text style={s.tagline}>Premium food, delivered.</Text>
        </View>

        <View style={s.form}>
          <Text style={s.title}>Welcome back</Text>
          {error ? <Text testID="login-error" style={s.error}>{error}</Text> : null}

          <TextInput
            testID="login-email-input"
            style={s.input} placeholder="Email address"
            placeholderTextColor={Colors.textSecondary}
            value={email} onChangeText={setEmail}
            keyboardType="email-address" autoCapitalize="none"
          />
          <TextInput
            testID="login-password-input"
            style={s.input} placeholder="Password"
            placeholderTextColor={Colors.textSecondary}
            value={password} onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity testID="login-submit-btn" style={s.btn} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color={Colors.primaryFg} /> : <Text style={s.btnTxt}>SIGN IN</Text>}
          </TouchableOpacity>

          <View style={s.divider}>
            <View style={s.line} /><Text style={s.or}>OR</Text><View style={s.line} />
          </View>

          <TouchableOpacity testID="google-login-btn" style={s.gBtn} onPress={handleGoogle}>
            <Text style={s.gBtnTxt}>Continue with Google</Text>
          </TouchableOpacity>
        </View>

        <View style={s.footer}>
          <Text style={s.footerTxt}>Don't have an account? </Text>
          <TouchableOpacity testID="go-register-btn" onPress={() => router.push('/(auth)/register')}>
            <Text style={s.link}>Sign up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { flexGrow: 1, paddingHorizontal: Spacing.screen, paddingTop: 80, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 60 },
  brand: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 42, color: Colors.primary, letterSpacing: 8 },
  tagline: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textSecondary, marginTop: 8, letterSpacing: 2 },
  form: { flex: 1 },
  title: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 28, color: Colors.textPrimary, marginBottom: 24 },
  error: { fontFamily: 'DMSans_400Regular', color: Colors.error, fontSize: 14, marginBottom: 16, padding: 12, backgroundColor: '#1A0000', borderWidth: 1, borderColor: Colors.error },
  input: { height: 56, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 16, color: Colors.textPrimary, fontFamily: 'DMSans_400Regular', fontSize: 16, marginBottom: 16 },
  btn: { height: 56, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  btnTxt: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.primaryFg, letterSpacing: 2 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  line: { flex: 1, height: 1, backgroundColor: Colors.border },
  or: { fontFamily: 'DMSans_400Regular', color: Colors.textSecondary, fontSize: 12, marginHorizontal: 16, letterSpacing: 2 },
  gBtn: { height: 56, backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  gBtnTxt: { fontFamily: 'DMSans_500Medium', fontSize: 16, color: Colors.textPrimary },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  footerTxt: { fontFamily: 'DMSans_400Regular', color: Colors.textSecondary, fontSize: 14 },
  link: { fontFamily: 'DMSans_700Bold', color: Colors.primary, fontSize: 14 },
});
