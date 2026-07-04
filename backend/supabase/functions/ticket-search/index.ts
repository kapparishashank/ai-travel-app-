// Supabase Edge Function: ticket-search
// Structured mock-provider contract for flights, trains, and buses.
// These adapters do not return live inventory. Revalidate with an authorized
// provider before any future checkout.

import { errorResponse, handleCors, jsonResponse } from '../_shared/cors.ts';

type TicketMode = 'flight' | 'train' | 'bus';
type PriceDataStatus = 'live' | 'cached' | 'estimated' | 'mock';
type AvailabilityStatus = 'available' | 'limited' | 'waitlist' | 'unavailable' | 'unknown';

type TicketSearchInput = {
  origin: string;
  destination: string;
  departDate: string;
  passengers: number;
  modes: TicketMode[];
  seatClass?: string;
};

type TicketResult = {
  id: string;
  providerId: string;
  mode: TicketMode;
  operator: string;
  serviceCode: string;
  origin: string;
  destination: string;
  departureAt: string;
  arrivalAt: string;
  durationMinutes: number;
  stops: number;
  seatClass: string;
  fare: {
    baseFareMinor: number;
    taxesMinor: number;
    convenienceFeeMinor: number;
    baggageCostMinor: number;
    totalMinor: number;
    currency: 'INR';
  };
  availabilityStatus: AvailabilityStatus;
  availableSeats: number | null;
  priceStatus: PriceDataStatus;
  lastCheckedAt: string;
  partnerBookingUrl: string;
  cancellationInfo: {
    refundable: boolean;
    summary: string;
    penaltyMinor?: number;
  };
  dataFreshness: {
    status: PriceDataStatus;
    checkedAt: string;
    expiresAt?: string;
    message: string;
  };
  tags: string[];
};

type ProviderContract = {
  id: string;
  displayName: string;
  mode: TicketMode;
  search(input: TicketSearchInput): Promise<TicketResult[]>;
  validateLatestPrice(resultId: string): Promise<{
    resultId: string;
    availabilityStatus: AvailabilityStatus;
    priceStatus: PriceDataStatus;
    fare: TicketResult['fare'];
    partnerBookingUrl: string;
    cancellationInfo: TicketResult['cancellationInfo'];
    checkedAt: string;
    message: string;
  }>;
};

Deno.serve(async (req: Request) => {
  const corsResult = handleCors(req);
  if (corsResult) return corsResult;
  if (req.method !== 'POST') return errorResponse('method_not_allowed', 'Use POST to search tickets.', 405);

  try {
    const raw = await req.json().catch(() => ({}));
    const input = normalizeInput(raw);
    if (!input.origin || !input.destination || !input.departDate) {
      return errorResponse('invalid_request', 'origin, destination, and departDate are required.', 400);
    }

    const providers = getProviders().filter((provider) => input.modes.includes(provider.mode));
    const settled = await Promise.allSettled(providers.map((provider) => provider.search(input)));
    const results = settled.flatMap((entry) => (entry.status === 'fulfilled' ? entry.value : []));

    return jsonResponse({
      status: 'ok',
      data_label: '[MOCK DATA]',
      disclaimer:
        'Ticket results use structured mock-provider data. Prices, availability, cancellation rules, and booking links are not live inventory. Revalidate through an authorized provider before checkout.',
      providerContractVersion: 'ticket-provider-v1',
      failures: settled.filter((entry) => entry.status === 'rejected').length,
      search: input,
      results,
    });
  } catch (error) {
    console.error('ticket-search error:', error);
    return errorResponse('internal_error', 'Ticket providers failed. Please try again.', 500);
  }
});

class MockProvider implements ProviderContract {
  constructor(
    public id: string,
    public displayName: string,
    public mode: TicketMode,
    private build: (input: TicketSearchInput) => TicketResult[],
  ) {}

  async search(input: TicketSearchInput) {
    return this.build(input);
  }

  async validateLatestPrice(resultId: string) {
    const result = this.build(defaultInput()).find((item) => item.id === resultId);
    if (!result) throw new Error('Result not found.');
    return {
      resultId,
      availabilityStatus: result.availabilityStatus,
      priceStatus: result.priceStatus,
      fare: result.fare,
      partnerBookingUrl: result.partnerBookingUrl,
      cancellationInfo: result.cancellationInfo,
      checkedAt: new Date().toISOString(),
      message: 'Mock validation only. This is not live inventory.',
    };
  }
}

