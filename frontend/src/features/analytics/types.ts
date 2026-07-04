export type AnalyticsEventName =
  | 'signup_completed'
  | 'trip_creation_started'
  | 'trip_created'
  | 'itinerary_generated'
  | 'itinerary_regenerated'
  | 'journey_search_started'
  | 'journey_option_selected'
  | 'hidden_cost_viewed'
  | 'packing_item_checked'
  | 'expense_added'
  | 'settlement_completed'
  | 'safety_mode_activated'
  | 'price_alert_created'
  | 'price_alert_triggered'
  | 'trip_completed';

export type AnalyticsProperties = {
  tripId?: string;
  feature?: string;
  mode?: string;
  status?: string;
  source?: string;
  destination?: string;
  durationDays?: number;
  travelerCount?: number;
  budgetMinor?: number;
  currency?: string;
  itemCategory?: string;
  provider?: string;
  dataLabel?: string;
  [key: string]: string | number | boolean | null | undefined;
};

export type AnalyticsEvent = {
  name: AnalyticsEventName;
  properties?: AnalyticsProperties;
};

export type AnalyticsPreference = {
  user_id: string;
  analytics_enabled: boolean;
};
