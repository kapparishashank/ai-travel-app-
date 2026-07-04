import { describe, expect, it } from 'vitest';
import {
  allocateMinorUnits,
  calculateExpenseSplits,
  calculateMemberBalances,
  canApplyOfflineEdit,
  generateMinimizedSettlements,
} from '../calculations';
import type { ExpenseSplitInput, SplitExpenseRecord, SplitMember } from '../types';

const members: SplitMember[] = [
  { id: 'amit', name: 'Amit' },
  { id: 'diya', name: 'Diya' },
  { id: 'neha', name: 'Neha' },
  { id: 'rahul', name: 'Rahul' },
];

function input(overrides: Partial<ExpenseSplitInput>): ExpenseSplitInput {
  return {
    title: 'Dinner',
    amountMinor: 4000,
    currency: 'INR',
    category: 'food',
    paidByMemberId: 'amit',
    participantIds: ['amit', 'diya', 'neha', 'rahul'],
    splitType: 'equal',
    ...overrides,
  };
}

function expense(overrides: Partial<SplitExpenseRecord>): SplitExpenseRecord {
  const baseInput = input({});
  return {
    id: 'expense-1',
    tripId: 'goa',
    title: baseInput.title,
    category: baseInput.category,
    amountMinor: baseInput.amountMinor,
    currency: baseInput.currency,
    paidByMemberId: baseInput.paidByMemberId,
    notes: null,
    spentAt: '2026-07-04T10:00:00.000Z',
    updatedAt: '2026-07-04T10:00:00.000Z',
    splitType: baseInput.splitType,
    participants: baseInput.participantIds,
    splits: calculateExpenseSplits(baseInput),
    auditHistory: [],
    ...overrides,
  };
}

describe('split expense calculations', () => {
  it('splits equal expenses and rounds fairly', () => {
    expect(allocateMinorUnits(100, { amit: 1, diya: 1, neha: 1 })).toEqual([
      { memberId: 'amit', amountMinor: 34 },
      { memberId: 'diya', amountMinor: 33 },
      { memberId: 'neha', amountMinor: 33 },
    ]);
  });

  it('validates exact amount splits', () => {
    expect(
      calculateExpenseSplits(
        input({
          splitType: 'exact',
          exactAmountsMinor: { amit: 1000, diya: 1000, neha: 1000, rahul: 1000 },
        })
      )
    ).toHaveLength(4);

    expect(() =>
      calculateExpenseSplits(
        input({
          splitType: 'exact',
          exactAmountsMinor: { amit: 1000, diya: 1000, neha: 1000, rahul: 900 },
        })
      )
    ).toThrow('Exact split totals must equal the expense total.');
  });

  it('validates percentage splits and allocates by weight', () => {
    expect(
      calculateExpenseSplits(
        input({
          splitType: 'percentage',
          percentages: { amit: 40, diya: 30, neha: 20, rahul: 10 },
        })
      )
    ).toEqual([
      { memberId: 'amit', amountMinor: 1600 },
      { memberId: 'diya', amountMinor: 1200 },
      { memberId: 'neha', amountMinor: 800 },
      { memberId: 'rahul', amountMinor: 400 },
    ]);

    expect(() =>
      calculateExpenseSplits(
        input({
          splitType: 'percentage',
          percentages: { amit: 40, diya: 30, neha: 20, rahul: 9 },
        })
      )
    ).toThrow('Percentage split must total 100%.');
  });

  it('supports shares splits', () => {
    expect(
      calculateExpenseSplits(
        input({
          splitType: 'shares',
          amountMinor: 6000,
          shares: { amit: 2, diya: 1, neha: 1, rahul: 2 },
        })
      )
    ).toEqual([
      { memberId: 'amit', amountMinor: 2000 },
      { memberId: 'diya', amountMinor: 1000 },
      { memberId: 'neha', amountMinor: 1000 },
      { memberId: 'rahul', amountMinor: 2000 },
    ]);
  });

  it('supports selected-member equal splits', () => {
    expect(
      calculateExpenseSplits(
        input({
          splitType: 'selected_members',
          amountMinor: 3000,
          participantIds: ['amit', 'rahul'],
        })
      )
    ).toEqual([
      { memberId: 'amit', amountMinor: 1500 },
      { memberId: 'rahul', amountMinor: 1500 },
    ]);
  });

  it('generates minimized settlements for a three-member scenario', () => {
    const threeMembers = members.slice(0, 3);
    const expenses = [
      expense({ id: 'e1', amountMinor: 3000, paidByMemberId: 'amit', splits: calculateExpenseSplits(input({ amountMinor: 3000, participantIds: ['amit', 'diya', 'neha'] })) }),
      expense({ id: 'e2', amountMinor: 900, paidByMemberId: 'diya', splits: calculateExpenseSplits(input({ amountMinor: 900, paidByMemberId: 'diya', participantIds: ['amit', 'diya', 'neha'] })) }),
    ];
    const balances = calculateMemberBalances(expenses, threeMembers);

    expect(generateMinimizedSettlements(balances, 'INR')).toEqual([
      { fromMemberId: 'neha', toMemberId: 'amit', amountMinor: 1300, currency: 'INR' },
      { fromMemberId: 'diya', toMemberId: 'amit', amountMinor: 400, currency: 'INR' },
    ]);
  });

  it('handles the four-student Hyderabad-to-Goa trip group', () => {
    const expenses = [
      expense({ id: 'tickets', title: 'Train tickets', amountMinor: 12000, paidByMemberId: 'amit', splits: calculateExpenseSplits(input({ amountMinor: 12000 })) }),
      expense({ id: 'stay', title: 'Beach stay advance', amountMinor: 16000, paidByMemberId: 'diya', category: 'accommodation', splits: calculateExpenseSplits(input({ amountMinor: 16000, paidByMemberId: 'diya' })) }),
      expense({ id: 'scooters', title: 'Scooter fuel', amountMinor: 4000, paidByMemberId: 'neha', category: 'fuel', splits: calculateExpenseSplits(input({ amountMinor: 4000, paidByMemberId: 'neha' })) }),
    ];

    const balances = calculateMemberBalances(expenses, members);
    expect(balances.find((balance) => balance.memberId === 'rahul')?.netMinor).toBe(-8000);
    expect(generateMinimizedSettlements(balances, 'INR')).toEqual([
      { fromMemberId: 'rahul', toMemberId: 'diya', amountMinor: 8000, currency: 'INR' },
      { fromMemberId: 'neha', toMemberId: 'amit', amountMinor: 4000, currency: 'INR' },
    ]);
  });

  it('keeps offline conflicting edits from overwriting newer server data', () => {
    expect(canApplyOfflineEdit('2026-07-04T10:00:00.000Z', '2026-07-04T09:59:59.000Z')).toBe(true);
    expect(canApplyOfflineEdit('2026-07-04T10:00:00.000Z', '2026-07-04T10:05:00.000Z')).toBe(false);
  });
});
