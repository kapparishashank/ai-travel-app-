export const budgetDiscoveryTags = [
  'beach',
  'mountains',
  'heritage',
  'adventure',
  'food',
  'nature',
  'nightlife',
  'relaxation',
  'weekend',
  'one_day_outing',
] as const;

export type BudgetDiscoveryTag = (typeof budgetDiscoveryTags)[number];
export type BudgetConfidence = 'high' | 'medium' | 'low';
export type DiscoveryTransport = 'bus' | 'train' | 'flight' | 'cab' | 'mixed';

export type CuratedDestination = {
  id: string;
  name: string;
  region: string;
  state: string;
  distanceKmByCity: Record<string, number>;
  tags: BudgetDiscoveryTag[];
  bestMonths: string[];
  dailyStayMinor: number;
  dailyFoodMinor: number;
  dailyLocalTravelMinor: number;
  dailyActivitiesMinor: number;
  feesMinor: number;
  confidence: BudgetConfidence;
  sourceNote: string;
};

export type BudgetDiscoveryInput = {
  startingCity: string;
  maxBudgetMinor: number;
  travelerCount: number;
  tripLengthDays: number;
  startDate?: string;
  endDate?: string;
  interests: BudgetDiscoveryTag[];
  preferredTransport: DiscoveryTransport;
  maxDistanceKm: number;
};

export type DestinationCostBreakdown = {
  transportMinor: number;
  accommodationMinor: number;
  foodMinor: number;
  localTravelMinor: number;
  activitiesMinor: number;
  feesMinor: number;
  emergencyBufferMinor: number;
  expectedTotalMinor: number;
};

export type BudgetDestinationSuggestion = {
  destination: CuratedDestination;
  transport: DiscoveryTransport;
  distanceKm: number;
  costs: DestinationCostBreakdown;
  confidence: BudgetConfidence;
  budgetRemainingMinor: number;
  isAffordable: boolean;
  affordabilityLabel: 'within_budget' | 'tight' | 'not_realistically_affordable';
  score: number;
  reasons: string[];
  lowerCostAlternatives: string[];
  estimatedLabel: '[ESTIMATED]';
};
