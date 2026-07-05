import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from '../types';
import { supabase } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  authUser: User | null;
  user: Profile | null;
  loading: boolean;
  initialized: boolean;
  emailVerified: boolean;
  setUser: (user: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  refreshProfile: () => Promise<Profile | null>;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) return null;
  return data as Profile;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  authUser: null,
  user: null,
  loading: true,
  initialized: false,
  emailVerified: false,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  refreshProfile: async () => {
    const authUser = get().authUser;
    if (!authUser) return null;

    const profile = await fetchProfile(authUser.id);
    set({ user: profile });
    return profile;
  },
  initialize: async () => {
    try {
      set({ loading: true });
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const authUser = session?.user ?? null;
      const profile = authUser ? await fetchProfile(authUser.id) : null;

      set({
        session,
        authUser,
        user: profile,
        emailVerified: Boolean(authUser?.email_confirmed_at),
      });

      supabase.auth.onAuthStateChange(async (_event: string, nextSession: Session | null) => {
        const nextUser = nextSession?.user ?? null;
        const nextProfile = nextUser ? await fetchProfile(nextUser.id) : null;

        set({
          session: nextSession,
          authUser: nextUser,
          user: nextProfile,
          emailVerified: Boolean(nextUser?.email_confirmed_at),
          loading: false,
          initialized: true,
        });
      });
    } catch (error) {
      console.error('Failed to initialize auth session:', error);
    } finally {
      set({ loading: false, initialized: true });
    }
  },
  signOut: async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      set({ session: null, authUser: null, user: null, emailVerified: false });
    }
  },
  deleteAccount: async () => {
    const { error } = await supabase.functions.invoke('delete-account', {
      method: 'POST',
    });

    if (error) throw error;
    await get().signOut();
  },
}));
