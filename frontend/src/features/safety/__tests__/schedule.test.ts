import { describe, expect, it } from 'vitest';
import { formatInterval, isCheckinMissed, missedCheckinWarning, nextCheckinDueAt } from '../schedule';
import type { SafetySession } from '../types';

const session: SafetySession = {
  id: 'session',
  user_id: 'user',
  status: 'active',
  checkin_interval_minutes: 90,
  started_at: '2026-07-04T10:00:00.000Z',
  next_checkin_due_at: '2026-07-04T11:30:00.000Z',
};

describe('safety check-in schedule', () => {
  it('calculates the next due time from the manual check-in time', () => {
    expect(nextCheckinDueAt('2026-07-04T10:00:00.000Z', 90)).toBe('2026-07-04T11:30:00.000Z');
  });

  it('rejects invalid schedule intervals', () => {
    expect(() => nextCheckinDueAt('2026-07-04T10:00:00.000Z', 0)).toThrow('Check-in interval must be positive.');
  });

  it('flags missed active check-ins only after the due time', () => {
    expect(isCheckinMissed(session, '2026-07-04T11:29:59.000Z')).toBe(false);
    expect(isCheckinMissed(session, '2026-07-04T11:30:01.000Z')).toBe(true);
    expect(isCheckinMissed({ ...session, status: 'completed' }, '2026-07-04T12:00:00.000Z')).toBe(false);
  });

  it('returns an in-app warning without claiming emergency dispatch', () => {
    const warning = missedCheckinWarning(session, '2026-07-04T12:00:00.000Z');
    expect(warning).toContain('in-app warning only');
    expect(warning).not.toContain('contacted emergency services');
  });

  it('formats check-in intervals', () => {
    expect(formatInterval(30)).toBe('30 min');
    expect(formatInterval(60)).toBe('1 hr');
    expect(formatInterval(150)).toBe('2 hr 30 min');
  });
});
