import { Platform } from 'react-native';
import { syncPackingQueue } from '../packing/api';
import { syncQueuedExpenseOperations } from '../splitExpenses/api';
import { getExpenseQueueTripIds } from './expenseRegistry';
import type { OfflineSyncResult } from './types';

export type ConnectivityState = 'online' | 'offline' | 'unknown';

export function getConnectivityState(): ConnectivityState {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'onLine' in navigator) {
    return navigator.onLine ? 'online' : 'offline';
  }
  return 'unknown';
}

export async function syncOfflineWork(userId: string): Promise<OfflineSyncResult> {
  const packing = await syncPackingQueue();
  const tripIds = await getExpenseQueueTripIds();
  let expenseSynced = 0;
  let expenseFailed = 0;
  let expenseConflicts = 0;
  let expenseAttempted = 0;

  for (const tripId of tripIds) {
    const result = await syncQueuedExpenseOperations(tripId, userId);
    expenseSynced += result.synced;
    expenseConflicts += result.conflicts;
    expenseAttempted += result.synced + result.conflicts;
    expenseFailed += Math.max(0, result.conflicts);
  }

  return {
    attempted: packing.attempted + expenseAttempted,
    synced: packing.attempted - packing.remaining + expenseSynced,
    failed: packing.remaining + expenseFailed,
    conflicts: expenseConflicts,
    remaining: packing.remaining + expenseFailed,
  };
}