function getProviders(): ProviderContract[] {
  return [
    new MockProvider('mock-flight', 'MockFlightProvider', 'flight', (input) => [
      ticket(input, 'mock-flight', 'flight-indigo-hyd-goa-0615', 'IndiGo mock', '6E-204', 6, 15, 85, 0, input.seatClass || 'Economy', 4200, 680, 220, 900, 'limited', 9, false, 'https://www.goindigo.in', ['Fastest', 'Low base fare']),
      ticket(input, 'mock-flight', 'flight-airindia-hyd-goa-1010', 'Air India mock', 'AI-805', 10, 10, 95, 0, input.seatClass || 'Economy Flex', 5200, 720, 240, 0, 'limited', 6, true, 'https://www.airindia.com', ['Refundable', 'Baggage included']),
    ]),
    new MockProvider('mock-train', 'MockTrainProvider', 'train', (input) => [
      ticket(input, 'mock-train', 'train-konkan-hyd-goa-0615', 'Indian Railways mock', 'KONKAN-127', 6, 15, 860, 8, input.seatClass || '3A', 950, 0, 35, 0, 'available', 28, true, 'https://www.irctc.co.in', ['Cheapest', 'Refundable']),
      ticket(input, 'mock-train', 'train-night-hyd-goa-1830', 'Indian Railways mock', 'NIGHT-173', 18, 30, 920, 10, input.seatClass || '2A', 1450, 0, 35, 0, 'limited', 4, true, 'https://www.irctc.co.in', ['Overnight']),
    ]),
    new MockProvider('mock-bus', 'MockBusProvider', 'bus', (input) => [
      ticket(input, 'mock-bus', 'bus-ac-sleeper-hyd-goa-2045', 'VRL Travels mock', 'VRL-SLP', 20, 45, 750, 2, input.seatClass || 'AC Sleeper', 1350, 70, 80, 0, 'available', 12, false, 'https://www.redbus.in', ['Overnight', 'Budget']),
      ticket(input, 'mock-bus', 'bus-volvo-hyd-goa-1930', 'SRS Travels mock', 'SRS-VOLVO', 19, 30, 790, 1, input.seatClass || 'Volvo Semi-Sleeper', 1600, 80, 90, 0, 'available', 18, true, 'https://www.redbus.in', ['Refundable']),
    ]),
  ];
}

function ticket(
  input: TicketSearchInput,
  providerId: string,
  id: string,
  operator: string,
  serviceCode: string,
  hour: number,
  minute: number,
  durationMinutes: number,
  stops: number,
  seatClass: string,
  base: number,
  taxes: number,
  fee: number,
  baggage: number,
  availabilityStatus: AvailabilityStatus,
  availableSeats: number | null,
  refundable: boolean,
  partnerBookingUrl: string,
  tags: string[],
): TicketResult {
  const departureAt = at(input.departDate, hour, minute);
  const arrivalAt = new Date(new Date(departureAt).getTime() + durationMinutes * 60_000).toISOString();
  const fare = fareFor(input.passengers, base, taxes, fee, baggage);
  const checkedAt = '2026-07-04T09:30:00.000Z';
  return {
    id,
    providerId,
    mode: providerId.replace('mock-', '') as TicketMode,
    operator,
    serviceCode,
    origin: input.origin,
    destination: input.destination,
    departureAt,
    arrivalAt,
    durationMinutes,
    stops,
    seatClass,
    fare,
    availabilityStatus,
    availableSeats,
    priceStatus: providerId === 'mock-train' ? 'mock' : 'estimated',
    lastCheckedAt: checkedAt,
    partnerBookingUrl,
    cancellationInfo: {
      refundable,
      summary: refundable ? 'Refundable estimate. Verify provider policy before purchase.' : 'Non-refundable estimate. Verify provider policy before purchase.',
      penaltyMinor: refundable ? 3500_00 : undefined,
    },
    dataFreshness: {
      status: providerId === 'mock-train' ? 'mock' : 'estimated',
      checkedAt,
      expiresAt: '2026-07-04T10:00:00.000Z',
      message: 'Structured mock-provider data. This is not live inventory.',
    },
    tags: ['Mock data', ...tags],
  };
}

function normalizeInput(raw: Record<string, unknown>): TicketSearchInput {
  const mode = raw.type as TicketMode | undefined;
  const modes = Array.isArray(raw.modes) ? (raw.modes as TicketMode[]) : mode ? [mode] : ['flight', 'train', 'bus'];
  return {
    origin: String(raw.origin ?? ''),
    destination: String(raw.destination ?? ''),
    departDate: String(raw.departDate ?? raw.date ?? ''),
    passengers: Math.max(1, Number(raw.passengers ?? raw.numPassengers ?? 1)),
    modes: modes.filter(isTicketMode),
    seatClass: typeof raw.seatClass === 'string' ? raw.seatClass : undefined,
  };
}

function isTicketMode(value: unknown): value is TicketMode {
  return value === 'flight' || value === 'train' || value === 'bus';
}

function fareFor(passengers: number, base: number, taxes: number, fee: number, baggage: number) {
  const baseFareMinor = base * 100 * passengers;
  const taxesMinor = taxes * 100 * passengers;
  const convenienceFeeMinor = fee * 100 * passengers;
  const baggageCostMinor = baggage * 100 * passengers;
  return {
    baseFareMinor,
    taxesMinor,
    convenienceFeeMinor,
    baggageCostMinor,
    totalMinor: baseFareMinor + taxesMinor + convenienceFeeMinor + baggageCostMinor,
    currency: 'INR' as const,
  };
}

function at(date: string, hour: number, minute: number) {
  const value = new Date(`${date}T00:00:00+05:30`);
  value.setHours(hour, minute, 0, 0);
  return value.toISOString();
}

function defaultInput(): TicketSearchInput {
  return {
    origin: 'Hyderabad',
    destination: 'Goa',
    departDate: '2026-08-14',
    passengers: 4,
    modes: ['flight', 'train', 'bus'],
  };
}
