import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, Dialog, Portal, SegmentedButtons, Text, TextInput, useTheme } from 'react-native-paper';
import { Button } from '../../src/components/common/Button';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { HiddenCostCalculator } from '../../src/features/hiddenCosts/HiddenCostCalculator';
import { hyderabadGoaHiddenCosts } from '../../src/features/hiddenCosts/demoData';
import {
  deleteSplitExpense,
  fetchSplitExpenseData,
  markSettlementComplete,
  saveSplitExpense,
  syncQueuedExpenseOperations,
} from '../../src/features/splitExpenses/api';
import {
  calculateExpenseSplits,
  calculateMemberBalances,
  generateMinimizedSettlements,
} from '../../src/features/splitExpenses/calculations';
import { enqueueExpenseOperation, getCachedSplitExpenses } from '../../src/features/splitExpenses/storage';
import { expenseCategories, type ExpenseSplitInput, type SplitExpenseRecord, type SplitMember, type SplitType } from '../../src/features/splitExpenses/types';
import { fetchTrips } from '../../src/features/trips/api';
import { useAuthStore } from '../../src/store/authStore';
import { formatINR, rupeesToPaise } from '../../src/utils/currency';

const splitTypes: SplitType[] = ['equal', 'exact', 'percentage', 'shares', 'selected_members'];

const demoMembers: SplitMember[] = [
  { id: 'demo-amit', name: 'Amit' },
  { id: 'demo-diya', name: 'Diya' },
  { id: 'demo-neha', name: 'Neha' },
  { id: 'demo-rahul', name: 'Rahul' },
];

const demoExpenses: SplitExpenseRecord[] = [
  makeDemoExpense('demo-train', 'Train tickets', 'transport', 12000, 'demo-amit'),
  makeDemoExpense('demo-stay', 'Beach stay advance', 'accommodation', 16000, 'demo-diya'),
  makeDemoExpense('demo-scooter', 'Scooter fuel', 'fuel', 4000, 'demo-neha'),
];

function makeDemoExpense(id: string, title: string, category: ExpenseSplitInput['category'], rupees: number, paidByMemberId: string): SplitExpenseRecord {
  const input: ExpenseSplitInput = {
    title,
    amountMinor: rupeesToPaise(rupees),
    currency: 'INR',
    category,
    paidByMemberId,
    participantIds: demoMembers.map((member) => member.id),
    splitType: 'equal',
  };
  return {
    id,
    tripId: 'demo-goa',
    title,
    category,
    amountMinor: input.amountMinor,
    currency: 'INR',
    paidByMemberId,
    notes: 'Demo data for the four-student Goa trip.',
    spentAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    splitType: 'equal',
    participants: input.participantIds,
    splits: calculateExpenseSplits(input),
    auditHistory: [],
  };
}

