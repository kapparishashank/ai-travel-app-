import { storage } from '../../utils/storage';
import type { QueuedExpenseOperation, SplitExpenseRecord } from './types';

const cacheKey = (tripId: string) => `travelai:split-expenses:${tripId}`;
const queueKey = (tripId: string) => `travelai:split-expenses-queue:${tripId}`;

export async function cacheSplitExpenses(tripId: string, expenses: SplitExpenseRecord[]) {
  await storage.setItem(cacheKey(tripId), JSON.stringify(expenses));
}

export async function getCachedSplitExpenses(tripId: string): Promise<SplitExpenseRecord[]> {
  const raw = await storage.getItem(cacheKey(tripId));
  return raw ? JSON.parse(raw) : [];
}

export async function enqueueExpenseOperation(tripId: string, operation: QueuedExpenseOperation) {
  const queue = await getQueuedExpenseOperations(tripId);
  queue.push(operation);
  await storage.setItem(queueKey(tripId), JSON.stringify(queue));
}

export async function getQueuedExpenseOperations(tripId: string): Promise<QueuedExpenseOperation[]> {
  const raw = await storage.getItem(queueKey(tripId));
  return raw ? JSON.parse(raw) : [];
}

export async function replaceQueuedExpenseOperations(tripId: string, operations: QueuedExpenseOperation[]) {
  await storage.setItem(queueKey(tripId), JSON.stringify(operations));
}
