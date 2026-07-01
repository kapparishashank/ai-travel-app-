import { createClient } from '@supabase/supabase-js';
import { env } from './env';
import { storage } from '../utils/storage';

// Custom storage adapter for Supabase Auth using our SecureStore/AsyncStorage wrapper
const supabaseStorage = {
  getItem: (key: string): Promise<string | null> | string | null => {
    return storage.getSecureItem(key);
  },
  setItem: (key: string, value: string): Promise<void> | void => {
    return storage.setSecureItem(key, value);
  },
  removeItem: (key: string): Promise<void> | void => {
    return storage.removeSecureItem(key);
  },
};

export const supabase = createClient(
  env.EXPO_PUBLIC_SUPABASE_URL,
  env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: supabaseStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // Disable OAuth session detection in URL for mobile (handled via Linking if needed)
    },
  }
);
