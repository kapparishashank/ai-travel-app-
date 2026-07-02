import { supabase } from '../../lib/supabase';
import type { TripBasicsInput, TripDetails, TripRecord, TripStatus, TripSummary } from './types';
import { cacheTripDetails, getCachedTripDetails } from './cache';

function summarizeTrip(row: TripRecord, userId?: string | null): TripSummary {
  const metadataTravelerTotal = row.metadata?.travelers?.total;
  const acceptedMembers = row.trip_members?.filter((member) => member.status === 'accepted') ?? [];

  return {
    ...row,
    travelerCount: metadataTravelerTotal ?? Math.max(acceptedMembers.length, 1),
    isOwner: row.created_by === userId,
  };
}

export async function fetchTrips(userId?: string | null): Promise<TripSummary[]> {
  const { data, error } = await supabase
    .from('trips')
    .select('*, trip_members(id,display_name,status,role)')
    .order('start_date', { ascending: true });

  if (error) throw error;
  return ((data ?? []) as TripRecord[]).map((trip) => summarizeTrip(trip, userId));
}

export async function fetchTripDetails(tripId: string, userId?: string | null): Promise<TripDetails> {
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('*, trip_members(id,display_name,status,role,user_id,email)')
    .eq('id', tripId)
    .single();

  if (tripError) {
    const cached = await getCachedTripDetails(tripId);
    if (cached) return cached;
    throw tripError;
  }

  const [
    days,
    itineraryItems,
    journeyOptions,
    budgets,
    costItems,
    packingLists,
    packingItems,
    safetySessions,
    expenses,
  ] = await Promise.all([
    supabase.from('trip_days').select('*').eq('trip_id', tripId).order('local_date', { ascending: true }),
    supabase.from('itinerary_items').select('*').eq('trip_id', tripId).order('starts_at', { ascending: true }),
    supabase.from('journey_options').select('*').eq('trip_id', tripId).order('depart_at', { ascending: true }),
    supabase.from('trip_budgets').select('*').eq('trip_id', tripId),
    supabase.from('cost_items').select('*').eq('trip_id', tripId),
    supabase.from('packing_lists').select('*').eq('trip_id', tripId),
    supabase.from('packing_items').select('*').eq('trip_id', tripId),
    supabase
      .from('safety_sessions')
      .select('id,trip_id,user_id,status,checkin_interval_minutes,started_at,ends_at,last_checkin_at,next_checkin_due_at')
      .eq('trip_id', tripId),
    supabase.from('expenses').select('*').eq('trip_id', tripId).order('spent_at', { ascending: false }),
  ]);

  const results = [days, itineraryItems, journeyOptions, budgets, costItems, packingLists, packingItems, safetySessions, expenses];
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;

  const details: TripDetails = {
    trip: summarizeTrip(trip as TripRecord, userId),
    days: days.data ?? [],
    itineraryItems: itineraryItems.data ?? [],
    journeyOptions: journeyOptions.data ?? [],
    budgets: budgets.data ?? [],
    costItems: costItems.data ?? [],
    packingLists: packingLists.data ?? [],
    packingItems: packingItems.data ?? [],
    safetySessions: safetySessions.data ?? [],
    members: (trip as any).trip_members ?? [],
    expenses: expenses.data ?? [],
  };

  await cacheTripDetails(details);
  return details;
}

export async function renameTrip(tripId: string, title: string) {
  const { error } = await supabase.from('trips').update({ title }).eq('id', tripId);
  if (error) throw error;
}

export async function updateTripBasics(tripId: string, basics: TripBasicsInput) {
  const { error } = await supabase.from('trips').update(basics).eq('id', tripId);
  if (error) throw error;
}

export async function updateTripStatus(tripId: string, status: TripStatus) {
  const { error } = await supabase.from('trips').update({ status }).eq('id', tripId);
  if (error) throw error;
}

export async function deleteTrip(tripId: string) {
  const { error } = await supabase.from('trips').delete().eq('id', tripId);
  if (error) throw error;
}

export async function duplicateTrip(trip: TripSummary, userId: string) {
  const {
    id: _id,
    trip_members: _members,
    travelerCount: _travelerCount,
    isOwner: _isOwner,
    created_at: _createdAt,
    updated_at: _updatedAt,
    ...baseTrip
  } = trip;
  const { data, error } = await supabase
    .from('trips')
    .insert({
      ...baseTrip,
      created_by: userId,
      title: `${trip.title} copy`,
      status: 'draft',
      metadata: {
        ...(trip.metadata ?? {}),
        duplicated_from_trip_id: trip.id,
      },
    })
    .select('id')
    .single();

  if (error) throw error;
  return data?.id as string;
}
