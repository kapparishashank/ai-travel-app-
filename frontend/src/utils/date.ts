// Date utilities — all dates stored/returned as ISO 8601 strings

/**
 * Formats an ISO date string (YYYY-MM-DD) to a readable label.
 * e.g. "2025-10-01" → "Wed, 1 Oct"
 */
export function formatDate(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

/**
 * Formats an ISO datetime string to a readable time.
 * e.g. "2025-10-01T06:00:00+05:30" → "6:00 AM"
 */
export function formatTime(isoDateTime: string): string {
  return new Date(isoDateTime).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats an ISO datetime to date + time.
 * e.g. "2025-10-01T06:00:00+05:30" → "1 Oct · 6:00 AM"
 */
export function formatDateTime(isoDateTime: string): string {
  const d = new Date(isoDateTime);
  const date = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${date} · ${time}`;
}

/**
 * Returns the number of days between two ISO dates (inclusive).
 * e.g. "2025-10-01", "2025-10-05" → 5
 */
export function tripDurationDays(startDate: string, endDate: string): number {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

/**
 * Returns "X days ago", "Today", "Tomorrow", or a formatted date.
 */
export function relativeDate(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 0) return `In ${diff} days`;
  return `${Math.abs(diff)} days ago`;
}

/**
 * Formats duration in minutes to human-readable string.
 * e.g. 510 → "8h 30m"
 */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Returns today's date as ISO YYYY-MM-DD string.
 */
export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Adds N days to an ISO date string.
 */
export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/**
 * Returns true if an ISO date is in the past.
 */
export function isPast(isoDate: string): boolean {
  return new Date(isoDate + 'T00:00:00') < new Date(todayISO() + 'T00:00:00');
}

/**
 * Returns a date range string like "1–5 Oct 2025" or "28 Sep – 3 Oct 2025".
 */
export function formatDateRange(startDate: string, endDate: string): string {
  const s = new Date(startDate + 'T00:00:00');
  const e = new Date(endDate + 'T00:00:00');
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  const startStr = s.toLocaleDateString('en-IN', { day: 'numeric', month: sameMonth ? undefined : 'short' });
  const endStr = e.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${startStr}–${endStr}`;
}
