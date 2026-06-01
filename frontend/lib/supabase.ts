import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
  || 'https://hyncyecefokfoarusyzl.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5bmN5ZWNlZm9rZm9hcnVzeXpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NzY1MTUsImV4cCI6MjA5MTA1MjUxNX0.UVmXJgCz1jJYlZXIxuy2n6kgh8-OEHTSIypCqQCFy7E';

// ── SSR-safe in-memory fallback for server-side rendering ────────────────────
const memStore: Record<string, string> = {};
const memStorage = {
  getItem: (key: string) => Promise.resolve(memStore[key] ?? null),
  setItem: (key: string, value: string) => { memStore[key] = value; return Promise.resolve(); },
  removeItem: (key: string) => { delete memStore[key]; return Promise.resolve(); },
};

// ── Choose the right storage for each runtime ────────────────────────────────
function buildStorage() {
  // Server-side (SSR) — window doesn't exist yet, use in-memory store
  if (typeof window === 'undefined') return memStorage;

  // Browser (Expo Web, client-side) — use localStorage
  if (Platform.OS === 'web') {
    return {
      getItem: (key: string) => Promise.resolve(window.localStorage.getItem(key)),
      setItem: (key: string, value: string) => {
        window.localStorage.setItem(key, value);
        return Promise.resolve();
      },
      removeItem: (key: string) => {
        window.localStorage.removeItem(key);
        return Promise.resolve();
      },
    };
  }

  // Native (iOS / Android) — use AsyncStorage
  // require() here avoids importing the native module in any web bundle path
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('@react-native-async-storage/async-storage').default;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: buildStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  // We use only .from() queries — no live subscriptions needed.
  // Disabling realtime prevents the 'Unauthorized' websocket warning in dev.
  realtime: {
    params: { eventsPerSecond: 0 },
  },
  global: {
    headers: { 'x-application-name': 'delight' },
  },
});
