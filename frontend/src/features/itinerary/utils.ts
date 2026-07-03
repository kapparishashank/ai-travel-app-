import type { ItineraryActivity } from '../trips/types';

export function timeToMinutes(time?: string | null) {
  if (!time || !/^\d{2}:\d{2}/.test(time)) return null;
  const [hours, minutes] = time.slice(0, 5).split(':').map(Number);
  return hours * 60 + minutes;
}

export function durationLabel(start?: string | null, end?: string | null) {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) return 'Flexible';
  const total = endMinutes - startMinutes;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return [hours ? `${hours}h` : '', minutes ? `${minutes}m` : ''].filter(Boolean).join(' ');
}

export function hasTimeOverlap(
  candidate: { id?: string; local_start_time?: string | null; local_end_time?: string | null },
  activities: ItineraryActivity[],
) {
  const start = timeToMinutes(candidate.local_start_time);
  const end = timeToMinutes(candidate.local_end_time);
  if (start === null || end === null || end <= start) return false;

  return activities.some((activity) => {
    if (activity.id === candidate.id) return false;
    const otherStart = timeToMinutes(activity.local_start_time);
    const otherEnd = timeToMinutes(activity.local_end_time);
    if (otherStart === null || otherEnd === null || otherEnd <= otherStart) return false;
    return start < otherEnd && end > otherStart;
  });
}

export function getDataStatus(activity: ItineraryActivity) {
  if (activity.status === 'booked' || activity.metadata?.booking_status === 'confirmed') return 'Confirmed booking';
  if (activity.source === 'imported' || activity.metadata?.external_source) return 'External data';
  return 'AI estimate';
}

export function getDayTotal(activities: ItineraryActivity[]) {
  return activities.reduce((sum, activity) => sum + (activity.estimated_cost_minor ?? 0), 0);
}

export function sortActivities(activities: ItineraryActivity[]) {
  return [...activities].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return (a.local_start_time ?? '').localeCompare(b.local_start_time ?? '');
  });
}
