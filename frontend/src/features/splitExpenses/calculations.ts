import type {
  AuditEntry,
  ExpenseSplit,
  ExpenseSplitInput,
  MemberBalance,
  SettlementDraft,
  SplitExpenseRecord,
  SplitMember,
} from './types';

function assertPositiveAmount(amountMinor: number) {
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    throw new Error('Expense amount must be a positive minor-unit integer.');
  }
}

function uniqueSorted(ids: string[]) {
  return Array.from(new Set(ids)).sort((a, b) => a.localeCompare(b));
}

function validateParticipants(ids: string[]) {
  const participantIds = uniqueSorted(ids);
  if (participantIds.length === 0) {
    throw new Error('Select at least one participant.');
  }
  return participantIds;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

export function allocateMinorUnits(totalMinor: number, weightsByMember: Record<string, number>): ExpenseSplit[] {
  assertPositiveAmount(totalMinor);
  const entries = Object.entries(weightsByMember)
    .filter(([, weight]) => weight > 0)
    .sort(([a], [b]) => a.localeCompare(b));

  if (entries.length === 0) {
    throw new Error('At least one split weight must be positive.');
  }

  const totalWeight = sum(entries.map(([, weight]) => weight));
  if (totalWeight <= 0) {
    throw new Error('Split weights must be positive.');
  }

  const allocated = entries.map(([memberId, weight]) => {
    const raw = (totalMinor * weight) / totalWeight;
    const amountMinor = Math.floor(raw);
    return { memberId, amountMinor, remainder: raw - amountMinor };
  });

  let remainder = totalMinor - sum(allocated.map((item) => item.amountMinor));
  allocated
    .slice()
    .sort((a, b) => b.remainder - a.remainder || a.memberId.localeCompare(b.memberId))
    .forEach((item) => {
      if (remainder > 0) {
        item.amountMinor += 1;
        remainder -= 1;
      }
    });

  return allocated
    .map(({ memberId, amountMinor }) => ({ memberId, amountMinor }))
    .sort((a, b) => a.memberId.localeCompare(b.memberId));
}

export function calculateExpenseSplits(input: ExpenseSplitInput): ExpenseSplit[] {
  assertPositiveAmount(input.amountMinor);
  const participantIds = validateParticipants(input.participantIds);

  if (!participantIds.includes(input.paidByMemberId)) {
    throw new Error('The payer must be included as a trip member.');
  }

  if (input.splitType === 'exact') {
    const exact = input.exactAmountsMinor ?? {};
    const splits = participantIds.map((memberId) => ({
      memberId,
      amountMinor: exact[memberId] ?? 0,
    }));
    if (splits.some((split) => !Number.isInteger(split.amountMinor) || split.amountMinor < 0)) {
      throw new Error('Exact split amounts cannot be negative.');
    }
    if (sum(splits.map((split) => split.amountMinor)) !== input.amountMinor) {
      throw new Error('Exact split totals must equal the expense total.');
    }
    return splits;
  }

  if (input.splitType === 'percentage') {
    const percentages = input.percentages ?? {};
    const totalPercentage = participantIds.reduce((total, memberId) => total + (percentages[memberId] ?? 0), 0);
    if (Math.abs(totalPercentage - 100) > 0.0001) {
      throw new Error('Percentage split must total 100%.');
    }
    return allocateMinorUnits(
      input.amountMinor,
      Object.fromEntries(participantIds.map((memberId) => [memberId, percentages[memberId] ?? 0]))
    );
  }

  if (input.splitType === 'shares') {
    const shares = input.shares ?? {};
    return allocateMinorUnits(
      input.amountMinor,
      Object.fromEntries(participantIds.map((memberId) => [memberId, shares[memberId] ?? 0]))
    );
  }

  return allocateMinorUnits(input.amountMinor, Object.fromEntries(participantIds.map((memberId) => [memberId, 1])));
}

export function calculateMemberBalances(expenses: SplitExpenseRecord[], members: SplitMember[]): MemberBalance[] {
  const balances = new Map<string, MemberBalance>();
  members.forEach((member) => balances.set(member.id, { memberId: member.id, paidMinor: 0, owedMinor: 0, netMinor: 0 }));

  expenses.forEach((expense) => {
    const payer = balances.get(expense.paidByMemberId);
    if (payer) {
      payer.paidMinor += expense.amountMinor;
      payer.netMinor += expense.amountMinor;
    }
    expense.splits.forEach((split) => {
      const balance = balances.get(split.memberId);
      if (balance) {
        balance.owedMinor += split.amountMinor;
        balance.netMinor -= split.amountMinor;
      }
    });
  });

  return Array.from(balances.values()).sort((a, b) => a.memberId.localeCompare(b.memberId));
}

export function generateMinimizedSettlements(
  balances: MemberBalance[],
  currency: string,
  existingCompleted: SettlementDraft[] = []
): SettlementDraft[] {
  const completedKey = (settlement: SettlementDraft) =>
    `${settlement.fromMemberId}:${settlement.toMemberId}:${settlement.amountMinor}`;
  const completed = new Set(existingCompleted.map(completedKey));
  const debtors = balances
    .filter((balance) => balance.netMinor < 0)
    .map((balance) => ({ memberId: balance.memberId, amountMinor: -balance.netMinor }))
    .sort((a, b) => b.amountMinor - a.amountMinor || a.memberId.localeCompare(b.memberId));
  const creditors = balances
    .filter((balance) => balance.netMinor > 0)
    .map((balance) => ({ memberId: balance.memberId, amountMinor: balance.netMinor }))
    .sort((a, b) => b.amountMinor - a.amountMinor || a.memberId.localeCompare(b.memberId));

  const settlements: SettlementDraft[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amountMinor = Math.min(debtor.amountMinor, creditor.amountMinor);
    const settlement = {
      fromMemberId: debtor.memberId,
      toMemberId: creditor.memberId,
      amountMinor,
      currency,
    };
    if (!completed.has(completedKey(settlement))) {
      settlements.push(settlement);
    }

    debtor.amountMinor -= amountMinor;
    creditor.amountMinor -= amountMinor;
    if (debtor.amountMinor === 0) debtorIndex += 1;
    if (creditor.amountMinor === 0) creditorIndex += 1;
  }

  return settlements;
}

export function createAuditEntry(action: AuditEntry['action'], userId: string, before?: unknown, after?: unknown): AuditEntry {
  return {
    action,
    userId,
    at: new Date().toISOString(),
    before,
    after,
  };
}

export function canApplyOfflineEdit(baseUpdatedAt: string | null | undefined, remoteUpdatedAt: string | null | undefined) {
  if (!baseUpdatedAt || !remoteUpdatedAt) return true;
  return new Date(remoteUpdatedAt).getTime() <= new Date(baseUpdatedAt).getTime();
}
