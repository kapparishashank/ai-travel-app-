// Supabase Edge Function: ai-planner
// Secure server-side AI itinerary generation. The mobile frontend must call this
// function, never the AI provider directly.

import { createClient } from '@supabase/supabase-js';
import { z } from 'https://esm.sh/zod@3.24.1';
import { errorResponse, handleCors, jsonResponse } from '../_shared/cors.ts';

const AI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-1.5-flash';
const MAX_GENERATIONS_PER_HOUR = 5;
const PROVIDER_TIMEOUT_MS = 25_000;
const PROVIDER_RETRIES = 1;

const requestSchema = z.object({
  tripId: z.string().uuid(),
  source: z.string().trim().min(2).max(120).optional(),
  destination: z.string().trim().min(2).max(120).optional(),
  dates: z
    .object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      flexible: z.boolean().default(false),
    })
    .optional(),
  travelers: z
    .object({
      adults: z.number().int().min(0).max(50),
      children: z.number().int().min(0).max(50),
      tripType: z.enum(['solo', 'couple', 'family', 'friends', 'work']),
    })
    .refine((value) => value.adults + value.children > 0, 'At least one traveler is required.')
    .optional(),
  budget: z
    .object({
      amountMinor: z.number().int().min(0).max(100_000_000),
      currency: z.string().length(3).default('INR'),
    })
    .optional(),
  interests: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  travelPace: z.enum(['slow', 'moderate', 'packed']).optional(),
  transportPreference: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  foodPreference: z.array(z.string().trim().min(1).max(40)).max(15).default([]),
  accessibilityRequirements: z.array(z.string().trim().min(1).max(80)).max(15).default([]),
  availableWeatherContext: z
    .array(
      z.object({
        date: z.string().optional(),
        summary: z.string().max(240),
        source: z.string().max(80).optional(),
      }),
    )
    .max(14)
    .default([]),
  availablePlaceContext: z
    .array(
      z.object({
        name: z.string().max(120),
        summary: z.string().max(360).optional(),
        requiresLiveVerification: z.boolean().default(true),
      }),
    )
    .max(30)
    .default([]),
});

