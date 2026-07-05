import { describe, expect, it } from 'vitest';
import { describeExternalUrl, isSafeExternalUrl } from '../externalLinks';

describe('external URL safety', () => {
  it('allows expected web, phone, and mail links', () => {
    expect(isSafeExternalUrl('https://example.com/book')).toBe(true);
    expect(isSafeExternalUrl('http://localhost:8081')).toBe(true);
    expect(isSafeExternalUrl('tel:112')).toBe(true);
    expect(isSafeExternalUrl('mailto:support@example.com')).toBe(true);
  });

  it('blocks insecure external web links, script, data, empty, and malformed URLs', () => {
    expect(isSafeExternalUrl('http://partner.example.com/book')).toBe(false);
    expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeExternalUrl('data:text/html,hello')).toBe(false);
    expect(isSafeExternalUrl('')).toBe(false);
    expect(isSafeExternalUrl('not a url')).toBe(false);
  });

  it('describes the destination without exposing query strings', () => {
    expect(describeExternalUrl('https://partner.example.com/book?token=secret')).toBe('partner.example.com');
    expect(describeExternalUrl('tel:112')).toBe('device dialer');
  });
});
