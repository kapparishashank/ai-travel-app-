// Supabase Edge Function: price-alerts
// Checks saved price alerts and returns simulated price updates.

import { createClient } from '@supabase/supabase-js';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  const corsResult = handleCors(req);
  if (corsResult) return corsResult;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return errorResponse('unauthorized', 'Missing authorization header', 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { alertId } = await req.json().catch(() => ({}));

    // Get JWT user
    const { data: { user }, error: authError } = await createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser();

    if (authError || !user) return errorResponse('unauthorized', 'Invalid token', 401);

    // Fetch alerts
    let query = supabase
      .from('price_alerts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (alertId) query = query.eq('id', alertId);

    const { data: alerts, error: alertsError } = await query;
    if (alertsError) return errorResponse('db_error', 'Failed to fetch alerts', 500);

    const results = [];

    for (const alert of alerts ?? []) {
      // Simulate a mock price (MVP — no real price API)
      const mockCurrentPrice = simulateMockPrice(alert.last_price_inr, alert.type);
      const hasDrop = alert.target_price_inr !== null && mockCurrentPrice <= alert.target_price_inr;
      const dropAmount = alert.last_price_inr ? Math.max(0, alert.last_price_inr - mockCurrentPrice) : 0;
      const dropPercent = alert.last_price_inr && dropAmount > 0
        ? Math.round((dropAmount / alert.last_price_inr) * 100)
        : 0;

      // Update last price and checked time
      await supabase
        .from('price_alerts')
        .update({ last_price_inr: mockCurrentPrice, last_checked_at: new Date().toISOString() })
        .eq('id', alert.id);

      results.push({
        alertId: alert.id,
        origin: alert.origin,
        destination: alert.destination,
        travelDate: alert.travel_date,
        type: alert.type,
        targetPriceInr: alert.target_price_inr,
        currentPriceInr: mockCurrentPrice,
        hasDrop,
        dropAmountInr: dropAmount,
        dropPercent,
        message: hasDrop
          ? `Price dropped ₹${Math.round(dropAmount / 100)} since your last check!`
          : `Price is ₹${Math.round(mockCurrentPrice / 100)}. Watching for drops below ₹${Math.round((alert.target_price_inr ?? mockCurrentPrice) / 100)}.`,
        dataLabel: '[MOCK DATA]',
        disclaimer: 'Price shown is a simulated mock. No live pricing API is connected in MVP.',
      });
    }

    return jsonResponse({ status: 'ok', data_label: '[MOCK DATA]', alerts: results });
  } catch (err) {
    console.error('price-alerts error:', err);
    return errorResponse('internal_error', 'An unexpected error occurred.', 500);
  }
});

function simulateMockPrice(lastPrice: number | null, type: string): number {
  // Base prices per type (in paise)
  const basePrices: Record<string, number> = {
    flight: 350000,
    train: 80000,
    bus: 60000,
  };
  const base = lastPrice ?? basePrices[type] ?? 200000;
  // Simulate ±10% random fluctuation
  const fluctuation = (Math.random() * 0.2 - 0.1); // -10% to +10%
  return Math.round(base * (1 + fluctuation));
}
