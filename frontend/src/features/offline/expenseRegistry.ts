import { storage } from '../../utils/storage';

const EXPENSE_TRIP_REGISTRY_KEY = 'travelai:split-expenses-trip-registry';

export async function registerExpenseQueueTrip(tripId: string) {
  const ids = await getExpenseQueueTripIds();
  if (!ids.includes(tripId)) await storage.setItem(EXPENSE_TRIP_REGISTRY_KEY, JSON.stringify([...ids, tripId]));
}

export async function getExpenseQueueTripIds(): Promise<string[]> {
  const raw = await storage.getItem(EXPENSE_TRIP_REGISTRY_KEY);
  return raw ? JSON.parse(raw) : [];
}