const activitySchema = z.object({
  title: z.string().min(2).max(160),
  description: z.string().max(600),
  locationName: z.string().max(160).optional().nullable(),
  category: z.enum(['transport', 'stay', 'food', 'activity', 'shopping', 'safety', 'other']).default('activity'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  estimatedCostMinor: z.number().int().min(0),
  travelTimeMinutes: z.number().int().min(0).max(720),
  recommendedTransport: z.string().max(120),
  recommendationReason: z.string().max(400),
  safetyNote: z.string().max(400),
  weatherNote: z.string().max(400),
  requiresLiveVerification: z.boolean(),
  alternatives: z.array(z.string().max(180)).max(5).default([]),
  warnings: z.array(z.string().max(180)).max(5).default([]),
});

const daySchema = z.object({
  dayNumber: z.number().int().min(1).max(60),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  theme: z.string().min(2).max(160),
  estimatedCostMinor: z.number().int().min(0),
  safetyNote: z.string().max(500),
  weatherNote: z.string().max(500),
  activities: z.array(activitySchema).min(3).max(14),
});

const itineraryResponseSchema = z.object({
  tripSummary: z.string().min(20).max(1200),
  estimatedTotalCostMinor: z.number().int().min(0),
  currency: z.string().length(3),
  confidenceLevel: z.enum(['low', 'medium', 'high']),
  recommendedTransport: z.string().max(160),
  reasonForRecommendation: z.string().max(600),
  dayWiseItinerary: z.array(daySchema).min(1).max(60),
  alternatives: z.array(z.string().max(240)).max(10).default([]),
  warnings: z.array(z.string().max(240)).max(12).default([]),
  dataLimitations: z.array(z.string().max(240)).min(1).max(12),
});

type ItineraryRequest = z.infer<typeof requestSchema>;
type ItineraryResponse = z.infer<typeof itineraryResponseSchema>;

type TripRow = {
  id: string;
  created_by: string;
  title: string;
  origin_name: string;
  destination_name: string;
  start_date: string;
  end_date: string;
  timezone: string;
  total_budget_minor: number;
  currency_code: string;
  metadata: Record<string, unknown>;
};

Deno.serve(async (req: Request) => {
  const corsResult = handleCors(req);
  if (corsResult) return corsResult;

  if (req.method !== 'POST') {
    return errorResponse('method_not_allowed', 'Use POST to generate an itinerary.', 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return errorResponse('unauthorized', 'Missing authorization header.', 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return errorResponse('misconfigured', 'AI planner is not configured.', 500);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) return errorResponse('unauthorized', 'Invalid or expired session.', 401);

  const rawBody = await req.json().catch(() => null);
  const parsedRequest = requestSchema.safeParse(rawBody);
  if (!parsedRequest.success) {
    return errorResponse('invalid_request', parsedRequest.error.issues[0]?.message ?? 'Invalid itinerary request.', 400);
  }

  const requestData = parsedRequest.data;
  const rateLimit = await checkRateLimit(adminClient, user.id);
  if (!rateLimit.allowed) {
    return errorResponse('rate_limited', 'You have reached the itinerary generation limit. Try again later.', 429);
  }

  const trip = await fetchAuthorizedTrip(adminClient, requestData.tripId, user.id);
  if (!trip) {
    return errorResponse('trip_not_found', 'Trip not found or you do not have access to it.', 404);
  }

  const normalizedRequest = normalizeRequest(requestData, trip);
  const generationId = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  await adminClient.from('ai_generations').insert({
    id: generationId,
    user_id: user.id,
    trip_id: trip.id,
    feature: 'itinerary',
    status: 'running',
    model: Deno.env.get('GEMINI_API_KEY') ? AI_MODEL : 'mock-secure-planner',
    prompt_version: 'itinerary-mvp-v2',
    input: sanitizeInputForLog(normalizedRequest),
    started_at: startedAt,
  });

  try {
    const aiResponse = await generateItinerary(normalizedRequest);
    const validation = itineraryResponseSchema.safeParse(aiResponse);

    let itinerary: ItineraryResponse;
    let repaired = false;

    if (validation.success) {
      itinerary = validation.data;
    } else {
      const repairedResponse = await repairStructuredResponse(normalizedRequest, aiResponse, validation.error.message);
      const repairValidation = itineraryResponseSchema.safeParse(repairedResponse);
      if (!repairValidation.success) {
        await markGenerationFailed(adminClient, generationId, 'AI response failed schema validation after repair.', {
          validation_error: repairValidation.error.issues.slice(0, 5),
        });
        return errorResponse(
          'invalid_ai_response',
          'TravelAI could not produce a valid itinerary. Please adjust the trip details and try again.',
          502,
        );
      }
      repaired = true;
      itinerary = repairValidation.data;
    }

    await saveItinerary(adminClient, trip, itinerary);

    await adminClient
      .from('ai_generations')
      .update({
        status: 'succeeded',
        output: sanitizeOutputForLog(itinerary, repaired),
        completed_at: new Date().toISOString(),
      })
      .eq('id', generationId);

    return jsonResponse({
      status: 'complete',
      generationId,
      tripId: trip.id,
      data_label: '[AI ESTIMATE]',
      disclaimer:
        'All itinerary details are estimates. Verify ticket availability, prices, place hours, weather, and safety conditions with live sources before booking or traveling.',
      data: itinerary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected AI planner error.';
    await markGenerationFailed(adminClient, generationId, message);
    return errorResponse('ai_planner_failed', safeFrontendError(message), 500);
  }
});

async function fetchAuthorizedTrip(adminClient: any, tripId: string, userId: string) {
  const { data: trip, error } = await adminClient.from('trips').select('*').eq('id', tripId).single();
  if (error || !trip) return null;

  if (trip.created_by === userId) return trip as TripRow;

  const { data: membership } = await adminClient
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .eq('status', 'accepted')
    .maybeSingle();

  return membership ? (trip as TripRow) : null;
}

async function checkRateLimit(adminClient: any, userId: string) {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await adminClient
    .from('ai_generations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('feature', 'itinerary')
    .gte('created_at', since);

  if (error) return { allowed: false };
  return { allowed: (count ?? 0) < MAX_GENERATIONS_PER_HOUR };
}

function normalizeRequest(requestData: ItineraryRequest, trip: TripRow): ItineraryRequest {
  const metadata = trip.metadata ?? {};
  const travelers = metadata.travelers as Record<string, unknown> | undefined;

  return {
    ...requestData,
    source: requestData.source ?? trip.origin_name,
    destination: requestData.destination ?? trip.destination_name,
    dates: requestData.dates ?? {
      startDate: trip.start_date,
      endDate: trip.end_date,
      flexible: Boolean(metadata.flexible_dates),
    },
    travelers: requestData.travelers ?? {
      adults: Number(travelers?.adults ?? 1),
      children: Number(travelers?.children ?? 0),
      tripType: (travelers?.trip_type as 'solo' | 'couple' | 'family' | 'friends' | 'work' | undefined) ?? 'solo',
    },
    budget: requestData.budget ?? {
      amountMinor: trip.total_budget_minor,
      currency: trip.currency_code,
    },
    interests: requestData.interests.length ? requestData.interests : ((metadata.interests as string[] | undefined) ?? []),
    travelPace: requestData.travelPace ?? ((metadata.travel_pace as ItineraryRequest['travelPace']) ?? 'moderate'),
    transportPreference: requestData.transportPreference.length
      ? requestData.transportPreference
      : ((metadata.preferred_transport as string[] | undefined) ?? []),
    foodPreference: requestData.foodPreference.length
      ? requestData.foodPreference
      : ((metadata.food_preferences as string[] | undefined) ?? []),
    accessibilityRequirements: requestData.accessibilityRequirements.length
      ? requestData.accessibilityRequirements
      : ((metadata.accessibility_needs as string[] | undefined) ?? []),
  };
}

async function generateItinerary(requestData: ItineraryRequest) {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) return generateMockItinerary(requestData);

  const prompt = buildPrompt(requestData);
  const raw = await callGeminiWithRetry(apiKey, prompt, false);
  return parseProviderJson(raw);
}

async function repairStructuredResponse(requestData: ItineraryRequest, invalidResponse: unknown, validationError: string) {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) return normalizeMockRepair(requestData, invalidResponse);

  const repairPrompt = `Repair the following JSON so it strictly matches the required itinerary schema. Return only JSON. Do not add live-price, ticket-availability, opening-hours, or safety guarantees.

Validation error:
${validationError}

Original request summary:
${JSON.stringify(sanitizeInputForLog(requestData))}

Invalid JSON:
${JSON.stringify(invalidResponse).slice(0, 12_000)}`;

  const raw = await callGeminiWithRetry(apiKey, repairPrompt, true);
  return parseProviderJson(raw);
}

async function callGeminiWithRetry(apiKey: string, prompt: string, repair: boolean) {
  let lastError: unknown;

  for (let attempt = 0; attempt <= PROVIDER_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: repair ? 0.1 : 0.35,
              maxOutputTokens: 8192,
            },
          }),
        },
      );

      if (!response.ok) {
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          throw new Error(`AI provider rejected the request (${response.status}).`);
        }
        throw new Error(`AI provider unavailable (${response.status}).`);
      }

      const result = await response.json();
      return result?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    } catch (error) {
      lastError = error;
      if (attempt === PROVIDER_RETRIES) break;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('AI provider request failed.');
}

