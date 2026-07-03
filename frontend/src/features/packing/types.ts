export const packingCategories = [
  'documents',
  'clothing',
  'footwear',
  'toiletries',
  'medicines',
  'electronics',
  'safety',
  'activity_equipment',
  'childrens_items',
  'food_and_water',
  'optional',
  'not_recommended',
] as const;

export type PackingCategory = (typeof packingCategories)[number];
export type PackingPriority = 'high' | 'medium' | 'low';

export type PackingList = {
  id: string;
  trip_id: string;
  user_id: string | null;
  title: string;
  status: string;
  created_at?: string;
  updated_at?: string;
};

export type PackingItem = {
  id: string;
  packing_list_id: string;
  trip_id: string;
  assigned_to: string | null;
  category: string;
  item_name: string;
  quantity: number;
  is_packed: boolean;
  packed_at: string | null;
  source: 'manual' | 'ai';
  notes: string | null;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export type PackingItemView = PackingItem & {
  packingCategory: PackingCategory;
  reason: string;
  priority: PackingPriority;
  aiGenerated: boolean;
  assignedUserLabel?: string | null;
  pendingSync?: boolean;
};

export type PackingProgress = {
  packed: number;
  total: number;
  percent: number;
  highPriorityRemaining: number;
};

export type PackingSyncOperation =
  | { id: string; type: 'add'; tripId: string; listId: string; item: PackingItemView; createdAt: string }
  | { id: string; type: 'update'; itemId: string; patch: Partial<Pick<PackingItem, 'quantity' | 'is_packed' | 'packed_at' | 'assigned_to' | 'notes'>>; createdAt: string }
  | { id: string; type: 'delete'; itemId: string; createdAt: string }
  | { id: string; type: 'reset'; tripId: string; createdAt: string };
