export const expenseCategories = [
  'transport',
  'accommodation',
  'food',
  'activities',
  'shopping',
  'fuel',
  'emergency',
  'miscellaneous',
] as const;

export type SplitExpenseCategory = (typeof expenseCategories)[number];
export type SplitType = 'equal' | 'exact' | 'percentage' | 'shares' | 'selected_members';

export type SplitMember = {
  id: string;
  userId?: string | null;
  name: string;
  email?: string | null;
};

export type ExpenseSplitInput = {
  title: string;
  amountMinor: number;
  currency: string;
  category: SplitExpenseCategory;
  notes?: string | null;
  paidByMemberId: string;
  participantIds: string[];
  splitType: SplitType;
  exactAmountsMinor?: Record<string, number>;
  percentages?: Record<string, number>;
  shares?: Record<string, number>;
};

export type ExpenseSplit = {
  memberId: string;
  amountMinor: number;
};

export type SplitExpenseRecord = {
  id: string;
  tripId: string;
  title: string;
  category: SplitExpenseCategory;
  amountMinor: number;
  currency: string;
  paidByMemberId: string;
  notes?: string | null;
  spentAt: string;
  updatedAt: string;
  splitType: SplitType;
  participants: string[];
  splits: ExpenseSplit[];
  auditHistory: AuditEntry[];
};

export type AuditEntry = {
  action: 'created' | 'updated' | 'deleted' | 'settlement_completed';
  userId: string;
  at: string;
  before?: unknown;
  after?: unknown;
};

export type MemberBalance = {
  memberId: string;
  paidMinor: number;
  owedMinor: number;
  netMinor: number;
};

export type SettlementDraft = {
  fromMemberId: string;
  toMemberId: string;
  amountMinor: number;
  currency: string;
  upiPaymentLink?: string | null;
};

export type QueuedExpenseOperation =
  | {
      id: string;
      type: 'add' | 'update';
      tripId: string;
      expense: ExpenseSplitInput;
      baseUpdatedAt?: string | null;
      createdAt: string;
    }
  | {
      id: string;
      type: 'delete';
      tripId: string;
      expenseId: string;
      baseUpdatedAt?: string | null;
      createdAt: string;
    }
  | {
      id: string;
      type: 'settlement_complete';
      tripId: string;
      settlement: SettlementDraft;
      createdAt: string;
    };
