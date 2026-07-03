import type { PackingItemView, PackingSyncOperation } from './types';
import { mergePackingItems } from './utils';

export function applyQueuedPackingOperation(items: PackingItemView[], operation: PackingSyncOperation) {
  if (operation.type === 'add') return mergePackingItems([{ ...operation.item, pendingSync: true }, ...items], []);
  if (operation.type === 'delete') return items.filter((item) => item.id !== operation.itemId);
  if (operation.type === 'reset') return items.map((item) => ({ ...item, is_packed: false, packed_at: null, pendingSync: true }));
  return items.map((item) => (item.id === operation.itemId ? { ...item, ...operation.patch, pendingSync: true } : item));
}
