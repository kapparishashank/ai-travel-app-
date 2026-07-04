import { storage } from '../../utils/storage';
import { supabase } from '../../lib/supabase';
import type { AnalyticsEventName, AnalyticsPreference, AnalyticsProperties } from './types';

const ANALYTICS_LOCAL_CONSENT_KEY = 'travelai:analytics-consent';
const blockedPropertyPatterns = [/email/i, /phone/i, /name/i, /token/i, /secret/i, /password/i, /latitude/i, /longitude/i, /precise/i, /location/i, /card/i, /upi/i];

export function sanitizeAnalyticsProperties(properties: AnalyticsProperties = {}) {
  return Object.fromEntries(
    Object.entries(properties).filter(([key, value]) => {
      if (value === undefined) return false;
      return !blockedPropertyPatterns.some((pattern) => pattern.test(key));
    }),
  );
}

export async function getAnalyticsConsent(userId?: string | null) {
  const local = await storage.getItem(ANALYTICS_LOCAL_CONSENT_KEY);
  if (local === 'disabled') return false;
  if (!userId) return local !== 'disabled';

  const { data, error } = await supabase
    .from('analytics_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return local !== 'disabled';
  if (!data) return local !== 'disabled';
  return Boolean((data as AnalyticsPreference).analytics_enabled);
}

export async function setAnalyticsConsent(userId: string | null | undefined, enabled: boolean) {
  await storage.setItem(ANALYTICS_LOCAL_CONSENT_KEY, enabled ? 'enabled' : 'disabled');
  if (!userId) return;
  const { error } = await supabase.from('analytics_preferences').upsert({
    user_id: userId,
    analytics_enabled: enabled,
  });
  if (error) throw error;
}

export async function trackAnalyticsEvent({
  userId,
  name,
  properties,
  sessionId,
}: {
  userId?: string | null;
  name: AnalyticsEventName;
  properties?: AnalyticsProperties;
  sessionId?: string;
}) {
  if (!userId) return { tracked: false, reason: 'no_user' };
  const consent = await getAnalyticsConsent(userId);
  if (!consent) return { tracked: false, reason: 'consent_disabled' };

  const { error } = await supabase.from('analytics_events').insert({
    user_id: userId,
    event_name: name,
    properties: sanitizeAnalyticsProperties(properties),
    session_id: sessionId ?? null,
  });
  if (error) throw error;
  return { tracked: true };
}
