export const notificationCategories = [
  'price_drop',
  'upcoming_trip',
  'packing_reminder',
  'expense_reminder',
  'weather_warning',
  'safety_checkin',
  'booking_update',
  'system_message',
] as const;

export type NotificationCategory = (typeof notificationCategories)[number];
export type NotificationStatus = 'unread' | 'read' | 'archived';
export type PushPermissionStatus = 'unknown' | 'granted' | 'denied' | 'unavailable';

export type TravelNotification = {
  id: string;
  user_id: string;
  trip_id?: string | null;
  type: string;
  category: NotificationCategory;
  status: NotificationStatus;
  title: string;
  body?: string | null;
  action_url?: string | null;
  metadata: Record<string, any>;
  read_at?: string | null;
  created_at: string;
};

export type NotificationPreferences = Record<NotificationCategory, boolean> & {
  user_id: string;
  push_enabled: boolean;
  push_permission_status: PushPermissionStatus;
  push_token?: string | null;
};

export const notificationCategoryLabels: Record<NotificationCategory, string> = {
  price_drop: 'Price drop',
  upcoming_trip: 'Upcoming trip',
  packing_reminder: 'Packing reminder',
  expense_reminder: 'Expense reminder',
  weather_warning: 'Weather warning',
  safety_checkin: 'Safety check-in',
  booking_update: 'Booking update',
  system_message: 'System message',
};
