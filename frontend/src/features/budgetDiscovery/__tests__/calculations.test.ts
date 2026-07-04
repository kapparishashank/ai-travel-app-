import { describe, expect, it } from 'vitest';
import { calculateDestinationCosts, discoverBudgetDestinations, parseRupeesToMinor } from '../calculations';
import { curatedIndiaDestinations } from '../dataset';
import type { BudgetDiscoveryInput } from '../types';

const baseInput: BudgetDiscoveryInput = {
  startingCity: 'Hyderabad',
  maxBudgetMinor: parseRupeesToMinor(40000),
  travelerCount: 4,
  tripLengthDays: 4,
  startDate: '2026-08-01',
  endDate: '2026-08-04',
  interests: ['beach', 'food', 'nightlife'],
  preferredTransport: 'train',
  maxDistanceKm: 900,
};

describe('budget discovery calculations', () => {
  it('uses deterministic minor-unit costs with an emergency buffer', () => {
    const goa = curatedIndiaDestinations.find((destination) => destination.id === 'goa')!;
    const costs = calculateDestinationCosts(goa, baseInput);
    const subtotal =
      costs.transportMinor +
      costs.accommodationMinor +
      costs.foodMinor +
      costs.localTravelMinor +
      costs.activitiesMinor +
      costs.feesMinor;
    expect(costs.emergencyBufferMinor).toBe(Math.round(subtotal * 0.1));
    expect(costs.expectedTotalMinor).toBe(subtotal + costs.emergencyBufferMinor);
  });

  it('does not mark over-budget results as affordable', () => {
    const results = discoverBudgetDestinations({ ...baseInput, maxBudgetMinor: parseRupeesToMinor(5000) });
    expect(results.length).toBeGreaterThan(0);
    results.forEach((result) => {
      if (result.costs.expectedTotalMinor > parseRupeesToMinor(5000)) {
        expect(result.isAffordable).toBe(false);
        expect(result.affordabilityLabel).toBe('not_realistically_affordable');
        expect(result.reasons.join(' ')).toContain('above');
      }
    });
  });

  it('keeps affordable results within the requested budget', () => {
    const results = discoverBudgetDestinations({ ...baseInput, maxBudgetMinor: parseRupeesToMinor(80000), interests: ['heritage'] });
    const affordable = results.filter((result) => result.isAffordable);
    expect(affordable.length).toBeGreaterThan(0);
    affordable.forEach((result) => {
      expect(result.costs.expectedTotalMinor).toBeLessThanOrEqual(parseRupeesToMinor(80000));
      expect(result.budgetRemainingMinor).toBeGreaterThanOrEqual(0);
    });
  });

  it('suggests lower-cost alternatives for expensive destinations', () => {
    const results = discoverBudgetDestinations({ ...baseInput, maxBudgetMinor: parseRupeesToMinor(30000), preferredTransport: 'flight' });
    const expensive = results.find((result) => result.lowerCostAlternatives.length > 0);
    expect(expensive).toBeTruthy();
  });

  it('validates currency input', () => {
    expect(parseRupeesToMinor('40,000.50')).toBe(4000050);
    expect(() => parseRupeesToMinor('-1')).toThrow('Enter a valid amount.');
  });
});
