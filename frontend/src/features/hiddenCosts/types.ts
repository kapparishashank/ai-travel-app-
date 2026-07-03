export const hiddenCostCategories = [
  'ticket_base_fare',
  'taxes',
  'convenience_fees',
  'baggage',
  'seat_selection',
  'first_mile_transport',
  'last_mile_transport',
  'local_transport',
  'accommodation',
  'accommodation_taxes',
  'food',
  'activities',
  'parking',
  'tolls',
  'internet_or_sim',
  'emergency_buffer',
  'other',
] as const;

export type HiddenCostCategory = (typeof hiddenCostCategories)[number];
export type CostStatus = 'estimated' | 'confirmed';
export type CostConfidence = 'high' | 'medium' | 'low';

export type HiddenCostItem = {
  id: string;
  name: string;
  category: HiddenCostCategory;
  amountMinor: number;
  currency: string;
  status: CostStatus;
  confidence: CostConfidence;
  explanation: string;
  dataSource: string;
  lastUpdatedAt: string;
};

export type HiddenCostTotals = {
  lowEstimateMinor: number;
  expectedEstimateMinor: number;
  highEstimateMinor: number;
  perPersonTotalMinor: number;
  groupTotalMinor: number;
  confirmedTotalMinor: number;
  estimatedTotalMinor: number;
  emergencyBufferMinor: number;
  remainingBudgetMinor: number;
  isOverBudget: boolean;
  explanation: string;
};

export type ItineraryCostSource = {
  id: string;
  title: string;
  estimated_cost_minor?: number | null;
  source?: string | null;
  metadata?: Record<string, any> | null;
  updated_at?: string | null;
};
