import type { PackingCategory, PackingItem, PackingItemView, PackingPriority, PackingProgress } from './types';

const categoryMap: Record<string, PackingCategory> = {
  document: 'documents',
  clothing: 'clothing',
  gear: 'activity_equipment',
  toiletry: 'toiletries',
  medicine: 'medicines',
  safety: 'safety',
  food: 'food_and_water',
  other: 'optional',
};

const dbCategoryMap: Record<PackingCategory, string> = {
  documents: 'document',
  clothing: 'clothing',
  footwear: 'gear',
  toiletries: 'toiletry',
  medicines: 'medicine',
  electronics: 'gear',
  safety: 'safety',
  activity_equipment: 'gear',
  childrens_items: 'other',
  food_and_water: 'food',
  optional: 'other',
  not_recommended: 'other',
};

export const packingCategoryLabels: Record<PackingCategory, string> = {
  documents: 'Documents',
  clothing: 'Clothing',
  footwear: 'Footwear',
  toiletries: 'Toiletries',
  medicines: 'Medicines',
  electronics: 'Electronics',
  safety: 'Safety',
  activity_equipment: 'Activity equipment',
  childrens_items: "Children's items",
  food_and_water: 'Food and water',
  optional: 'Optional',
  not_recommended: 'Not recommended',
};

type PackingNotes = {
  packing_category?: PackingCategory;
  reason?: string;
  priority?: PackingPriority;
  ai_generated?: boolean;
  assigned_user_label?: string | null;
  medicine_disclaimer?: string;
};

export function calculatePackingProgress(items: PackingItemView[]): PackingProgress {
  const packable = items.filter((item) => item.packingCategory !== 'not_recommended');
  const total = packable.length;
  const packed = packable.filter((item) => item.is_packed).length;
  return {
    packed,
    total,
    percent: total === 0 ? 0 : Math.round((packed / total) * 100),
    highPriorityRemaining: packable.filter((item) => item.priority === 'high' && !item.is_packed).length,
  };
}

export function toPackingItemView(item: PackingItem): PackingItemView {
  const notes = parsePackingNotes(item.notes);
  const packingCategory = notes.packing_category ?? categoryMap[item.category] ?? 'optional';
  return {
    ...item,
    packingCategory,
    reason: notes.reason ?? item.notes ?? 'User-added packing item.',
    priority: notes.priority ?? 'medium',
    aiGenerated: notes.ai_generated ?? item.source === 'ai',
    assignedUserLabel: notes.assigned_user_label ?? null,
  };
}

export function serializePackingNotes(input: {
  packingCategory: PackingCategory;
  reason: string;
  priority: PackingPriority;
  aiGenerated: boolean;
  assignedUserLabel?: string | null;
}) {
  return JSON.stringify({
    packing_category: input.packingCategory,
    reason: input.reason,
    priority: input.priority,
    ai_generated: input.aiGenerated,
    assigned_user_label: input.assignedUserLabel ?? null,
  });
}

export function mapPackingCategoryToDb(category: PackingCategory) {
  return dbCategoryMap[category] ?? 'other';
}

export function sanitizePackingSuggestion(name: string, category: PackingCategory) {
  const unsafeTerms = ['knife', 'weapon', 'firearm', 'illegal', 'drug', 'explosive'];
  const normalized = `${name} ${category}`.toLowerCase();
  return !unsafeTerms.some((term) => normalized.includes(term));
}

export function mergePackingItems(localItems: PackingItemView[], remoteItems: PackingItemView[]) {
  const byId = new Map(remoteItems.map((item) => [item.id, item]));
  for (const item of localItems) {
    byId.set(item.id, { ...byId.get(item.id), ...item });
  }
  return [...byId.values()].sort((a, b) => a.sort_order - b.sort_order || a.item_name.localeCompare(b.item_name));
}

function parsePackingNotes(notes: string | null): PackingNotes {
  if (!notes) return {};
  try {
    const parsed = JSON.parse(notes);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return { reason: notes };
  }
}
