import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, KeyboardAvoidingView,
  Platform, ImageBackground, Dimensions, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const IMAGE_HEIGHT = Math.round(SCREEN_HEIGHT * 0.45); // 45% of screen

// ── FirstMeal Design Tokens (from Stitch Kinetic-Offset system) ────────────
const T = {
  surface:       '#fff8f1',
  surfaceLowest: '#ffffff',
  onBackground:  '#1f1b12',
  primary:       '#755b00',
  primaryFixDim: '#edc13d',
  secondary:     '#6f5c2b',         // bg of Speed Badge
  onSecondary:   '#ffffff',
  outline:       '#7f7662',
  outlineVariant:'#d1c5ae',
  onSurface:     '#1f1b12',
  onSurfaceVar:  '#4e4634',
  tertiary:      '#00687b',         // Speed Streak colour
  kineticShadow: '#897541',
  focusBlue:     '#276EF1',
};

export default function Login() {
  const [identity, setIdentity]   = useState('');
  const [password, setPassword]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [identityFocused, setIdentityFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const { login } = useAuth();
  const router    = useRouter();

  const handleLogin = async () => {
    if (!identity || !password) { setError('Please fill all fields'); return; }
    setLoading(true); setError('');
    try {
      await login(identity.trim().toLowerCase(), password);
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err?.detail || err?.message || 'Login failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Speed Streak (2px top bar) ─────────────────────────────────── */}
      <View style={s.speedStreak} />

      {/* ── Hero Image (fixed-ish 45% header) ─────────────────────────── */}
      <View style={[s.heroWrap, { height: IMAGE_HEIGHT }]}>
        <ImageBackground
          source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB45-O820ZivUslh4TSgIauvbZQKrlr86i-UBxQnU024AyUBVi7_Cq-BcBkQ8mQOU6zEgqo5BRQEMYQ0H2qw70v0LG7LKjTqIpWStg7Gv-Q2hl6D7zKb-hFvHwuJquM3XA9bPZK1hJ5b0WQz9G_QWLj1P9CehVhbmh2ygszZNzRV6Gwo7-IM6BU35muGpANo6uRnPBNTSl3H8RKrKpbWXcGGrAnuFE2afcCNgPlurrmDzoXetjl5OOkMjsShB1ukGBt56MUhL1dLSJ3' }}
          style={s.heroImage}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.30)', 'transparent']}
            style={StyleSheet.absoluteFillObject}
          />
        </ImageBackground>
      </View>

      {/* ── Scrollable Content (overlaps hero by ~44px) ─────────────────── */}
      <ScrollView
        contentContainerStyle={[s.scroll, { marginTop: IMAGE_HEIGHT - 44 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── White Card ── */}
        <View style={s.card}>

          {/* Speed Badge (absolute, top-left overlap) */}
          <View style={s.speedBadge}>
            <MaterialIcons name="bolt" size={14} color={T.onSecondary} />
            <Text style={s.speedBadgeTxt}>INSTANT ACCESS</Text>
          </View>

          {/* Brand */}
          <Text style={s.brandName}>firstmeal</Text>

          {/* Header */}
          <Text style={s.heading}>Welcome to FirstMeal</Text>
          <Text style={s.subheading}>Sign in to satisfy your crave</Text>

          {/* Error */}
          {error ? (
            <View style={s.errorBox}>
              <MaterialIcons name="error-outline" size={15} color="#ba1a1a" />
              <Text style={s.errorTxt}>{error}</Text>
            </View>
          ) : null}

          {/* Email / Phone Input */}
          <TextInput
            id="identity"
            style={[s.input, identityFocused && s.inputFocused]}
            placeholder="Email or Phone"
            placeholderTextColor={`${T.outline}99`}
            autoCapitalize="none"
            keyboardType="email-address"
            value={identity}
            onChangeText={setIdentity}
            onFocus={() => setIdentityFocused(true)}
            onBlur={() => setIdentityFocused(false)}
          />

          {/* Password Input */}
          <TextInput
            id="password"
            style={[s.input, passwordFocused && s.inputFocused]}
            placeholder="Password"
            placeholderTextColor={`${T.outline}99`}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
          />

          {/* Continue Button */}
          <TouchableOpacity
            id="login-btn"
            style={[s.primaryBtn, loading && s.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color={T.surface} />
            ) : (
              <>
                <Text style={s.primaryBtnTxt}>Continue</Text>
                <MaterialIcons name="arrow-forward" size={18} color={T.surface} />
              </>
            )}
          </TouchableOpacity>

          {/* Secondary Links */}
          <TouchableOpacity style={s.forgotWrap}>
            <Text style={s.forgotTxt}>FORGOT PASSWORD?</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <Text style={s.dividerTxt}>or</Text>
            <View style={s.dividerLine} />
          </View>

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
        <Text style={s.footer}>© 2024 KINETIC LOGISTICS HUB</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.surface,
  },

  // Speed Streak — 2px gradient line at very top
  speedStreak: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 2,
    backgroundColor: T.tertiary,
    opacity: 0.5,
    zIndex: 100,
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

  // Card — the white panel that slides up over the hero
  card: {
    width: '100%',
    maxWidth: 450,
    backgroundColor: T.surfaceLowest,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 32,
    paddingTop: 40,
    paddingBottom: 64,
    minHeight: 530,
    // Kinetic offset shadow (4px 4px 0 #897541)
    shadowColor: T.kineticShadow,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
    // Border hint (top + left)
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
  },

  // Speed Badge — absolute chip top-right of card
  speedBadge: {
    position: 'absolute',
    top: -16,
    right: 32,
    backgroundColor: T.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
    // Kinetic offset
    shadowColor: T.kineticShadow,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  speedBadgeTxt: {
    color: T.onSecondary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },

  // Brand
  brandName: {
    textAlign: 'center',
    fontSize: 30,
    fontWeight: '900',
    color: T.onBackground,
    letterSpacing: -1,
    marginBottom: 32,
  },

  // Heading
  heading: {
    fontSize: 28,
    fontWeight: '900',
    color: T.onBackground,
    letterSpacing: -0.5,
    lineHeight: 34,
    marginBottom: 6,
  },
  subheading: {
    fontSize: 14,
    fontWeight: '500',
    color: T.outline,
    marginBottom: 28,
  },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffdad6',
    borderLeftWidth: 3,
    borderLeftColor: '#ba1a1a',
    padding: 12,
    marginBottom: 16,
    borderRadius: 6,
  },
  errorTxt: {
    color: '#ba1a1a',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },

  // Inputs
  input: {
    width: '100%',
    height: 54,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.outlineVariant,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: '500',
    color: T.onSurface,
    marginBottom: 12,
  },
  inputFocused: {
    borderColor: '#276EF1',
    shadowColor: '#276EF1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },

  // Primary Button
  primaryBtn: {
    width: '100%',
    height: 54,
    backgroundColor: T.onBackground,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    // Kinetic offset: active handled by activeOpacity
    shadowColor: T.kineticShadow,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 0,
    elevation: 4,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnTxt: {
    color: T.surface,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Forgot
  forgotWrap: { alignItems: 'center', marginTop: 24 },
  forgotTxt: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    color: T.primary,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    marginBottom: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: `${T.outlineVariant}55`,
  },
  dividerTxt: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: T.outline,
    textTransform: 'uppercase',
  },

  // Register
  registerWrap: { alignItems: 'center', marginTop: 12 },
  registerTxt: {
    fontSize: 13,
    fontWeight: '500',
    color: T.onSurfaceVar,
  },
  registerLink: {
    fontWeight: '900',
    color: T.onBackground,
  },

  // Footer
  footer: {
    marginTop: 16,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 3,
    color: `${T.outline}70`,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
