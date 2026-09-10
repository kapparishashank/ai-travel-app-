import { supabase } from '../../lib/supabase';
import { trackAnalyticsEvent } from '../analytics/analytics';
import { canApplyOfflineEdit, calculateExpenseSplits, createAuditEntry } from './calculations';
import { cacheSplitExpenses, getQueuedExpenseOperations, replaceQueuedExpenseOperations } from './storage';
import type {
  AuditEntry,
  ExpenseSplitInput,
  QueuedExpenseOperation,
  SettlementDraft,
  SplitExpenseCategory,
  SplitExpenseRecord,
  SplitMember,
  SplitType,
} from './types';

const dbCategoryByUi: Record<SplitExpenseCategory, string> = {
  transport: 'transport',
  accommodation: 'stay',
  food: 'food',
  activities: 'activity',
  shopping: 'shopping',
  fuel: 'transport',
  emergency: 'safety',
  miscellaneous: 'other',
};

const uiCategoryByDb: Record<string, SplitExpenseCategory> = {
  transport: 'transport',
  stay: 'accommodation',
  food: 'food',
  activity: 'activities',
  shopping: 'shopping',
  safety: 'emergency',
  other: 'miscellaneous',
};

type ExpenseNotesPayload = {
  text?: string | null;
  splitType?: SplitType;
  uiCategory?: SplitExpenseCategory;
  auditHistory?: AuditEntry[];
};

function parseNotes(notes: string | null): ExpenseNotesPayload {
  if (!notes) return {};
  try {
    const parsed = JSON.parse(notes);
    return typeof parsed === 'object' && parsed ? parsed : { text: notes };
  } catch {
    return { text: notes };
  }
}

function stringifyNotes(payload: ExpenseNotesPayload) {
  return JSON.stringify(payload);
}

function memberName(row: { display_name?: string | null; email?: string | null }) {
  return row.display_name || row.email || 'Traveler';
}

