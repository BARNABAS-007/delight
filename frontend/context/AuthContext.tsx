import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setToken } from '@/services/api';

interface User {
  user_id: string; email: string; name: string; role: string; picture?: string; phone?: string;
}
interface AuthCtx {
  user: User | null; loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: (session_id: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (u: User) => void;
}
const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('delight_token');
        if (token) {
          setToken(token);
          const u = await api.me() as any;
          setUser(u);
        }
      } catch { await AsyncStorage.removeItem('delight_token'); setToken(null); }
      finally { setLoading(false); }
    })();
  }, []);

  const save = async (token: string, u: User) => {
    await AsyncStorage.setItem('delight_token', token);
    setToken(token); setUser(u);
  };

  const login = async (email: string, password: string) => {
    const res: any = await api.login(email, password);
    await save(res.token, res.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const res: any = await api.register(name, email, password);
    await save(res.token, res.user);
  };

  const loginWithGoogle = async (session_id: string) => {
    const res: any = await api.googleAuth(session_id);
    await save(res.token, res.user);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('delight_token');
    setToken(null); setUser(null);
  };

  const updateUser = (u: User) => setUser(u);

  return (
    <Ctx.Provider value={{ user, loading, login, register, loginWithGoogle, logout, updateUser }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
