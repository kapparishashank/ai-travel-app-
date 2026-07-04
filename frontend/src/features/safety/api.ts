import { supabase } from '../../lib/supabase';
import { cacheSafetyInfo, getCachedSafetyInfo } from './storage';
import { nextCheckinDueAt } from './schedule';
import type { SafetyInfo, SafetyInfoLabel, SafetySession, TrustedContact } from './types';

function normalizeEmergencyNumbers(numbers: Record<string, string>, lastUpdated: string, dataLabel: SafetyInfoLabel) {
  return Object.entries(numbers).map(([key, number]) => ({
    label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase()),
    number,
    source: dataLabel === '[MOCK DATA]' ? '[MOCK DATA] safety-info function' : 'Safety information provider',
    lastUpdated,
    dataLabel,
  }));
}

function normalizePlaces(rows: any[], lastUpdated: string, dataLabel: SafetyInfoLabel, source: string) {
  return rows.map((row) => ({
    name: row.name,
    phone: row.phone,
    distanceKm: row.distanceKm,
    note: row.note,
    source,
    lastUpdated,
    dataLabel,
  }));
}

export async function fetchSafetyInfo(destination: string): Promise<SafetyInfo> {
  const { data, error } = await supabase.functions.invoke('safety-info', {
    body: { destination, travelerType: 'friends' },
  });

  if (error || (data as any)?.error) {
    const cached = await getCachedSafetyInfo(destination);
    if (cached) return cached;
    throw error ?? new Error((data as any)?.message ?? 'Could not fetch safety information.');
  }

  const payload = data as any;
  const dataLabel = (payload.data_label ?? '[MOCK DATA]') as SafetyInfoLabel;
  const lastUpdated = payload.lastUpdated ?? new Date().toISOString();
  const info: SafetyInfo = {
    destination: payload.destination ?? destination,
    dataLabel,
    disclaimer: payload.disclaimer,
    sourceNote: payload.sourceNote,
    lastUpdated,
    emergencyNumbers: normalizeEmergencyNumbers(payload.emergencyNumbers ?? {}, lastUpdated, dataLabel),
    nearbyHospitals: normalizePlaces(payload.nearbyHospitals ?? [], lastUpdated, dataLabel, 'Nearby hospital provider'),
    nearbyPoliceStations: normalizePlaces(payload.nearbyPoliceStations ?? [], lastUpdated, dataLabel, 'Nearby police provider'),
    safetyNotes: payload.safetyNotes ?? [],
    weatherWarning: payload.weatherAlert
      ? {
          title: 'Weather warning',
          detail: payload.weatherAlert,
          source: 'Weather provider',
          lastUpdated,
          dataLabel,
        }
      : {
          title: 'No active mock weather warning',
          detail: 'No weather warning is available in mock data. Verify the live forecast before outdoor travel.',
          source: dataLabel === '[MOCK DATA]' ? '[MOCK DATA] safety-info function' : 'Weather provider',
          lastUpdated,
          dataLabel,
        },
  };
  await cacheSafetyInfo(destination, info);
  return info;
}

export async function fetchTrustedContacts(userId: string): Promise<TrustedContact[]> {
  const { data, error } = await supabase
    .from('trusted_contacts')
    .select('*')
    .eq('user_id', userId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as TrustedContact[];
}

export async function saveTrustedContact(userId: string, contact: Partial<TrustedContact>) {
  const payload = {
    user_id: userId,
    name: contact.name?.trim(),
    phone: contact.phone?.trim(),
    email: contact.email?.trim() || null,
    relationship: contact.relationship?.trim() || null,
    is_primary: Boolean(contact.is_primary),
  };
  if (contact.id) {
    const { error } = await supabase.from('trusted_contacts').update(payload).eq('id', contact.id);
    if (error) throw error;
    return contact.id;
  }
  const { data, error } = await supabase.from('trusted_contacts').insert(payload).select('id').single();
  if (error) throw error;
  return data?.id as string;
}

export async function deleteTrustedContact(contactId: string) {
  const { error } = await supabase.from('trusted_contacts').delete().eq('id', contactId);
  if (error) throw error;
}

export async function fetchActiveSafetySession(userId: string): Promise<SafetySession | null> {
  const { data, error } = await supabase
    .from('safety_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as SafetySession | null) ?? null;
}

export async function startSafetySession(userId: string, intervalMinutes: number, tripId?: string | null) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('safety_sessions')
    .insert({
      user_id: userId,
      trip_id: tripId ?? null,
      status: 'active',
      checkin_interval_minutes: intervalMinutes,
      started_at: now,
      next_checkin_due_at: nextCheckinDueAt(now, intervalMinutes),
      escalation_message: 'If I miss a check-in, show an in-app warning first. Do not claim emergency dispatch.',
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as SafetySession;
}

export async function stopSafetySession(sessionId: string) {
  const { error } = await supabase
    .from('safety_sessions')
    .update({ status: 'completed', ends_at: new Date().toISOString(), next_checkin_due_at: null })
    .eq('id', sessionId);
  if (error) throw error;
}

export async function createSafeCheckin(session: SafetySession, message: string) {
  const now = new Date().toISOString();
  const nextDue = nextCheckinDueAt(now, session.checkin_interval_minutes);
  const [checkinResult, sessionResult] = await Promise.all([
    supabase.from('safety_checkins').insert({
      safety_session_id: session.id,
      user_id: session.user_id,
      status: 'ok',
      due_at: session.next_checkin_due_at ?? now,
      checked_in_at: now,
      message: message || 'I am safe.',
      latitude: null,
      longitude: null,
    }),
    supabase
      .from('safety_sessions')
      .update({ last_checkin_at: now, next_checkin_due_at: nextDue })
      .eq('id', session.id),
  ]);
  if (checkinResult.error) throw checkinResult.error;
  if (sessionResult.error) throw sessionResult.error;
}

export async function reportIncorrectSafetyDetail(userId: string, destination: string, message: string) {
  const { error } = await supabase.from('user_feedback').insert({
    user_id: userId,
    feedback_type: 'safety',
    message,
    metadata: { destination, feature: 'safety' },
  });
  if (error) throw error;
}
