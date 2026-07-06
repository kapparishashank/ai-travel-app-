import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Checkbox, Dialog, Portal, ProgressBar, Snackbar, useTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../src/components/common/Button';
import { Card } from '../../src/components/common/Card';
import { ConfirmationDialog } from '../../src/components/common/ConfirmationDialog';
import { EmptyState } from '../../src/components/common/EmptyState';
import { ErrorState } from '../../src/components/common/ErrorState';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { TextInput } from '../../src/components/common/TextInput';
import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
} from '../../src/components/animate-ui/primitives/radix/accordion';
import { trackAnalyticsEvent } from '../../src/features/analytics/analytics';
import { addPackingItem, createPackingList, fetchPackingForTrip, generatePackingChecklist, resetPackedStatus, syncPackingQueue, updatePackingItem } from '../../src/features/packing/api';
import { cachePackingList, enqueuePackingOperation, getCachedPackingList } from '../../src/features/packing/cache';
import { buildFallbackPackingItems } from '../../src/features/packing/fallback';
import { packingCategories, type PackingCategory, type PackingItemView, type PackingPriority } from '../../src/features/packing/types';
import { calculatePackingProgress, packingCategoryLabels, serializePackingNotes } from '../../src/features/packing/utils';
import { fetchTrips } from '../../src/features/trips/api';
import type { TripSummary } from '../../src/features/trips/types';
import { useAuthStore } from '../../src/store/authStore';

function priorityColor(priority: PackingPriority, theme: MD3Theme) {
  if (priority === 'high') return theme.colors.error;
  if (priority === 'medium') return theme.colors.secondary;
  return theme.colors.onSurfaceVariant;
}

const packingTipItems = [
  {
    title: 'Medicine reminders',
    content: 'Medicine suggestions are general packing reminders only, not medical advice.',
  },
  {
    title: 'Offline fallback lists',
    content: 'If AI generation fails, TravelAI creates a deterministic fallback checklist that can be cached for offline access.',
  },
  {
    title: 'Unsafe item guidance',
    content: 'TravelAI avoids recommending prohibited, illegal, or clearly unsafe items. Always verify airline, rail, hotel, and local rules before packing.',
  },
];

