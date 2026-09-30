/**
 * usePlanTripDraftStore
 * Persists the multi-step "Plan a Trip" wizard draft so the user
 * doesn't lose their progress on navigation or app restart.
 *
 * Uses AsyncStorage via a simple read/write helper to avoid
 * pulling in zustand/middleware which may not be configured here.
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emptyPlanTripDraft } from './options';
import type { PlanTripFormData } from './validation';

const DRAFT_KEY = 'travelai.planTripDraft.v1';

interface PlanTripDraftState {
  draft: PlanTripFormData;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  updateDraft: (partial: Partial<PlanTripFormData>) => Promise<void>;
  replaceDraft: (data: PlanTripFormData) => Promise<void>;
  clearDraft: () => Promise<void>;
}

export const usePlanTripDraftStore = create<PlanTripDraftState>((set, get) => ({
  draft: emptyPlanTripDraft,
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const raw = await AsyncStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PlanTripFormData;
        set({ draft: { ...emptyPlanTripDraft, ...parsed }, hydrated: true });
      } else {
        set({ hydrated: true });
      }
    } catch {
      // If storage is unavailable, proceed with the empty default
      set({ hydrated: true });
    }
  },

  updateDraft: async (partial) => {
    const next = { ...get().draft, ...partial };
    set({ draft: next });
    try {
      await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(next));
    } catch {
      // Non-fatal: draft update will still be in memory
    }
  },

  replaceDraft: async (data) => {
    set({ draft: data });
    try {
      await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    } catch {
      // Non-fatal
    }
  },

  clearDraft: async () => {
    set({ draft: emptyPlanTripDraft });
    try {
      await AsyncStorage.removeItem(DRAFT_KEY);
    } catch {
      // Non-fatal
    }
  },
}));

// Keep the old export for any other files that may import it
export const tripPlannerStore = {};
