import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, KeyboardAvoidingView,
  Platform, ImageBackground, Dimensions, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/theme';

const { width } = Dimensions.get('window');

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" />
      
      {/* 45% Hero Image Section */}
      <View style={s.heroSection}>
        <ImageBackground
          source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB45-O820ZivUslh4TSgIauvbZQKrlr86i-UBxQnU024AyUBVi7_Cq-BcBkQ8mQOU6zEgqo5BRQEMYQ0H2qw70v0LG7LKjTqIpWStg7Gv-Q2hl6D7zKb-hFvHwuJquM3XA9bPZK1hJ5b0WQz9G_QWLj1P9CehVhbmh2ygszZNzRV6Gwo7-IM6BU35muGpANo6uRnPBNTSl3H8RKrKpbWXcGGrAnuFE2afcCNgPlurrmDzoXetjl5OOkMjsShB1ukGBt56MUhL1dLSJ3' }}
          style={s.heroImage}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'transparent']}
            style={StyleSheet.absoluteFill}
          />
        </ImageBackground>
      </View>

      {/* 55% Content Section */}
      <ScrollView 
        style={s.contentScroll}
        contentContainerStyle={s.contentContainer}
        bounces={false}
      >
        <View style={s.card}>
          {/* Brand */}
          <Text style={s.brand}>firstmeal</Text>

          {/* Header */}
          <View style={s.header}>
            <Text style={s.title}>Create Account</Text>
            <Text style={s.subtitle}>Join the gourmet movement today</Text>
          </View>

          {/* Form */}
          <View style={s.form}>
            <TextInput
              style={s.input}
              placeholder="Full Name"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={s.input}
              placeholder="Email address"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={s.input}
              placeholder="Create Password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            {error ? <Text style={s.errorTxt}>{error}</Text> : null}

            <TouchableOpacity 
              style={s.btn} 
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
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

          {/* Premium Badge */}
          <View style={s.badge}>
            <Text style={s.badgeTxt}>JOIN PREMIUM</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff8f1',
  },
  heroSection: {
    height: '45%',
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
    marginTop: '38%', // Slight overlap with hero
  },
  contentContainer: {
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 32,
    paddingTop: 40,
    paddingBottom: 60,
    minHeight: 550,
    // Kinetic Offset Shadow
    shadowColor: '#897541',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  brand: {
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '900',
    color: '#1f1b12',
    marginBottom: 32,
    letterSpacing: -1,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1f1b12',
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 14,
    color: '#7f7662',
    fontWeight: '500',
    marginTop: 4,
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: '#fff8f1',
    borderWidth: 1,
    borderColor: '#d1c5ae',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1f1b12',
    fontWeight: '500',
  },
  errorTxt: {
    color: '#ba1a1a',
    fontSize: 13,
    fontWeight: '700',
  },
  btn: {
    backgroundColor: '#1f1b12',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
    // Kinetic Offset shadow for button
    shadowColor: '#897541',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  btnTxt: {
    color: '#fff8f1',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerTxt: {
    color: '#4e4634',
    fontSize: 14,
    fontWeight: '500',
  },
  link: {
    color: '#1f1b12',
    fontSize: 14,
    fontWeight: '900',
  },
  badge: {
    position: 'absolute',
    top: -20,
    right: 32,
    backgroundColor: '#6f5c2b',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#897541',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  badgeTxt: {
    color: '#fff8f1',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
