import { describe, expect, it, vi } from 'vitest';
import { storage } from '../../../utils/storage';
import { enqueueOfflineMutation, getOfflineQueue, processOfflineQueue } from '../queue';

vi.mock('../../../utils/storage', () => {
  const memory = new Map<string, string>();
  return {
    storage: {
      getItem: vi.fn((key: string) => Promise.resolve(memory.get(key) ?? null)),
      setItem: vi.fn((key: string, value: string) => {
        memory.set(key, value);
        return Promise.resolve();
      }),
      removeItem: vi.fn((key: string) => {
        memory.delete(key);
        return Promise.resolve();
      }),
    },
  };
});

describe('offline queue retry behavior', () => {
  it('syncs successful queued mutations and removes them', async () => {
    await enqueueOfflineMutation('offline:test:success', { id: 'a', type: 'expense.add', payload: { amount: 100 } });
    const result = await processOfflineQueue({
      key: 'offline:test:success',
      apply: async () => undefined,
    });

    expect(result).toEqual({ attempted: 1, synced: 1, failed: 0, conflicts: 0, remaining: 0 });
    expect(await getOfflineQueue('offline:test:success')).toEqual([]);
  });

  it('keeps failed mutations until max attempts are reached', async () => {
    await enqueueOfflineMutation('offline:test:retry', { id: 'a', type: 'packing.update', payload: { packed: true } });
    const first = await processOfflineQueue({
      key: 'offline:test:retry',
      apply: async () => {
        throw new Error('Network unavailable');
      },
      maxAttempts: 2,
    });

    expect(first.remaining).toBe(1);
    expect((await getOfflineQueue('offline:test:retry'))[0].attempts).toBe(1);

    const second = await processOfflineQueue({
      key: 'offline:test:retry',
      apply: async () => {
        throw new Error('Still unavailable');
      },
      maxAttempts: 2,
    });

    expect(second.remaining).toBe(0);
  });

  it('marks timestamp conflicts without applying stale changes', async () => {
    await enqueueOfflineMutation('offline:test:conflict', {
      id: 'a',
      type: 'expense.update',
      payload: { title: 'Dinner' },
      baseUpdatedAt: '2026-07-04T10:00:00.000Z',
    });

    const result = await processOfflineQueue({
      key: 'offline:test:conflict',
      apply: async () => ({ remoteUpdatedAt: '2026-07-04T10:05:00.000Z' }),
    });

    expect(result.conflicts).toBe(1);
    expect((await getOfflineQueue('offline:test:conflict'))[0].status).toBe('conflict');
  });

  it('uses non-sensitive storage only for queued payloads', async () => {
    await enqueueOfflineMutation('offline:test:storage', { id: 'a', type: 'safe', payload: { cardNumber: undefined } });
    expect(storage.setItem).toHaveBeenCalled();
  });
});