export default function PackingScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const authUser = useAuthStore((state) => state.authUser);
  const [categoryFilter, setCategoryFilter] = useState<PackingCategory | 'all'>('all');
  const [localItems, setLocalItems] = useState<PackingItemView[] | null>(null);
  const [listIdOverride, setListIdOverride] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [message, setMessage] = useState('');
  const [generationInputs, setGenerationInputs] = useState({
    baggageLimit: 'Carry-on plus one personal item',
    weatherContext: 'Warm coastal weather with sun and possible humidity',
    accommodationType: 'Shared apartment or hotel',
    accessibilityOrMedicalNotes: '',
  });

  const tripsQuery = useQuery({
    queryKey: ['trips', authUser?.id],
    queryFn: () => fetchTrips(authUser?.id),
    enabled: Boolean(authUser?.id),
  });

  const selectedTrip = useMemo(() => {
    const trips = tripsQuery.data ?? [];
    return trips[0] ?? null;
  }, [tripsQuery.data]);

  const packingQuery = useQuery({
    queryKey: ['packing', selectedTrip?.id],
    queryFn: async () => {
      if (!selectedTrip) throw new Error('Select a trip first.');
      try {
        await syncPackingQueue();
        const remote = await fetchPackingForTrip(selectedTrip.id);
        await cachePackingList(selectedTrip.id, remote);
        return remote;
      } catch (error) {
        const cached = await getCachedPackingList(selectedTrip.id);
        if (cached) return cached;
        throw error;
      }
    },
    enabled: Boolean(selectedTrip?.id),
  });

  const members = selectedTrip?.trip_members ?? [];
  const items = useMemo(() => localItems ?? packingQuery.data?.items ?? [], [localItems, packingQuery.data?.items]);
  const listId = listIdOverride ?? packingQuery.data?.list?.id ?? null;
  const progress = useMemo(() => calculatePackingProgress(items), [items]);
  const filteredItems = useMemo(
    () => items.filter((item) => categoryFilter === 'all' || item.packingCategory === categoryFilter),
    [categoryFilter, items],
  );

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTrip) throw new Error('Select a trip first.');
      try {
        await generatePackingChecklist(selectedTrip.id, generationInputs);
        const remote = await fetchPackingForTrip(selectedTrip.id);
        await cachePackingList(selectedTrip.id, remote);
        return remote;
      } catch {
        const fallbackListId = listId ?? `offline-list-${selectedTrip.id}`;
        const fallbackItems = buildFallbackPackingItems(selectedTrip, fallbackListId);
        const fallbackList = {
          id: fallbackListId,
          trip_id: selectedTrip.id,
          user_id: authUser?.id ?? null,
          title: `${selectedTrip.destination_name} fallback packing list`,
          status: 'active',
        };
        await cachePackingList(selectedTrip.id, { list: fallbackList, items: fallbackItems });
        return { list: fallbackList, items: fallbackItems, fallback: true };
      }
    },
    onSuccess: async (result: { list?: { id?: string } | null; items: PackingItemView[]; fallback?: boolean }) => {
      setLocalItems(result.items);
      setListIdOverride(result.list?.id ?? null);
      setMessage(result.fallback ? 'Generated a fallback packing list for offline use.' : 'Packing list generated and saved.');
      queryClient.invalidateQueries({ queryKey: ['packing', selectedTrip?.id] });
    },
    onError: (error: any) => setMessage(error.message ?? 'Could not generate packing list.'),
  });

  const saveLocal = async (nextItems: PackingItemView[]) => {
    setLocalItems(nextItems);
    if (selectedTrip) {
      await cachePackingList(selectedTrip.id, {
        list: packingQuery.data?.list ?? (listId ? { id: listId, trip_id: selectedTrip.id, user_id: authUser?.id ?? null, title: 'Packing list', status: 'active' } : null),
        items: nextItems,
      });
    }
  };

  const addCustomItem = async (input: CustomPackingForm) => {
    if (!selectedTrip) return;
    let activeListId = listId;
    try {
      if (!activeListId) {
        const created = await createPackingList(selectedTrip.id, authUser?.id ?? null, `${selectedTrip.destination_name} packing list`);
        activeListId = created.id;
        setListIdOverride(created.id);
      }
    } catch {
      activeListId = `offline-list-${selectedTrip.id}`;
      setListIdOverride(activeListId);
    }

    const now = new Date().toISOString();
    const localItem: PackingItemView = {
      id: `local-${now}`,
      packing_list_id: activeListId,
      trip_id: selectedTrip.id,
      assigned_to: input.assignedTo || null,
      category: 'other',
      item_name: input.name.trim(),
      quantity: Math.max(1, Number(input.quantity || 1)),
      is_packed: false,
      packed_at: null,
      source: 'manual',
      notes: serializePackingNotes({
        packingCategory: input.category,
        reason: input.reason.trim() || 'Custom item added by user.',
        priority: input.priority,
        aiGenerated: false,
      }),
      sort_order: items.length,
      created_at: now,
      updated_at: now,
      packingCategory: input.category,
      reason: input.reason.trim() || 'Custom item added by user.',
      priority: input.priority,
      aiGenerated: false,
      assignedUserLabel: members.find((member) => member.id === input.assignedTo)?.display_name ?? null,
    };

    const nextItems = [localItem, ...items];
    await saveLocal(nextItems);
    setAddDialogOpen(false);

    try {
      const saved = await addPackingItem(activeListId, selectedTrip.id, localItem);
      await saveLocal([saved, ...items]);
      setMessage('Packing item added.');
    } catch {
      await enqueuePackingOperation({ id: `op-${now}`, type: 'add', tripId: selectedTrip.id, listId: activeListId, item: localItem, createdAt: now });
      setMessage('Saved offline. This item will sync when connectivity returns.');
    }
  };

  const updateItem = async (item: PackingItemView, patch: Partial<PackingItemView>) => {
    const nextItem = { ...item, ...patch };
    if (patch.is_packed === true && !item.is_packed) {
      await trackAnalyticsEvent({
        userId: authUser?.id,
        name: 'packing_item_checked',
        properties: {
          tripId: item.trip_id,
          itemCategory: item.packingCategory,
        },
      });
    }
    const nextItems = items.map((current) => (current.id === item.id ? nextItem : current));
    await saveLocal(nextItems);
    const dbPatch = {
      quantity: nextItem.quantity,
      is_packed: nextItem.is_packed,
      packed_at: nextItem.packed_at,
      assigned_to: nextItem.assigned_to,
      notes: serializePackingNotes(nextItem),
    };
    try {
      await updatePackingItem(item.id, dbPatch);
    } catch {
      const createdAt = new Date().toISOString();
      await enqueuePackingOperation({ id: `op-${createdAt}`, type: 'update', itemId: item.id, patch: dbPatch, createdAt });
    }
  };

  const deleteSuggestion = async (item: PackingItemView) => {
    if (!item.aiGenerated) {
      setMessage('Only AI suggestions can be deleted here.');
      return;
    }
    const nextItems = items.filter((current) => current.id !== item.id);
    await saveLocal(nextItems);
    try {
      const { deletePackingSuggestion } = await import('../../src/features/packing/api');
      await deletePackingSuggestion(item);
    } catch {
      const createdAt = new Date().toISOString();
      await enqueuePackingOperation({ id: `op-${createdAt}`, type: 'delete', itemId: item.id, createdAt });
    }
  };

  const resetPacked = async () => {
    if (!selectedTrip) return;
    const nextItems = items.map((item) => ({ ...item, is_packed: false, packed_at: null }));
    await saveLocal(nextItems);
    setConfirmReset(false);
    try {
      await resetPackedStatus(selectedTrip.id);
      setMessage('Packed status reset.');
    } catch {
      const createdAt = new Date().toISOString();
      await enqueuePackingOperation({ id: `op-${createdAt}`, type: 'reset', tripId: selectedTrip.id, createdAt });
      setMessage('Reset saved offline and will sync later.');
    }
  };

  if (tripsQuery.isLoading) {
    return <ScreenContainer safeArea={false} contentContainerStyle={styles.center}><Text>Loading trips...</Text></ScreenContainer>;
  }

  if (tripsQuery.isError) {
    return <ScreenContainer safeArea={false} contentContainerStyle={styles.center}><ErrorState message="Could not load trips." onRetry={() => tripsQuery.refetch()} /></ScreenContainer>;
  }

  if (!selectedTrip) {
    return (
      <ScreenContainer safeArea={false} contentContainerStyle={styles.center}>
        <EmptyState title="No trips yet" description="Create a trip before generating a packing checklist." icon="bag-suitcase-outline" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer safeArea={false} keyboardAvoiding={false}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={packingQuery.isRefetching} onRefresh={() => {
          setLocalItems(null);
          setListIdOverride(null);
          packingQuery.refetch();
        }} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: theme.colors.onBackground }]}>Packing</Text>
            <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              {selectedTrip.destination_name} - {selectedTrip.start_date} to {selectedTrip.end_date}
            </Text>
          </View>
          <Button icon="auto-fix" onPress={() => generateMutation.mutate()} loading={generateMutation.isPending} accessibilityLabel="Generate packing checklist">
            Generate list
          </Button>
        </View>

        <Card style={styles.progressPanel}>
          <View style={styles.progressHeader}>
            <View>
              <Text style={[styles.panelTitle, { color: theme.colors.onSurface }]}>Packing progress</Text>
              <Text style={[styles.notice, { color: theme.colors.onSurfaceVariant }]}>
                {progress.packed} of {progress.total} packable items packed
              </Text>
            </View>
            <View style={[styles.progressBadge, { backgroundColor: theme.colors.primaryContainer }]}>
              <Text style={[styles.progressValue, { color: theme.colors.primary }]}>{progress.percent}%</Text>
            </View>
          </View>
          <ProgressBar progress={progress.percent / 100} color={theme.colors.primary} style={styles.progress} />
          {progress.highPriorityRemaining > 0 && (
            <View style={[styles.warningStrip, { backgroundColor: theme.colors.errorContainer }]}>
              <MaterialCommunityIcons name="alert-outline" size={18} color={theme.colors.error} />
              <Text style={[styles.warningText, { color: theme.colors.error }]}>
                {progress.highPriorityRemaining} high-priority items remain.
              </Text>
            </View>
          )}
          <View style={styles.actionRow}>
            <Button icon="plus" onPress={() => setAddDialogOpen(true)} accessibilityLabel="Add custom packing item">Add custom item</Button>
            <Button mode="outlined" icon="backup-restore" onPress={() => setConfirmReset(true)} disabled={!items.some((item) => item.is_packed)}>
              Reset packed
            </Button>
          </View>
        </Card>

        <Card style={styles.panel}>
          <View style={styles.panelHeading}>
            <View style={[styles.smallIconTile, { backgroundColor: theme.colors.secondaryContainer }]}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={20} color={theme.colors.secondary} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.panelTitle, { color: theme.colors.onSurface }]}>Checklist context</Text>
              <Text style={[styles.notice, { color: theme.colors.onSurfaceVariant }]}>Inputs guide AI suggestions and deterministic fallback lists.</Text>
            </View>
          </View>
          <View style={styles.contextGrid}>
            <TextInput label="Weather context" value={generationInputs.weatherContext} onChangeText={(weatherContext) => setGenerationInputs((current) => ({ ...current, weatherContext }))} />
            <TextInput label="Baggage limit" value={generationInputs.baggageLimit} onChangeText={(baggageLimit) => setGenerationInputs((current) => ({ ...current, baggageLimit }))} />
            <TextInput label="Accommodation type" value={generationInputs.accommodationType} onChangeText={(accommodationType) => setGenerationInputs((current) => ({ ...current, accommodationType }))} />
            <TextInput label="Accessibility or medical notes" value={generationInputs.accessibilityOrMedicalNotes} onChangeText={(accessibilityOrMedicalNotes) => setGenerationInputs((current) => ({ ...current, accessibilityOrMedicalNotes }))} />
          </View>
          <Accordion type="single" collapsible style={styles.tipsAccordion}>
            {packingTipItems.map((item, index) => (
              <AccordionItem key={item.title} value={`packing-tip-${index + 1}`}>
                <AccordionHeader>
                  <AccordionTrigger textStyle={styles.accordionTitle}>{item.title}</AccordionTrigger>
                </AccordionHeader>
                <AccordionContent>
                  <Text style={[styles.notice, { color: theme.colors.onSurfaceVariant }]}>{item.content}</Text>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          <Button mode={categoryFilter === 'all' ? 'contained' : 'outlined'} onPress={() => setCategoryFilter('all')}>All</Button>
          {packingCategories.map((category) => (
            <Button key={category} mode={categoryFilter === category ? 'contained' : 'outlined'} onPress={() => setCategoryFilter(category)}>
              {packingCategoryLabels[category]}
            </Button>
          ))}
        </ScrollView>

        {packingQuery.isError && items.length === 0 ? (
          <ErrorState message="Could not load packing list." onRetry={() => packingQuery.refetch()} />
        ) : filteredItems.length === 0 ? (
          <EmptyState title="No packing items" description="Generate a list or add custom items." icon="bag-personal-outline" actionLabel="Generate list" onAction={() => generateMutation.mutate()} />
        ) : (
          <View style={styles.itemList}>
            {filteredItems.map((item) => (
              <PackingItemCard
                key={item.id}
                item={item}
                members={members}
                onTogglePacked={() => updateItem(item, { is_packed: !item.is_packed, packed_at: !item.is_packed ? new Date().toISOString() : null })}
                onQuantity={(quantity) => updateItem(item, { quantity })}
                onAssign={(memberId) => updateItem(item, { assigned_to: memberId || null, assignedUserLabel: members.find((member) => member.id === memberId)?.display_name ?? null })}
                onDelete={() => deleteSuggestion(item)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <CustomItemDialog visible={addDialogOpen} members={members} onDismiss={() => setAddDialogOpen(false)} onSave={addCustomItem} />
      <ConfirmationDialog
        visible={confirmReset}
        title="Reset packed status?"
        message="This will mark every item as unpacked. The change will sync when connectivity is available."
        confirmLabel="Reset"
        onDismiss={() => setConfirmReset(false)}
        onConfirm={resetPacked}
      />
      <Snackbar visible={!!message} onDismiss={() => setMessage('')} duration={4000}>{message}</Snackbar>
    </ScreenContainer>
  );
}

function PackingItemCard({
  item,
  members,
  onTogglePacked,
  onQuantity,
  onAssign,
  onDelete,
}: {
  item: PackingItemView;
  members: NonNullable<TripSummary['trip_members']>;
  onTogglePacked: () => void;
  onQuantity: (quantity: number) => void;
  onAssign: (memberId: string | null) => void;
  onDelete: () => void;
}) {
  const theme = useTheme();
  const [quantity, setQuantity] = useState(String(item.quantity));
  const priorityTone = priorityColor(item.priority, theme);
  return (
    <Card style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <Checkbox status={item.is_packed ? 'checked' : 'unchecked'} onPress={onTogglePacked} />
        <View style={styles.itemBody}>
          <Text style={[styles.itemName, { color: theme.colors.onSurface }]}>{item.item_name}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.metaBadge, { borderColor: theme.colors.outlineVariant }]}>
              <Text style={[styles.badgeText, { color: theme.colors.onSurfaceVariant }]}>{packingCategoryLabels[item.packingCategory]}</Text>
            </View>
            <View style={[styles.metaBadge, { borderColor: priorityTone }]}>
              <Text style={[styles.badgeText, { color: priorityTone }]}>{item.priority} priority</Text>
            </View>
            <View style={[styles.metaBadge, { borderColor: item.aiGenerated ? theme.colors.primary : theme.colors.outlineVariant }]}>
              <Text style={[styles.badgeText, { color: item.aiGenerated ? theme.colors.primary : theme.colors.onSurfaceVariant }]}>
                {item.aiGenerated ? 'AI estimate' : 'Custom'}
              </Text>
            </View>
          </View>
        </View>
        <MaterialCommunityIcons name={item.is_packed ? 'check-circle' : 'circle-outline'} size={22} color={item.is_packed ? theme.colors.primary : theme.colors.outline} />
      </View>
      <Text style={[styles.reason, { color: theme.colors.onSurfaceVariant }]}>{item.reason}</Text>
      <View style={styles.inlineControls}>
        <TextInput
          label="Qty"
          value={quantity}
          onChangeText={(text) => {
            const cleaned = text.replace(/[^\d]/g, '');
            setQuantity(cleaned);
            const parsed = Number(cleaned);
            if (parsed > 0) onQuantity(parsed);
          }}
          keyboardType="number-pad"
          style={styles.quantityInput}
        />
        <View style={styles.assignWrap}>
          <Button mode={!item.assigned_to ? 'contained-tonal' : 'outlined'} onPress={() => onAssign(null)}>Unassigned</Button>
          {members.map((member) => (
            <Button key={member.id} mode={item.assigned_to === member.id ? 'contained' : 'outlined'} onPress={() => onAssign(member.id)}>
              {member.display_name}
            </Button>
          ))}
        </View>
      </View>
      <View style={styles.actionRow}>
        <Button mode="text" icon="delete-outline" disabled={!item.aiGenerated} onPress={onDelete}>Delete suggestion</Button>
      </View>
    </Card>
  );
}

type CustomPackingForm = {
  name: string;
  quantity: string;
  category: PackingCategory;
  priority: PackingPriority;
  reason: string;
  assignedTo: string | null;
};

function CustomItemDialog({
  visible,
  members,
  onDismiss,
  onSave,
}: {
  visible: boolean;
  members: NonNullable<TripSummary['trip_members']>;
  onDismiss: () => void;
  onSave: (form: CustomPackingForm) => void;
}) {
  const [form, setForm] = useState<CustomPackingForm>({
    name: '',
    quantity: '1',
    category: 'optional',
    priority: 'medium',
    reason: '',
    assignedTo: null,
  });
  const patch = (input: Partial<CustomPackingForm>) => setForm((current) => ({ ...current, ...input }));
  const priorities: PackingPriority[] = ['high', 'medium', 'low'];
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title>Add custom item</Dialog.Title>
        <Dialog.ScrollArea>
          <ScrollView contentContainerStyle={styles.dialogContent}>
            <TextInput label="Name" value={form.name} onChangeText={(name) => patch({ name })} />
            <TextInput label="Quantity" value={form.quantity} onChangeText={(quantity) => patch({ quantity: quantity.replace(/[^\d]/g, '') })} keyboardType="number-pad" />
            <TextInput label="Reason" value={form.reason} onChangeText={(reason) => patch({ reason })} />
            <View style={styles.optionWrap}>
              {packingCategories.map((category) => (
                <Button key={category} mode={form.category === category ? 'contained' : 'outlined'} onPress={() => patch({ category })}>
                  {packingCategoryLabels[category]}
                </Button>
              ))}
            </View>
            <View style={styles.optionWrap}>
              {priorities.map((priority) => (
                <Button key={priority} mode={form.priority === priority ? 'contained' : 'outlined'} onPress={() => patch({ priority })}>
                  {priority}
                </Button>
              ))}
            </View>
            <View style={styles.optionWrap}>
              <Button mode={!form.assignedTo ? 'contained-tonal' : 'outlined'} onPress={() => patch({ assignedTo: null })}>Unassigned</Button>
              {members.map((member) => (
                <Button key={member.id} mode={form.assignedTo === member.id ? 'contained' : 'outlined'} onPress={() => patch({ assignedTo: member.id })}>
                  {member.display_name}
                </Button>
              ))}
            </View>
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button mode="text" onPress={onDismiss}>Cancel</Button>
          <Button disabled={form.name.trim().length < 2 || Number(form.quantity) < 1} onPress={() => onSave(form)}>Save</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', padding: 24 },
  container: { padding: 16, paddingBottom: 32, maxWidth: 1180, width: '100%', alignSelf: 'center' },
  flex: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginTop: 12, marginBottom: 12, flexWrap: 'wrap' },
  title: { fontSize: 30, fontWeight: '900' },
  subtitle: { fontSize: 14, marginTop: 4, lineHeight: 20 },
  panel: { padding: 16 },
  progressPanel: { padding: 18 },
  panelHeading: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 10 },
  smallIconTile: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  contextGrid: { gap: 2 },
  panelTitle: { fontSize: 17, fontWeight: '900' },
  notice: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  progressBadge: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  progressValue: { fontSize: 16, fontWeight: '900' },
  progress: { height: 8, borderRadius: 8, marginTop: 8 },
  warningStrip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 8, padding: 10, marginTop: 12 },
  warningText: { fontSize: 13, fontWeight: '800', flex: 1 },
  tipsAccordion: { marginTop: 8 },
  accordionTitle: { fontSize: 13, textTransform: 'uppercase' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  filters: { gap: 8, paddingVertical: 10 },
  itemList: { gap: 8 },
  itemCard: { padding: 16 },
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  itemBody: { flex: 1 },
  itemName: { fontSize: 17, fontWeight: '900' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  metaBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '900', textTransform: 'capitalize' },
  reason: { fontSize: 14, lineHeight: 20, marginTop: 8 },
  inlineControls: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 8 },
  quantityInput: { width: 110 },
  assignWrap: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  dialog: { borderRadius: 8 },
  dialogContent: { paddingHorizontal: 16, paddingBottom: 8 },
});
