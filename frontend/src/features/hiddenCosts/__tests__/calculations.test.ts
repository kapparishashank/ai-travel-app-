import { describe, expect, it } from 'vitest';
import {
  calculateHiddenCostTotals,
  createCostItem,
  deriveCostsFromItineraryItems,
  formatMinorAsDecimal,
  parseDecimalAmountToMinor,
} from '../calculations';
import type { HiddenCostItem } from '../types';

function cost(overrides: Partial<HiddenCostItem>): HiddenCostItem {
  return {
    id: overrides.id ?? 'cost',
    name: overrides.name ?? 'Cost',
    category: overrides.category ?? 'other',
    amountMinor: overrides.amountMinor ?? 0,
    currency: 'INR',
    status: overrides.status ?? 'estimated',
    confidence: overrides.confidence ?? 'medium',
    explanation: overrides.explanation ?? 'Test explanation',
    dataSource: overrides.dataSource ?? 'Unit test',
    lastUpdatedAt: '2026-07-03T00:00:00.000Z',
  };
}

describe('hidden cost calculations', () => {
  it('parses decimal amounts into minor units without floating point arithmetic', () => {
    expect(parseDecimalAmountToMinor('123.45')).toBe(12345);
    expect(parseDecimalAmountToMinor('1,000.5')).toBe(100050);
    expect(formatMinorAsDecimal(12345)).toBe('123.45');
  });

  it('rejects negative and over-precision amounts', () => {
    expect(() => parseDecimalAmountToMinor('-1')).toThrow();
    expect(() => parseDecimalAmountToMinor('10.999')).toThrow();
  });

  it('calculates confirmed, estimated, group, per-person, and remaining totals', () => {
    const totals = calculateHiddenCostTotals({
      travelerCount: 4,
      budgetMinor: 40_000_00,
      emergencyBufferPercentage: 10,
      items: [
        cost({ id: 'ticket', amountMinor: 20_000_00, status: 'confirmed', confidence: 'high' }),
        cost({ id: 'food', amountMinor: 8_000_00, status: 'estimated', confidence: 'medium' }),
      ],
    });

    expect(totals.confirmedTotalMinor).toBe(20_000_00);
    expect(totals.estimatedTotalMinor).toBe(8_000_00);
    expect(totals.emergencyBufferMinor).toBe(2_800_00);
    expect(totals.groupTotalMinor).toBe(30_800_00);
    expect(totals.perPersonTotalMinor).toBe(7_700_00);
    expect(totals.remainingBudgetMinor).toBe(9_200_00);
    expect(totals.isOverBudget).toBe(false);
  });

  it('applies confidence ranges only to estimated costs', () => {
    const totals = calculateHiddenCostTotals({
      travelerCount: 2,
      budgetMinor: 10_000_00,
      emergencyBufferPercentage: 0,
      items: [
        cost({ id: 'confirmed', amountMinor: 1_000_00, status: 'confirmed', confidence: 'low' }),
        cost({ id: 'estimated', amountMinor: 1_000_00, status: 'estimated', confidence: 'low' }),
      ],
    });

    expect(totals.lowEstimateMinor).toBe(1_700_00);
    expect(totals.expectedEstimateMinor).toBe(2_000_00);
    expect(totals.highEstimateMinor).toBe(2_300_00);
  });

  it('flags over-budget plans', () => {
    const totals = calculateHiddenCostTotals({
      travelerCount: 4,
      budgetMinor: 40_000_00,
      emergencyBufferPercentage: 10,
      items: [cost({ amountMinor: 50_000_00, status: 'estimated', confidence: 'high' })],
    });

    expect(totals.isOverBudget).toBe(true);
    expect(totals.remainingBudgetMinor).toBe(-15_000_00);
  });

  it('prevents negative costs when creating items', () => {
    expect(() =>
      createCostItem({
        name: 'Bad cost',
        category: 'other',
        amountMinor: -1,
        currency: 'INR',
        status: 'estimated',
        confidence: 'medium',
        explanation: 'Invalid',
        dataSource: 'Unit test',
      }),
    ).toThrow('Costs cannot be negative.');
  });

  it('derives itinerary costs so totals can update when itinerary items change', () => {
    const initial = deriveCostsFromItineraryItems(
      [
        {
          id: 'beach',
          title: 'Beach club',
          estimated_cost_minor: 2_000_00,
          source: 'ai',
          metadata: { category: 'activity' },
        },
      ],
      'INR',
    );
    const updated = deriveCostsFromItineraryItems(
      [
        {
          id: 'beach',
          title: 'Beach club',
          estimated_cost_minor: 3_000_00,
          source: 'ai',
          metadata: { category: 'activity' },
        },
      ],
      'INR',
    );

    expect(initial[0].amountMinor).toBe(2_000_00);
    expect(updated[0].amountMinor).toBe(3_000_00);
    expect(updated[0].category).toBe('activities');
  });
});
