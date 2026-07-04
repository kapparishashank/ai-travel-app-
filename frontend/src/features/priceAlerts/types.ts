export type AlertStatus = 'active' | 'paused' | 'triggered' | 'expired' | 'cancelled';

export type PriceAlertRow = {
  id: string;
  user_id: string;
  trip_id?: string | null;
  journey_option_id?: string | null;
  mode: 'flight' | 'train' | 'bus' | 'cab' | 'ferry' | 'walk' | 'mixed';
  origin_name: string;
  destination_name: string;
  depart_on: string;
  target_price_minor: number;
  percentage_drop_threshold: number;
  notification_cooldown_minutes: number;
  minimum_change_minor: number;
  last_seen_price_minor?: number | null;
  last_notification_price_minor?: number | null;
  currency_code: string;
  status: AlertStatus;
  provider: string;
  latest_result_url?: string | null;
  alert_label: string;
  last_checked_at?: string | null;
  last_notified_at?: string | null;
  next_check_at?: string | null;
  last_worker_error?: string | null;
};

export type PriceHistoryRow = {
  id: string;
  price_alert_id: string;
  journey_option_id?: string | null;
  mode: PriceAlertRow['mode'];
  origin_name: string;
  destination_name: string;
  depart_on: string;
  observed_price_minor: number;
  currency_code: string;
  provider?: string | null;
  data_status?: 'mock' | 'estimated' | 'cached' | 'live';
  observed_at: string;
};

export type JourneyOptionForAlert = {
  id: string;
  trip_id?: string | null;
  mode: PriceAlertRow['mode'];
  provider?: string | null;
  operator_name?: string | null;
  origin_name?: string;
  destination_name?: string;
  depart_at: string;
  total_price_minor: number;
  currency_code: string;
  booking_url?: string | null;
};

export type AlertEvaluationInput = {
  status: AlertStatus;
  targetPriceMinor: number;
  previousPriceMinor: number | null;
  latestPriceMinor: number;
  percentageDropThreshold: number;
  minimumChangeMinor: number;
  lastNotifiedAt?: string | null;
  lastNotificationPriceMinor?: number | null;
  cooldownMinutes: number;
  nowIso: string;
  duplicateNotificationExists?: boolean;
};

export type AlertEvaluationResult = {
  shouldNotify: boolean;
  targetHit: boolean;
  percentageDropHit: boolean;
  changeMinor: number;
  percentageChange: number;
  reason: string;
};
