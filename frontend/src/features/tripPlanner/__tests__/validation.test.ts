import { describe, expect, it } from 'vitest';
import {
  budgetSchema,
  planTripSchema,
  travelersSchema,
  travelDatesSchema,
} from '../validation';
import { hyderabadToGoaDemoInput } from '../options';

describe('trip planner validation', () => {
  it('rejects an end date that is not after the start date', () => {
    const result = travelDatesSchema.safeParse({
      startDate: '2026-08-17',
      endDate: '2026-08-14',
      flexibleDates: false,
    });

    expect(result.success).toBe(false);
  });

  it('requires at least one traveler', () => {
    const result = travelersSchema.safeParse({
      adults: 0,
      children: 0,
      tripType: 'friends',
    });

    expect(result.success).toBe(false);
  });

  it('rejects negative traveler counts', () => {
    const result = travelersSchema.safeParse({
      adults: -1,
      children: 0,
      tripType: 'solo',
    });

    expect(result.success).toBe(false);
  });

  it('rejects an unrealistically low budget', () => {
    const result = budgetSchema.safeParse({
      totalBudget: 250,
      currency: 'INR',
    });

    expect(result.success).toBe(false);
  });

  it('accepts the Hyderabad to Goa demo input', () => {
    const result = planTripSchema.safeParse(hyderabadToGoaDemoInput);

    expect(result.success).toBe(true);
  });
});
