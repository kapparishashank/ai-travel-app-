// Supabase Edge Function: personalized-recs
// Generates personalized in-destination recommendations (restaurants, sights, hidden gems)

import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';

interface RequestBody {
  destination: string;
  numDays: number;
  preferences?: string[];
  budgetLevel?: 'budget' | 'moderate' | 'luxury';
}

Deno.serve(async (req: Request) => {
  const corsResult = handleCors(req);
  if (corsResult) return corsResult;

  if (req.method !== 'POST') return errorResponse('method_not_allowed', 'Use POST', 405);

  try {
    const body: RequestBody = await req.json().catch(() => ({} as RequestBody));
    const { destination, numDays, preferences = [], budgetLevel = 'moderate' } = body;

    if (!destination || !numDays) {
      return errorResponse('invalid_request', 'destination and numDays are required');
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

    const AI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-1.5-flash';
    const prompt = `You are a local travel guide for ${destination}. Given the following constraints:
- Duration: ${numDays} days
- Budget Level: ${budgetLevel}
- Interests: ${preferences.join(', ')}

Provide personalized recommendations for this trip. Include:
1. Top 3 Restaurants/Cafes.
2. Top 3 Attractions/Sights.
3. 2 Hidden Gems (less touristy spots).

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
                restaurants: {
                  type: 'ARRAY',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      name: { type: 'STRING' },
                      description: { type: 'STRING' },
                      priceEstimate: { type: 'STRING' }
                    },
                    required: ['name', 'description', 'priceEstimate']
                  }
                },
                attractions: {
                  type: 'ARRAY',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      name: { type: 'STRING' },
                      description: { type: 'STRING' },
                      timeRequired: { type: 'STRING' }
                    },
                    required: ['name', 'description', 'timeRequired']
                  }
                },
                hiddenGems: {
                  type: 'ARRAY',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      name: { type: 'STRING' },
                      description: { type: 'STRING' },
                      whyItsSpecial: { type: 'STRING' }
                    },
                    required: ['name', 'description', 'whyItsSpecial']
                  }
                }
              },
              required: ['restaurants', 'attractions', 'hiddenGems']
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
    console.error('personalized-recs error:', err);
    return errorResponse('internal_error', 'An unexpected error occurred.', 500);
  }
});