function buildPrompt(requestData: ItineraryRequest) {
  const tripDays = countTripDays(requestData.dates!.startDate, requestData.dates!.endDate);

  return `You are TravelAI's secure itinerary planner. Return strict JSON only.

Required schema:
{
  "tripSummary": string,
  "estimatedTotalCostMinor": integer,
  "currency": "INR",
  "confidenceLevel": "low" | "medium" | "high",
  "recommendedTransport": string,
  "reasonForRecommendation": string,
  "dayWiseItinerary": [{
    "dayNumber": integer,
    "date": "YYYY-MM-DD",
    "theme": string,
    "estimatedCostMinor": integer,
    "safetyNote": string,
    "weatherNote": string,
    "activities": [{
      "title": string,
      "description": string,
      "locationName": string | null,
      "category": "transport" | "stay" | "food" | "activity" | "shopping" | "safety" | "other",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "estimatedCostMinor": integer,
      "travelTimeMinutes": integer,
      "recommendedTransport": string,
      "recommendationReason": string,
      "safetyNote": string,
      "weatherNote": string,
      "requiresLiveVerification": boolean,
      "alternatives": string[],
      "warnings": string[]
    }]
  }],
  "alternatives": string[],
  "warnings": string[],
  "dataLimitations": string[]
}

Trip input:
${JSON.stringify({ ...requestData, tripDays })}

Rules:
- Never invent confirmed ticket availability.
- Never claim estimated prices are live prices.
- Never guarantee that a place is open.
- Clearly mark information that requires live verification.
- Never guarantee safety.
- Keep the plan within budget where realistically possible.
- Add rest and meal periods every day.
- Avoid impossible travel times.
- Warn when the requested budget is unrealistic.
- Use minor currency units for all costs.
- Return exactly ${tripDays} days unless the date input is impossible.`;
}

