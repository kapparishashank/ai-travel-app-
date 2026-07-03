import type { JourneyOption, JourneyPriority, JourneySort, RankedJourneyOption } from './types';

const baseWeights = {
  price: 0.3,
  duration: 0.2,
  comfort: 0.15,
  convenience: 0.15,
  reliability: 0.1,
  flexibility: 0.05,
  safety: 0.05,
};

const priorityWeights: Record<JourneyPriority, typeof baseWeights> = {
  balanced: baseWeights,
  price: { price: 0.45, duration: 0.15, comfort: 0.1, convenience: 0.1, reliability: 0.1, flexibility: 0.05, safety: 0.05 },
  time: { price: 0.18, duration: 0.4, comfort: 0.12, convenience: 0.12, reliability: 0.1, flexibility: 0.04, safety: 0.04 },
  comfort: { price: 0.18, duration: 0.15, comfort: 0.34, convenience: 0.15, reliability: 0.1, flexibility: 0.04, safety: 0.04 },
  convenience: { price: 0.18, duration: 0.15, comfort: 0.12, convenience: 0.34, reliability: 0.1, flexibility: 0.06, safety: 0.05 },
};

const modeTieBreakOrder: Record<JourneyOption['mode'], number> = {
  train: 1,
  mixed: 2,
  bus: 3,
  flight: 4,
  cab: 5,
};

export function rankJourneyOptions(
  options: JourneyOption[],
  priority: JourneyPriority = 'balanced',
  sort: JourneySort = 'recommended',
): RankedJourneyOption[] {
  if (!options.length) return [];

  const normalized = normalizeOptions(options);
  const weights = priorityWeights[priority];
  const ranked = options.map((option) => {
    const values = normalized[option.id];
    const weightedScore =
      values.price * weights.price +
      values.duration * weights.duration +
      values.comfort * weights.comfort +
      values.convenience * weights.convenience +
      values.reliability * weights.reliability +
      values.flexibility * weights.flexibility +
      values.safety * weights.safety;

    return {
      ...option,
      normalized: values,
      weightedScore: roundScore(weightedScore * 100),
      labels: [],
      whyRecommended: buildWhyRecommended(option, values, priority),
    };
  });

  const labeled = applyLabels(ranked);
  return sortRankedOptions(labeled, sort);
}

function normalizeOptions(options: JourneyOption[]) {
  const priceValues = options.map((option) => option.totalEstimatedCostMinor);
  const durationValues = options.map((option) => option.durationMinutes + option.waitingTimeMinutes);
  const result: Record<string, RankedJourneyOption['normalized']> = {};

  for (const option of options) {
    result[option.id] = {
      price: normalizeLowerIsBetter(option.totalEstimatedCostMinor, priceValues),
      duration: normalizeLowerIsBetter(option.durationMinutes + option.waitingTimeMinutes, durationValues),
      comfort: normalizeScore(option.comfortScore),
      convenience: normalizeScore(option.convenienceScore),
      reliability: normalizeScore(option.reliabilityScore),
      flexibility: normalizeScore(option.flexibilityScore),
      safety: normalizeScore(option.safetyGuidanceScore),
    };
  }

  return result;
}

function applyLabels(options: RankedJourneyOption[]) {
  const byScore = [...options].sort(compareRecommended);
  const cheapest = minBy(options, (option) => option.totalEstimatedCostMinor);
  const fastest = minBy(options, (option) => option.durationMinutes + option.waitingTimeMinutes);
  const comfortable = maxBy(options, (option) => option.comfortScore);
  const family = maxBy(options, (option) => option.comfortScore * 0.35 + option.convenienceScore * 0.35 + option.safetyGuidanceScore * 0.2 - option.transfers * 5);
  const budget = maxBy(options, (option) => option.normalized.price * 0.7 + option.normalized.flexibility * 0.2 + option.normalized.reliability * 0.1);

  return options.map((option) => ({
    ...option,
    labels: [
      option.id === byScore[0]?.id ? 'Best overall' : null,
      option.id === cheapest?.id ? 'Cheapest' : null,
      option.id === fastest?.id ? 'Fastest' : null,
      option.id === comfortable?.id ? 'Most comfortable' : null,
      option.id === family?.id ? 'Best for families' : null,
      option.id === budget?.id ? 'Best for budget travelers' : null,
    ].filter(Boolean) as string[],
  }));
}

export function sortRankedOptions(options: RankedJourneyOption[], sort: JourneySort) {
  return [...options].sort((a, b) => {
    if (sort === 'price') return compareNumber(a.totalEstimatedCostMinor, b.totalEstimatedCostMinor) || compareRecommended(a, b);
    if (sort === 'duration') return compareNumber(a.durationMinutes + a.waitingTimeMinutes, b.durationMinutes + b.waitingTimeMinutes) || compareRecommended(a, b);
    if (sort === 'comfort') return compareNumber(b.comfortScore, a.comfortScore) || compareRecommended(a, b);
    if (sort === 'departure') return a.departure.localeCompare(b.departure) || compareRecommended(a, b);
    return compareRecommended(a, b);
  });
}

function compareRecommended(a: RankedJourneyOption, b: RankedJourneyOption) {
  return (
    compareNumber(b.weightedScore, a.weightedScore) ||
    compareNumber(a.totalEstimatedCostMinor, b.totalEstimatedCostMinor) ||
    compareNumber(a.durationMinutes + a.waitingTimeMinutes, b.durationMinutes + b.waitingTimeMinutes) ||
    compareNumber(modeTieBreakOrder[a.mode], modeTieBreakOrder[b.mode]) ||
    a.id.localeCompare(b.id)
  );
}

function buildWhyRecommended(option: JourneyOption, normalized: RankedJourneyOption['normalized'], priority: JourneyPriority) {
  const strengths = [
    normalized.price >= 0.75 ? 'strong total-cost value' : null,
    normalized.duration >= 0.75 ? 'competitive travel time' : null,
    normalized.comfort >= 0.75 ? 'high comfort' : null,
    normalized.convenience >= 0.75 ? 'easy first-mile and last-mile experience' : null,
    normalized.reliability >= 0.75 ? 'solid reliability estimate' : null,
    normalized.flexibility >= 0.75 ? 'better cancellation flexibility' : null,
    normalized.safety >= 0.75 ? 'clearer safety guidance' : null,
  ].filter(Boolean);

  const summary = strengths.length ? strengths.join(', ') : 'balanced tradeoffs across price, time, and convenience';
  return `Recommended for ${priority === 'balanced' ? 'balanced priorities' : `${priority} priority`} because it offers ${summary}. Total cost includes base fare, taxes, baggage, first-mile, and last-mile estimates.`;
}

function normalizeLowerIsBetter(value: number, values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return 1;
  return (max - value) / (max - min);
}

function normalizeScore(value: number) {
  return Math.max(0, Math.min(1, value / 100));
}

function minBy<T>(items: T[], selector: (item: T) => number) {
  return [...items].sort((a, b) => compareNumber(selector(a), selector(b)))[0];
}

function maxBy<T>(items: T[], selector: (item: T) => number) {
  return [...items].sort((a, b) => compareNumber(selector(b), selector(a)))[0];
}

function compareNumber(a: number, b: number) {
  return a === b ? 0 : a < b ? -1 : 1;
}

function roundScore(value: number) {
  return Math.round(value * 100) / 100;
}
