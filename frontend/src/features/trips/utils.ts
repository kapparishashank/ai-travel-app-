import type { TripDetails, TripSummary } from './types';

export function groupTrips(trips: TripSummary[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return {
    Upcoming: trips.filter((trip) => !['draft', 'completed', 'cancelled', 'archived'].includes(trip.status)),
    Draft: trips.filter((trip) => trip.status === 'draft'),
    Past: trips.filter((trip) => trip.status !== 'archived' && trip.status !== 'draft' && (['completed', 'cancelled'].includes(trip.status) || new Date(trip.end_date) < today)),
    Archived: trips.filter((trip) => trip.status === 'archived'),
  };
}

export function calculatePlanningProgress(details: TripDetails) {
  const checks = [
    Boolean(details.trip.destination_name),
    Boolean(details.trip.start_date && details.trip.end_date),
    details.members.length > 0 || details.trip.travelerCount > 0,
    details.journeyOptions.length > 0,
    details.itineraryItems.length > 0,
    details.budgets.length > 0 || details.trip.total_budget_minor > 0,
    details.packingItems.length > 0,
    details.safetySessions.length > 0,
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function getSelectedTransport(details: TripDetails) {
  const selected = details.journeyOptions.find((option) => option.status === 'selected') ?? details.journeyOptions.find((option) => option.is_recommended);
  if (!selected) return 'Not selected';
  return [selected.mode, selected.operator_name].filter(Boolean).join(' · ');
}

export function getEstimatedTotal(details: TripDetails) {
  const costTotal = details.costItems.reduce((sum, item) => sum + (item.amount_minor ?? 0), 0);
  const optionTotal = details.journeyOptions.find((option) => option.status === 'selected')?.total_price_minor ?? 0;
  const budgetActual = details.budgets.reduce((sum, item) => sum + (item.actual_amount_minor ?? 0), 0);
  return Math.max(costTotal + optionTotal, budgetActual, details.trip.total_budget_minor);
}

export function getTripWarnings(details: TripDetails) {
  const warnings: string[] = [];
  if (!details.journeyOptions.length) warnings.push('No transport option selected yet.');
  if (!details.itineraryItems.length) warnings.push('Itinerary has not been generated.');
  if (!details.packingItems.length) warnings.push('Packing list is empty.');
  if (!details.trip.total_budget_minor) warnings.push('Budget is missing.');
  return warnings;
}