export default function ExpensesScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const authUser = useAuthStore((state) => state.authUser);
  const [dialogExpense, setDialogExpense] = useState<SplitExpenseRecord | null | undefined>(undefined);
  const [settlementDialog, setSettlementDialog] = useState<any>(null);
  const [upiLink, setUpiLink] = useState('');

  const tripsQuery = useQuery({
    queryKey: ['trips', authUser?.id],
    queryFn: () => fetchTrips(authUser?.id),
    enabled: !!authUser?.id,
  });
  const selectedTrip = tripsQuery.data?.[0];

  const splitQuery = useQuery({
    queryKey: ['split-expenses', selectedTrip?.id],
    queryFn: async () => {
      try {
        return await fetchSplitExpenseData(selectedTrip!.id);
      } catch (error) {
        const cached = await getCachedSplitExpenses(selectedTrip!.id);
        if (cached.length) return { members: selectedTrip?.trip_members?.map((member: any) => ({ id: member.id, name: member.display_name })) ?? [], expenses: cached, completedSettlements: [] };
        throw error;
      }
    },
    enabled: !!selectedTrip?.id,
  });

  const data: { members: SplitMember[]; expenses: SplitExpenseRecord[]; completedSettlements: any[] } =
    selectedTrip && splitQuery.data ? splitQuery.data : { members: demoMembers, expenses: demoExpenses, completedSettlements: [] };
  const isDemo = !selectedTrip || !splitQuery.data;
  const currency = selectedTrip?.currency_code ?? 'INR';
  const currentMemberId = data.members.find((member) => member.userId === authUser?.id)?.id ?? data.members[0]?.id;

  const balances = useMemo(() => calculateMemberBalances(data.expenses, data.members), [data.expenses, data.members]);
  const settlements = useMemo(
    () => generateMinimizedSettlements(balances, currency, data.completedSettlements),
    [balances, currency, data.completedSettlements]
  );
  const myBalance = balances.find((balance) => balance.memberId === currentMemberId);

  const saveMutation = useMutation({
    mutationFn: async ({ form, existing }: { form: ExpenseSplitInput; existing?: SplitExpenseRecord }) => {
      if (!selectedTrip || !authUser?.id) throw new Error('Sign in and select a trip first.');
      return saveSplitExpense(selectedTrip.id, form, authUser.id, existing);
    },
    onSuccess: () => {
      setDialogExpense(undefined);
      queryClient.invalidateQueries({ queryKey: ['split-expenses', selectedTrip?.id] });
    },
    onError: async (_error, variables) => {
      if (selectedTrip) {
        await enqueueExpenseOperation(selectedTrip.id, {
          id: `queued-${Date.now()}`,
          type: variables.existing ? 'update' : 'add',
          tripId: selectedTrip.id,
          expense: variables.form,
          baseUpdatedAt: variables.existing?.updatedAt,
          createdAt: new Date().toISOString(),
        });
      }
      Alert.alert('Saved offline', 'This expense will sync when the connection is back.');
      setDialogExpense(undefined);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (expense: SplitExpenseRecord) => {
      if (!selectedTrip) throw new Error('Select a trip first.');
      await deleteSplitExpense(expense.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['split-expenses', selectedTrip?.id] }),
  });

  const settlementMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTrip || !authUser?.id || !settlementDialog) throw new Error('Missing settlement.');
      await markSettlementComplete(selectedTrip.id, { ...settlementDialog, upiPaymentLink: upiLink || null }, authUser.id);
    },
    onSuccess: () => {
      setSettlementDialog(null);
      setUpiLink('');
      queryClient.invalidateQueries({ queryKey: ['split-expenses', selectedTrip?.id] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTrip || !authUser?.id) return { synced: 0, conflicts: 0 };
      return syncQueuedExpenseOperations(selectedTrip.id, authUser.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['split-expenses', selectedTrip?.id] }),
  });

  const memberName = (id: string) => data.members.find((member) => member.id === id)?.name ?? 'Traveler';

  return (
    <ScreenContainer safeArea={false} keyboardAvoiding={false}>
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={styles.card}>
          <Card.Content style={styles.gap}>
            <View style={styles.headerRow}>
              <View style={styles.flex}>
                <Text variant="headlineSmall">Split Expenses</Text>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  {isDemo ? 'Demo data: four-student Hyderabad-to-Goa trip' : selectedTrip?.title}
                </Text>
              </View>
              <Button icon="plus" disabled={isDemo || data.members.length === 0} onPress={() => setDialogExpense(null)}>
                Add expense
              </Button>
            </View>
            <View style={styles.balanceRow}>
              <SummaryTile label="You owe" value={formatINR(Math.max(0, -(myBalance?.netMinor ?? 0)))} tone="danger" />
              <SummaryTile label="You are owed" value={formatINR(Math.max(0, myBalance?.netMinor ?? 0))} tone="success" />
              <SummaryTile label="Trip spend" value={formatINR(data.expenses.reduce((total, expense) => total + expense.amountMinor, 0))} />
            </View>
            <Button mode="outlined" icon="sync" disabled={isDemo || !selectedTrip} loading={syncMutation.isPending} onPress={() => syncMutation.mutate()}>
              Sync offline entries
            </Button>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content style={styles.gap}>
            <Text variant="titleMedium">Balances</Text>
            {balances.map((balance) => (
              <View key={balance.memberId} style={styles.balanceLine}>
                <Text>{memberName(balance.memberId)}</Text>
                <Text style={{ color: balance.netMinor < 0 ? theme.colors.error : theme.colors.primary }}>
                  {balance.netMinor < 0 ? 'owes ' : 'is owed '}
                  {formatINR(Math.abs(balance.netMinor))}
                </Text>
              </View>
            ))}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content style={styles.gap}>
            <Text variant="titleMedium">Expenses</Text>
            {data.expenses.length === 0 ? (
              <Text>No shared expenses yet.</Text>
            ) : (
              data.expenses.map((expense) => (
                <View key={expense.id} style={styles.expenseItem}>
                  <View style={styles.flex}>
                    <Text variant="titleSmall">{expense.title}</Text>
                    <Text style={{ color: theme.colors.onSurfaceVariant }}>
                      Paid by {memberName(expense.paidByMemberId)} • {expense.splitType.replace('_', ' ')} • {expense.category}
                    </Text>
                    {!!expense.notes && <Text>{expense.notes}</Text>}
                  </View>
                  <View style={styles.actions}>
                    <Text variant="titleMedium">{formatINR(expense.amountMinor)}</Text>
                    <Button mode="text" icon="pencil-outline" disabled={isDemo} onPress={() => setDialogExpense(expense)}>Edit</Button>
                    <Button
                      mode="text"
                      icon="delete-outline"
                      disabled={isDemo}
                      onPress={() => Alert.alert('Delete expense?', 'This removes the expense and its splits.', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(expense) },
                      ])}
                    >
                      Delete
                    </Button>
                  </View>
                </View>
              ))
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content style={styles.gap}>
            <Text variant="titleMedium">Suggested settlements</Text>
            {settlements.length === 0 ? (
              <Text>Everyone is settled up.</Text>
            ) : (
              settlements.map((settlement) => (
                <View key={`${settlement.fromMemberId}-${settlement.toMemberId}-${settlement.amountMinor}`} style={styles.balanceLine}>
                  <Text>
                    {memberName(settlement.fromMemberId)} pays {memberName(settlement.toMemberId)}
                  </Text>
                  <View style={styles.actions}>
                    <Text variant="titleMedium">{formatINR(settlement.amountMinor)}</Text>
                    <Button
                      mode="outlined"
                      disabled={isDemo}
                      onPress={() => {
                        setSettlementDialog(settlement);
                        setUpiLink('');
                      }}
                    >
                      Mark paid
                    </Button>
                  </View>
                </View>
              ))
            )}
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              Payment links are stored only as a prepared UPI reference. TravelAI does not verify or claim payment completion.
            </Text>
          </Card.Content>
        </Card>

        <HiddenCostCalculator
          initialItems={hyderabadGoaHiddenCosts}
          budgetMinor={rupeesToPaise(40000)}
          travelerCount={4}
          currency="INR"
          demoLabel="Demo data: Hyderabad-to-Goa friends trip, 4 travelers, INR 40,000 budget"
        />
      </ScrollView>

      <ExpenseDialog
        visible={dialogExpense !== undefined}
        expense={dialogExpense ?? undefined}
        members={data.members}
        currency={currency}
        loading={saveMutation.isPending}
        onDismiss={() => setDialogExpense(undefined)}
        onSave={(form) => saveMutation.mutate({ form, existing: dialogExpense ?? undefined })}
      />

      <Portal>
        <Dialog visible={!!settlementDialog} onDismiss={() => setSettlementDialog(null)}>
          <Dialog.Title>Confirm settlement paid</Dialog.Title>
          <Dialog.Content style={styles.gap}>
            <Text>Only mark this complete after the members verify the payment outside TravelAI.</Text>
            <TextInput label="UPI payment link (optional)" value={upiLink} onChangeText={setUpiLink} autoCapitalize="none" />
          </Dialog.Content>
          <Dialog.Actions>
            <Button mode="text" onPress={() => setSettlementDialog(null)}>Cancel</Button>
            <Button loading={settlementMutation.isPending} onPress={() => settlementMutation.mutate()}>Mark complete</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScreenContainer>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: string; tone?: 'danger' | 'success' }) {
  const theme = useTheme();
  const color = tone === 'danger' ? theme.colors.error : tone === 'success' ? theme.colors.primary : theme.colors.onSurface;
  return (
    <View style={styles.summaryTile}>
      <Text style={{ color: theme.colors.onSurfaceVariant }}>{label}</Text>
      <Text variant="titleLarge" style={{ color }}>{value}</Text>
    </View>
  );
}

