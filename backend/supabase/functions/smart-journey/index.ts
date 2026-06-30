// Supabase Edge Function: smart-journey
// Returns mock transport comparison results (bus, train, flight) between two cities.

import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';

interface RequestBody {
  origin: string;
  destination: string;
  travelDate: string;
  numTravelers: number;
  returnDate?: string;
}

Deno.serve(async (req: Request) => {
  const corsResult = handleCors(req);
  if (corsResult) return corsResult;

  try {
    const body: RequestBody = await req.json().catch(() => ({} as RequestBody));
    const { origin, destination, travelDate, numTravelers = 1 } = body;

    if (!origin || !destination || !travelDate) {
      return errorResponse('invalid_request', 'origin, destination, and travelDate are required');
    }

    // All data is mock — no live transport API integrated in MVP
    const options = generateMockOptions(origin, destination, travelDate, numTravelers);

    return jsonResponse({
      status: 'ok',
      data_label: '[MOCK DATA]',
      disclaimer: 'All transport options shown are estimated mock data. Prices and availability are not confirmed. Always verify with the actual provider before booking.',
      origin,
      destination,
      travelDate,
      numTravelers,
      options,
    });
  } catch (err) {
    console.error('smart-journey error:', err);
    return errorResponse('internal_error', 'An unexpected error occurred.', 500);
  }
});

function generateMockOptions(origin: string, destination: string, travelDate: string, numTravelers: number) {
  const date = new Date(travelDate);
  const fmt = (h: number, m = 0) => {
    const dt = new Date(date);
    dt.setHours(h, m, 0, 0);
    return dt.toISOString();
  };

  const perPax = (amount: number) => amount * numTravelers;

  return [
    {
      mode: 'train',
      operator: 'Indian Railways',
      departureTime: fmt(6, 0),
      arrivalTime: fmt(14, 30),
      durationMins: 510,
      baseFareInr: perPax(60000),      // ₹600 per person
      taxesInr: 0,
      baggageCostInr: 0,
      lastMileInr: perPax(15000),       // ₹150 last mile
      totalCostInr: perPax(75000),
      comfortRating: 3,
      numStops: 2,
      isRefundable: true,
      isRecommended: true,
      recommendationLabel: 'Best Value',
      whyRecommended: 'Lowest total cost with reasonable travel time. Refundable ticket.',
      cancellationPolicy: 'Full refund if cancelled 48h before departure. 50% refund within 24h.',
      reliabilityNote: 'Trains run on time approximately 70% of the time on this route.',
      dataLabel: '[MOCK DATA]',
    },
    {
      mode: 'bus',
      operator: 'State / Private AC Bus',
      departureTime: fmt(21, 0),
      arrivalTime: (() => {
        const d = new Date(date);
        d.setDate(d.getDate() + 1);
        d.setHours(6, 0, 0, 0);
        return d.toISOString();
      })(),
      durationMins: 540,
      baseFareInr: perPax(45000),      // ₹450 per person
      taxesInr: 0,
      baggageCostInr: 0,
      lastMileInr: perPax(10000),
      totalCostInr: perPax(55000),
      comfortRating: 2,
      numStops: 0,
      isRefundable: false,
      isRecommended: false,
      recommendationLabel: 'Cheapest Option',
      whyRecommended: null,
      cancellationPolicy: 'Non-refundable',
      reliabilityNote: 'Overnight bus. Arrival time may vary due to road conditions.',
      dataLabel: '[MOCK DATA]',
    },
    {
      mode: 'flight',
      operator: 'IndiGo / Air India (estimate)',
      departureTime: fmt(8, 0),
      arrivalTime: fmt(9, 30),
      durationMins: 90,
      baseFareInr: perPax(350000),     // ₹3500 per person
      taxesInr: perPax(45000),
      baggageCostInr: perPax(80000),
      lastMileInr: perPax(60000),
      totalCostInr: perPax(535000),
      comfortRating: 4,
      numStops: 0,
      isRefundable: false,
      isRecommended: false,
      recommendationLabel: 'Fastest',
      whyRecommended: null,
      cancellationPolicy: 'Non-refundable base fare. Taxes may be refunded.',
      reliabilityNote: 'Flight schedules vary. Check airline website for live status.',
      dataLabel: '[MOCK DATA]',
    },
    {
      mode: 'cab',
      operator: 'Outstation Cab (Estimated)',
      departureTime: fmt(7, 0),
      arrivalTime: fmt(14, 0),
      durationMins: 420,
      baseFareInr: 1200000,            // ₹12,000 flat (not per person)
      taxesInr: 0,
      baggageCostInr: 0,
      lastMileInr: 0,
      totalCostInr: 1200000,
      comfortRating: 4,
      numStops: 0,
      isRefundable: true,
      isRecommended: false,
      recommendationLabel: 'Best for Families',
      whyRecommended: 'Door-to-door convenience. Shared cost for larger groups.',
      cancellationPolicy: 'Free cancellation 24h before. 50% charge within 24h.',
      reliabilityNote: 'Estimated cost — actual cab price depends on availability and surge.',
      dataLabel: '[MOCK DATA]',
    },
  ];
}
