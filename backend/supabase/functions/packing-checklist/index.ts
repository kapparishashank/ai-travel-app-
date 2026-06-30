// Supabase Edge Function: packing-checklist
// Generates a personalized packing checklist. Uses Gemini if key present, else returns mock data.

import { createClient } from '@supabase/supabase-js';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  const corsResult = handleCors(req);
  if (corsResult) return corsResult;

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { tripId } = await req.json().catch(() => ({}));
    if (!tripId) return errorResponse('invalid_request', 'tripId is required');

    const { data: trip, error } = await supabase.from('trips').select('*').eq('id', tripId).single();
    if (error || !trip) return errorResponse('trip_not_found', 'Trip not found', 404);

    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    const dataLabel = geminiKey ? '[AI ESTIMATE]' : '[MOCK DATA]';

    const start = new Date(trip.start_date);
    const end = new Date(trip.end_date);
    const numDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    let categories;
    if (geminiKey) {
      categories = await generateWithGemini(trip, numDays, geminiKey);
    } else {
      categories = getMockChecklist(trip.destination as string, numDays);
    }

    // Delete existing packing items and insert fresh ones
    await supabase.from('packing_items').delete().eq('trip_id', tripId);

    const items: Record<string, unknown>[] = [];
    let sortOrder = 0;
    for (const cat of categories) {
      for (const item of cat.items) {
        items.push({
          trip_id: tripId,
          category: cat.name,
          item_name: item.itemName,
          quantity: item.quantity ?? 1,
          is_packed: false,
          is_ai_generated: true,
          notes: item.notes ?? null,
          sort_order: sortOrder++,
        });
      }
    }
    await supabase.from('packing_items').insert(items);

    return jsonResponse({ status: 'complete', tripId, data_label: dataLabel, categories });
  } catch (err) {
    console.error('packing-checklist error:', err);
    return errorResponse('internal_error', 'An unexpected error occurred.', 500);
  }
});

async function generateWithGemini(trip: Record<string, unknown>, numDays: number, apiKey: string) {
  const prompt = `Generate a packing checklist for a ${numDays}-day trip to ${trip.destination} from ${trip.origin}.
Trip type: ${trip.traveler_type}, Comfort: ${trip.comfort_level}, Travelers: ${trip.num_travelers}.
Return JSON array of categories. Each category: { name: string, items: [{ itemName: string, quantity: number, notes: string|null }] }
Categories should include: Clothing, Documents, Toiletries, Electronics, Medicines, Snacks/Food, Accessories, Miscellaneous.
Return ONLY the JSON array.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.5 },
      }),
    }
  );
  const result = await response.json();
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
  return JSON.parse(text);
}

function getMockChecklist(destination: string, numDays: number) {
  return [
    {
      name: 'Clothing',
      items: [
        { itemName: 'T-shirts / casual tops', quantity: numDays, notes: `For ${destination} weather` },
        { itemName: 'Comfortable trousers / jeans', quantity: 2, notes: null },
        { itemName: 'Undergarments', quantity: numDays, notes: null },
        { itemName: 'Socks', quantity: numDays, notes: null },
        { itemName: 'Jacket or light sweater', quantity: 1, notes: 'For evenings / AC' },
        { itemName: 'Comfortable walking shoes', quantity: 1, notes: null },
        { itemName: 'Sandals / slippers', quantity: 1, notes: null },
      ],
    },
    {
      name: 'Documents',
      items: [
        { itemName: 'Government-issued ID (Aadhaar / Passport)', quantity: 1, notes: 'Original + photocopy' },
        { itemName: 'Travel tickets (train/bus/flight)', quantity: 1, notes: 'Digital + printout recommended' },
        { itemName: 'Hotel / accommodation booking confirmation', quantity: 1, notes: null },
        { itemName: 'Travel insurance documents', quantity: 1, notes: 'If applicable' },
        { itemName: 'Emergency contact list', quantity: 1, notes: null },
      ],
    },
    {
      name: 'Toiletries',
      items: [
        { itemName: 'Toothbrush & toothpaste', quantity: 1, notes: null },
        { itemName: 'Soap / body wash', quantity: 1, notes: null },
        { itemName: 'Shampoo & conditioner', quantity: 1, notes: 'Travel-size' },
        { itemName: 'Sunscreen SPF 30+', quantity: 1, notes: `Important for ${destination}` },
        { itemName: 'Deodorant', quantity: 1, notes: null },
        { itemName: 'Face wash & moisturiser', quantity: 1, notes: null },
        { itemName: 'Razor & shaving kit', quantity: 1, notes: 'If needed' },
      ],
    },
    {
      name: 'Electronics',
      items: [
        { itemName: 'Smartphone + charger', quantity: 1, notes: null },
        { itemName: 'Power bank (10,000 mAh+)', quantity: 1, notes: 'Essential for long days out' },
        { itemName: 'Universal travel adapter', quantity: 1, notes: 'If needed' },
        { itemName: 'Earphones / headphones', quantity: 1, notes: null },
        { itemName: 'Camera (if not using phone)', quantity: 1, notes: 'Optional' },
      ],
    },
    {
      name: 'Medicines',
      items: [
        { itemName: 'Personal prescription medicines', quantity: 1, notes: 'Enough for entire trip + buffer' },
        { itemName: 'Paracetamol / pain reliever', quantity: 1, notes: null },
        { itemName: 'ORS packets', quantity: 3, notes: 'For dehydration' },
        { itemName: 'Antacids', quantity: 1, notes: 'For travel tummy issues' },
        { itemName: 'Motion sickness tablets', quantity: 1, notes: 'If travelling by road/sea' },
        { itemName: 'First aid kit (bandages, antiseptic)', quantity: 1, notes: null },
        { itemName: 'Insect repellent', quantity: 1, notes: `[MOCK DATA] For ${destination}` },
      ],
    },
    {
      name: 'Miscellaneous',
      items: [
        { itemName: 'Reusable water bottle', quantity: 1, notes: null },
        { itemName: 'Small day backpack / tote bag', quantity: 1, notes: null },
        { itemName: 'Padlock for luggage', quantity: 1, notes: null },
        { itemName: 'Cash (INR) + debit/credit card', quantity: 1, notes: 'Carry some cash for local vendors' },
        { itemName: 'Hand sanitiser', quantity: 1, notes: null },
        { itemName: 'Mask(s)', quantity: 2, notes: null },
      ],
    },
  ];
}
