import type { SafetySession } from './types';

export function nextCheckinDueAt(fromIso: string, intervalMinutes: number) {
  if (!Number.isFinite(intervalMinutes) || intervalMinutes <= 0) {
    throw new Error('Check-in interval must be positive.');
  }
  return new Date(new Date(fromIso).getTime() + intervalMinutes * 60_000).toISOString();
}

export function isCheckinMissed(session: Pick<SafetySession, 'status' | 'next_checkin_due_at'>, nowIso: string) {
  if (session.status !== 'active' || !session.next_checkin_due_at) return false;
  return new Date(session.next_checkin_due_at).getTime() < new Date(nowIso).getTime();
}

export function missedCheckinWarning(session: SafetySession, nowIso: string) {
  if (!isCheckinMissed(session, nowIso)) return null;
  return 'A check-in is overdue. This is an in-app warning only; TravelAI has not contacted emergency services or trusted contacts.';
}

export function formatInterval(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours} hr ${remaining} min` : `${hours} hr`;
}
