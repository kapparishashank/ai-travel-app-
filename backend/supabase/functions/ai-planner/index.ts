// Supabase Edge Function: ai-planner
// Generates a day-by-day AI travel itinerary for a trip.
// Uses mock data when GEMINI_API_KEY is not set (clearly labelled [AI ESTIMATE] / [MOCK DATA]).

import { createClient } from '@supabase/supabase-js';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';

const MOCK_LABEL = '[MOCK DATA]';
const AI_LABEL = '[AI ESTIMATE]';

interface RequestBody {
  tripId: string;
  regenerateDay?: number;
}

Deno.serve(async (req: Request) => {
  const corsResult = handleCors(req);
  if (corsResult) return corsResult;

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const body: RequestBody = await req.json().catch(() => ({} as RequestBody));
    const { tripId, regenerateDay } = body;

    if (!tripId) return errorResponse('invalid_request', 'tripId is required');

    // Fetch trip details
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (tripError || !trip) return errorResponse('trip_not_found', 'No trip found with the provided ID.', 404);

    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    const dataLabel = geminiKey ? AI_LABEL : MOCK_LABEL;

    // Calculate number of days
    const start = new Date(trip.start_date);
    const end = new Date(trip.end_date);
    const numDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    let days;

    if (geminiKey) {
      days = await generateWithGemini(trip, numDays, regenerateDay, geminiKey);
    } else {
      days = generateMockItinerary(trip, numDays, regenerateDay);
    }

    // Delete existing days/activities if regenerating
    if (regenerateDay !== undefined) {
      const { data: dayData } = await supabase
        .from('itinerary_days')
        .select('id')
        .eq('trip_id', tripId)
        .eq('day_number', regenerateDay)
        .maybeSingle();

      if (dayData?.id) {
        await supabase.from('itinerary_activities').delete().eq('trip_id', tripId).eq('day_id', dayData.id);
        await supabase.from('itinerary_days').delete().eq('trip_id', tripId).eq('day_number', regenerateDay);
      }
    } else {
      await supabase.from('itinerary_activities').delete().eq('trip_id', tripId);
      await supabase.from('itinerary_days').delete().eq('trip_id', tripId);
    }

    // Insert new days and activities
    for (const day of days) {
      const { data: insertedDay, error: dayError } = await supabase
        .from('itinerary_days')
        .insert({
          trip_id: tripId,
          day_number: day.dayNumber,
          date: day.date,
          theme: day.theme,
          estimated_cost_inr: day.estimatedCostInr,
          notes: day.notes ?? null,
        })
        .select()
        .single();

      if (dayError || !insertedDay) continue;

      const activities = day.activities.map((a: Record<string, unknown>, idx: number) => ({
        day_id: insertedDay.id,
        trip_id: tripId,
        sort_order: idx,
        title: a.title,
        description: a.description ?? null,
        location_name: a.locationName ?? null,
        start_time: a.startTime ?? null,
        end_time: a.endTime ?? null,
        duration_mins: a.durationMins ?? null,
        category: a.category ?? 'other',
        estimated_cost_inr: a.estimatedCostInr ?? 0,
        is_ai_generated: true,
        is_confirmed: false,
        source_label: dataLabel,
        notes: a.notes ?? null,
      }));

      await supabase.from('itinerary_activities').insert(activities);
    }

    const totalCost = days.reduce((sum: number, d: Record<string, number>) => sum + (d.estimatedCostInr ?? 0), 0);

    return jsonResponse({
      status: 'complete',
      tripId,
      data_label: dataLabel,
      days,
      totalEstimatedCostInr: totalCost,
    });
  } catch (err) {
    console.error('ai-planner error:', err);
    return errorResponse('internal_error', 'An unexpected error occurred.', 500);
  }
});

async function generateWithGemini(
  trip: Record<string, unknown>,
  numDays: number,
  regenerateDay: number | undefined,
  apiKey: string,
): Promise<Record<string, unknown>[]> {
  const prompt = `You are a travel planner for India. Generate a ${numDays}-day itinerary for a trip from ${trip.origin} to ${trip.destination}.
Trip details:
- Start date: ${trip.start_date}
- Budget: ₹${Math.round((trip.budget_inr as number) / 100)} total
- Travelers: ${trip.num_travelers} (${trip.traveler_type})
- Interests: ${(trip.interests as string[]).join(', ') || 'general sightseeing'}
- Comfort level: ${trip.comfort_level}
${regenerateDay !== undefined ? `Regenerate only day ${regenerateDay}.` : ''}

Return a JSON array of days. Each day has:
- dayNumber (integer)
- date (YYYY-MM-DD)
- theme (string, 1 sentence)
- estimatedCostInr (integer in paise, i.e. rupees × 100)
- activities (array of objects with: title, description, locationName, startTime (HH:MM), endTime (HH:MM), durationMins, category (one of: sightseeing/food/transport/accommodation/activity/rest/shopping/emergency/other), estimatedCostInr (paise))

Important: All prices are estimates only, not confirmed. Use realistic Indian travel costs.
Return ONLY the JSON array, no explanation.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.7 },
      }),
    }
  );

  const result = await response.json();
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
  return JSON.parse(text);
}

function generateMockItinerary(
  trip: Record<string, unknown>,
  numDays: number,
  regenerateDay: number | undefined,
): Record<string, unknown>[] {
  const start = new Date(trip.start_date as string);
  const daysToGenerate = regenerateDay !== undefined
    ? [regenerateDay]
    : Array.from({ length: numDays }, (_, i) => i + 1);

  return daysToGenerate.map((dayNum) => {
    const date = new Date(start);
    date.setDate(date.getDate() + dayNum - 1);
    const dateStr = date.toISOString().split('T')[0];

    return {
      dayNumber: dayNum,
      date: dateStr,
      theme: dayNum === 1 ? 'Arrival & Orientation' : dayNum === numDays ? 'Departure Day' : `Day ${dayNum} Exploration`,
      estimatedCostInr: 150000, // ₹1500 mock estimate in paise
      notes: '[MOCK DATA] This itinerary is a placeholder. Configure GEMINI_API_KEY for AI-generated plans.',
      activities: [
        {
          title: dayNum === 1 ? 'Check in to accommodation' : 'Breakfast at local café',
          description: '[MOCK DATA] Example activity',
          locationName: `${trip.destination} city center`,
          startTime: '09:00',
          endTime: '10:00',
          durationMins: 60,
          category: dayNum === 1 ? 'accommodation' : 'food',
          estimatedCostInr: 30000,
          notes: '[MOCK DATA]',
        },
        {
          title: 'Sightseeing at a local landmark',
          description: `[MOCK DATA] Visit a popular attraction in ${trip.destination}`,
          locationName: `${trip.destination} landmark`,
          startTime: '10:30',
          endTime: '13:00',
          durationMins: 150,
          category: 'sightseeing',
          estimatedCostInr: 50000,
          notes: '[MOCK DATA]',
        },
        {
          title: 'Lunch at a local restaurant',
          description: '[MOCK DATA] Enjoy regional cuisine',
          locationName: `${trip.destination} local area`,
          startTime: '13:30',
          endTime: '14:30',
          durationMins: 60,
          category: 'food',
          estimatedCostInr: 25000,
          notes: '[MOCK DATA]',
        },
        {
          title: 'Evening leisure / shopping',
          description: '[MOCK DATA] Explore local markets',
          locationName: `${trip.destination} market`,
          startTime: '17:00',
          endTime: '19:00',
          durationMins: 120,
          category: 'shopping',
          estimatedCostInr: 50000,
          notes: '[MOCK DATA]',
        },
      ],
    };
  });
}
