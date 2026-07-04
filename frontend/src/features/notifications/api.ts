import { Platform } from 'react-native';
import { supabase } from '../../lib/supabase';
import type { NotificationCategory, NotificationPreferences, PushPermissionStatus, TravelNotification } from './types';

const defaultCategoryPrefs: Record<NotificationCategory, boolean> = {
  price_drop: true,
  upcoming_trip: true,
  packing_reminder: true,
  expense_reminder: true,
  weather_warning: true,
  safety_checkin: true,
  booking_update: true,
  system_message: true,
};

export function defaultNotificationPreferences(userId: string): NotificationPreferences {
  return {
    user_id: userId,
    ...defaultCategoryPrefs,
    push_enabled: false,
    push_permission_status: 'unknown',
    push_token: null,
  };
}

export async function fetchNotifications(): Promise<TravelNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []).map(normalizeNotification);
}

export async function markNotificationRead(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ status: 'read', read_at: new Date().toISOString() })
    .eq('id', notificationId);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ status: 'read', read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('status', 'unread');
  if (error) throw error;
}

export async function fetchNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const defaults = defaultNotificationPreferences(userId);
    await saveNotificationPreferences(defaults);
    return defaults;
  }
  return { ...defaultNotificationPreferences(userId), ...(data as any) };
}

export async function saveNotificationPreferences(preferences: NotificationPreferences) {
  const { error } = await supabase.from('notification_preferences').upsert(preferences, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function registerForPushNotifications(userId: string): Promise<PushPermissionStatus> {
  let status: PushPermissionStatus = 'unavailable';

  if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
    const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
    status = permission === 'granted' ? 'granted' : permission === 'denied' ? 'denied' : 'unknown';
  }

  const preferences = await fetchNotificationPreferences(userId);
  await saveNotificationPreferences({
    ...preferences,
    push_enabled: status === 'granted',
    push_permission_status: status,
    push_token: null,
  });
  return status;
}

export function deepLinkForNotification(notification: TravelNotification) {
  if (notification.action_url) return notification.action_url;
  if (notification.trip_id) {
    if (notification.category === 'packing_reminder') return `/(tabs)/packing`;
    if (notification.category === 'expense_reminder') return `/(tabs)/expenses`;
    if (notification.category === 'safety_checkin') return `/(tabs)/safety-mode`;
    return `/(tabs)/trip/${notification.trip_id}`;
  }
  if (notification.category === 'price_drop') return '/(tabs)/price-alerts';
  if (notification.category === 'weather_warning') return '/(tabs)/safety-mode';
  return '/(tabs)';
}

function normalizeNotification(row: any): TravelNotification {
  const inferredCategory = categoryFromType(row.type, row.metadata);
  return {
    ...row,
    category: row.category ?? inferredCategory,
    metadata: row.metadata ?? {},
  };
}

function categoryFromType(type: string, metadata: Record<string, any> = {}): NotificationCategory {
  if (type === 'price_alert') return 'price_drop';
  if (type === 'safety_checkin') return 'safety_checkin';
  if (type === 'expense') return 'expense_reminder';
  if (type === 'packing') return 'packing_reminder';
  if (metadata?.category) return metadata.category;
  return 'system_message';
}
