export const SUPPORTED_CURRENCY_CODES = [
  'INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD', 'JPY',
] as const;

export type CurrencyCode = typeof SUPPORTED_CURRENCY_CODES[number];

export function isSupportedCurrency(code: unknown): code is CurrencyCode {
  return typeof code === 'string' && (SUPPORTED_CURRENCY_CODES as readonly string[]).includes(code);
}

/**
 * Formats a numeric amount for display using the given currency code.
 * Does NOT convert amounts; just formats the value using Intl.NumberFormat.
 * Amounts are assumed to already be in the correct currency unit (e.g. rupees for INR,
 * dollars for USD, yen for JPY) unless the caller explicitly passes minor units.
 */
export function formatCurrency(
  amount: number,
  currency: CurrencyCode | string = 'INR',
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
): string {
  const code = isSupportedCurrency(currency) ? currency : 'INR';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code,
    minimumFractionDigits: options?.minimumFractionDigits ?? (code === 'JPY' ? 0 : 2),
    maximumFractionDigits: options?.maximumFractionDigits ?? (code === 'JPY' ? 0 : 2),
  }).format(amount);
}

/**
 * Formats a paise/minor amount (divide-by-100) for Indian travel contexts
 * where INR is explicitly required. Keeps INR format and behaviour.
 */
export function formatINR(paise: number, options?: { showDecimal?: boolean; compact?: boolean }): string {
  const rupees = paise / 100;
  if (options?.compact) {
    if (rupees >= 10_00_000) return `₹${(rupees / 10_00_000).toFixed(1)}L`;
    if (rupees >= 1_000) return `₹${(rupees / 1_000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: options?.showDecimal ? 2 : 0,
    maximumFractionDigits: options?.showDecimal ? 2 : 0,
  }).format(rupees);
}

export function formatINRWithLabel(paise: number, label: string): string {
  return `${formatINR(paise)} ${label}`;
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export function getBudgetTier(totalRupees: number, numDays: number, numPeople: number): 'budget' | 'standard' | 'premium' {
  const perDayPerPerson = totalRupees / Math.max(1, numDays) / Math.max(1, numPeople);
  if (perDayPerPerson < 1500) return 'budget';
  if (perDayPerPerson < 5000) return 'standard';
  return 'premium';
}

export function calculateMinSettlements(
  balances: { userId: string; name: string; net: number }[]
): { fromId: string; fromName: string; toId: string; toName: string; amountPaise: number }[] {
  const settlements: { fromId: string; fromName: string; toId: string; toName: string; amountPaise: number }[] = [];
  const creditors = balances.filter(b => b.net > 0).map(b => ({ ...b }));
  const debtors = balances.filter(b => b.net < 0).map(b => ({ ...b, net: Math.abs(b.net) }));
  let i = 0, j = 0;
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
