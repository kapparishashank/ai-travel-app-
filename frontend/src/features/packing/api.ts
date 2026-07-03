import { supabase } from '../../lib/supabase';
import type { PackingItem, PackingItemView, PackingList, PackingSyncOperation } from './types';
import { getPackingSyncQueue, setPackingSyncQueue } from './cache';
import { mapPackingCategoryToDb, serializePackingNotes, toPackingItemView } from './utils';

export async function fetchPackingForTrip(tripId: string) {
  const [lists, items] = await Promise.all([
    supabase.from('packing_lists').select('*').eq('trip_id', tripId).eq('status', 'active').order('created_at', { ascending: false }),
    supabase.from('packing_items').select('*').eq('trip_id', tripId).order('sort_order', { ascending: true }),
  ]);

  if (lists.error) throw lists.error;
  if (items.error) throw items.error;

  return {
    list: ((lists.data ?? [])[0] ?? null) as PackingList | null,
    items: ((items.data ?? []) as PackingItem[]).map(toPackingItemView),
  };
}

export async function generatePackingChecklist(tripId: string, input?: {
  baggageLimit?: string;
  weatherContext?: string;
  accommodationType?: string;
  accessibilityOrMedicalNotes?: string;
}) {
  const { data, error } = await supabase.functions.invoke('packing-checklist', {
    method: 'POST',
    body: { tripId, ...input },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).message ?? 'Packing generation failed.');
  return data;
}

export async function createPackingList(tripId: string, userId: string | null, title: string) {
  const { data, error } = await supabase
    .from('packing_lists')
    .insert({ trip_id: tripId, user_id: userId, title })
    .select('*')
    .single();
  if (error) throw error;
  return data as PackingList;
}

export async function addPackingItem(listId: string, tripId: string, item: PackingItemView) {
  const { data, error } = await supabase
    .from('packing_items')
    .insert({
      packing_list_id: listId,
      trip_id: tripId,
      assigned_to: item.assigned_to,
      category: mapPackingCategoryToDb(item.packingCategory),
      item_name: item.item_name,
      quantity: item.quantity,
      is_packed: item.is_packed,
      packed_at: item.packed_at,
      source: item.aiGenerated ? 'ai' : 'manual',
      notes: serializePackingNotes(item),
      sort_order: item.sort_order,
    })
    .select('*')
    .single();
  if (error) throw error;
  return toPackingItemView(data as PackingItem);
}

export async function updatePackingItem(itemId: string, patch: Partial<Pick<PackingItem, 'quantity' | 'is_packed' | 'packed_at' | 'assigned_to' | 'notes'>>) {
  const { error } = await supabase.from('packing_items').update(patch).eq('id', itemId);
  if (error) throw error;
}

export async function deletePackingSuggestion(item: PackingItemView) {
  if (!item.aiGenerated) throw new Error('Only suggestions can be deleted here.');
  const { error } = await supabase.from('packing_items').delete().eq('id', item.id);
  if (error) throw error;
}

export async function resetPackedStatus(tripId: string) {
  const { error } = await supabase.from('packing_items').update({ is_packed: false, packed_at: null }).eq('trip_id', tripId);
  if (error) throw error;
}

export async function syncPackingQueue() {
  const queue = await getPackingSyncQueue();
  const remaining: PackingSyncOperation[] = [];

  for (const operation of queue) {
    try {
      if (operation.type === 'add') await addPackingItem(operation.listId, operation.tripId, operation.item);
      if (operation.type === 'update') await updatePackingItem(operation.itemId, operation.patch);
      if (operation.type === 'delete') {
        const { error } = await supabase.from('packing_items').delete().eq('id', operation.itemId);
        if (error) throw error;
      }
      if (operation.type === 'reset') await resetPackedStatus(operation.tripId);
    } catch {
      remaining.push(operation);
    }
  }

  await setPackingSyncQueue(remaining);
  return { attempted: queue.length, remaining: remaining.length };
}
