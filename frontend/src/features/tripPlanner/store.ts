import { create } from 'zustand';
import { storage } from '../../utils/storage';
import { emptyPlanTripDraft } from './options';
import type { PlanTripFormData } from './validation';

const STORAGE_KEY = 'travelai.planTripDraft.v1';

type PlanTripDraftState = {
  draft: PlanTripFormData;
  hydrated: boolean;
  updateDraft: (patch: Partial<PlanTripFormData>) => Promise<void>;
  replaceDraft: (draft: PlanTripFormData) => Promise<void>;
  hydrate: () => Promise<void>;
  clearDraft: () => Promise<void>;
};

async function persistDraft(draft: PlanTripFormData) {
  await storage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

export const usePlanTripDraftStore = create<PlanTripDraftState>((set, get) => ({
  draft: emptyPlanTripDraft,
  hydrated: false,
  updateDraft: async (patch) => {
    const nextDraft = { ...get().draft, ...patch };
    set({ draft: nextDraft });
    await persistDraft(nextDraft);
  },
  replaceDraft: async (draft) => {
    set({ draft });
    await persistDraft(draft);
  },
  hydrate: async () => {
    const stored = await storage.getItem(STORAGE_KEY);
    if (!stored) {
      set({ hydrated: true });
      return;
    }

    try {
      const parsed = JSON.parse(stored) as Partial<PlanTripFormData>;
      set({ draft: { ...emptyPlanTripDraft, ...parsed }, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
  clearDraft: async () => {
    set({ draft: emptyPlanTripDraft });
    await storage.removeItem(STORAGE_KEY);
  },
}));
