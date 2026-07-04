import { describe, expect, it, vi } from 'vitest';
import { sanitizeAnalyticsProperties, setAnalyticsConsent, trackAnalyticsEvent } from '../analytics';
import { storage } from '../../../utils/storage';
import { supabase } from '../../../lib/supabase';

vi.mock('../../../utils/storage', () => {
  const memory = new Map<string, string>();
  return {
    storage: {
      getItem: vi.fn((key: string) => Promise.resolve(memory.get(key) ?? null)),
      setItem: vi.fn((key: string, value: string) => {
        memory.set(key, value);
        return Promise.resolve();
      }),
    },
  };
});

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
      upsert: vi.fn(() => Promise.resolve({ error: null })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
    })),
  },
}));

describe('privacy-conscious analytics', () => {
  it('removes personal and precise location fields', () => {
    expect(
      sanitizeAnalyticsProperties({
        tripId: 'trip',
        email: 'x@example.com',
        latitude: 17.123456,
        longitude: 78.123456,
        phoneNumber: '123',
        destination: 'Goa',
        budgetMinor: 4000000,
      }),
    ).toEqual({ tripId: 'trip', destination: 'Goa', budgetMinor: 4000000 });
  });

  it('respects disabled analytics consent', async () => {
    await setAnalyticsConsent('user-1', false);
    const result = await trackAnalyticsEvent({ userId: 'user-1', name: 'trip_created', properties: { tripId: 'trip' } });
    expect(result).toEqual({ tracked: false, reason: 'consent_disabled' });
  });

  it('stores local consent preference without secrets', async () => {
    await setAnalyticsConsent('user-1', true);
    expect(storage.setItem).toHaveBeenCalledWith('travelai:analytics-consent', 'enabled');
    expect(supabase.from).toHaveBeenCalledWith('analytics_preferences');
  });
});
