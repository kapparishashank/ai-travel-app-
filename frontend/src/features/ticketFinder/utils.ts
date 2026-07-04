import type { TicketFilters, TicketResult, TicketSort } from './types';

export function filterTicketResults(results: TicketResult[], filters: TicketFilters) {
  return results.filter((result) => {
    if (!filters.modes.includes('all') && !filters.modes.includes(result.mode)) return false;
    if (result.fare.totalMinor > filters.maxPriceMinor) return false;
    if (!matchesTimeWindow(result.departureAt, filters.departureWindow)) return false;
    if (!matchesTimeWindow(result.arrivalAt, filters.arrivalWindow)) return false;
    if (result.durationMinutes > filters.maxDurationMinutes) return false;
    if (result.stops > filters.maxStops) return false;
    if (filters.refundability === 'refundable' && !result.cancellationInfo.refundable) return false;
    if (filters.refundability === 'non_refundable' && result.cancellationInfo.refundable) return false;
    if (filters.seatClass && !result.seatClass.toLowerCase().includes(filters.seatClass.toLowerCase())) return false;
    if (filters.operator && !result.operator.toLowerCase().includes(filters.operator.toLowerCase())) return false;
    return true;
  });
}

export function sortTicketResults(results: TicketResult[], sort: TicketSort) {
  return [...results].sort((a, b) => {
    if (sort === 'price') return a.fare.totalMinor - b.fare.totalMinor || a.durationMinutes - b.durationMinutes;
    if (sort === 'departure') return a.departureAt.localeCompare(b.departureAt) || a.fare.totalMinor - b.fare.totalMinor;
    if (sort === 'arrival') return a.arrivalAt.localeCompare(b.arrivalAt) || a.fare.totalMinor - b.fare.totalMinor;
    if (sort === 'duration') return a.durationMinutes - b.durationMinutes || a.fare.totalMinor - b.fare.totalMinor;
    return recommendedScore(b) - recommendedScore(a) || a.fare.totalMinor - b.fare.totalMinor || a.departureAt.localeCompare(b.departureAt);
  });
}

export function recommendedScore(result: TicketResult) {
  const availability = { available: 20, limited: 12, waitlist: 4, unknown: 2, unavailable: -20 }[result.availabilityStatus];
  const refundable = result.cancellationInfo.refundable ? 10 : 0;
  const price = Math.max(0, 40 - result.fare.totalMinor / 100_000);
  const duration = Math.max(0, 30 - result.durationMinutes / 60);
  return availability + refundable + price + duration - result.stops * 2;
}

export function priceStatusLabel(status: TicketResult['priceStatus']) {
  return {
    live: 'Live price',
    cached: 'Cached price',
    estimated: 'Estimated price',
    mock: 'Mock price',
  }[status];
}

function matchesTimeWindow(iso: string, window: TicketFilters['departureWindow']) {
  if (window === 'any') return true;
  const hour = new Date(iso).getHours();
  if (window === 'morning') return hour >= 5 && hour < 12;
  if (window === 'afternoon') return hour >= 12 && hour < 17;
  if (window === 'evening') return hour >= 17 && hour < 22;
  return hour >= 22 || hour < 5;
}
