// Supabase Edge Function: hidden-cost-calc
// Estimates hidden and additional costs beyond the advertised ticket/hotel price.

import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';

interface RequestBody {
  destination: string;
  numDays: number;
  numTravelers: number;
  transportMode: 'flight' | 'train' | 'bus' | 'cab';
  comfortLevel?: 'budget' | 'standard' | 'premium';
  includeFood?: boolean;
  includeLocalTransport?: boolean;
  includeActivities?: boolean;
}

Deno.serve(async (req: Request) => {
  const corsResult = handleCors(req);
  if (corsResult) return corsResult;

  try {
    const body: RequestBody = await req.json().catch(() => ({} as RequestBody));
    const {
      destination,
      numDays,
      numTravelers,
      transportMode,
      comfortLevel = 'standard',
      includeFood = true,
      includeLocalTransport = true,
      includeActivities = true,
    } = body;

    if (!destination || !numDays || !numTravelers || !transportMode) {
      return errorResponse('invalid_request', 'destination, numDays, numTravelers, and transportMode are required');
    }

    const breakdown = calculateHiddenCosts({
      numDays,
      numTravelers,
      transportMode,
      comfortLevel,
      includeFood,
      includeLocalTransport,
      includeActivities,
    });

    return jsonResponse({
      status: 'ok',
      data_label: '[AI ESTIMATE]',
      disclaimer: 'All cost estimates are AI-generated approximations based on typical India travel patterns. Actual costs may vary significantly. TravelAI does not guarantee these prices.',
      destination,
      numDays,
      numTravelers,
      comfortLevel,
      breakdown,
      notes: [
        'All amounts are in paise (divide by 100 for rupees).',
        'Food costs assume eating at mid-range local restaurants.',
        'Local transport estimate includes autos, metro, and cabs.',
        'Activity fees are based on typical tourist attractions.',
        'An emergency buffer of 10% of total is always recommended.',
      ],
    });
  } catch (err) {
    console.error('hidden-cost-calc error:', err);
    return errorResponse('internal_error', 'An unexpected error occurred.', 500);
  }
});

interface CostInputs {
  numDays: number;
  numTravelers: number;
  transportMode: string;
  comfortLevel: string;
  includeFood: boolean;
  includeLocalTransport: boolean;
  includeActivities: boolean;
}

function calculateHiddenCosts(input: CostInputs) {
  const { numDays, numTravelers, transportMode, comfortLevel, includeFood, includeLocalTransport, includeActivities } = input;

  // Per-person daily multiplier based on comfort level (in paise)
  const comfortMultiplier = comfortLevel === 'budget' ? 0.6 : comfortLevel === 'premium' ? 2.0 : 1.0;

  // Baggage fees (one-way, per person)
  const baggageFees = transportMode === 'flight'
    ? Math.round(80000 * numTravelers * comfortMultiplier)
    : 0;

  // Airport / station transfer (both ends)
  const transferCost = transportMode === 'flight'
    ? Math.round(60000 * numTravelers)
    : Math.round(20000 * numTravelers);

  // Local transport per day per person (₹200–₹600 range)
  const localTransportDaily = Math.round(30000 * comfortMultiplier);
  const localTransportTotal = includeLocalTransport
    ? localTransportDaily * numDays * numTravelers
    : 0;

  // Food per day per person (₹300–₹900 range)
  const foodDaily = Math.round(45000 * comfortMultiplier);
  const foodTotal = includeFood
    ? foodDaily * numDays * numTravelers
    : 0;

  // Activity / entry fees per day per person (₹100–₹500)
  const activityDaily = Math.round(20000 * comfortMultiplier);
  const activityTotal = includeActivities
    ? activityDaily * numDays * numTravelers
    : 0;

  // Entry fees (monuments, parks etc.) — flat estimate
  const entryFees = includeActivities
    ? Math.round(15000 * numDays * numTravelers * comfortMultiplier)
    : 0;

  // Platform convenience fees (booking platforms)
  const platformFees = Math.round(4500 * numTravelers);

  // GST / taxes on accommodation (assume 18% on ₹1500/night/person)
  const accommodationTax = Math.round(0.18 * 150000 * numDays * numTravelers);

  // Miscellaneous (souvenirs, tips, etc.)
  const miscCost = Math.round(50000 * numDays * numTravelers * 0.5);

  const subtotal = baggageFees + transferCost + localTransportTotal + foodTotal +
    activityTotal + entryFees + platformFees + accommodationTax + miscCost;

  // Emergency buffer 10%
  const emergencyBuffer = Math.round(subtotal * 0.1);
  const totalHiddenCost = subtotal + emergencyBuffer;

  return {
    baggageFeesInr: baggageFees,
    transferCostInr: transferCost,
    localTransportInr: localTransportTotal,
    foodTotalInr: foodTotal,
    foodDailyPerPersonInr: foodDaily,
    activityFeesInr: activityTotal,
    entryFeesInr: entryFees,
    platformConvenienceFeeInr: platformFees,
    accommodationTaxInr: accommodationTax,
    miscInr: miscCost,
    emergencyBufferInr: emergencyBuffer,
    totalHiddenCostInr: totalHiddenCost,
  };
}
