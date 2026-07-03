import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Dialog, Portal, Snackbar, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { TextInput } from '../../components/common/TextInput';
import { formatINR } from '../../utils/currency';
import { calculateHiddenCostTotals, createCostItem, formatMinorAsDecimal, parseDecimalAmountToMinor } from './calculations';
import { hiddenCostCategories, type CostConfidence, type CostStatus, type HiddenCostCategory, type HiddenCostItem } from './types';

const categoryLabels: Record<HiddenCostCategory, string> = {
  ticket_base_fare: 'Ticket base fare',
  taxes: 'Taxes',
  convenience_fees: 'Convenience fees',
  baggage: 'Baggage',
  seat_selection: 'Seat selection',
  first_mile_transport: 'First-mile transport',
  last_mile_transport: 'Last-mile transport',
  local_transport: 'Local transport',
  accommodation: 'Accommodation',
  accommodation_taxes: 'Accommodation taxes',
  food: 'Food',
  activities: 'Activities',
  parking: 'Parking',
  tolls: 'Tolls',
  internet_or_sim: 'Internet or SIM',
  emergency_buffer: 'Emergency buffer',
  other: 'Other',
};

const statusOptions: CostStatus[] = ['estimated', 'confirmed'];
const confidenceOptions: CostConfidence[] = ['high', 'medium', 'low'];

type HiddenCostCalculatorProps = {
  initialItems: HiddenCostItem[];
  budgetMinor: number;
  travelerCount: number;
  currency?: string;
  demoLabel?: string;
};

