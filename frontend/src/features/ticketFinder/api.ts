import { supabase } from '../../lib/supabase';
import type { TicketResult, TicketSearchInput } from './types';

export async function saveTicketResultToTrip({
  tripId,
  userId,
  search,
  result,
}: {
  tripId: string;
  userId: string;
  search: TicketSearchInput;
  result: TicketResult;
}) {
  const { data: journeySearch, error: searchError } = await supabase
    .from('journey_searches')
    .insert({
      user_id: userId,
      trip_id: tripId,
      origin_name: search.origin,
      destination_name: search.destination,
      depart_at: result.departureAt,
      passenger_count: search.passengers,
      modes: [result.mode],
      status: 'completed',
      provider: result.providerId,
      request_payload: {
        ...search,
        source: 'smart_ticket_finder_v1',
      },
    })
    .select('id')
    .single();
  if (searchError || !journeySearch) throw searchError ?? new Error('Could not save ticket search.');

  const { data: option, error: optionError } = await supabase
    .from('journey_options')
    .insert({
      journey_search_id: journeySearch.id,
      trip_id: tripId,
      mode: result.mode,
      provider: result.providerId,
      operator_name: result.operator,
      option_code: result.serviceCode,
      depart_at: result.departureAt,
      arrive_at: result.arrivalAt,
      duration_minutes: result.durationMinutes,
      base_fare_minor: result.fare.baseFareMinor,
      taxes_minor: result.fare.taxesMinor,
      fees_minor: result.fare.convenienceFeeMinor + result.fare.baggageCostMinor,
      total_price_minor: result.fare.totalMinor,
      currency_code: result.fare.currency,
      status: 'selected',
      is_recommended: false,
      recommendation_reason: 'Saved from Smart Ticket Finder. Revalidate price and availability before checkout.',
      booking_url: result.partnerBookingUrl,
      raw_payload: {
        ...result,
        saved_from: 'smart_ticket_finder_v1',
        payment_card_data_stored: false,
      },
    })
    .select('id')
    .single();
  if (optionError || !option) throw optionError ?? new Error('Could not save ticket result.');
  return option.id as string;
}
