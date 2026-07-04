import { createClient } from '@supabase/supabase-js';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';

type AlertRow = {
  id: string;
  user_id: string;
  trip_id: string | null;
  journey_option_id: string | null;
  mode: string;
  origin_name: string;
  destination_name: string;
  depart_on: string;
  target_price_minor: number;
  percentage_drop_threshold: number;
  notification_cooldown_minutes: number;
  minimum_change_minor: number;
  last_seen_price_minor: number | null;
  last_notification_price_minor: number | null;
  currency_code: string;
  status: string;
  provider: string | null;
  latest_result_url: string | null;
  last_notified_at: string | null;
};

Deno.serve(async (req: Request) => {
  const corsResult = handleCors(req);
  if (corsResult) return corsResult;

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? 'run';
    const alertId = body.alertId as string | undefined;
    const forceDropPercent = Number(body.forceDropPercent ?? 0);
    const authHeader = req.headers.get('Authorization');
    const workerSecret = req.headers.get('x-worker-secret');
    const isWorker = Boolean(workerSecret && workerSecret === Deno.env.get('PRICE_ALERT_WORKER_SECRET'));

    if (!authHeader && !isWorker) return errorResponse('unauthorized', 'Missing authorization header.', 401);

    const service = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    let userId: string | null = null;
    if (!isWorker) {
      const authClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader! } } },
      );
      const { data, error } = await authClient.auth.getUser();
      if (error || !data.user) return errorResponse('unauthorized', 'Invalid token.', 401);
      userId = data.user.id;
    }

    let query = service
      .from('price_alerts')
      .select('*')
      .eq('status', 'active')
      .lte('next_check_at', new Date().toISOString())
      .order('next_check_at', { ascending: true })
      .limit(50);

    if (alertId) query = query.eq('id', alertId);
    if (userId) query = query.eq('user_id', userId);

    const { data: alerts, error: alertError } = await query;
    if (alertError) return errorResponse('db_error', alertError.message, 500);

    const results = [];
    for (const alert of (alerts ?? []) as AlertRow[]) {
      try {
        const result = await processAlert(service, alert, action === 'simulate_drop' ? forceDropPercent || 20 : 0);
        results.push(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown worker error';
        await service.from('price_alerts').update({ last_worker_error: message, last_checked_at: new Date().toISOString() }).eq('id', alert.id);
        results.push({ alertId: alert.id, status: 'error', message });
      }
    }

    return jsonResponse({
      status: 'ok',
      data_label: '[MOCK DATA]',
      disclaimer: 'Mock-provider prices may change before booking. TravelAI does not guarantee future prices.',
      processed: results.length,
      results,
    });
  } catch (err) {
    console.error('price-alerts worker error:', err);
    return errorResponse('internal_error', 'An unexpected error occurred.', 500);
  }
});

async function processAlert(service: any, alert: AlertRow, forceDropPercent: number) {
  const now = new Date().toISOString();
  const previousPrice = alert.last_seen_price_minor;
  const latestPrice = simulateMockPrice(previousPrice, alert.mode, forceDropPercent);
  const evaluation = await evaluateWithDuplicateCheck(service, alert, latestPrice, now);
  const provider = alert.provider ?? 'mock-price-provider';

  const { error: historyError } = await service.from('price_history').insert({
    price_alert_id: alert.id,
    journey_option_id: alert.journey_option_id,
    mode: alert.mode,
    origin_name: alert.origin_name,
    destination_name: alert.destination_name,
    depart_on: alert.depart_on,
    observed_price_minor: latestPrice,
    currency_code: alert.currency_code,
    provider,
    data_status: 'mock',
    observed_at: now,
    raw_payload: {
      label: '[MOCK DATA]',
      previous_price_minor: previousPrice,
      force_drop_percent: forceDropPercent,
    },
  });
  if (historyError) throw historyError;

  const update: Record<string, unknown> = {
    last_seen_price_minor: latestPrice,
    last_checked_at: now,
    next_check_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    latest_result_url: alert.latest_result_url,
    last_worker_error: null,
  };

  if (evaluation.shouldNotify) {
    const { error: notificationError } = await service.from('notifications').insert({
      user_id: alert.user_id,
      trip_id: alert.trip_id,
      type: 'price_alert',
      category: 'price_drop',
      status: 'unread',
      title: `${alert.destination_name} price alert`,
      body: `${evaluation.reason} Latest mock price is ${formatMinor(latestPrice, alert.currency_code)}. Prices may change before booking.`,
      action_url: alert.latest_result_url,
      delivery_key: `price-alert:${alert.id}:${latestPrice}`,
      delivered_at: now,
      metadata: {
        price_alert_id: alert.id,
        observed_price_minor: latestPrice,
        previous_price_minor: previousPrice,
        percentage_change: evaluation.percentageChange,
        data_label: '[MOCK DATA]',
      },
    });
    if (notificationError) throw notificationError;
    await service.from('analytics_events').insert({
      user_id: alert.user_id,
      event_name: 'price_alert_triggered',
      properties: {
        mode: alert.mode,
        provider,
        dataLabel: '[MOCK DATA]',
        latestPriceMinor: latestPrice,
      },
    });
    update.last_notified_at = now;
    update.last_notification_price_minor = latestPrice;
    update.triggered_at = now;
  }

  const { error: updateError } = await service.from('price_alerts').update(update).eq('id', alert.id);
  if (updateError) throw updateError;

  return {
    alertId: alert.id,
    status: 'checked',
    previousPriceMinor: previousPrice,
    latestPriceMinor: latestPrice,
    percentageChange: evaluation.percentageChange,
    notified: evaluation.shouldNotify,
    reason: evaluation.reason,
    dataLabel: '[MOCK DATA]',
  };
}

