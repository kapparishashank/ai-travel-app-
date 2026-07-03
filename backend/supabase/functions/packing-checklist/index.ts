// Supabase Edge Function: packing-checklist
// Generates and saves an AI recommended packing checklist. The frontend calls
// this function instead of calling an AI provider directly.

import { createClient } from '@supabase/supabase-js';
import { z } from 'https://esm.sh/zod@3.24.1';
import { errorResponse, handleCors, jsonResponse } from '../_shared/cors.ts';

const AI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-1.5-flash';
const PROVIDER_TIMEOUT_MS = 20_000;

const packingCategories = [
  'documents',
  'clothing',
  'footwear',
  'toiletries',
  'medicines',
  'electronics',
  'safety',
  'activity_equipment',
  'childrens_items',
  'food_and_water',
  'optional',
  'not_recommended',
] as const;

const requestSchema = z.object({
  tripId: z.string().uuid(),
  baggageLimit: z.string().trim().max(160).optional().default('Standard carry-on plus personal item'),
  weatherContext: z.string().trim().max(800).optional().default('Weather context unavailable. Pack flexible layers.'),
  accommodationType: z.string().trim().max(120).optional().default('standard hotel or homestay'),
  accessibilityOrMedicalNotes: z.string().trim().max(800).optional().default(''),
});

const itemSchema = z.object({
  name: z.string().min(2).max(120),
  category: z.enum(packingCategories),
  quantity: z.number().int().min(1).max(50),
  reason: z.string().min(8).max(300),
  priority: z.enum(['high', 'medium', 'low']),
  assignedUser: z.string().max(120).optional().nullable(),
});

const responseSchema = z.object({
  title: z.string().min(4).max(160),
  items: z.array(itemSchema).min(8).max(80),
  safetyNote: z.string().max(500),
  medicineDisclaimer: z.string().max(500),
});

type PackingResponse = z.infer<typeof responseSchema>;

type TripRow = {
  id: string;
  created_by: string;
  title: string;
  origin_name: string;
  destination_name: string;
  start_date: string;
  end_date: string;
  currency_code: string;
  metadata: Record<string, unknown>;
};

Deno.serve(async (req: Request) => {
  const corsResult = handleCors(req);
  if (corsResult) return corsResult;

  if (req.method !== 'POST') return errorResponse('method_not_allowed', 'Use POST to generate a packing list.', 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return errorResponse('unauthorized', 'Missing authorization header.', 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return errorResponse('misconfigured', 'Packing generator is not configured.', 500);

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user) return errorResponse('unauthorized', 'Invalid or expired session.', 401);

  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return errorResponse('invalid_request', parsed.error.issues[0]?.message ?? 'Invalid packing request.', 400);

  const trip = await fetchAuthorizedTrip(adminClient, parsed.data.tripId, user.id);
  if (!trip) return errorResponse('trip_not_found', 'Trip not found or you do not have access to it.', 404);

  const generationId = crypto.randomUUID();
  await adminClient.from('ai_generations').insert({
    id: generationId,
    user_id: user.id,
    trip_id: trip.id,
    feature: 'packing',
    status: 'running',
    model: Deno.env.get('GEMINI_API_KEY') ? AI_MODEL : 'deterministic-fallback',
    prompt_version: 'packing-mvp-v1',
    input: {
      tripId: trip.id,
      destination: trip.destination_name,
      dates: { startDate: trip.start_date, endDate: trip.end_date },
      baggageLimit: parsed.data.baggageLimit,
      weatherContextProvided: Boolean(parsed.data.weatherContext),
      accommodationType: parsed.data.accommodationType,
      accessibilityOrMedicalNotesProvided: Boolean(parsed.data.accessibilityOrMedicalNotes),
    },
    started_at: new Date().toISOString(),
  });

  try {
    const generated = await generatePackingList(trip, parsed.data);
    const validation = responseSchema.safeParse(generated);
    const checklist = validation.success ? validation.data : buildFallbackChecklist(trip, parsed.data);

    const { data: list, error: listError } = await adminClient
      .from('packing_lists')
      .insert({
        trip_id: trip.id,
        user_id: user.id,
        title: checklist.title,
      })
      .select('id')
      .single();
    if (listError || !list) throw listError ?? new Error('Could not save packing list.');

    const rows = checklist.items
      .filter((item) => isAllowedPackingSuggestion(item.name, item.category))
      .map((item, index) => ({
        packing_list_id: list.id,
        trip_id: trip.id,
        category: mapPackingCategory(item.category),
        item_name: item.name,
        quantity: item.quantity,
        is_packed: false,
        source: 'ai',
        notes: JSON.stringify({
          packing_category: item.category,
          reason: item.reason,
          priority: item.priority,
          assigned_user_label: item.assignedUser ?? null,
          ai_generated: true,
          medicine_disclaimer: item.category === 'medicines' ? checklist.medicineDisclaimer : undefined,
        }),
        sort_order: index,
      }));

    const { error: itemsError } = await adminClient.from('packing_items').insert(rows);
    if (itemsError) throw itemsError;

    await adminClient
      .from('ai_generations')
      .update({
        status: 'succeeded',
        output: {
          itemCount: rows.length,
          usedFallback: !validation.success || !Deno.env.get('GEMINI_API_KEY'),
          categories: [...new Set(checklist.items.map((item) => item.category))],
        },
        completed_at: new Date().toISOString(),
      })
      .eq('id', generationId);

    return jsonResponse({
      status: 'complete',
      tripId: trip.id,
      listId: list.id,
      generationId,
      data_label: Deno.env.get('GEMINI_API_KEY') && validation.success ? '[AI ESTIMATE]' : '[FALLBACK]',
      safetyNote: checklist.safetyNote,
      medicineDisclaimer: checklist.medicineDisclaimer,
      itemCount: rows.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Packing checklist failed.';
    await adminClient
      .from('ai_generations')
      .update({
        status: 'failed',
        error_message: message.slice(0, 1000),
        output: { safe_error: true },
        completed_at: new Date().toISOString(),
      })
      .eq('id', generationId);
    return errorResponse('packing_failed', 'TravelAI could not generate the packing list. A fallback list can be used.', 500);
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

async function generatePackingList(trip: TripRow, request: z.infer<typeof requestSchema>): Promise<unknown> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) return buildFallbackChecklist(trip, request);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    const prompt = buildPrompt(trip, request);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.25, maxOutputTokens: 4096 },
        }),
      },
    );
    if (!response.ok) throw new Error(`AI provider unavailable (${response.status}).`);
    const result = await response.json();
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    return JSON.parse(text);
  } finally {
    clearTimeout(timeout);
  }
}

