import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, KeyboardAvoidingView,
  Platform, Dimensions, StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Colors, Radius, Spacing } from '@/constants/theme';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IMAGE_HEIGHT = Math.round(SCREEN_HEIGHT * 0.45); // 45% of screen

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  
  const { register } = useAuth();
  const router = useRouter();

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await register(name, email, password);
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={s.container}>
        <View style={s.card}>
           <Text style={s.title}>Check your email</Text>
           <Text style={s.subtitle}>
             We've sent a verification link to {email}. Please verify your account to continue.
           </Text>
           <TouchableOpacity 
             style={s.btn} 
             onPress={() => router.replace('/(auth)/login')}
           >
             <Text style={s.btnTxt}>Back to Login</Text>
           </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={s.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* 45% Hero Image Section */}
      <View style={[s.heroSection, { height: IMAGE_HEIGHT }]}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1611309454921-16cef3438ee0?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzV8MHwxfHNlYXJjaHwzfHxnb3VybWV0JTIwYnVyZ2VyJTIwZGFyayUyMGJhY2tncm91bmR8ZW58MHx8fHwxNzc1NDc2MDc5fDA&ixlib=rb-4.1.0&q=85' }}
          style={s.heroImage}
          contentFit="cover"
          priority="high"
        />
        <LinearGradient
          colors={['rgba(0,0,0,0)', '#050505']}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Content Section */}
      <ScrollView 
        style={s.contentScroll}
        contentContainerStyle={[s.contentContainer, { marginTop: IMAGE_HEIGHT - 44 }]}
        bounces={false}
      >
        <View style={s.card}>
          {/* Brand */}
          <Text style={s.brand}>FIRSTMEAL</Text>

          {/* Header */}
          <View style={s.header}>
            <Text style={s.title}>Create Account</Text>
            <Text style={s.subtitle}>Join the gourmet movement today.</Text>
          </View>

          {/* Form */}
          <View style={s.form}>
            <TextInput
              style={[s.input, nameFocused && s.inputFocused]}
              placeholder="Full Name"
              placeholderTextColor={Colors.textSecondary}
              returnKeyType="next"
              onSubmitEditing={() => emailInputRef.current?.focus()}
              value={name}
              onChangeText={setName}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
            />
            <TextInput
              ref={emailInputRef}
              style={[s.input, emailFocused && s.inputFocused]}
              placeholder="Email address"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
            />
            <View style={[s.inputContainer, passwordFocused && s.inputFocused]}>
              <TextInput
                ref={passwordInputRef}
                style={s.passwordInput}
                placeholder="Create Password"
                placeholderTextColor={Colors.textSecondary}
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

            {error ? <Text style={s.errorTxt}>{error}</Text> : null}

            <TouchableOpacity 
              style={s.btn} 
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={Colors.primaryFg} />
              ) : (
                <Text style={s.btnTxt}>CREATE ACCOUNT</Text>
              )}
            </TouchableOpacity>

            <View style={s.footer}>
              <Text style={s.footerTxt}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text style={s.link}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  heroSection: {
    width: '100%',
    position: 'absolute',
    top: 0,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 450,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    paddingHorizontal: 32,
    paddingTop: 40,
    paddingBottom: 60,
    minHeight: 550,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  brand: {
    textAlign: 'center',
    fontSize: 24,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    color: Colors.textPrimary,
    marginBottom: 32,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    color: Colors.textPrimary,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: 'DMSans_400Regular',
    marginTop: 6,
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 16,
    paddingVertical: 14,
    height: 56,
    fontSize: 16,
    color: Colors.textPrimary,
    fontFamily: 'DMSans_400Regular',
  },
  inputContainer: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.textPrimary,
    fontFamily: 'DMSans_400Regular',
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
  errorTxt: {
    color: Colors.error,
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
  },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingVertical: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  btnTxt: {
    color: Colors.primaryFg,
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerTxt: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
  },
  link: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: 'DMSans_700Bold',
  },
});
