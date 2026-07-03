import type { PackingItemView } from './types';
import type { PackingCategory, PackingPriority } from './types';
import { mapPackingCategoryToDb, serializePackingNotes } from './utils';

type FallbackTrip = {
  id: string;
  destination_name: string;
  start_date: string;
  end_date: string;
  metadata?: Record<string, any>;
};

export function buildFallbackPackingItems(trip: FallbackTrip, listId: string): PackingItemView[] {
  const days = countTripDays(trip.start_date, trip.end_date);
  const interests = ((trip.metadata?.interests as string[] | undefined) ?? []).map((item) => item.toLowerCase());
  const beach = interests.includes('beach') || trip.destination_name.toLowerCase().includes('goa');
  const children = Number(trip.metadata?.travelers?.children ?? 0);
  const now = new Date().toISOString();

  const specs: Array<[string, PackingCategory, number, string, PackingPriority]> = [
    ['Government ID and booking confirmations', 'documents', 1, 'Needed for travel and accommodation check-in.', 'high'],
    ['Offline copies of tickets', 'documents', 1, 'Useful when mobile data is unreliable.', 'high'],
    ['Light breathable outfits', 'clothing', Math.max(2, days), `Covers ${days} days in ${trip.destination_name}.`, 'high'],
    ['Comfortable walking shoes', 'footwear', 1, 'Useful for sightseeing and transit.', 'high'],
    [beach ? 'Sandals or flip-flops' : 'Backup casual footwear', 'footwear', 1, beach ? 'Useful for beach and pool plans.' : 'Backup footwear for wet or uncomfortable days.', 'medium'],
    ['Basic toiletries kit', 'toiletries', 1, 'Covers daily hygiene without relying on accommodation supplies.', 'high'],
    ['Sunscreen', 'toiletries', 1, 'General outdoor reminder; choose what suits your skin.', 'medium'],
    ['Personal prescription medicines', 'medicines', 1, 'General reminder to carry your own prescribed medicines with buffer. Not medical advice.', 'high'],
    ['Basic first-aid pouch', 'medicines', 1, 'General reminder for minor cuts or discomfort. Not medical advice.', 'medium'],
    ['Phone charger and power bank', 'electronics', 1, 'Keeps maps, bookings, and contacts available.', 'high'],
    ['Small day bag', 'safety', 1, 'Keeps important items together during day trips.', 'medium'],
    ['Reusable water bottle', 'food_and_water', 1, 'Helps hydration during transit and activities.', 'medium'],
    ['Compact snacks', 'food_and_water', 1, 'Useful during delays or long transit windows.', 'low'],
    ['Laundry bag', 'optional', 1, 'Keeps used clothing separate.', 'low'],
    ['Oversized hard-shell luggage', 'not_recommended', 1, 'May be inconvenient with baggage limits and local transport.', 'medium'],
  ];

  if (beach) {
    specs.push(['Swimwear', 'activity_equipment', 1, 'Relevant for beach or pool plans where appropriate.', 'medium']);
    specs.push(['Quick-dry towel', 'activity_equipment', 1, 'Useful for beach days without relying on accommodation towels.', 'medium']);
  }

  if (children > 0) {
    specs.push(['Child comfort item', 'childrens_items', 1, 'Helps children rest during transport and unfamiliar stays.', 'medium']);
  }

  return specs.map(([name, packingCategory, quantity, reason, priority], index) => ({
    id: `offline-${trip.id}-${index}`,
    packing_list_id: listId,
    trip_id: trip.id,
    assigned_to: null,
    category: mapPackingCategoryToDb(packingCategory),
    item_name: name,
    quantity,
    is_packed: false,
    packed_at: null,
    source: 'ai',
    notes: serializePackingNotes({
      packingCategory,
      reason,
      priority,
      aiGenerated: true,
    }),
    sort_order: index,
    created_at: now,
    updated_at: now,
    packingCategory,
    reason,
    priority,
    aiGenerated: true,
  }));
}

function countTripDays(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}
