import { describe, expect, it } from 'vitest';
import { evaluatePriceAlert, isCooldownActive, simulateMockLatestPrice } from '../logic';
import type { AlertEvaluationInput } from '../types';

const base: AlertEvaluationInput = {
  status: 'active',
  targetPriceMinor: 80000,
  previousPriceMinor: 100000,
  latestPriceMinor: 79000,
  percentageDropThreshold: 10,
  minimumChangeMinor: 1000,
  cooldownMinutes: 1440,
  nowIso: '2026-07-04T10:00:00.000Z',
};

describe('price alert logic', () => {
  it('notifies when target price is reached', () => {
    const result = evaluatePriceAlert(base);
    expect(result.shouldNotify).toBe(true);
    expect(result.targetHit).toBe(true);
  });

  it('notifies when percentage drop condition is reached', () => {
    const result = evaluatePriceAlert({ ...base, targetPriceMinor: 50000, latestPriceMinor: 85000, percentageDropThreshold: 12 });
    expect(result.shouldNotify).toBe(true);
    expect(result.percentageDropHit).toBe(true);
  });

  it('does not notify during cooldown', () => {
    const result = evaluatePriceAlert({ ...base, lastNotifiedAt: '2026-07-04T09:30:00.000Z' });
    expect(result.shouldNotify).toBe(false);
    expect(result.reason).toBe('Notification cooldown is active.');
    expect(isCooldownActive('2026-07-04T09:30:00.000Z', 60, base.nowIso)).toBe(true);
  });

  it('does not notify paused alerts', () => {
    const result = evaluatePriceAlert({ ...base, status: 'paused' });
    expect(result.shouldNotify).toBe(false);
    expect(result.reason).toBe('Alert is not active.');
  });

  it('prevents duplicate notifications for the same observed price', () => {
    expect(evaluatePriceAlert({ ...base, lastNotificationPriceMinor: 79000 }).shouldNotify).toBe(false);
    expect(evaluatePriceAlert({ ...base, duplicateNotificationExists: true }).reason).toBe('Duplicate notification prevented.');
  });

  it('ignores insignificant changes', () => {
    const result = evaluatePriceAlert({ ...base, previousPriceMinor: 80050, latestPriceMinor: 80000, targetPriceMinor: 80000, minimumChangeMinor: 1000 });
    expect(result.shouldNotify).toBe(false);
    expect(result.reason).toBe('Price change is below the minimum meaningful-change threshold.');
  });

  it('simulates a development-only price drop deterministically', () => {
    expect(simulateMockLatestPrice(100000, 'flight', 20)).toBe(80000);
  });
});
