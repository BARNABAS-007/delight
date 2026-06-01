import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { setToken, api } from '@/services/api';

interface User {
  user_id: string; 
  email: string; 
  name: string; 
  role: string; 
  picture?: string; 
  phone?: string;
}

interface AuthCtx {
  user: User | null; 
  loading: boolean;
  login: (email: string, password: string) => Promise<string>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAndSetUser = async (session: any) => {
    const base = {
      user_id: session.user.id,
      email: session.user.email || '',
      name: session.user.user_metadata?.full_name || '',
      picture: session.user.user_metadata?.avatar_url || '',
    };
    // Fetch role from public.users table
    let { data } = await supabase
      .from('users')
      .select('role, name, phone')
      .eq('user_id', session.user.id)
      .single();

    // If no row yet (e.g. first Google login), auto-create with role 'customer'
    if (!data) {
      const { data: inserted } = await supabase
        .from('users')
        .upsert({
          user_id: session.user.id,
          email: base.email,
          name: base.name,
          role: 'customer',
        }, { onConflict: 'user_id' })
        .select('role, name, phone')
        .single();
      data = inserted;
    }

    setUser({
      ...base,
      name: data?.name || base.name,
      phone: data?.phone || '',
      role: data?.role || 'customer',
    });
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setToken(session.access_token);
          await fetchAndSetUser(session);
        } else {
          // Check for custom backend session
          const customToken = await AsyncStorage.getItem('custom_token');
          const customUser = await AsyncStorage.getItem('custom_user');
          if (customToken && customUser) {
            setToken(customToken);
            setUser(JSON.parse(customUser));
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setToken(session.access_token);
        await fetchAndSetUser(session);
      } else {
        // Only clear if we don't have a custom backend user
        const customToken = await AsyncStorage.getItem('custom_token');
        if (!customToken) {
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // 1. Try Supabase Auth first
      const { data: authData, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) throw error;
      
      if (authData.user) {
        const { data } = await supabase.from('users').select('role').eq('user_id', authData.user.id).single();
        return data?.role || 'customer';
      }
      return 'customer';
    } catch (supabaseError: any) {
      // 2. Fallback to custom backend login if Supabase fails (e.g. for seeded owners/admins)
      try {
        const res = await api.login(email.trim().toLowerCase(), password) as any;
        if (res && res.token && res.user) {
          setToken(res.token);
          setUser(res.user);
          // Persist token & user locally for persistence
          await AsyncStorage.setItem('custom_token', res.token);
          await AsyncStorage.setItem('custom_user', JSON.stringify(res.user));
          return res.user.role || 'customer';
        }
      } catch (backendError: any) {
        // If both fail, throw the original Supabase error or backend error
        throw backendError?.message || backendError?.detail || supabaseError;
      }
      throw supabaseError;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) throw error;

    // Upsert into public.users so role lookup works immediately
    if (authData.user) {
      await supabase.from('users').upsert({
        user_id: authData.user.id,
        email,
        name,
        role: 'customer',
      }, { onConflict: 'user_id' });
    }
  };

  const logout = async () => {
    await supabase.auth.signOut().catch(() => {}); // ignore network errors
    await AsyncStorage.removeItem('custom_token');
    await AsyncStorage.removeItem('custom_user');
    setUser(null);
    setToken(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  };

  return (
    <Ctx.Provider value={{ user, loading, login, register, logout, resetPassword }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
