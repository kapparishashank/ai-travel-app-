import { supabase } from '../../lib/supabase';
import { trackAnalyticsEvent } from '../analytics/analytics';
import type { JourneySearchInput, RankedJourneyOption } from './types';

export async function saveJourneyOptionToTrip({
  tripId,
  userId,
  search,
  option,
}: {
  tripId: string;
  userId: string;
  search: JourneySearchInput;
  option: RankedJourneyOption;
}) {
  const { data: journeySearch, error: searchError } = await supabase
    .from('journey_searches')
    .insert({
      user_id: userId,
      trip_id: tripId,
      origin_name: search.origin,
      destination_name: search.destination,
      depart_at: option.departure,
      passenger_count: search.travelers,
      modes: [option.mode],
      status: 'completed',
      provider: 'smart-journey-demo',
      request_payload: search,
    })
    .select('id')
    .single();
  if (searchError || !journeySearch) throw searchError ?? new Error('Could not save journey search.');

  const feesMinor = option.baggageCostMinor + option.firstMileCostMinor + option.lastMileCostMinor;
  const { data: savedOption, error: optionError } = await supabase
    .from('journey_options')
    .insert({
      journey_search_id: journeySearch.id,
      trip_id: tripId,
      mode: option.mode,
      provider: 'smart-journey-demo',
      operator_name: option.provider,
      option_code: option.id,
      depart_at: option.departure,
      arrive_at: option.arrival,
      duration_minutes: option.durationMinutes,
      base_fare_minor: option.baseFareMinor,
      taxes_minor: option.taxesMinor,
      fees_minor: feesMinor,
      total_price_minor: option.totalEstimatedCostMinor,
      currency_code: 'INR',
      status: 'selected',
      is_recommended: option.labels.includes('Best overall'),
      recommendation_reason: option.whyRecommended,
      raw_payload: {
        ...option,
        saved_from: 'smart_journey_v1',
      },
    })
    .select('id')
    .single();
  if (optionError || !savedOption) throw optionError ?? new Error('Could not save journey option.');
  await trackAnalyticsEvent({
    userId,
    name: 'journey_option_selected',
    properties: {
      tripId,
      mode: option.mode,
      provider: option.provider,
      dataLabel: option.dataStatus,
    },
  });

  if (option.segments.length) {
    const { error: segmentError } = await supabase.from('journey_segments').insert(
      option.segments.map((segment, index) => ({
        journey_option_id: savedOption.id,
        segment_number: index + 1,
        mode: segment.mode,
        carrier_name: segment.provider,
        origin_name: segment.origin,
        destination_name: segment.destination,
        depart_at: segment.departure,
        arrive_at: segment.arrival,
        duration_minutes: segment.durationMinutes,
      })),
    );
    if (segmentError) throw segmentError;
  }

  return savedOption.id as string;
}
