import { curatedIndiaDestinations } from './dataset';
import type {
  BudgetDestinationSuggestion,
  BudgetDiscoveryInput,
  BudgetDiscoveryTag,
  CuratedDestination,
  DestinationCostBreakdown,
  DiscoveryTransport,
} from './types';

const transportCostPerKmByMode: Record<DiscoveryTransport, number> = {
  bus: 180,
  train: 120,
  flight: 520,
  cab: 1600,
  mixed: 260,
};

function cityKey(city: string) {
  return city.trim().toLowerCase();
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function parseRupeesToMinor(value: string | number) {
  const raw = String(value).replace(/,/g, '').trim();
  if (!/^\d+(\.\d{0,2})?$/.test(raw)) throw new Error('Enter a valid amount.');
  return Math.round(Number(raw) * 100);
}

export function destinationDistance(destination: CuratedDestination, startingCity: string) {
  return destination.distanceKmByCity[cityKey(startingCity)] ?? 1200;
}

export function estimateTransportMinor(distanceKm: number, travelers: number, preferredTransport: DiscoveryTransport) {
  const mode = preferredTransport === 'mixed' ? (distanceKm > 900 ? 'flight' : distanceKm > 250 ? 'train' : 'cab') : preferredTransport;
  const base = distanceKm * transportCostPerKmByMode[mode] * travelers;
  const minimumByMode: Record<DiscoveryTransport, number> = {
    bus: 50000,
    train: 40000,
    flight: 250000,
    cab: 120000,
    mixed: 70000,
  };
  return Math.max(Math.round(base), minimumByMode[mode] * travelers);
}

export function calculateDestinationCosts(
  destination: CuratedDestination,
  input: BudgetDiscoveryInput
): DestinationCostBreakdown {
  const travelers = Math.max(1, input.travelerCount);
  const days = Math.max(1, input.tripLengthDays);
  const nights = Math.max(0, days - 1);
  const distanceKm = destinationDistance(destination, input.startingCity);
  const transportMinor = estimateTransportMinor(distanceKm, travelers, input.preferredTransport);
  const accommodationMinor = destination.dailyStayMinor * nights * travelers;
  const foodMinor = destination.dailyFoodMinor * days * travelers;
  const localTravelMinor = destination.dailyLocalTravelMinor * days * travelers;
  const activitiesMinor = destination.dailyActivitiesMinor * days * travelers;
  const feesMinor = destination.feesMinor * travelers;
  const subtotal = transportMinor + accommodationMinor + foodMinor + localTravelMinor + activitiesMinor + feesMinor;
  const emergencyBufferMinor = Math.round(subtotal * 0.1);
  return {
    transportMinor,
    accommodationMinor,
    foodMinor,
    localTravelMinor,
    activitiesMinor,
    feesMinor,
    emergencyBufferMinor,
    expectedTotalMinor: subtotal + emergencyBufferMinor,
  };
}

function affordabilityLabel(total: number, budget: number): BudgetDestinationSuggestion['affordabilityLabel'] {
  if (total <= budget * 0.9) return 'within_budget';
  if (total <= budget) return 'tight';
  return 'not_realistically_affordable';
}

function tagOverlap(destinationTags: BudgetDiscoveryTag[], interests: BudgetDiscoveryTag[]) {
  return interests.filter((interest) => destinationTags.includes(interest));
}

function recommendationReasons(destination: CuratedDestination, input: BudgetDiscoveryInput, costs: DestinationCostBreakdown, distanceKm: number) {
  const matching = tagOverlap(destination.tags, input.interests);
  const reasons = [
    matching.length ? `Matches ${matching.join(', ')} interests.` : 'Included as a curated India MVP destination.',
    `Estimated total is ${costs.expectedTotalMinor <= input.maxBudgetMinor ? 'inside' : 'above'} your requested budget.`,
    `${Math.round(distanceKm)} km from ${input.startingCity || 'your starting city'} by estimated route distance.`,
  ];
  if (input.tripLengthDays <= 2 && destination.tags.includes('weekend')) reasons.push('Good fit for a short weekend plan.');
  if (destination.confidence === 'high') reasons.push('Higher confidence because this destination has simpler MVP cost assumptions.');
  return reasons;
}

function scoreSuggestion(destination: CuratedDestination, input: BudgetDiscoveryInput, costs: DestinationCostBreakdown, distanceKm: number) {
  const budgetRatio = costs.expectedTotalMinor / input.maxBudgetMinor;
  const budgetScore = budgetRatio <= 1 ? 50 * (1 - clamp(budgetRatio - 0.65, 0, 0.35) / 0.35) + 20 : -35 * clamp(budgetRatio - 1, 0, 1);
  const interestScore = tagOverlap(destination.tags, input.interests).length * 12;
  const distanceScore = distanceKm <= input.maxDistanceKm ? 18 : -25;
  const confidenceScore = destination.confidence === 'high' ? 10 : destination.confidence === 'medium' ? 5 : 0;
  return Math.round(budgetScore + interestScore + distanceScore + confidenceScore);
}

export function discoverBudgetDestinations(input: BudgetDiscoveryInput, dataset = curatedIndiaDestinations): BudgetDestinationSuggestion[] {
  if (input.maxBudgetMinor <= 0) throw new Error('Maximum budget must be positive.');
  if (input.travelerCount <= 0) throw new Error('Traveler count must be positive.');
  if (input.tripLengthDays <= 0) throw new Error('Trip length must be positive.');

  const candidates = dataset
    .filter((destination) => {
      const distance = destinationDistance(destination, input.startingCity);
      const tagMatch = input.interests.length === 0 || input.interests.some((interest) => destination.tags.includes(interest));
      return tagMatch && distance <= input.maxDistanceKm * 1.5;
    })
    .map((destination) => {
      const distanceKm = destinationDistance(destination, input.startingCity);
      const costs = calculateDestinationCosts(destination, input);
      const label = affordabilityLabel(costs.expectedTotalMinor, input.maxBudgetMinor);
      return {
        destination,
        transport: input.preferredTransport,
        distanceKm,
        costs,
        confidence: destination.confidence,
        budgetRemainingMinor: input.maxBudgetMinor - costs.expectedTotalMinor,
        isAffordable: costs.expectedTotalMinor <= input.maxBudgetMinor,
        affordabilityLabel: label,
        score: scoreSuggestion(destination, input, costs, distanceKm),
        reasons: recommendationReasons(destination, input, costs, distanceKm),
        lowerCostAlternatives: [],
        estimatedLabel: '[ESTIMATED]' as const,
      };
    })
    .sort((a, b) => {
      if (a.isAffordable !== b.isAffordable) return a.isAffordable ? -1 : 1;
      return b.score - a.score || a.costs.expectedTotalMinor - b.costs.expectedTotalMinor || a.destination.name.localeCompare(b.destination.name);
    });

  return candidates.map((suggestion) => ({
    ...suggestion,
    lowerCostAlternatives: candidates
      .filter((candidate) => candidate.costs.expectedTotalMinor < suggestion.costs.expectedTotalMinor && candidate.destination.id !== suggestion.destination.id)
      .slice(0, 3)
      .map((candidate) => candidate.destination.name),
  }));
}
