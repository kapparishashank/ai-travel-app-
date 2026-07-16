// Supabase Edge Function: budget-discovery
// Recommends best places based on budget and preferences

import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';

interface RequestBody {
  budgetInr: number;
  numDays: number;
  numTravelers: number;
  interests?: string[];
  startingCity?: string;
}

Deno.serve(async (req: Request) => {
  const corsResult = handleCors(req);
  if (corsResult) return corsResult;

  if (req.method !== 'POST') return errorResponse('method_not_allowed', 'Use POST', 405);

  try {
    const body: RequestBody = await req.json().catch(() => ({} as RequestBody));
    const { budgetInr, numDays, numTravelers, interests = [], startingCity = 'India' } = body;

    if (!budgetInr || !numDays || !numTravelers) {
      return errorResponse('invalid_request', 'budgetInr, numDays, and numTravelers are required');
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

    const AI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-1.5-flash';
    const prompt = `You are a budget travel planner. Suggest the best travel destinations given these constraints:
- Total Budget: ${budgetInr} INR
- Duration: ${numDays} days
- Number of Travelers: ${numTravelers}
- Origin: ${startingCity}
- Interests: ${interests.join(', ')}

Provide 3 destination recommendations. For each, give a short description, estimated total cost, and top reasons to visit.
Return strictly valid JSON.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.7,
            responseSchema: {
              type: 'OBJECT',
              properties: {
                destinations: {
                  type: 'ARRAY',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      name: { type: 'STRING' },
                      description: { type: 'STRING' },
                      estimatedCostInr: { type: 'INTEGER' },
                      reasonsToVisit: {
                        type: 'ARRAY',
                        items: { type: 'STRING' }
                      }
                    },
                    required: ['name', 'description', 'estimatedCostInr', 'reasonsToVisit']
                  }
                }
              },
              required: ['destinations']
            }
          }
        })
      }
    );

    if (!response.ok) throw new Error(`AI provider unavailable (${response.status})`);
    const result = await response.json();
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    const data = JSON.parse(text);

    return jsonResponse({ status: 'ok', data });
  } catch (err) {
    console.error('budget-discovery error:', err);
    return errorResponse('internal_error', 'An unexpected error occurred.', 500);
  }
});
