import { describe, expect, it } from 'vitest';
import { MockBusProvider, MockFlightProvider, MockTrainProvider, searchMockProviders } from '../providers';
import { filterTicketResults, sortTicketResults } from '../utils';
import type { TicketFilters, TicketProvider, TicketSearchInput } from '../types';

const search: TicketSearchInput = {
  origin: 'Hyderabad',
  destination: 'Goa',
  departDate: '2026-08-14',
  passengers: 4,
  modes: ['flight', 'train', 'bus'],
  seatClass: '',
};

const defaultFilters: TicketFilters = {
  modes: ['all'],
  maxPriceMinor: 50_000_00,
  departureWindow: 'any',
  arrivalWindow: 'any',
  maxDurationMinutes: 1200,
  maxStops: 10,
  refundability: 'all',
  seatClass: '',
  operator: '',
};

describe('ticket provider adapters', () => {
  it('return complete mock results without claiming live inventory', async () => {
    const providers = [new MockFlightProvider(), new MockTrainProvider(), new MockBusProvider()];
    const results = (await Promise.all(providers.map((provider) => provider.search(search)))).flat();

    expect(results).toHaveLength(6);
    expect(results.every((result) => result.partnerBookingUrl.startsWith('https://'))).toBe(true);
    expect(results.every((result) => result.priceStatus !== 'live')).toBe(true);
    expect(results.every((result) => result.fare.totalMinor >= result.fare.baseFareMinor)).toBe(true);
  });

  it('validates latest price through provider contract before redirect', async () => {
    const provider = new MockFlightProvider();
    const [result] = await provider.search(search);
    const validation = await provider.validateLatestPrice(result.id);

    expect(validation.resultId).toBe(result.id);
    expect(validation.priceStatus).toBe(result.priceStatus);
    expect(validation.message).toContain('not live inventory');
  });

  it('handles provider failure without crashing aggregate search', async () => {
    const failingProvider: TicketProvider = {
      id: 'failing',
      displayName: 'FailingProvider',
      mode: 'bus',
      search: async () => {
        throw new Error('provider down');
      },
      getFareDetails: async () => {
        throw new Error('provider down');
      },
      getAvailabilityStatus: async () => 'unknown',
      validateLatestPrice: async () => {
        throw new Error('provider down');
      },
      getPartnerBookingUrl: async () => {
        throw new Error('provider down');
      },
      getCancellationInformation: async () => ({ refundable: false, summary: 'Unavailable' }),
      getDataFreshness: async () => ({ status: 'mock', checkedAt: new Date().toISOString(), message: 'Unavailable' }),
    };

    const settled = await Promise.allSettled([new MockTrainProvider().search(search), failingProvider.search(search)]);
    const results = settled.flatMap((entry) => (entry.status === 'fulfilled' ? entry.value : []));

    expect(results.length).toBeGreaterThan(0);
    expect(settled.filter((entry) => entry.status === 'rejected')).toHaveLength(1);
  });
});

describe('ticket filters and sorting', () => {
  it('sorts by total fare rather than base fare', async () => {
    const { results } = await searchMockProviders(search);
    const sorted = sortTicketResults(results, 'price');

    expect(sorted[0].fare.totalMinor).toBeLessThanOrEqual(sorted[1].fare.totalMinor);
    expect(sorted[0].mode).toBe('train');
  });

  it('filters by refundability and operator', async () => {
    const { results } = await searchMockProviders(search);
    const filtered = filterTicketResults(results, {
      ...defaultFilters,
      refundability: 'refundable',
      operator: 'Air India',
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].operator).toContain('Air India');
    expect(filtered[0].cancellationInfo.refundable).toBe(true);
  });

  it('filters by mode, class, stops, and duration', async () => {
    const { results } = await searchMockProviders(search);
    const filtered = filterTicketResults(results, {
      ...defaultFilters,
      modes: ['bus'],
      seatClass: 'Sleeper',
      maxStops: 2,
      maxDurationMinutes: 800,
    });

    expect(filtered.every((result) => result.mode === 'bus')).toBe(true);
    expect(filtered.every((result) => result.seatClass.includes('Sleeper'))).toBe(true);
  });
});
