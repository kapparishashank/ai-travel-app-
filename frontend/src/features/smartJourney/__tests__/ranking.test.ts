import { describe, expect, it } from 'vitest';
import { getMockJourneyOptions } from '../mockProviders';
import { rankJourneyOptions } from '../ranking';
import type { JourneyOption } from '../types';

const hyderabadGoa = {
  origin: 'Hyderabad',
  destination: 'Goa',
  travelDate: '2026-08-14',
  travelers: 4,
};

describe('smart journey ranking', () => {
  it('labels Hyderabad-to-Goa options deterministically', () => {
    const ranked = rankJourneyOptions(getMockJourneyOptions(hyderabadGoa), 'balanced', 'recommended');

    expect(ranked[0].labels).toContain('Best overall');
    expect(ranked.find((option) => option.mode === 'train')?.labels).toContain('Cheapest');
    expect(ranked.find((option) => option.mode === 'flight')?.labels).toContain('Fastest');
    expect(ranked.find((option) => option.mode === 'flight')?.labels).toContain('Most comfortable');
    expect(ranked.find((option) => option.mode === 'cab')?.labels).toContain('Best for families');
    expect(ranked.find((option) => option.labels.includes('Best for budget travelers'))).toBeTruthy();
  });

  it('changes ranking when user prioritizes time', () => {
    const ranked = rankJourneyOptions(getMockJourneyOptions(hyderabadGoa), 'time', 'recommended');

    expect(ranked[0].mode).toBe('flight');
  });

  it('sorts by total price, not base fare', () => {
    const ranked = rankJourneyOptions(getMockJourneyOptions(hyderabadGoa), 'balanced', 'price');

    expect(ranked[0].mode).toBe('train');
    expect(ranked[0].totalEstimatedCostMinor).toBeLessThan(ranked[1].totalEstimatedCostMinor);
  });

  it('normalizes equal values without divide-by-zero and uses stable tie-breaking', () => {
    const base = getMockJourneyOptions(hyderabadGoa)[0];
    const options: JourneyOption[] = [
      { ...base, id: 'cab-copy', mode: 'cab', totalEstimatedCostMinor: 1000, durationMinutes: 60, comfortScore: 80, convenienceScore: 80, reliabilityScore: 80, flexibilityScore: 80, safetyGuidanceScore: 80 },
      { ...base, id: 'train-copy', mode: 'train', totalEstimatedCostMinor: 1000, durationMinutes: 60, comfortScore: 80, convenienceScore: 80, reliabilityScore: 80, flexibilityScore: 80, safetyGuidanceScore: 80 },
    ];

    const ranked = rankJourneyOptions(options, 'balanced', 'recommended');

    expect(ranked.map((option) => option.id)).toEqual(['train-copy', 'cab-copy']);
    expect(ranked[0].normalized.price).toBe(1);
    expect(ranked[0].normalized.duration).toBe(1);
  });
});