function buildPrompt(trip: TripRow, request: z.infer<typeof requestSchema>) {
  const duration = countTripDays(trip.start_date, trip.end_date);
  return `Return strict JSON for a safe travel packing checklist.

Schema:
{
  "title": string,
  "items": [{"name": string, "category": ${JSON.stringify(packingCategories)}, "quantity": integer, "reason": string, "priority": "high"|"medium"|"low", "assignedUser": string|null}],
  "safetyNote": string,
  "medicineDisclaimer": string
}

Trip:
${JSON.stringify({
  destination: trip.destination_name,
  dates: { startDate: trip.start_date, endDate: trip.end_date },
  duration,
  activities: trip.metadata?.interests ?? [],
  transportMode: trip.metadata?.preferred_transport ?? [],
  travelerType: trip.metadata?.travelers ?? trip.metadata?.trip_type,
  accommodationType: request.accommodationType,
  baggageLimit: request.baggageLimit,
  weatherContext: request.weatherContext,
  accessibilityOrMedicalNotes: request.accessibilityOrMedicalNotes,
})}

Rules:
- Avoid prohibited, illegal, weapon-like, or clearly unsafe items.
- Medicine items must be general reminders only, not medical advice.
- Include documents, clothing, footwear, toiletries, medicines, electronics, safety, activity equipment, food and water, optional, and not recommended when relevant.
- Put beach/nightlife/food context into reasons when relevant.
- Return JSON only.`;
}

