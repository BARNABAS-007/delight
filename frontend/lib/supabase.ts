import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://hyncyecefokfoarusyzl.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5bmN5ZWNlZm9rZm9hcnVzeXpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NzY1MTUsImV4cCI6MjA5MTA1MjUxNX0.UVmXJgCz1jJYlZXIxuy2n6kgh8-OEHTSIypCqQCFy7E';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