function parseProviderJson(raw: string) {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return JSON.parse(fenced?.[1] ?? trimmed);
}

async function saveItinerary(adminClient: any, trip: TripRow, itinerary: ItineraryResponse) {
  await adminClient.from('itinerary_items').delete().eq('trip_id', trip.id);
  await adminClient.from('trip_days').delete().eq('trip_id', trip.id);

  for (const day of itinerary.dayWiseItinerary) {
    const { data: insertedDay, error: dayError } = await adminClient
      .from('trip_days')
      .insert({
        trip_id: trip.id,
        day_number: day.dayNumber,
        local_date: day.date,
        title: day.theme,
        notes: [day.safetyNote, day.weatherNote].filter(Boolean).join('\n'),
      })
      .select('id')
      .single();

    if (dayError || !insertedDay) throw dayError ?? new Error('Failed to save itinerary day.');

    const items = day.activities.map((activity, index) => ({
      trip_id: trip.id,
      trip_day_id: insertedDay.id,
      title: activity.title,
      description: activity.description,
      category: activity.category,
      location_name: activity.locationName,
      starts_at: toTripDateTime(day.date, activity.startTime, trip.timezone),
      ends_at: toTripDateTime(day.date, activity.endTime, trip.timezone),
      local_start_time: activity.startTime,
      local_end_time: activity.endTime,
      estimated_cost_minor: activity.estimatedCostMinor,
      source: 'ai',
      status: 'planned',
      sort_order: index,
      metadata: {
        travel_time_minutes: activity.travelTimeMinutes,
        recommended_transport: activity.recommendedTransport,
        recommendation_reason: activity.recommendationReason,
        safety_note: activity.safetyNote,
        weather_note: activity.weatherNote,
        requires_live_verification: activity.requiresLiveVerification,
        alternatives: activity.alternatives,
        warnings: activity.warnings,
        data_label: '[AI ESTIMATE]',
      },
    }));

    const { error: itemsError } = await adminClient.from('itinerary_items').insert(items);
    if (itemsError) throw itemsError;
  }
}

function toTripDateTime(date: string, time: string, timezone: string) {
  // Store a safe ISO-like timestamp. The trip timezone is retained on the trip;
  // local_start_time/local_end_time are the source of truth for floating local time.
  const offset = timezone === 'Asia/Kolkata' ? '+05:30' : 'Z';
  return `${date}T${time}:00${offset}`;
}

function sanitizeInputForLog(requestData: ItineraryRequest) {
  return {
    tripId: requestData.tripId,
    source: requestData.source,
    destination: requestData.destination,
    dates: requestData.dates,
    travelers: requestData.travelers,
    budget: requestData.budget,
    interests: requestData.interests,
    travelPace: requestData.travelPace,
    transportPreference: requestData.transportPreference,
    foodPreferenceCount: requestData.foodPreference.length,
    accessibilityRequirementCount: requestData.accessibilityRequirements.length,
    weatherContextCount: requestData.availableWeatherContext.length,
    placeContextCount: requestData.availablePlaceContext.length,
  };
}

function sanitizeOutputForLog(itinerary: ItineraryResponse, repaired: boolean) {
  return {
    repaired,
    confidenceLevel: itinerary.confidenceLevel,
    estimatedTotalCostMinor: itinerary.estimatedTotalCostMinor,
    currency: itinerary.currency,
    dayCount: itinerary.dayWiseItinerary.length,
    activityCount: itinerary.dayWiseItinerary.reduce((sum, day) => sum + day.activities.length, 0),
    warnings: itinerary.warnings,
    dataLimitations: itinerary.dataLimitations,
  };
}

async function markGenerationFailed(
  adminClient: any,
  generationId: string,
  message: string,
  extraOutput?: Record<string, unknown>,
) {
  await adminClient
    .from('ai_generations')
    .update({
      status: 'failed',
      error_message: message.slice(0, 1000),
      output: extraOutput ?? { safe_error: true },
      completed_at: new Date().toISOString(),
    })
    .eq('id', generationId);
}