async function evaluateWithDuplicateCheck(service: any, alert: AlertRow, latestPrice: number, nowIso: string) {
  const duplicateSince = new Date(Date.now() - alert.notification_cooldown_minutes * 60_000).toISOString();
  const { data: duplicate } = await service
    .from('notifications')
    .select('id')
    .eq('user_id', alert.user_id)
    .eq('type', 'price_alert')
    .gte('created_at', duplicateSince)
    .contains('metadata', { price_alert_id: alert.id, observed_price_minor: latestPrice })
    .limit(1);

  return evaluatePriceAlert({
    status: alert.status,
    targetPriceMinor: alert.target_price_minor,
    previousPriceMinor: alert.last_seen_price_minor,
    latestPriceMinor: latestPrice,
    percentageDropThreshold: Number(alert.percentage_drop_threshold),
    minimumChangeMinor: alert.minimum_change_minor,
    lastNotifiedAt: alert.last_notified_at,
    lastNotificationPriceMinor: alert.last_notification_price_minor,
    cooldownMinutes: alert.notification_cooldown_minutes,
    nowIso,
    duplicateNotificationExists: Boolean(duplicate?.length),
  });
}

function evaluatePriceAlert(input: {
  status: string;
  targetPriceMinor: number;
  previousPriceMinor: number | null;
  latestPriceMinor: number;
  percentageDropThreshold: number;
  minimumChangeMinor: number;
  lastNotifiedAt: string | null;
  lastNotificationPriceMinor: number | null;
  cooldownMinutes: number;
  nowIso: string;
  duplicateNotificationExists: boolean;
}) {
  const changeMinor = input.previousPriceMinor === null ? 0 : input.previousPriceMinor - input.latestPriceMinor;
  const percentageChange = input.previousPriceMinor && input.previousPriceMinor > 0
    ? ((input.latestPriceMinor - input.previousPriceMinor) / input.previousPriceMinor) * 100
    : 0;
  const targetHit = input.latestPriceMinor <= input.targetPriceMinor;
  const percentageDropHit = Boolean(input.previousPriceMinor) && percentageChange <= -input.percentageDropThreshold;

  if (input.status !== 'active') return { shouldNotify: false, targetHit, percentageDropHit, changeMinor, percentageChange, reason: 'Alert is not active.' };
  if (!targetHit && !percentageDropHit) return { shouldNotify: false, targetHit, percentageDropHit, changeMinor, percentageChange, reason: 'No alert condition met.' };
  if (input.previousPriceMinor !== null && changeMinor < input.minimumChangeMinor) {
    return { shouldNotify: false, targetHit, percentageDropHit, changeMinor, percentageChange, reason: 'Price change is insignificant.' };
  }
  if (input.lastNotifiedAt && new Date(input.nowIso).getTime() - new Date(input.lastNotifiedAt).getTime() < input.cooldownMinutes * 60_000) {
    return { shouldNotify: false, targetHit, percentageDropHit, changeMinor, percentageChange, reason: 'Notification cooldown is active.' };
  }
  if (input.duplicateNotificationExists || input.lastNotificationPriceMinor === input.latestPriceMinor) {
    return { shouldNotify: false, targetHit, percentageDropHit, changeMinor, percentageChange, reason: 'Duplicate notification prevented.' };
  }
  return { shouldNotify: true, targetHit, percentageDropHit, changeMinor, percentageChange, reason: targetHit ? 'Target price reached.' : 'Percentage drop reached.' };
}

function simulateMockPrice(currentPriceMinor: number | null, mode: string, forceDropPercent: number) {
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

function formatMinor(amountMinor: number, currency: string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amountMinor / 100);
}
