import { create } from 'zustand';
import type { Trip } from '../types';

interface TripState {
  activeTripId: string | null;
  activeTrip: Trip | null;
  setActiveTripId: (id: string | null) => void;
  setActiveTrip: (trip: Trip | null) => void;
  reset: () => void;
}

export const useTripStore = create<TripState>((set) => ({
  activeTripId: null,
  activeTrip: null,
  setActiveTripId: (activeTripId) => set({ activeTripId }),
  setActiveTrip: (activeTrip) => set({ activeTrip, activeTripId: activeTrip ? activeTrip.id : null }),
  reset: () => set({ activeTripId: null, activeTrip: null }),
}));