export function HiddenCostCalculator({
  initialItems,
  budgetMinor,
  travelerCount,
  currency = 'INR',
  demoLabel,
}: HiddenCostCalculatorProps) {
  const theme = useTheme();
  const [items, setItems] = useState(initialItems);
  const [emergencyBufferPercentage, setEmergencyBufferPercentage] = useState('10');
  const [dialogState, setDialogState] = useState<{ mode: 'add' | 'edit'; item?: HiddenCostItem } | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const bufferPercent = Math.max(0, Number(emergencyBufferPercentage || 0));
  const totals = useMemo(
    () =>
      calculateHiddenCostTotals({
        items,
        travelerCount,
        budgetMinor,
        emergencyBufferPercentage: bufferPercent,
      }),
    [budgetMinor, bufferPercent, items, travelerCount],
  );

  const saveItem = (input: CostFormState) => {
    try {
      const amountMinor = parseDecimalAmountToMinor(input.amount);
      const next = createCostItem({
        id: dialogState?.item?.id,
        name: input.name.trim(),
        category: input.category,
        amountMinor,
        currency,
        status: input.status,
        confidence: input.confidence,
        explanation: input.explanation.trim(),
        dataSource: input.dataSource.trim(),
      });
      if (next.name.length < 2) throw new Error('Name must be at least 2 characters.');
      if (!next.explanation) throw new Error('Add an explanation for this cost.');
      if (!next.dataSource) throw new Error('Add a data source for this cost.');

      setItems((current) =>
        dialogState?.mode === 'edit' ? current.map((item) => (item.id === next.id ? next : item)) : [next, ...current],
      );
      setDialogState(null);
      setMessage('Cost saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save cost.');
    }
  };

  const markConfirmed = (itemId: string) => {
    setItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              status: 'confirmed',
              confidence: 'high',
              lastUpdatedAt: new Date().toISOString(),
            }
          : item,
      ),
    );
  };

  const deleteEstimated = (item: HiddenCostItem) => {
    if (item.status === 'confirmed') {
      setMessage('Confirmed costs cannot be deleted from this calculator.');
      return;
    }
    setItems((current) => current.filter((cost) => cost.id !== item.id));
  };

  return (
    <View>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.colors.onBackground }]}>Hidden Cost Calculator</Text>
          {!!demoLabel && <Text style={[styles.demoLabel, { color: theme.colors.primary }]}>{demoLabel}</Text>}
        </View>
        <Button icon="plus" onPress={() => setDialogState({ mode: 'add' })} accessibilityLabel="Add a hidden cost">
          Add cost
        </Button>
      </View>

      <Card style={styles.summaryCard}>
        <View style={styles.summaryGrid}>
          <TotalMetric label="Low estimate" value={totals.lowEstimateMinor} icon="trending-down" />
          <TotalMetric label="Expected estimate" value={totals.expectedEstimateMinor} icon="calculator-variant-outline" />
          <TotalMetric label="High estimate" value={totals.highEstimateMinor} icon="trending-up" />
          <TotalMetric label="Per-person total" value={totals.perPersonTotalMinor} icon="account-outline" />
          <TotalMetric label="Group total" value={totals.groupTotalMinor} icon="account-group-outline" />
          <TotalMetric label="Confirmed total" value={totals.confirmedTotalMinor} icon="check-circle-outline" />
          <TotalMetric label="Estimated total" value={totals.estimatedTotalMinor} icon="clock-outline" />
          <TotalMetric label="Remaining budget" value={totals.remainingBudgetMinor} icon="wallet-outline" />
        </View>
        {totals.isOverBudget && (
          <View style={[styles.warning, { backgroundColor: theme.colors.errorContainer }]}>
            <MaterialCommunityIcons name="alert-outline" size={18} color={theme.colors.error} />
            <Text style={[styles.warningText, { color: theme.colors.onErrorContainer }]}>
              This plan is over budget by {formatINR(Math.abs(totals.remainingBudgetMinor))}.
            </Text>
          </View>
        )}
        <View style={styles.bufferRow}>
          <TextInput
            label="Emergency buffer percentage"
            value={emergencyBufferPercentage}
            onChangeText={(text) => setEmergencyBufferPercentage(text.replace(/[^\d.]/g, ''))}
            keyboardType="decimal-pad"
            leftIcon="shield-plus-outline"
          />
          <Text style={[styles.smallText, { color: theme.colors.onSurfaceVariant }]}>
            Current buffer: {formatINR(totals.emergencyBufferMinor)}
          </Text>
        </View>
        <Text style={[styles.explanation, { color: theme.colors.onSurfaceVariant }]}>{totals.explanation}</Text>
      </Card>

      <View style={styles.itemList}>
        {items.map((item) => (
          <Card key={item.id} style={styles.itemCard} accessibilityLabel={`${item.name} hidden cost`}>
            <View style={styles.itemHeader}>
              <View style={styles.itemTitleBlock}>
                <Text style={[styles.itemTitle, { color: theme.colors.onSurface }]}>{item.name}</Text>
                <Text style={[styles.smallText, { color: theme.colors.onSurfaceVariant }]}>
                  {categoryLabels[item.category]} - {item.status} - {item.confidence} confidence
                </Text>
              </View>
              <Text style={[styles.amount, { color: theme.colors.onSurface }]}>{formatINR(item.amountMinor)}</Text>
            </View>
            <Text style={[styles.explanation, { color: theme.colors.onSurfaceVariant }]}>{item.explanation}</Text>
            <Text style={[styles.source, { color: theme.colors.onSurfaceVariant }]}>
              Source: {item.dataSource} - Updated {new Date(item.lastUpdatedAt).toLocaleString()}
            </Text>
            <View style={styles.actionRow}>
              <Button mode="text" icon="pencil-outline" onPress={() => setDialogState({ mode: 'edit', item })}>
                Edit
              </Button>
              <Button mode="text" icon="check-circle-outline" disabled={item.status === 'confirmed'} onPress={() => markConfirmed(item.id)}>
                Confirm
              </Button>
              <Button mode="text" icon="delete-outline" disabled={item.status === 'confirmed'} onPress={() => deleteEstimated(item)}>
                Delete
              </Button>
            </View>
          </Card>
        ))}
      </View>

      <CostDialog
        visible={!!dialogState}
        item={dialogState?.item}
        onDismiss={() => setDialogState(null)}
        onSave={saveItem}
      />

      <Snackbar visible={!!message} onDismiss={() => setMessage('')} duration={3500}>
        {message}
      </Snackbar>
    </View>
  );
}

type CostFormState = {
  name: string;
  category: HiddenCostCategory;
  amount: string;
  status: CostStatus;
  confidence: CostConfidence;
  explanation: string;
  dataSource: string;
};

