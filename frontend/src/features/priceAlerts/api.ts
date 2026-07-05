import { supabase } from '../../lib/supabase';
import { trackAnalyticsEvent } from '../analytics/analytics';
import type { JourneyOptionForAlert, PriceAlertRow, PriceHistoryRow } from './types';

export async function fetchJourneyOptionsForAlerts(): Promise<JourneyOptionForAlert[]> {
  const { data, error } = await supabase
    .from('journey_options')
    .select('id,trip_id,mode,provider,operator_name,depart_at,total_price_minor,currency_code,booking_url,journey_segments(origin_name,destination_name)')
    .order('depart_at', { ascending: true })
    .limit(30);
  if (error) throw error;
  const options = (data ?? []).map((row: any) => ({
    id: row.id,
    trip_id: row.trip_id,
    mode: row.mode,
    provider: row.provider,
    operator_name: row.operator_name,
    origin_name: row.journey_segments?.[0]?.origin_name ?? 'Origin',
    destination_name: row.journey_segments?.[row.journey_segments.length - 1]?.destination_name ?? 'Destination',
    depart_at: row.depart_at,
    total_price_minor: row.total_price_minor,
    currency_code: row.currency_code,
    booking_url: row.booking_url,
  }));
  if (options.length) return options;

  const { data: trips } = await supabase
    .from('trips')
    .select('id,origin_name,destination_name,start_date,currency_code')
    .order('start_date', { ascending: true })
    .limit(1);
  const trip = (trips ?? [])[0] as any;
  if (!trip) return [];

  return [{
    id: `mock-alert-option-${trip.id}`,
    trip_id: trip.id,
    mode: 'train',
    provider: 'mock-rail-provider',
    operator_name: 'Indian Railways demo fare',
    origin_name: trip.origin_name ?? 'Hyderabad',
    destination_name: trip.destination_name ?? 'Goa',
    depart_at: `${trip.start_date ?? new Date().toISOString().slice(0, 10)}T06:15:00+05:30`,
    total_price_minor: 560000,
    currency_code: trip.currency_code ?? 'INR',
    booking_url: null,
  }];
}

export async function fetchPriceAlerts(): Promise<PriceAlertRow[]> {
  const { data, error } = await supabase.from('price_alerts').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PriceAlertRow[];
}

export async function fetchPriceHistory(alertId: string): Promise<PriceHistoryRow[]> {
  const { data, error } = await supabase
    .from('price_history')
    .select('*')
    .eq('price_alert_id', alertId)
    .order('observed_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []) as PriceHistoryRow[];
}

export async function createPriceAlert({
  userId,
  option,
  targetPriceMinor,
  percentageDropThreshold,
}: {
  userId: string;
  option: JourneyOptionForAlert;
  targetPriceMinor: number;
  percentageDropThreshold: number;
}) {
  const { error } = await supabase.from('price_alerts').insert({
    user_id: userId,
    trip_id: option.trip_id ?? null,
    journey_option_id: option.id,
    mode: option.mode,
    origin_name: option.origin_name ?? 'Origin',
    destination_name: option.destination_name ?? 'Destination',
    depart_on: option.depart_at.slice(0, 10),
    target_price_minor: targetPriceMinor,
    percentage_drop_threshold: percentageDropThreshold,
    last_seen_price_minor: option.total_price_minor,
    currency_code: option.currency_code,
    status: 'active',
    provider: option.provider ?? 'mock-price-provider',
    latest_result_url: option.booking_url ?? null,
    alert_label: '[MOCK DATA]',
    next_check_at: new Date().toISOString(),
  });
  if (error) throw error;
  await trackAnalyticsEvent({
    userId,
    name: 'price_alert_created',
    properties: {
      mode: option.mode,
      provider: option.provider ?? 'mock-price-provider',
      targetPriceMinor,
      dataLabel: '[MOCK DATA]',
    },
  });
}

export async function updatePriceAlertStatus(alertId: string, status: 'active' | 'paused' | 'cancelled') {
  const { error } = await supabase
    .from('price_alerts')
    .update({ status, next_check_at: status === 'active' ? new Date().toISOString() : null })
    .eq('id', alertId);
  if (error) throw error;
}

export async function deletePriceAlert(alertId: string) {
  const { error } = await supabase.from('price_alerts').delete().eq('id', alertId);
  if (error) throw error;
}

export async function simulatePriceDrop(alertId: string, forceDropPercent = 20) {
  const { data, error } = await supabase.functions.invoke('price-alerts', {
    body: { action: 'simulate_drop', alertId, forceDropPercent },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).message ?? 'Could not simulate price drop.');
  return data;
}

export async function runPriceAlertCheck(alertId?: string) {
  const { data, error } = await supabase.functions.invoke('price-alerts', {
    body: { action: 'run', alertId },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).message ?? 'Could not check alerts.');
  return data;
}
