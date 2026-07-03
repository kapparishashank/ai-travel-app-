export type JourneyMode = 'bus' | 'train' | 'flight' | 'cab' | 'mixed';
export type JourneyPriority = 'balanced' | 'price' | 'time' | 'comfort' | 'convenience';
export type JourneySort = 'recommended' | 'price' | 'duration' | 'comfort' | 'departure';
export type JourneyDataStatus = 'demo_estimate' | 'provider_estimate';

export type JourneyOption = {
  id: string;
  mode: JourneyMode;
  provider: string;
  departure: string;
  arrival: string;
  durationMinutes: number;
  waitingTimeMinutes: number;
  transfers: number;
  baseFareMinor: number;
  taxesMinor: number;
  baggageCostMinor: number;
  firstMileCostMinor: number;
  lastMileCostMinor: number;
  totalEstimatedCostMinor: number;
  comfortScore: number;
  convenienceScore: number;
  reliabilityScore: number;
  flexibilityScore: number;
  safetyGuidanceScore: number;
  dataStatus: JourneyDataStatus;
  lastCheckedAt: string;
  cancellationPolicy: string;
  safetyGuidance: string;
  segments: JourneySegment[];
};

export type JourneySegment = {
  mode: JourneyMode;
  provider: string;
  origin: string;
  destination: string;
  departure: string;
  arrival: string;
  durationMinutes: number;
};

export type RankedJourneyOption = JourneyOption & {
  weightedScore: number;
  labels: string[];
  whyRecommended: string;
  normalized: {
    price: number;
    duration: number;
    comfort: number;
    convenience: number;
    reliability: number;
    flexibility: number;
    safety: number;
  };
};

export type JourneySearchInput = {
  origin: string;
  destination: string;
  travelDate: string;
  travelers: number;
};
