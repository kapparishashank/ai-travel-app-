import { storage } from '../../utils/storage';
import type { PackingItemView, PackingList, PackingSyncOperation } from './types';
export { applyQueuedPackingOperation } from './sync';

const PACKING_CACHE_PREFIX = 'travelai.packing.cache.v1';
const PACKING_QUEUE_KEY = 'travelai.packing.syncQueue.v1';

export type CachedPackingList = {
  list: PackingList | null;
  items: PackingItemView[];
  cachedAt: string;
};

export async function cachePackingList(tripId: string, payload: Omit<CachedPackingList, 'cachedAt'>) {
  await storage.setItem(cacheKey(tripId), JSON.stringify({ ...payload, cachedAt: new Date().toISOString() }));
}

export async function getCachedPackingList(tripId: string): Promise<CachedPackingList | null> {
  const raw = await storage.getItem(cacheKey(tripId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CachedPackingList;
  } catch {
    return null;
  }
}

export async function enqueuePackingOperation(operation: PackingSyncOperation) {
  const queue = await getPackingSyncQueue();
  await storage.setItem(PACKING_QUEUE_KEY, JSON.stringify([...queue, operation]));
}

export async function getPackingSyncQueue(): Promise<PackingSyncOperation[]> {
  const raw = await storage.getItem(PACKING_QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PackingSyncOperation[];
  } catch {
    return [];
  }
}

export async function setPackingSyncQueue(queue: PackingSyncOperation[]) {
  await storage.setItem(PACKING_QUEUE_KEY, JSON.stringify(queue));
}

function cacheKey(tripId: string) {
  return `${PACKING_CACHE_PREFIX}.${tripId}`;
}
