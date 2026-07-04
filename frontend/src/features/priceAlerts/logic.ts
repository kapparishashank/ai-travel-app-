import type { AlertEvaluationInput, AlertEvaluationResult } from './types';

export function calculatePercentageChange(previousPriceMinor: number | null, latestPriceMinor: number) {
  if (!previousPriceMinor || previousPriceMinor <= 0) return 0;
  return ((latestPriceMinor - previousPriceMinor) / previousPriceMinor) * 100;
}

export function isCooldownActive(lastNotifiedAt: string | null | undefined, cooldownMinutes: number, nowIso: string) {
  if (!lastNotifiedAt) return false;
  return new Date(nowIso).getTime() - new Date(lastNotifiedAt).getTime() < cooldownMinutes * 60_000;
}

export function evaluatePriceAlert(input: AlertEvaluationInput): AlertEvaluationResult {
  if (input.status !== 'active') {
    return base(false, false, false, input, 'Alert is not active.');
  }

  const changeMinor = input.previousPriceMinor === null ? 0 : input.previousPriceMinor - input.latestPriceMinor;
  const percentageChange = calculatePercentageChange(input.previousPriceMinor, input.latestPriceMinor);
  const targetHit = input.latestPriceMinor <= input.targetPriceMinor;
  const percentageDropHit = Boolean(input.previousPriceMinor) && percentageChange <= -input.percentageDropThreshold;
  const meaningfulChange = changeMinor >= input.minimumChangeMinor;

  if (!targetHit && !percentageDropHit) {
    return { shouldNotify: false, targetHit, percentageDropHit, changeMinor, percentageChange, reason: 'No target price or percentage-drop condition met.' };
  }

  if (!meaningfulChange && input.previousPriceMinor !== null) {
    return { shouldNotify: false, targetHit, percentageDropHit, changeMinor, percentageChange, reason: 'Price change is below the minimum meaningful-change threshold.' };
  }

  if (isCooldownActive(input.lastNotifiedAt, input.cooldownMinutes, input.nowIso)) {
    return { shouldNotify: false, targetHit, percentageDropHit, changeMinor, percentageChange, reason: 'Notification cooldown is active.' };
  }

  if (input.duplicateNotificationExists || input.lastNotificationPriceMinor === input.latestPriceMinor) {
    return { shouldNotify: false, targetHit, percentageDropHit, changeMinor, percentageChange, reason: 'Duplicate notification prevented.' };
  }

  return {
    shouldNotify: true,
    targetHit,
    percentageDropHit,
    changeMinor,
    percentageChange,
    reason: targetHit ? 'Target price reached.' : 'Percentage drop reached.',
  };
}

function base(
  shouldNotify: boolean,
  targetHit: boolean,
  percentageDropHit: boolean,
  input: AlertEvaluationInput,
  reason: string,
): AlertEvaluationResult {
  return {
    shouldNotify,
    targetHit,
    percentageDropHit,
    changeMinor: input.previousPriceMinor === null ? 0 : input.previousPriceMinor - input.latestPriceMinor,
    percentageChange: calculatePercentageChange(input.previousPriceMinor, input.latestPriceMinor),
    reason,
  };
}

export function simulateMockLatestPrice(currentPriceMinor: number | null, mode: string, forceDropPercent = 0) {
  const baseByMode: Record<string, number> = {
    flight: 520000,
    train: 95000,
    bus: 75000,
    cab: 650000,
    mixed: 240000,
  };
  const base = currentPriceMinor ?? baseByMode[mode] ?? 200000;
  if (forceDropPercent > 0) return Math.max(1000, Math.round(base * (1 - forceDropPercent / 100)));
  const deterministicShift = mode.split('').reduce((total, char) => total + char.charCodeAt(0), 0) % 9;
  return Math.max(1000, Math.round(base * (0.98 + deterministicShift / 100)));
}
