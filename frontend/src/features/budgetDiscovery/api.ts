import { supabase } from '../../lib/supabase';
import { rupeesToPaise } from '../../utils/currency';
import type { BudgetDestinationSuggestion, BudgetDiscoveryInput } from './types';

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + Math.max(0, days - 1));
  return value.toISOString().slice(0, 10);
}

export async function saveBudgetDestination(userId: string, input: BudgetDiscoveryInput, suggestion: BudgetDestinationSuggestion) {
  const { error } = await supabase.from('saved_destinations').upsert(
    {
      user_id: userId,
      destination_id: suggestion.destination.id,
      source_city: input.startingCity,
      max_budget_minor: input.maxBudgetMinor,
      traveler_count: input.travelerCount,
      trip_length_days: input.tripLengthDays,
      selected_tags: input.interests,
      estimate_payload: {
        destination: suggestion.destination.name,
        costs: suggestion.costs,
        confidence: suggestion.confidence,
        affordability_label: suggestion.affordabilityLabel,
        reasons: suggestion.reasons,
      },
    },
    { onConflict: 'user_id,destination_id,source_city,trip_length_days' }
  );
  if (error) throw error;
}

export async function createTripDraftFromSuggestion(userId: string, input: BudgetDiscoveryInput, suggestion: BudgetDestinationSuggestion) {
  const startDate = input.startDate || new Date().toISOString().slice(0, 10);
  const endDate = input.endDate || addDays(startDate, input.tripLengthDays);
  const { data, error } = await supabase
    .from('trips')
    .insert({
      created_by: userId,
      title: `${input.startingCity} to ${suggestion.destination.name}`,
      origin_name: input.startingCity,
      destination_name: suggestion.destination.name,
      start_date: startDate,
      end_date: endDate,
      status: 'draft',
      currency_code: 'INR',
      total_budget_minor: input.maxBudgetMinor || rupeesToPaise(1),
      metadata: {
        source: 'budget_discovery',
        destination_id: suggestion.destination.id,
        estimated_costs: suggestion.costs,
        budget_remaining_minor: suggestion.budgetRemainingMinor,
        affordability_label: suggestion.affordabilityLabel,
        travelers: {
          total: input.travelerCount,
        },
        interests: input.interests,
        preferred_transport: [input.preferredTransport],
        max_distance_km: input.maxDistanceKm,
      },
    })
    .select('id')
    .single();
  if (error) throw error;
  return data?.id as string;
}

export async function generateBudgetDestinations(input: {
  budgetInr: number;
  numDays: number;
  numTravelers: number;
  interests?: string[];
  startingCity?: string;
}) {
  const { data, error } = await supabase.functions.invoke('budget-discovery', {
    body: input,
  });
  if (error) throw error;
  return data.data.destinations as Array<{
    name: string;
    description: string;
    estimatedCostInr: number;
    reasonsToVisit: string[];
  }>;
}