function safeFrontendError(message: string) {
  if (message.includes('abort')) return 'The itinerary request timed out. Please try again.';
  if (message.includes('provider')) return 'The itinerary provider is temporarily unavailable. Please try again.';
  return 'TravelAI could not generate the itinerary right now. Please try again.';
}

function countTripDays(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

function generateMockItinerary(requestData: ItineraryRequest): ItineraryResponse {
  const days = countTripDays(requestData.dates!.startDate, requestData.dates!.endDate);
  const budget = requestData.budget!.amountMinor;
  const dayBudget = Math.max(0, Math.floor(budget / days));
  const start = new Date(`${requestData.dates!.startDate}T00:00:00Z`);
  const unrealistic = budget > 0 && budget < days * 250_000;

  return {
    tripSummary: `[MOCK DATA] A ${days}-day estimated itinerary from ${requestData.source} to ${requestData.destination} for ${requestData.travelers!.adults + requestData.travelers!.children} travelers. Verify prices, hours, weather, ticket availability, and safety conditions before booking.`,
    estimatedTotalCostMinor: Math.min(budget || days * 350_000, days * dayBudget),
    currency: requestData.budget!.currency,
    confidenceLevel: 'medium',
    recommendedTransport: requestData.transportPreference[0] ?? 'flight plus local cab',
    reasonForRecommendation: 'Chosen as an estimated balance of travel time, comfort, and budget. Availability and prices require live verification.',
    dayWiseItinerary: Array.from({ length: days }, (_, index) => {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + index);
      const dateString = date.toISOString().slice(0, 10);
      const activityCost = Math.floor(dayBudget / 4);

      return {
        dayNumber: index + 1,
        date: dateString,
        theme: index === 0 ? 'Arrival, orientation, and easy evening' : index === days - 1 ? 'Slow morning and departure buffer' : 'Local exploration with meals and rest',
        estimatedCostMinor: dayBudget,
        safetyNote: 'General safety guidance only. TravelAI does not guarantee safety; use local judgment and emergency services when needed.',
        weatherNote: requestData.availableWeatherContext[index]?.summary ?? 'Weather context unavailable. Verify forecast before finalizing outdoor activities.',
        activities: [
          mockActivity('Breakfast and day planning', 'food', '09:00', '10:00', activityCost, 'Walk or short cab'),
          mockActivity('Primary local experience', 'activity', '10:30', '13:00', activityCost, 'Cab or local transit'),
          mockActivity('Lunch and rest period', 'food', '13:00', '15:00', activityCost, 'Walk nearby'),
          mockActivity('Evening interest-led activity', 'activity', '16:30', '19:00', activityCost, 'Cab after dark if needed'),
        ],
      };
    }),
    alternatives: ['Swap a paid activity for a free beach/market walk if costs exceed budget.', 'Use train or bus only after checking live schedules and seat availability.'],
    warnings: [
      'All prices are estimates, not live prices.',
      'Place hours and ticket availability require live verification.',
      'Safety cannot be guaranteed.',
      ...(unrealistic ? ['Requested budget appears unrealistic for the trip length and traveler count.'] : []),
    ],
    dataLimitations: [
      'No confirmed ticket availability is included.',
      'No live opening-hours verification is included.',
      'No live safety or weather guarantee is included.',
    ],
  };
}

function mockActivity(
  title: string,
  category: 'transport' | 'stay' | 'food' | 'activity' | 'shopping' | 'safety' | 'other',
  startTime: string,
  endTime: string,
  cost: number,
  transport: string,
) {
  return {
    title,
    description: '[MOCK DATA] Estimated activity placeholder. Verify details with live sources.',
    locationName: null,
    category,
    startTime,
    endTime,
    estimatedCostMinor: Math.max(0, cost),
    travelTimeMinutes: 30,
    recommendedTransport: transport,
    recommendationReason: 'Estimated as practical for the time window; verify local conditions.',
    safetyNote: 'General safety note only; TravelAI does not guarantee safety.',
    weatherNote: 'Verify weather before outdoor plans.',
    requiresLiveVerification: true,
    alternatives: ['Choose a nearby lower-cost option.'],
    warnings: ['Requires live verification.'],
  };
}

function normalizeMockRepair(requestData: ItineraryRequest, _invalidResponse: unknown) {
  return generateMockItinerary(requestData);
}