export async function fetchSplitExpenseData(tripId: string): Promise<{
  members: SplitMember[];
  expenses: SplitExpenseRecord[];
  completedSettlements: SettlementDraft[];
}> {
  const [membersResult, expensesResult, settlementsResult] = await Promise.all([
    supabase.from('trip_members').select('id,user_id,display_name,email,status').eq('trip_id', tripId).order('created_at', { ascending: true }),
    supabase.from('expenses').select('*').eq('trip_id', tripId).order('spent_at', { ascending: false }),
    supabase.from('settlements').select('*').eq('trip_id', tripId).eq('status', 'completed'),
  ]);

  if (membersResult.error) throw membersResult.error;
  if (expensesResult.error) throw expensesResult.error;
  if (settlementsResult.error) throw settlementsResult.error;

  const expenseRows = expensesResult.data ?? [];
  const expenseIds = expenseRows.map((expense: { id: string }) => expense.id);
  const [participantsResult, splitsResult] = expenseIds.length
    ? await Promise.all([
        supabase.from('expense_participants').select('*').in('expense_id', expenseIds),
        supabase.from('expense_splits').select('*').in('expense_id', expenseIds),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];

  if (participantsResult.error) throw participantsResult.error;
  if (splitsResult.error) throw splitsResult.error;

  const participantsByExpense = new Map<string, string[]>();
  (participantsResult.data ?? []).forEach((row: { expense_id: string; trip_member_id: string }) => {
    participantsByExpense.set(row.expense_id, [...(participantsByExpense.get(row.expense_id) ?? []), row.trip_member_id]);
  });

  const splitsByExpense = new Map<string, { memberId: string; amountMinor: number }[]>();
  (splitsResult.data ?? []).forEach((row: { expense_id: string; trip_member_id: string; amount_minor: number }) => {
    splitsByExpense.set(row.expense_id, [
      ...(splitsByExpense.get(row.expense_id) ?? []),
      { memberId: row.trip_member_id, amountMinor: row.amount_minor },
    ]);
  });

  const members = (membersResult.data ?? []).map((row: { id: string; user_id?: string | null; display_name?: string | null; email?: string | null; status?: string }) => ({
    id: row.id,
    userId: row.user_id,
    name: memberName(row),
    email: row.email,
  }));

  const expenses = expenseRows.map((row: { id: string; trip_id: string; title: string; paid_by_member_id?: string | null; paid_by_user_id?: string | null; amount_minor: number; currency_code?: string | null; notes?: string | null; updated_at?: string; spent_at?: string; category?: string }) => {
    const notes = parseNotes(row.notes);
    return {
      id: row.id,
      tripId: row.trip_id,
      title: row.title,
      category: notes.uiCategory ?? uiCategoryByDb[row.category] ?? 'miscellaneous',
      amountMinor: row.amount_minor,
      currency: row.currency_code,
      paidByMemberId: row.paid_by_member_id,
      notes: notes.text ?? null,
      spentAt: row.spent_at,
      updatedAt: row.updated_at,
      splitType: notes.splitType ?? 'equal',
      participants: participantsByExpense.get(row.id) ?? [],
      splits: splitsByExpense.get(row.id) ?? [],
      auditHistory: notes.auditHistory ?? [],
    } satisfies SplitExpenseRecord;
  });

  await cacheSplitExpenses(tripId, expenses);

  return {
    members,
    expenses,
    completedSettlements: (settlementsResult.data ?? []).map((row: { from_member_id: string; to_member_id: string; amount_minor: number; currency_code?: string | null; upi_payment_link?: string | null }) => ({
      fromMemberId: row.from_member_id,
      toMemberId: row.to_member_id,
      amountMinor: row.amount_minor,
      currency: row.currency_code,
      upiPaymentLink: row.upi_payment_link,
    })),
  };
}

export async function saveSplitExpense(tripId: string, input: ExpenseSplitInput, userId: string, existing?: SplitExpenseRecord) {
  const splits = calculateExpenseSplits(input);
  const audit = createAuditEntry(existing ? 'updated' : 'created', userId, existing, input);
  const notes = stringifyNotes({
    text: input.notes ?? null,
    splitType: input.splitType,
    uiCategory: input.category,
    auditHistory: [...(existing?.auditHistory ?? []), audit],
  });

  // Resolve the actual user_id from the trip member identified by paidByMemberId.
  // The trip_members table may have user_id (registered user), traveler_profile_id,
  // or email — at least one must be present per the DB constraint.
  // If the member has a user_id, use it for paid_by_user_id; otherwise null.
  const { data: memberRow } = await supabase
    .from('trip_members')
    .select('user_id')
    .eq('trip_id', tripId)
    .eq('id', input.paidByMemberId)
    .single();

  const memberUserId = memberRow?.user_id ?? null;

  const expensePayload = {
    trip_id: tripId,
    paid_by_member_id: input.paidByMemberId,
    paid_by_user_id: memberUserId,
    title: input.title.trim(),
    category: dbCategoryByUi[input.category],
    amount_minor: input.amountMinor,
    currency_code: input.currency,
    notes,
    created_by: userId,
  };

  const { data, error } = existing
    ? await supabase.from('expenses').update(expensePayload).eq('id', existing.id).select('id').single()
    : await supabase.from('expenses').insert(expensePayload).select('id').single();

  if (error) throw error;
  const expenseId = existing?.id ?? data?.id;
  if (!expenseId) throw new Error('Could not save expense.');

  if (existing) {
    const [deleteParticipants, deleteSplits] = await Promise.all([
      supabase.from('expense_participants').delete().eq('expense_id', expenseId),
      supabase.from('expense_splits').delete().eq('expense_id', expenseId),
    ]);
    if (deleteParticipants.error) throw deleteParticipants.error;
    if (deleteSplits.error) throw deleteSplits.error;
  }

  const participantRows = input.participantIds.map((memberId) => ({ expense_id: expenseId, trip_member_id: memberId }));
  const splitRows = splits.map((split) => ({
    expense_id: expenseId,
    trip_member_id: split.memberId,
    amount_minor: split.amountMinor,
    status: 'pending',
  }));

  const [participantsResult, splitsResult] = await Promise.all([
    supabase.from('expense_participants').insert(participantRows),
    supabase.from('expense_splits').insert(splitRows),
  ]);
  if (participantsResult.error) throw participantsResult.error;
  if (splitsResult.error) throw splitsResult.error;
  if (!existing) {
    await trackAnalyticsEvent({
      userId,
      name: 'expense_added',
      properties: {
        tripId,
        itemCategory: input.category,
        currency: input.currency,
      },
    });
  }

  return expenseId as string;
}

export async function deleteSplitExpense(expenseId: string) {
  const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
  if (error) throw error;
}

export async function markSettlementComplete(tripId: string, settlement: SettlementDraft, userId: string) {
  const { error } = await supabase.from('settlements').insert({
    trip_id: tripId,
    from_member_id: settlement.fromMemberId,
    to_member_id: settlement.toMemberId,
    amount_minor: settlement.amountMinor,
    currency_code: settlement.currency,
    status: 'completed',
    settled_at: new Date().toISOString(),
    notes: 'Confirmed by user after external payment.',
    upi_payment_link: settlement.upiPaymentLink ?? null,
    created_by: userId,
  });
  if (error) throw error;
  await trackAnalyticsEvent({
    userId,
    name: 'settlement_completed',
    properties: {
      tripId,
      currency: settlement.currency,
    },
  });
}

export async function syncQueuedExpenseOperations(tripId: string, userId: string) {
  const queue = await getQueuedExpenseOperations(tripId);
  if (queue.length === 0) return { synced: 0, conflicts: 0 };

  const remaining: QueuedExpenseOperation[] = [];
  let synced = 0;
  let conflicts = 0;

  for (const operation of queue) {
    try {
      if (operation.type === 'delete') {
        const { data } = await supabase.from('expenses').select('updated_at').eq('id', operation.expenseId).maybeSingle();
        if (data && !canApplyOfflineEdit(operation.baseUpdatedAt, (data as { updated_at: string | null | undefined }).updated_at)) {
          conflicts += 1;
          remaining.push(operation);
          continue;
        }
        await deleteSplitExpense(operation.expenseId);
      } else if (operation.type === 'settlement_complete') {
        await markSettlementComplete(tripId, operation.settlement, userId);
      } else {
        await saveSplitExpense(tripId, operation.expense, userId);
      }
      synced += 1;
    } catch {
      remaining.push(operation);
    }
  }

  await replaceQueuedExpenseOperations(tripId, remaining);
  return { synced, conflicts };
}
