import { describe, expect, it } from 'vitest';
import { getDataStatus, getDayTotal, hasTimeOverlap, sortActivities } from '../utils';
import type { ItineraryActivity } from '../../trips/types';

const baseActivity = {
  trip_id: 'trip-hyderabad-goa',
  trip_day_id: 'day-1',
  description: 'Estimated Hyderabad-to-Goa demo activity.',
  category: 'activity',
  location_name: 'Goa',
  starts_at: null,
  ends_at: null,
  source: 'ai',
  status: 'planned',
  metadata: {
    recommended_transport: 'Cab',
    recommendation_reason: 'Fits a moderate friends trip pace.',
    safety_note: 'Verify local conditions.',
    weather_note: 'Check forecast before outdoor plans.',
    data_label: '[AI ESTIMATE]',
  },
} satisfies Omit<ItineraryActivity, 'id' | 'title' | 'local_start_time' | 'local_end_time' | 'estimated_cost_minor' | 'sort_order'>;

function activity(
  id: string,
  title: string,
  start: string,
  end: string,
  cost: number,
  sortOrder: number,
  metadata: Record<string, any> = {},
): ItineraryActivity {
  return {
    ...baseActivity,
    id,
    title,
    local_start_time: start,
    local_end_time: end,
    estimated_cost_minor: cost,
    sort_order: sortOrder,
    metadata: { ...baseActivity.metadata, ...metadata },
  };
}

describe('Hyderabad to Goa itinerary flow helpers', () => {
  const dayOneActivities = [
    activity('arrival', 'Arrive in Goa and check in', '09:00', '10:30', 450_000, 2),
    activity('beach', 'Calangute beach time', '11:00', '13:00', 150_000, 1, { locked: true }),
    activity('food', 'Goan lunch crawl', '13:30', '15:00', 250_000, 3),
    activity('nightlife', 'Nightlife lane', '20:00', '22:30', 350_000, 4),
  ];

  it('sorts the Hyderabad-to-Goa demo day by saved itinerary order', () => {
    expect(sortActivities(dayOneActivities).map((item) => item.id)).toEqual(['beach', 'arrival', 'food', 'nightlife']);
  });

  it('recalculates day totals after itinerary edits', () => {
    expect(getDayTotal(dayOneActivities)).toBe(1_200_000);

    const edited = dayOneActivities.map((item) =>
      item.id === 'food' ? { ...item, estimated_cost_minor: 300_000 } : item,
    );

    expect(getDayTotal(edited)).toBe(1_250_000);
  });

  it('prevents overlapping custom activities where possible', () => {
    expect(
      hasTimeOverlap(
        {
          local_start_time: '12:30',
          local_end_time: '14:00',
        },
        dayOneActivities,
      ),
    ).toBe(true);

    expect(
      hasTimeOverlap(
        {
          local_start_time: '16:00',
          local_end_time: '18:00',
        },
        dayOneActivities,
      ),
    ).toBe(false);
  });

  it('keeps locked activities identifiable for regeneration', () => {
    const locked = dayOneActivities.filter((item) => item.metadata.locked);

    expect(locked).toHaveLength(1);
    expect(locked[0].title).toBe('Calangute beach time');
  });

  it('labels data provenance for AI estimates, external data, and confirmed bookings', () => {
    expect(getDataStatus(dayOneActivities[0])).toBe('AI estimate');
    expect(getDataStatus({ ...dayOneActivities[0], source: 'imported' })).toBe('External data');
    expect(getDataStatus({ ...dayOneActivities[0], status: 'booked' })).toBe('Confirmed booking');
  });
});
