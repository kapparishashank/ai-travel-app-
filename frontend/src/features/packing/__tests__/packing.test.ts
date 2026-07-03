import { describe, expect, it } from 'vitest';
import { applyQueuedPackingOperation } from '../sync';
import type { PackingItemView } from '../types';
import { calculatePackingProgress, mergePackingItems } from '../utils';

function item(overrides: Partial<PackingItemView>): PackingItemView {
  return {
    id: overrides.id ?? 'item-1',
    packing_list_id: 'list-1',
    trip_id: 'trip-1',
    assigned_to: null,
    category: 'other',
    item_name: overrides.item_name ?? 'Passport',
    quantity: overrides.quantity ?? 1,
    is_packed: overrides.is_packed ?? false,
    packed_at: overrides.packed_at ?? null,
    source: overrides.source ?? 'ai',
    notes: null,
    sort_order: overrides.sort_order ?? 0,
    packingCategory: overrides.packingCategory ?? 'documents',
    reason: overrides.reason ?? 'Needed for travel.',
    priority: overrides.priority ?? 'high',
    aiGenerated: overrides.aiGenerated ?? true,
    pendingSync: overrides.pendingSync,
  };
}

describe('packing progress', () => {
  it('calculates progress while excluding not recommended items', () => {
    const progress = calculatePackingProgress([
      item({ id: 'passport', is_packed: true, priority: 'high' }),
      item({ id: 'charger', packingCategory: 'electronics', is_packed: false, priority: 'high' }),
      item({ id: 'oversized', packingCategory: 'not_recommended', is_packed: false, priority: 'medium' }),
    ]);

    expect(progress.total).toBe(2);
    expect(progress.packed).toBe(1);
    expect(progress.percent).toBe(50);
    expect(progress.highPriorityRemaining).toBe(1);
  });

  it('returns zero progress for an empty list', () => {
    expect(calculatePackingProgress([])).toEqual({
      packed: 0,
      total: 0,
      percent: 0,
      highPriorityRemaining: 0,
    });
  });
});

describe('packing synchronization logic', () => {
  it('applies queued packed-status updates locally', () => {
    const updated = applyQueuedPackingOperation(
      [item({ id: 'charger', is_packed: false })],
      {
        id: 'op-1',
        type: 'update',
        itemId: 'charger',
        patch: { is_packed: true, packed_at: '2026-07-03T00:00:00.000Z' },
        createdAt: '2026-07-03T00:00:00.000Z',
      },
    );

    expect(updated[0].is_packed).toBe(true);
    expect(updated[0].pendingSync).toBe(true);
  });

  it('applies queued deletes locally', () => {
    const updated = applyQueuedPackingOperation(
      [item({ id: 'passport' }), item({ id: 'snacks' })],
      { id: 'op-2', type: 'delete', itemId: 'snacks', createdAt: '2026-07-03T00:00:00.000Z' },
    );

    expect(updated.map((entry) => entry.id)).toEqual(['passport']);
  });

  it('merges local and remote items with local changes winning', () => {
    const merged = mergePackingItems(
      [item({ id: 'passport', quantity: 2 })],
      [item({ id: 'passport', quantity: 1 }), item({ id: 'charger', sort_order: 2 })],
    );

    expect(merged.find((entry) => entry.id === 'passport')?.quantity).toBe(2);
    expect(merged).toHaveLength(2);
  });
});