function CostDialog({
  visible,
  item,
  onDismiss,
  onSave,
}: {
  visible: boolean;
  item?: HiddenCostItem;
  onDismiss: () => void;
  onSave: (input: CostFormState) => void;
}) {
  const theme = useTheme();
  const [form, setForm] = useState<CostFormState>({
    name: '',
    category: 'other',
    amount: '0.00',
    status: 'estimated',
    confidence: 'medium',
    explanation: '',
    dataSource: '',
  });

  useEffect(() => {
    setForm({
      name: item?.name ?? '',
      category: item?.category ?? 'other',
      amount: item ? formatMinorAsDecimal(item.amountMinor) : '0.00',
      status: item?.status ?? 'estimated',
      confidence: item?.confidence ?? 'medium',
      explanation: item?.explanation ?? '',
      dataSource: item?.dataSource ?? '',
    });
  }, [item, visible]);

  const patchForm = (patch: Partial<CostFormState>) => setForm((current) => ({ ...current, ...patch }));

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title>{item ? 'Edit hidden cost' : 'Add hidden cost'}</Dialog.Title>
        <Dialog.ScrollArea>
          <ScrollView contentContainerStyle={styles.dialogContent}>
            <TextInput label="Name" value={form.name} onChangeText={(name) => patchForm({ name })} />
            <TextInput
              label="Amount"
              value={form.amount}
              onChangeText={(amount) => patchForm({ amount: amount.replace(/[^\d.]/g, '') })}
              keyboardType="decimal-pad"
              leftIcon="cash"
            />
            <Text style={[styles.controlLabel, { color: theme.colors.onSurface }]}>Category</Text>
            <View style={styles.optionWrap}>
              {hiddenCostCategories.map((category) => (
                <Button
                  key={category}
                  mode={form.category === category ? 'contained' : 'outlined'}
                  onPress={() => patchForm({ category })}
                  style={styles.optionButton}
                >
                  {categoryLabels[category]}
                </Button>
              ))}
            </View>
            <Text style={[styles.controlLabel, { color: theme.colors.onSurface }]}>Status</Text>
            <View style={styles.optionRow}>
              {statusOptions.map((status) => (
                <Button key={status} mode={form.status === status ? 'contained' : 'outlined'} onPress={() => patchForm({ status })}>
                  {status}
                </Button>
              ))}
            </View>
            <Text style={[styles.controlLabel, { color: theme.colors.onSurface }]}>Confidence</Text>
            <View style={styles.optionRow}>
              {confidenceOptions.map((confidence) => (
                <Button
                  key={confidence}
                  mode={form.confidence === confidence ? 'contained' : 'outlined'}
                  onPress={() => patchForm({ confidence })}
                >
                  {confidence}
                </Button>
              ))}
            </View>
            <TextInput label="Explanation" value={form.explanation} onChangeText={(explanation) => patchForm({ explanation })} />
            <TextInput label="Data source" value={form.dataSource} onChangeText={(dataSource) => patchForm({ dataSource })} />
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button mode="text" onPress={onDismiss}>Cancel</Button>
          <Button onPress={() => onSave(form)}>Save</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

function TotalMetric({ label, value, icon }: { label: string; value: number; icon: string }) {
  const theme = useTheme();
  return (
    <View style={styles.metric}>
      <MaterialCommunityIcons name={icon as any} size={20} color={theme.colors.primary} />
      <View style={styles.metricText}>
        <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
        <Text style={[styles.metricValue, { color: theme.colors.onSurface }]}>{formatINR(value)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
  },
  demoLabel: {
    fontSize: 13,
    fontWeight: '900',
    marginTop: 4,
  },
  summaryCard: {
    padding: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 190,
    flex: 1,
  },
  metricText: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 17,
    fontWeight: '900',
    marginTop: 2,
  },
  warning: {
    marginTop: 14,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800',
  },
  bufferRow: {
    marginTop: 12,
  },
  explanation: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  smallText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
  itemList: {
    gap: 8,
    marginTop: 8,
  },
  itemCard: {
    padding: 14,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  itemTitleBlock: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  amount: {
    fontSize: 18,
    fontWeight: '900',
  },
  source: {
    fontSize: 12,
    marginTop: 8,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  dialog: {
    borderRadius: 8,
  },
  dialogContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  controlLabel: {
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 4,
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    marginVertical: 2,
  },
});
