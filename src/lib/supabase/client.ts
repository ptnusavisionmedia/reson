import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { supabaseAnonKey, supabaseUrl } from '@/config/env';
import type { Database } from '@/types/database';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // OAuth (Google) memakai PKCE: kode ditukar manual lewat exchangeCodeForSession.
    flowType: 'pkce',
  },
});

// Refresh token hanya saat app aktif (rekomendasi Supabase untuk React Native).
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
