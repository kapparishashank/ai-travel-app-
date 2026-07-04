import { storage } from '../../utils/storage';
import type { OfflineMutation, OfflineSyncResult } from './types';

export function canApplyMutation(baseUpdatedAt: string | null | undefined, remoteUpdatedAt: string | null | undefined) {
  if (!baseUpdatedAt || !remoteUpdatedAt) return true;
  return new Date(remoteUpdatedAt).getTime() <= new Date(baseUpdatedAt).getTime();
}

export async function getOfflineQueue<TPayload>(key: string): Promise<Array<OfflineMutation<TPayload>>> {
  const raw = await storage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}

export async function setOfflineQueue<TPayload>(key: string, queue: Array<OfflineMutation<TPayload>>) {
  await storage.setItem(key, JSON.stringify(queue));
}

export async function enqueueOfflineMutation<TPayload>(
  key: string,
  mutation: Omit<OfflineMutation<TPayload>, 'attempts' | 'status' | 'createdAt'> & Partial<Pick<OfflineMutation<TPayload>, 'createdAt'>>,
) {
  const queue = await getOfflineQueue<TPayload>(key);
  const next: OfflineMutation<TPayload> = {
    ...mutation,
    createdAt: mutation.createdAt ?? new Date().toISOString(),
    attempts: 0,
    status: 'pending',
  };
  await setOfflineQueue(key, [...queue.filter((item) => item.id !== next.id), next]);
  return next;
}

export async function processOfflineQueue<TPayload>({
  key,
  apply,
  maxAttempts = 3,
}: {
  key: string;
  apply: (mutation: OfflineMutation<TPayload>) => Promise<{ remoteUpdatedAt?: string | null } | void>;
  maxAttempts?: number;
}): Promise<OfflineSyncResult> {
  const queue = await getOfflineQueue<TPayload>(key);
  const remaining: Array<OfflineMutation<TPayload>> = [];
  let synced = 0;
  let failed = 0;
  let conflicts = 0;

  for (const mutation of queue) {
    try {
      const result = await apply(mutation);
      if (!canApplyMutation(mutation.baseUpdatedAt, result?.remoteUpdatedAt)) {
        conflicts += 1;
        remaining.push({ ...mutation, status: 'conflict', attempts: mutation.attempts + 1, lastError: 'Remote record changed after offline edit.' });
        continue;
      }
      synced += 1;
    } catch (error) {
      const attempts = mutation.attempts + 1;
      const keep = attempts < maxAttempts;
      failed += 1;
      if (keep) {
        remaining.push({
          ...mutation,
          attempts,
          status: 'failed',
          lastError: error instanceof Error ? error.message : 'Offline mutation failed.',
        });
      }
    }
  }

  await setOfflineQueue(key, remaining);
  return {
    attempted: queue.length,
    synced,
    failed,
    conflicts,
    remaining: remaining.length,
  };
}
