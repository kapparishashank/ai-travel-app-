// INR (Indian Rupee) currency formatting utilities
// Database stores all monetary values in paise (1 rupee = 100 paise)

/**
 * Formats paise to a human-readable INR string.
 * e.g. 150000 paise → "₹1,500"
 */
export function formatINR(paise: number, options?: { showDecimal?: boolean; compact?: boolean }): string {
  const rupees = paise / 100;

  if (options?.compact) {
    if (rupees >= 10_00_000) {
      return `₹${(rupees / 10_00_000).toFixed(1)}L`;
    }
    if (rupees >= 1_000) {
      return `₹${(rupees / 1_000).toFixed(1)}K`;
    }
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: options?.showDecimal ? 2 : 0,
    maximumFractionDigits: options?.showDecimal ? 2 : 0,
  }).format(rupees);
}

/**
 * Converts rupees to paise for DB storage.
 * e.g. 1500 → 150000
 */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Converts paise to rupees for display/calculation.
 * e.g. 150000 → 1500
 */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/**
 * Formats a price with its data label for display.
 * e.g. "₹1,500 [AI ESTIMATE]"
 */
export function formatINRWithLabel(paise: number, label: string): string {
  return `${formatINR(paise)} ${label}`;
}

/**
 * Returns a budget tier label based on rupees per day per person.
 */
export function getBudgetTier(totalRupees: number, numDays: number, numPeople: number): 'budget' | 'standard' | 'premium' {
  const perDayPerPerson = totalRupees / Math.max(1, numDays) / Math.max(1, numPeople);
  if (perDayPerPerson < 1500) return 'budget';
  if (perDayPerPerson < 5000) return 'standard';
  return 'premium';
}

/**
 * Calculates minimum settlement transactions from member balances.
 * Returns array of { from, to, amount } pairs.
 */
export function calculateMinSettlements(
  balances: { userId: string; name: string; net: number }[]
): { fromId: string; fromName: string; toId: string; toName: string; amountPaise: number }[] {
  const settlements: { fromId: string; fromName: string; toId: string; toName: string; amountPaise: number }[] = [];

  // Separate creditors and debtors
  const creditors = balances.filter(b => b.net > 0).map(b => ({ ...b }));
  const debtors = balances.filter(b => b.net < 0).map(b => ({ ...b, net: Math.abs(b.net) }));

  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debt = debtors[i];
    const credit = creditors[j];
    const amount = Math.min(debt.net, credit.net);

    if (amount > 0) {
      settlements.push({
        fromId: debt.userId,
        fromName: debt.name,
        toId: credit.userId,
        toName: credit.name,
        amountPaise: amount,
      });
    }

    debt.net -= amount;
    credit.net -= amount;

    if (debt.net === 0) i++;
    if (credit.net === 0) j++;
  }

  return settlements;
}
