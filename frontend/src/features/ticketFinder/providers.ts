import type {
  AvailabilityStatus,
  FareBreakdown,
  TicketMode,
  TicketProvider,
  TicketProviderValidation,
  TicketResult,
  TicketSearchInput,
} from './types';

const checkedAt = '2026-07-04T09:30:00.000Z';

abstract class MockTicketProvider implements TicketProvider {
  abstract id: string;
  abstract displayName: string;
  abstract mode: TicketMode;

  protected abstract buildResults(input: TicketSearchInput): TicketResult[];

  async search(input: TicketSearchInput) {
    return this.buildResults(input);
  }

  async getFareDetails(resultId: string) {
    return this.findById(resultId).fare;
  }

  async getAvailabilityStatus(resultId: string) {
    return this.findById(resultId).availabilityStatus;
  }

  async validateLatestPrice(resultId: string): Promise<TicketProviderValidation> {
    const result = this.findById(resultId);
    return {
      resultId,
      availabilityStatus: result.availabilityStatus,
      priceStatus: result.priceStatus,
      fare: result.fare,
      partnerBookingUrl: result.partnerBookingUrl,
      cancellationInfo: result.cancellationInfo,
      checkedAt: new Date().toISOString(),
      message: 'Mock provider validation only. This is not live inventory and must be revalidated by an authorized provider before checkout.',
    };
  }

  async getPartnerBookingUrl(resultId: string) {
    return this.findById(resultId).partnerBookingUrl;
  }

  async getCancellationInformation(resultId: string) {
    return this.findById(resultId).cancellationInfo;
  }

  async getDataFreshness(resultId: string) {
    return this.findById(resultId).dataFreshness;
  }

  private findById(resultId: string) {
    const result = this.buildResults(defaultInput()).find((item) => item.id === resultId);
    if (!result) throw new Error('Ticket result not found in mock provider.');
    return result;
  }
}

export class MockFlightProvider extends MockTicketProvider {
  id = 'mock-flight';
  displayName = 'MockFlightProvider';
  mode: TicketMode = 'flight';

  protected buildResults(input: TicketSearchInput): TicketResult[] {
    return [
      result(input, {
        id: 'flight-indigo-hyd-goa-0615',
        providerId: this.id,
        mode: 'flight',
        operator: 'IndiGo mock',
        serviceCode: '6E-204',
        departHour: 6,
        departMinute: 15,
        durationMinutes: 85,
        stops: 0,
        seatClass: input.seatClass || 'Economy',
        base: 4200,
        taxes: 680,
        fee: 220,
        baggage: 900,
        availableSeats: 9,
        availabilityStatus: 'limited',
        refundable: false,
        cancellation: 'Non-refundable base fare. Taxes may be partially refundable. Verify with airline.',
        url: 'https://www.goindigo.in',
        tags: ['Fastest', 'Low base fare'],
      }),
      result(input, {
        id: 'flight-airindia-hyd-goa-1010',
        providerId: this.id,
        mode: 'flight',
        operator: 'Air India mock',
        serviceCode: 'AI-805',
        departHour: 10,
        departMinute: 10,
        durationMinutes: 95,
        stops: 0,
        seatClass: input.seatClass || 'Economy Flex',
        base: 5200,
        taxes: 720,
        fee: 240,
        baggage: 0,
        availableSeats: 6,
        availabilityStatus: 'limited',
        refundable: true,
        cancellation: 'Refundable estimate with cancellation fee. Verify fare family before purchase.',
        url: 'https://www.airindia.com',
        tags: ['Refundable', 'Baggage included'],
      }),
    ];
  }
}

export class MockTrainProvider extends MockTicketProvider {
  id = 'mock-train';
  displayName = 'MockTrainProvider';
  mode: TicketMode = 'train';

  protected buildResults(input: TicketSearchInput): TicketResult[] {
    return [
      result(input, {
        id: 'train-konkan-hyd-goa-0615',
        providerId: this.id,
        mode: 'train',
        operator: 'Indian Railways mock',
        serviceCode: 'KONKAN-127',
        departHour: 6,
        departMinute: 15,
        durationMinutes: 860,
        stops: 8,
        seatClass: input.seatClass || '3A',
        base: 950,
        taxes: 0,
        fee: 35,
        baggage: 0,
        availableSeats: 28,
        availabilityStatus: 'available',
        refundable: true,
        cancellation: 'Rail cancellation rules vary by charting status and class. Verify in IRCTC.',
        url: 'https://www.irctc.co.in',
        tags: ['Cheapest', 'Refundable'],
      }),
      result(input, {
        id: 'train-night-hyd-goa-1830',
        providerId: this.id,
        mode: 'train',
        operator: 'Indian Railways mock',
        serviceCode: 'NIGHT-173',
        departHour: 18,
        departMinute: 30,
        durationMinutes: 920,
        stops: 10,
        seatClass: input.seatClass || '2A',
        base: 1450,
        taxes: 0,
        fee: 35,
        baggage: 0,
        availableSeats: 4,
        availabilityStatus: 'limited',
        refundable: true,
        cancellation: 'Refund estimate depends on class and timing. Verify in IRCTC.',
        url: 'https://www.irctc.co.in',
        tags: ['Overnight'],
      }),
    ];
  }
}

