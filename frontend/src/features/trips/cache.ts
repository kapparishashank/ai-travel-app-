import { storage } from '../../utils/storage';
import type { TripDetails } from './types';

const RECENT_TRIP_CACHE_KEY = 'travelai.recentTripDetails.v1';

export type CachedTripDetails = Omit<TripDetails, 'safetySessions'> & {
  safetySessions: Array<{
    id: string;
    trip_id: string | null;
    user_id: string;
    status: string;
    checkin_interval_minutes: number;
    started_at: string;
    ends_at: string | null;
    last_checkin_at: string | null;
    next_checkin_due_at: string | null;
  }>;
  cachedAt: string;
};

export async function cacheTripDetails(details: TripDetails) {
  const safeDetails: CachedTripDetails = {
    ...details,
    safetySessions: details.safetySessions.map((session) => ({
      id: session.id,
      trip_id: session.trip_id,
      user_id: session.user_id,
      status: session.status,
      checkin_interval_minutes: session.checkin_interval_minutes,
      started_at: session.started_at,
      ends_at: session.ends_at,
      last_checkin_at: session.last_checkin_at,
      next_checkin_due_at: session.next_checkin_due_at,
    })),
    cachedAt: new Date().toISOString(),
  };

  await storage.setItem(RECENT_TRIP_CACHE_KEY, JSON.stringify(safeDetails));
}

export async function getCachedTripDetails(tripId: string) {
  const cached = await storage.getItem(RECENT_TRIP_CACHE_KEY);
  if (!cached) return null;

  try {
    const parsed = JSON.parse(cached) as CachedTripDetails;
    return parsed.trip.id === tripId ? parsed : null;
  } catch {
    return null;
  }
}