function ExpenseDialog({
  visible,
  expense,
  members,
  currency,
  loading,
  onDismiss,
  onSave,
}: {
  visible: boolean;
  expense?: SplitExpenseRecord;
  members: SplitMember[];
  currency: string;
  loading: boolean;
  onDismiss: () => void;
  onSave: (form: ExpenseSplitInput) => void;
}) {
  const [title, setTitle] = useState(expense?.title ?? '');
  const [amount, setAmount] = useState(expense ? String(expense.amountMinor / 100) : '');
  const [category, setCategory] = useState<ExpenseSplitInput['category']>(expense?.category ?? 'food');
  const [notes, setNotes] = useState(expense?.notes ?? '');
  const [paidByMemberId, setPaidByMemberId] = useState(expense?.paidByMemberId ?? members[0]?.id ?? '');
  const [participantIds, setParticipantIds] = useState<string[]>(expense?.participants ?? members.map((member) => member.id));
  const [splitType, setSplitType] = useState<SplitType>(expense?.splitType ?? 'equal');
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  React.useEffect(() => {
    setTitle(expense?.title ?? '');
    setAmount(expense ? String(expense.amountMinor / 100) : '');
    setCategory(expense?.category ?? 'food');
    setNotes(expense?.notes ?? '');
    setPaidByMemberId(expense?.paidByMemberId ?? members[0]?.id ?? '');
    setParticipantIds(expense?.participants ?? members.map((member) => member.id));
    setSplitType(expense?.splitType ?? 'equal');
    setValues(Object.fromEntries((expense?.splits ?? []).map((split) => [split.memberId, String(split.amountMinor / 100)])));
    setError('');
  }, [expense, members, visible]);

  const toggleParticipant = (id: string) => {
    setParticipantIds((current) => (current.includes(id) ? current.filter((memberId) => memberId !== id) : [...current, id]));
  };

  const submit = () => {
    const amountMinor = Math.round(Number(amount) * 100);
    const exactAmountsMinor = Object.fromEntries(Object.entries(values).map(([id, value]) => [id, Math.round(Number(value) * 100)]));
    const percentages = Object.fromEntries(Object.entries(values).map(([id, value]) => [id, Number(value)]));
    const shares = Object.fromEntries(Object.entries(values).map(([id, value]) => [id, Number(value)]));
    const form: ExpenseSplitInput = {
      title,
      amountMinor,
      currency,
      category,
      notes,
      paidByMemberId,
      participantIds,
      splitType,
      exactAmountsMinor,
      percentages,
      shares,
    };
    try {
      calculateExpenseSplits(form);
      if (title.trim().length < 2) throw new Error('Enter a useful expense name.');
      setError('');
      onSave(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check the split details.');
    }
  };

  const needsValues = splitType === 'exact' || splitType === 'percentage' || splitType === 'shares';

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>{expense ? 'Edit expense' : 'Add expense'}</Dialog.Title>
        <Dialog.ScrollArea>
          <ScrollView contentContainerStyle={styles.dialogContent}>
            <TextInput label="Name" value={title} onChangeText={setTitle} />
            <TextInput label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
            <TextInput label="Notes" value={notes} onChangeText={setNotes} multiline />
            <Text variant="labelLarge">Category</Text>
            <View style={styles.wrap}>
              {expenseCategories.map((item) => (
                <Button key={item} mode={category === item ? 'contained' : 'outlined'} onPress={() => setCategory(item)}>
                  {item}
                </Button>
              ))}
            </View>
            <Text variant="labelLarge">Payer</Text>
            <View style={styles.wrap}>
              {members.map((member) => (
                <Button key={member.id} mode={paidByMemberId === member.id ? 'contained' : 'outlined'} onPress={() => setPaidByMemberId(member.id)}>
                  {member.name}
                </Button>
              ))}
            </View>
            <Text variant="labelLarge">Participants</Text>
            <View style={styles.wrap}>
              {members.map((member) => (
                <Button key={member.id} mode={participantIds.includes(member.id) ? 'contained' : 'outlined'} onPress={() => toggleParticipant(member.id)}>
                  {member.name}
                </Button>
              ))}
            </View>
            <SegmentedButtons
              value={splitType}
              onValueChange={(value) => setSplitType(value as SplitType)}
              buttons={splitTypes.map((item) => ({ value: item, label: item.replace('_', ' ') }))}
            />
            {needsValues && participantIds.map((memberId) => (
              <TextInput
                key={memberId}
                label={`${members.find((member) => member.id === memberId)?.name ?? 'Traveler'} ${splitType}`}
                value={values[memberId] ?? ''}
                onChangeText={(value) => setValues((current) => ({ ...current, [memberId]: value }))}
                keyboardType="decimal-pad"
              />
            ))}
            {!!error && <Text style={styles.error}>{error}</Text>}
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button mode="text" onPress={onDismiss}>Cancel</Button>
          <Button loading={loading} onPress={submit}>Save</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
    maxWidth: 1180,
    width: '100%',
    alignSelf: 'center',
    gap: 16,
  },
  card: {
    borderRadius: 8,
  },
  gap: {
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  flex: {
    flex: 1,
    minWidth: 220,
  },
  balanceRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  summaryTile: {
    minWidth: 160,
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d0d7de',
    borderRadius: 8,
    padding: 12,
  },
  balanceLine: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  expenseItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#d0d7de',
    flexWrap: 'wrap',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dialogContent: {
    padding: 16,
    gap: 12,
  },
  error: {
    color: '#b42318',
  },
});