function buildFallbackChecklist(trip: TripRow, request: z.infer<typeof requestSchema>): PackingResponse {
  const duration = countTripDays(trip.start_date, trip.end_date);
  const destination = trip.destination_name;
  const interests = ((trip.metadata?.interests as string[] | undefined) ?? []).map((item) => item.toLowerCase());
  const beachTrip = interests.includes('beach') || destination.toLowerCase().includes('goa');
  const children = Number((trip.metadata?.travelers as Record<string, unknown> | undefined)?.children ?? 0);

  const items: PackingResponse['items'] = [
    item('Government ID and booking confirmations', 'documents', 1, 'Required for travel, accommodation check-in, and identity verification.', 'high'),
    item('Digital and offline copies of tickets', 'documents', 1, 'Useful if mobile data is unreliable during transit.', 'high'),
    item('Light breathable outfits', 'clothing', Math.max(2, duration), `Suitable for ${destination} and the planned trip duration.`, 'high'),
    item('Comfortable evening layer', 'clothing', 1, 'Useful for air-conditioned transport, flights, or cooler evenings.', 'medium'),
    item('Comfortable walking shoes', 'footwear', 1, 'Supports walking-heavy sightseeing days.', 'high'),
    item(beachTrip ? 'Sandals or flip-flops' : 'Backup casual footwear', 'footwear', 1, beachTrip ? 'Useful for beaches and casual coastal walks.' : 'Helpful if primary footwear gets wet or uncomfortable.', 'medium'),
    item('Toothbrush, toothpaste, and basic toiletries', 'toiletries', 1, 'Covers daily hygiene without assuming hotel supplies.', 'high'),
    item('Sunscreen and lip balm', 'toiletries', 1, 'General sun-protection reminder for outdoor plans; verify what suits your skin.', 'medium'),
    item('Personal prescription medicines', 'medicines', 1, 'General reminder to carry your own prescribed medicines with enough trip buffer.', 'high'),
    item('Basic first-aid pouch', 'medicines', 1, 'General reminder for small cuts or discomfort; not medical advice.', 'medium'),
    item('Phone charger and power bank', 'electronics', 1, 'Keeps navigation, bookings, and emergency contact access available.', 'high'),
    item('Reusable water bottle', 'food_and_water', 1, 'Helps hydration during transit and activity days.', 'medium'),
    item('Small day bag', 'safety', 1, 'Keeps documents, water, medicines, and electronics together during day trips.', 'high'),
    item('Luggage lock', 'safety', 1, 'Basic luggage security for shared transport or accommodation storage.', 'medium'),
    item('Compact snacks', 'food_and_water', 1, 'Useful during delays or long transit windows.', 'low'),
    item('Laundry bag', 'optional', 1, 'Keeps used clothing separate on multi-day trips.', 'low'),
    item('Oversized hard-shell luggage', 'not_recommended', 1, `May conflict with baggage limit: ${request.baggageLimit}.`, 'medium'),
  ];

  if (beachTrip) {
    items.push(
      item('Swimwear', 'activity_equipment', 1, 'Relevant for beach or pool plans; pack only where appropriate for your itinerary.', 'medium'),
      item('Quick-dry towel', 'activity_equipment', 1, 'Useful for beach days without relying on accommodation towels.', 'medium'),
    );
  }

  if (children > 0) {
    items.push(
      item('Child comfort item', 'childrens_items', 1, 'Helps children rest during transport and unfamiliar stays.', 'medium'),
      item('Child snacks and refillable bottle', 'childrens_items', 1, 'Useful for schedule gaps and transit delays.', 'medium'),
    );
  }

  if (request.accessibilityOrMedicalNotes) {
    items.push(item('Accessibility or medical support notes', 'documents', 1, 'General reminder based on user-supplied accessibility or medical notes.', 'high'));
  }

  return {
    title: `${destination} packing checklist`,
    items,
    safetyNote: 'This checklist avoids prohibited, illegal, weapon-like, or clearly unsafe packing suggestions.',
    medicineDisclaimer: 'Medicine suggestions are general packing reminders only and are not medical advice. Follow clinician guidance for medicines.',
  };
}

function item(
  name: string,
  category: PackingResponse['items'][number]['category'],
  quantity: number,
  reason: string,
  priority: PackingResponse['items'][number]['priority'],
) {
  return { name, category, quantity, reason, priority, assignedUser: null };
}

function isAllowedPackingSuggestion(name: string, category: string) {
  const unsafe = ['knife', 'weapon', 'firearm', 'illegal', 'drug', 'explosive'];
  const normalized = `${name} ${category}`.toLowerCase();
  return !unsafe.some((term) => normalized.includes(term));
}

function mapPackingCategory(category: string) {
  const mapped: Record<string, string> = {
    documents: 'document',
    clothing: 'clothing',
    footwear: 'gear',
    toiletries: 'toiletry',
    medicines: 'medicine',
    electronics: 'gear',
    safety: 'safety',
    activity_equipment: 'gear',
    childrens_items: 'other',
    food_and_water: 'food',
    optional: 'other',
    not_recommended: 'other',
  };
  return mapped[category] ?? 'other';
}

function countTripDays(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}
