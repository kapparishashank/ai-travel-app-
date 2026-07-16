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

    const breakdown = await calculateHiddenCosts({
      destination,
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
  destination: string;
  numDays: number;
  numTravelers: number;
  transportMode: string;
  comfortLevel: string;
  includeFood: boolean;
  includeLocalTransport: boolean;
  includeActivities: boolean;
}

async function calculateHiddenCosts(input: CostInputs) {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const AI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-1.5-flash';
  const prompt = `You are an expert travel cost estimator. Estimate the hidden and additional costs for a trip to ${input.destination}.
Details:
- Duration: ${input.numDays} days
- Travelers: ${input.numTravelers}
- Transport Mode: ${input.transportMode}
- Comfort Level: ${input.comfortLevel}
- Include Food: ${input.includeFood}
- Include Local Transport: ${input.includeLocalTransport}
- Include Activities: ${input.includeActivities}

Provide realistic cost estimates in paise (INR * 100). If a cost is not applicable based on the inputs, set it to 0. Return strict JSON.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
          responseSchema: {
            type: 'OBJECT',
            properties: {
              baggageFeesInr: { type: 'INTEGER' },
              transferCostInr: { type: 'INTEGER' },
              localTransportInr: { type: 'INTEGER' },
              foodTotalInr: { type: 'INTEGER' },
              foodDailyPerPersonInr: { type: 'INTEGER' },
              activityFeesInr: { type: 'INTEGER' },
              entryFeesInr: { type: 'INTEGER' },
              platformConvenienceFeeInr: { type: 'INTEGER' },
              accommodationTaxInr: { type: 'INTEGER' },
              miscInr: { type: 'INTEGER' },
              emergencyBufferInr: { type: 'INTEGER' },
              totalHiddenCostInr: { type: 'INTEGER' },
            },
            required: [
              'baggageFeesInr',
              'transferCostInr',
              'localTransportInr',
              'foodTotalInr',
              'foodDailyPerPersonInr',
              'activityFeesInr',
              'entryFeesInr',
              'platformConvenienceFeeInr',
              'accommodationTaxInr',
              'miscInr',
              'emergencyBufferInr',
              'totalHiddenCostInr',
            ],
          },
        },
      }),
    },
  );

  if (!response.ok) throw new Error(`AI provider unavailable (${response.status})`);
  const result = await response.json();
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  return JSON.parse(text);
}
