// supabaseClient.ts
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Substitua com suas chaves do Supabase. Use 'string' para tipar as variáveis.
const supabaseUrl: string = 'https://ogwawiodxxwkshvdpudb.supabase.co';
const supabaseAnonKey: string = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nd2F3aW9keHh3a3NodmRwdWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NTMxMjIsImV4cCI6MjA2ODMyOTEyMn0.FxzyJHMEWf6Pq6Ox_1PyF3LwQLlu-eUxLapcJbdf1W4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});