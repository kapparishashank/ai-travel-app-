import { create } from 'zustand';
import type { Profile } from '../types';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: Profile | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  initialized: false,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  initialize: async () => {
    try {
      set({ loading: true });
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          set({ user: profile as Profile });
        }
      }
    } catch (error) {
      console.error('Failed to initialize auth session:', error);
    } finally {
      set({ loading: false, initialized: true });
    }
  },
  signOut: async () => {
    try {
      await supabase.auth.signOut();
      set({ user: null });
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  },
}));
