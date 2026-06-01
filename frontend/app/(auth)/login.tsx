import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, KeyboardAvoidingView,
  Platform, Dimensions, StatusBar, Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radius, Spacing } from '@/constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const IMAGE_HEIGHT = Math.round(SCREEN_HEIGHT * 0.45); // 45% of screen

export default function Login() {
  const [identity, setIdentity]   = useState('');
  const [password, setPassword]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [identityFocused, setIdentityFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword]       = useState(false);

  const passwordInputRef = useRef<TextInput>(null);

  const { login, resetPassword } = useAuth();
  const router    = useRouter();

  const handleGoogle = () => {
    const redirectUrl = (process.env.EXPO_PUBLIC_BACKEND_URL || '') + '/callback';
    Linking.openURL(`https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`);
  };

  const handleLogin = async () => {
    if (!identity || !password) { setError('Please fill all fields'); return; }
    setLoading(true); setError('');
    try {
      const role = await login(identity.trim().toLowerCase(), password);
      if (role === 'restaurant_owner') {
        router.replace('/owner/dashboard');
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      setError(err?.detail || err?.message || 'Login failed. Please try again.');
    } finally { setLoading(false); }
  };

  const handleForgotPassword = async () => {
    if (!identity) {
      setError('Please enter your email above first');
      return;
    }
    setLoading(true); setError('');
    try {
      await resetPassword(identity.trim().toLowerCase());
      setError('Password reset link sent! Check your email.');
    } catch (err: any) {
      setError(err?.detail || err?.message || 'Failed to send reset link.');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Hero Image (fixed-ish 45% header) ─────────────────────────── */}
      <View style={[s.heroWrap, { height: IMAGE_HEIGHT }]}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1611309454921-16cef3438ee0?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzV8MHwxfHNlYXJjaHwzfHxnb3VybWV0JTIwYnVyZ2VyJTIwZGFyayUyMGJhY2tncm91bmR8ZW58MHx8fHwxNzc1NDc2MDc5fDA&ixlib=rb-4.1.0&q=85' }}
          style={s.heroImage}
          contentFit="cover"
          priority="high"
        />
        <LinearGradient
          colors={['rgba(0,0,0,0)', '#050505']}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      {/* ── Scrollable Content (overlaps hero by ~44px) ─────────────────── */}
      <ScrollView
        contentContainerStyle={[s.scroll, { marginTop: IMAGE_HEIGHT - 44 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Dark Card ── */}
        <View style={s.card}>

          {/* Brand */}
          <Text style={s.brandName}>FIRSTMEAL</Text>

          {/* Header */}
          <Text style={s.heading}>Welcome Back</Text>

          {/* Error */}
          {error ? (
            <View style={s.errorBox}>
              <MaterialIcons name="error-outline" size={15} color={Colors.error} />
              <Text style={s.errorTxt}>{error}</Text>
            </View>
          ) : null}

          {/* Email / Phone Input */}
          <TextInput
            id="identity"
            testID="login-identity-input"
            style={[s.input, identityFocused && s.inputFocused]}
            placeholder="Email or Phone"
            placeholderTextColor={`${Colors.textSecondary}`}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
            onSubmitEditing={() => passwordInputRef.current?.focus()}
            value={identity}
            onChangeText={setIdentity}
            onFocus={() => setIdentityFocused(true)}
            onBlur={() => setIdentityFocused(false)}
          />

          {/* Password Input */}
          <View style={[s.inputContainer, passwordFocused && s.inputFocused]}>
            <TextInput
              ref={passwordInputRef}
              id="password"
              testID="login-password-input"
              style={s.passwordInput}
              placeholder="Password"
              placeholderTextColor={`${Colors.textSecondary}`}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={s.eyeButton}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={showPassword ? 'visibility' : 'visibility-off'}
                size={20}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            id="login-btn"
            testID="login-form-submit-button"
            style={[s.primaryBtn, loading && s.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={Colors.primaryFg} />
            ) : (
              <>
                <Text style={s.primaryBtnTxt}>Continue</Text>
                <MaterialIcons name="arrow-forward" size={18} color={Colors.primaryFg} />
              </>
            )}
          </TouchableOpacity>

          {/* Secondary Links */}
          <TouchableOpacity style={s.forgotWrap} onPress={handleForgotPassword} disabled={loading}>
            <Text style={s.forgotTxt}>FORGOT PASSWORD?</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <Text style={s.dividerTxt}>or</Text>
            <View style={s.dividerLine} />
          </View>

          {/* Google Sign-In */}
          <TouchableOpacity
            testID="google-login-btn"
            style={s.googleBtn}
            onPress={handleGoogle}
            activeOpacity={0.8}
          >
            <Image
              source={{ uri: 'https://developers.google.com/static/identity/images/g-logo.png' }}
              style={s.googleIcon}
            />
            <Text style={s.googleBtnTxt}>Continue with Google</Text>
          </TouchableOpacity>

          {/* Register */}
          <TouchableOpacity
            onPress={() => router.push('/(auth)/register')}
            style={s.registerWrap}
          >
            <Text style={s.registerTxt}>
              New here?{' '}
              <Text style={s.registerLink}>Create Account</Text>
            </Text>
          </TouchableOpacity>

        </View>

        {/* Footer */}
        <Text style={s.footer}>© 2024 FIRSTMEAL CULINARY</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Hero
  heroWrap: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
  },
  heroImage: {
    flex: 1,
  },

  // Scroll
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: 32,
  },

  // Card — the panel that slides up over the hero
  card: {
    width: '100%',
    maxWidth: 450,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    paddingHorizontal: 32,
    paddingTop: 40,
    paddingBottom: 64,
    minHeight: 530,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // Brand
  brandName: {
    textAlign: 'center',
    fontSize: 24,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    color: Colors.textPrimary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 32,
  },

  // Heading
  heading: {
    fontSize: 32,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 36,
    marginBottom: 24,
  },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.error,
    padding: 12,
    marginBottom: 16,
    borderRadius: Radius.sm,
  },
  errorTxt: {
    color: Colors.error,
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    flex: 1,
  },

  // Inputs
  input: {
    width: '100%',
    height: 56,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  inputContainer: {
    width: '100%',
    height: 56,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textPrimary,
  },
  eyeButton: {
    paddingHorizontal: 12,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputFocused: {
    borderColor: Colors.primary,
  },

  // Primary Button
  primaryBtn: {
    width: '100%',
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnTxt: {
    color: Colors.primaryFg,
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Forgot
  forgotWrap: { alignItems: 'center', marginTop: 24 },
  forgotTxt: {
    fontSize: 12,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: Colors.textSecondary,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 24,
    marginBottom: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerTxt: {
    fontSize: 12,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 0.5,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },

  // Register
  registerWrap: { alignItems: 'center', marginTop: 12 },
  registerTxt: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textSecondary,
  },
  registerLink: {
    fontFamily: 'DMSans_700Bold',
    color: Colors.textPrimary,
  },

  // Google
  googleBtn: {
    width: '100%',
    height: 56,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  googleBtnTxt: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
  },

  // Footer
  footer: {
    marginTop: 24,
    fontSize: 10,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 1,
    color: Colors.textSecondary,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
