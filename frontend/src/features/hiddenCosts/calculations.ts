import type {
  CostConfidence,
  HiddenCostCategory,
  HiddenCostItem,
  HiddenCostTotals,
  ItineraryCostSource,
} from './types';

const confidenceRange: Record<CostConfidence, number> = {
  high: 0.05,
  medium: 0.15,
  low: 0.3,
};

const itineraryCategoryBySource: Record<string, HiddenCostCategory> = {
  food: 'food',
  activity: 'activities',
  transport: 'local_transport',
  stay: 'accommodation',
  shopping: 'other',
  safety: 'other',
  other: 'other',
};

export function parseDecimalAmountToMinor(value: string): number {
  const normalized = value.trim().replace(/,/g, '');
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) {
    throw new Error('Amount must be a positive number with up to 2 decimal places.');
  }

  const [whole, fraction = ''] = normalized.split('.');
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(minor) || minor < 0) {
    throw new Error('Amount is outside the supported range.');
  }
  return minor;
}

export function formatMinorAsDecimal(amountMinor: number): string {
  const sign = amountMinor < 0 ? '-' : '';
  const absolute = Math.abs(amountMinor);
  const whole = Math.floor(absolute / 100);
  const fraction = String(absolute % 100).padStart(2, '0');
  return `${sign}${whole}.${fraction}`;
}

export function calculateHiddenCostTotals({
  items,
  travelerCount,
  budgetMinor,
  emergencyBufferPercentage,
}: {
  items: HiddenCostItem[];
  travelerCount: number;
  budgetMinor: number;
  emergencyBufferPercentage: number;
}): HiddenCostTotals {
  if (travelerCount <= 0) throw new Error('Traveler count must be positive.');
  if (budgetMinor < 0) throw new Error('Budget cannot be negative.');
  if (emergencyBufferPercentage < 0) throw new Error('Emergency buffer cannot be negative.');

  const fixedItems = items.filter((item) => item.category !== 'emergency_buffer');
  const confirmedTotalMinor = sumByStatus(fixedItems, 'confirmed');
  const estimatedTotalMinor = sumByStatus(fixedItems, 'estimated');
  const expectedWithoutBufferMinor = confirmedTotalMinor + estimatedTotalMinor;
  const emergencyBufferMinor = roundMinor((expectedWithoutBufferMinor * emergencyBufferPercentage) / 100);
  const groupTotalMinor = expectedWithoutBufferMinor + emergencyBufferMinor;

  const lowWithoutBufferMinor = fixedItems.reduce((sum, item) => {
    if (item.status === 'confirmed') return sum + item.amountMinor;
    return sum + roundMinor(item.amountMinor * (1 - confidenceRange[item.confidence]));
  }, 0);
  const highWithoutBufferMinor = fixedItems.reduce((sum, item) => {
    if (item.status === 'confirmed') return sum + item.amountMinor;
    return sum + roundMinor(item.amountMinor * (1 + confidenceRange[item.confidence]));
  }, 0);

  const lowEstimateMinor = lowWithoutBufferMinor + roundMinor((lowWithoutBufferMinor * emergencyBufferPercentage) / 100);
  const highEstimateMinor = highWithoutBufferMinor + roundMinor((highWithoutBufferMinor * emergencyBufferPercentage) / 100);
  const remainingBudgetMinor = budgetMinor - groupTotalMinor;

  return {
    lowEstimateMinor,
    expectedEstimateMinor: groupTotalMinor,
    highEstimateMinor,
    perPersonTotalMinor: roundMinor(groupTotalMinor / travelerCount),
    groupTotalMinor,
    confirmedTotalMinor,
    estimatedTotalMinor,
    emergencyBufferMinor,
    remainingBudgetMinor,
    isOverBudget: remainingBudgetMinor < 0,
    explanation: buildExplanation(emergencyBufferPercentage),
  };
}

export function createCostItem(input: Omit<HiddenCostItem, 'id' | 'lastUpdatedAt'> & { id?: string }): HiddenCostItem {
  if (input.amountMinor < 0) throw new Error('Costs cannot be negative.');

  return {
    ...input,
    id: input.id ?? cryptoRandomId(),
    lastUpdatedAt: new Date().toISOString(),
  };
}

export function deriveCostsFromItineraryItems(items: ItineraryCostSource[], currency: string): HiddenCostItem[] {
  return items
    .filter((item) => (item.estimated_cost_minor ?? 0) > 0)
    .map((item) =>
      createCostItem({
        id: `itinerary-${item.id}`,
        name: item.title,
        category: itineraryCategoryBySource[String(item.metadata?.category ?? item.source ?? 'activity')] ?? 'activities',
        amountMinor: item.estimated_cost_minor ?? 0,
        currency,
        status: item.metadata?.booking_status === 'confirmed' ? 'confirmed' : 'estimated',
        confidence: item.source === 'ai' ? 'medium' : 'high',
        explanation: 'Imported from the current itinerary and recalculated whenever itinerary items change.',
        dataSource: item.source === 'ai' ? 'AI itinerary estimate' : 'Itinerary item',
      }),
    );
}

function sumByStatus(items: HiddenCostItem[], status: HiddenCostItem['status']) {
  return items.reduce((sum, item) => sum + (item.status === status ? item.amountMinor : 0), 0);
}

function roundMinor(value: number) {
  return Math.round(value);
}

function buildExplanation(emergencyBufferPercentage: number) {
  return [
    'Confirmed costs are counted exactly.',
    'Estimated costs use confidence bands: high +/-5%, medium +/-15%, low +/-30%.',
    `The emergency buffer is ${emergencyBufferPercentage}% of confirmed plus estimated costs, excluding manual emergency-buffer line items.`,
    'All final arithmetic is performed locally in deterministic TypeScript using minor currency units.',
  ].join(' ');
}

function cryptoRandomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `cost-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
