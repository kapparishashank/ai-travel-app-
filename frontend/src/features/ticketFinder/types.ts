export type TicketMode = 'flight' | 'train' | 'bus';
export type PriceDataStatus = 'live' | 'cached' | 'estimated' | 'mock';
export type AvailabilityStatus = 'available' | 'limited' | 'waitlist' | 'unavailable' | 'unknown';
export type RefundabilityFilter = 'all' | 'refundable' | 'non_refundable';
export type TicketSort = 'recommended' | 'price' | 'departure' | 'arrival' | 'duration';

export type TicketSearchInput = {
  origin: string;
  destination: string;
  departDate: string;
  passengers: number;
  modes: TicketMode[];
  seatClass?: string;
};

export type FareBreakdown = {
  baseFareMinor: number;
  taxesMinor: number;
  convenienceFeeMinor: number;
  baggageCostMinor: number;
  totalMinor: number;
  currency: 'INR';
};

export type TicketResult = {
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
  fare: FareBreakdown;
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

export type TicketProviderValidation = {
  resultId: string;
  availabilityStatus: AvailabilityStatus;
  priceStatus: PriceDataStatus;
  fare: FareBreakdown;
  partnerBookingUrl: string;
  cancellationInfo: TicketResult['cancellationInfo'];
  checkedAt: string;
  message: string;
};

export type TicketProvider = {
  id: string;
  displayName: string;
  mode: TicketMode;
  search(input: TicketSearchInput): Promise<TicketResult[]>;
  getFareDetails(resultId: string): Promise<FareBreakdown>;
  getAvailabilityStatus(resultId: string): Promise<AvailabilityStatus>;
  validateLatestPrice(resultId: string): Promise<TicketProviderValidation>;
  getPartnerBookingUrl(resultId: string): Promise<string>;
  getCancellationInformation(resultId: string): Promise<TicketResult['cancellationInfo']>;
  getDataFreshness(resultId: string): Promise<TicketResult['dataFreshness']>;
};

export type TicketFilters = {
  modes: Array<TicketMode | 'all'>;
  maxPriceMinor: number;
  departureWindow: 'any' | 'morning' | 'afternoon' | 'evening' | 'night';
  arrivalWindow: 'any' | 'morning' | 'afternoon' | 'evening' | 'night';
  maxDurationMinutes: number;
  maxStops: number;
  refundability: RefundabilityFilter;
  seatClass: string;
  operator: string;
};
