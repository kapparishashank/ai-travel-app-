import { describe, it, expect } from 'vitest';
import { formatCurrency, isSupportedCurrency, SUPPORTED_CURRENCY_CODES } from '../currency';

describe('formatCurrency', () => {
  it('formats INR correctly', () => {
    expect(formatCurrency(1500, 'INR')).toContain('₹');
    expect(formatCurrency(1500, 'INR')).toContain('1,500');
  });

  it('formats USD correctly', () => {
    expect(formatCurrency(500, 'USD')).toContain('$');
    expect(formatCurrency(500.5, 'USD')).toContain('500.50');
  });

  it('formats EUR correctly', () => {
    expect(formatCurrency(200, 'EUR')).toContain('€');
  });

  it('formats JPY with zero decimals', () => {
    expect(formatCurrency(1000, 'JPY')).toContain('¥');
    expect(formatCurrency(1000, 'JPY')).not.toContain('.');
  });

  it('handles zero', () => {
    expect(formatCurrency(0, 'USD')).toContain('$0');
  });

  it('handles negative values', () => {
    expect(formatCurrency(-100, 'INR')).toContain('(') || expect(formatCurrency(-100, 'INR')).toContain('-');
  });

  it('defaults to INR when invalid code given', () => {
    expect(formatCurrency(100, 'XYZ')).toContain('₹');
  });

  it('supports all required codes', () => {
    for (const c of SUPPORTED_CURRENCY_CODES) {
      expect(isSupportedCurrency(c)).toBe(true);
    }
  });
});