export class MockBusProvider extends MockTicketProvider {
  id = 'mock-bus';
  displayName = 'MockBusProvider';
  mode: TicketMode = 'bus';

  protected buildResults(input: TicketSearchInput): TicketResult[] {
    return [
      result(input, {
        id: 'bus-ac-sleeper-hyd-goa-2045',
        providerId: this.id,
        mode: 'bus',
        operator: 'VRL Travels mock',
        serviceCode: 'VRL-SLP',
        departHour: 20,
        departMinute: 45,
        durationMinutes: 750,
        stops: 2,
        seatClass: input.seatClass || 'AC Sleeper',
        base: 1350,
        taxes: 70,
        fee: 80,
        baggage: 0,
        availableSeats: 12,
        availabilityStatus: 'available',
        refundable: false,
        cancellation: 'Often non-refundable close to departure. Verify operator policy.',
        url: 'https://www.redbus.in',
        tags: ['Overnight', 'Budget'],
      }),
      result(input, {
        id: 'bus-volvo-hyd-goa-1930',
        providerId: this.id,
        mode: 'bus',
        operator: 'SRS Travels mock',
        serviceCode: 'SRS-VOLVO',
        departHour: 19,
        departMinute: 30,
        durationMinutes: 790,
        stops: 1,
        seatClass: input.seatClass || 'Volvo Semi-Sleeper',
        base: 1600,
        taxes: 80,
        fee: 90,
        baggage: 0,
        availableSeats: 18,
        availabilityStatus: 'available',
        refundable: true,
        cancellation: 'Partial refund estimate before cutoff. Verify operator terms.',
        url: 'https://www.redbus.in',
        tags: ['Refundable'],
      }),
    ];
  }
}

export const ticketProviders: TicketProvider[] = [
  new MockFlightProvider(),
  new MockTrainProvider(),
  new MockBusProvider(),
];

export async function searchMockProviders(input: TicketSearchInput) {
  const providers = ticketProviders.filter((provider) => input.modes.includes(provider.mode));
  const settled = await Promise.allSettled(providers.map((provider) => provider.search(input)));
  return {
    results: settled.flatMap((entry) => (entry.status === 'fulfilled' ? entry.value : [])),
    failures: settled.filter((entry) => entry.status === 'rejected').length,
  };
}

export function getProviderById(providerId: string) {
  return ticketProviders.find((provider) => provider.id === providerId) ?? null;
}

function result(
  input: TicketSearchInput,
  spec: {
    id: string;
    providerId: string;
    mode: TicketMode;
    operator: string;
    serviceCode: string;
    departHour: number;
    departMinute: number;
    durationMinutes: number;
    stops: number;
    seatClass: string;
    base: number;
    taxes: number;
    fee: number;
    baggage: number;
    availableSeats: number | null;
    availabilityStatus: AvailabilityStatus;
    refundable: boolean;
    cancellation: string;
    url: string;
    tags: string[];
  },
): TicketResult {
  const departureAt = at(input.departDate, spec.departHour, spec.departMinute);
  const arrivalAt = new Date(new Date(departureAt).getTime() + spec.durationMinutes * 60_000).toISOString();
  const fare = fareFor(input.passengers, spec.base, spec.taxes, spec.fee, spec.baggage);
  return {
    id: spec.id,
    providerId: spec.providerId,
    mode: spec.mode,
    operator: spec.operator,
    serviceCode: spec.serviceCode,
    origin: input.origin,
    destination: input.destination,
    departureAt,
    arrivalAt,
    durationMinutes: spec.durationMinutes,
    stops: spec.stops,
    seatClass: spec.seatClass,
    fare,
    availabilityStatus: spec.availabilityStatus,
    availableSeats: spec.availableSeats,
    priceStatus: spec.mode === 'train' ? 'mock' : 'estimated',
    lastCheckedAt: checkedAt,
    partnerBookingUrl: spec.url,
    cancellationInfo: {
      refundable: spec.refundable,
      summary: spec.cancellation,
      penaltyMinor: spec.refundable ? 3500_00 : undefined,
    },
    dataFreshness: {
      status: spec.mode === 'train' ? 'mock' : 'estimated',
      checkedAt,
      expiresAt: '2026-07-04T10:00:00.000Z',
      message: 'Structured mock-provider data. This is not live inventory.',
    },
    tags: ['Mock data', ...spec.tags],
  };
}

function fareFor(passengers: number, base: number, taxes: number, fee: number, baggage: number): FareBreakdown {
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
    currency: 'INR',
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
