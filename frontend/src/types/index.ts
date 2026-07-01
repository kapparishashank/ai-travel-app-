// TravelAI — Shared TypeScript Types
// All monetary values are in paise (divide by 100 to get INR rupees).

// ─────────────────────────────────────────────
// AUTH / USER
// ─────────────────────────────────────────────

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  date_of_birth?: string | null;
  home_city: string | null;
  preferred_language?: string;
  preferred_lang?: string;
  currency_code?: string;
  timezone?: string;
  comfort_level?: 'budget' | 'standard' | 'premium';
  interests?: string[];
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────
// TRIPS
// ─────────────────────────────────────────────

export type TravelerType = 'solo' | 'couple' | 'family' | 'friends' | 'work';
export type TripStatus = 'planning' | 'active' | 'completed' | 'cancelled';
export type ComfortLevel = 'budget' | 'standard' | 'premium';

export interface Trip {
  id: string;
  user_id: string;
  title: string;
  origin: string;
  destination: string;
  start_date: string; // ISO YYYY-MM-DD
  end_date: string;   // ISO YYYY-MM-DD
  num_travelers: number;
  traveler_type: TravelerType;
  budget_inr: number; // paise
  interests: string[];
  comfort_level: ComfortLevel;
  status: TripStatus;
  is_saved: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTripInput {
  title: string;
  origin: string;
  destination: string;
  start_date: string;
  end_date: string;
  num_travelers: number;
  traveler_type: TravelerType;
  budget_inr: number; // paise
  interests: string[];
  comfort_level: ComfortLevel;
  notes?: string;
}

// ─────────────────────────────────────────────
// ITINERARY
// ─────────────────────────────────────────────

export type ActivityCategory =
  | 'sightseeing' | 'food' | 'transport' | 'accommodation'
  | 'activity' | 'rest' | 'shopping' | 'emergency' | 'other';

export interface ItineraryActivity {
  id: string;
  day_id: string;
  trip_id: string;
  sort_order: number;
  title: string;
  description: string | null;
  location_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  start_time: string | null; // HH:MM
  end_time: string | null;
  duration_mins: number | null;
  category: ActivityCategory;
  estimated_cost_inr: number; // paise
  is_ai_generated: boolean;
  is_confirmed: boolean;
  source_label: string; // '[AI ESTIMATE]' | '[MOCK DATA]' | '[LIVE]'
  booking_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface ItineraryDay {
  id: string;
  trip_id: string;
  day_number: number;
  date: string; // ISO YYYY-MM-DD
  theme: string | null;
  estimated_cost_inr: number;
  notes: string | null;
  is_locked: boolean;
  activities: ItineraryActivity[];
  created_at: string;
}

// ─────────────────────────────────────────────
// TRANSPORT / JOURNEY
// ─────────────────────────────────────────────

export type TransportMode = 'flight' | 'train' | 'bus' | 'cab' | 'ferry' | 'mixed';

export interface TransportOption {
  id?: string;
  mode: TransportMode;
  operator: string | null;
  departureTime: string; // ISO datetime
  arrivalTime: string;
  durationMins: number;
  baseFareInr: number;
  taxesInr: number;
  baggageCostInr: number;
  lastMileInr: number;
  totalCostInr: number;
  comfortRating: number; // 1–5
  numStops: number;
  isRefundable: boolean;
  isRecommended: boolean;
  recommendationLabel: string | null;
  whyRecommended: string | null;
  cancellationPolicy?: string;
  reliabilityNote?: string;
  dataLabel: string;
}

// ─────────────────────────────────────────────
// TICKETS
// ─────────────────────────────────────────────

export type TicketType = 'flight' | 'train' | 'bus';
export type TicketStatus = 'saved' | 'booked' | 'cancelled' | 'refunded';

export interface Ticket {
  id: string;
  user_id: string;
  trip_id: string | null;
  type: TicketType;
  operator: string | null;
  origin: string;
  destination: string;
  departure_at: string;
  arrival_at: string;
  seat_class: string | null;
  base_fare_inr: number;
  total_fare_inr: number;
  booking_ref: string | null;
  status: TicketStatus;
  booking_url: string | null;
  data_label: string;
  created_at: string;
}

export interface MockTicketResult {
  id: string;
  operator: string;
  origin: string;
  destination: string;
  departureAt: string;
  arrivalAt: string;
  durationMins: number;
  seatClass: string;
  availableSeats: number;
  baseFareInr: number;
  taxesInr?: number;
  baggageCostInr?: number;
  totalFareInr: number;
  isRefundable: boolean;
  cancellationPolicy: string;
  bookingUrl: string;
  dataLabel: string;
  tags: string[];
  flightNumber?: string;
  trainNumber?: string;
  trainName?: string;
}

// ─────────────────────────────────────────────
// EXPENSES
// ─────────────────────────────────────────────

export type ExpenseCategory =
  | 'transport' | 'accommodation' | 'food' | 'activities'
  | 'shopping' | 'fuel' | 'emergency' | 'miscellaneous';

export interface ExpenseGroup {
  id: string;
  trip_id: string | null;
  name: string;
  created_by: string;
  invite_code: string;
  currency: string;
  created_at: string;
  members?: ExpenseGroupMember[];
}

export interface ExpenseGroupMember {
  group_id: string;
  user_id: string;
  display_name: string | null;
  joined_at: string;
  profile?: Profile;
}

export interface Expense {
  id: string;
  group_id: string;
  trip_id: string | null;
  paid_by: string;
  title: string;
  amount_inr: number; // paise
  category: ExpenseCategory;
  receipt_url: string | null;
  notes: string | null;
  expense_date: string; // ISO YYYY-MM-DD
  created_at: string;
  splits?: ExpenseSplit[];
  payer?: Profile;
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string;
  share_amount_inr: number;
  is_settled: boolean;
  settled_at: string | null;
}

export interface MemberBalance {
  userId: string;
  displayName: string;
  totalPaid: number;
  totalOwed: number;
  netBalance: number; // positive = is owed money; negative = owes money
}

export interface Settlement {
  fromUserId: string;
  toUserId: string;
  fromName: string;
  toName: string;
  amountInr: number;
}

// ─────────────────────────────────────────────
// PACKING
// ─────────────────────────────────────────────

export interface PackingItem {
  id: string;
  trip_id: string;
  category: string;
  item_name: string;
  quantity: number;
  is_packed: boolean;
  is_ai_generated: boolean;
  notes: string | null;
  sort_order: number;
  created_at: string;
}

export interface PackingCategory {
  name: string;
  items: PackingItem[];
  totalCount: number;
  packedCount: number;
}

// ─────────────────────────────────────────────
// PRICE ALERTS
// ─────────────────────────────────────────────

export interface PriceAlert {
  id: string;
  user_id: string;
  trip_id: string | null;
  type: TicketType;
  origin: string;
  destination: string;
  travel_date: string | null;
  target_price_inr: number | null;
  last_price_inr: number | null;
  is_active: boolean;
  last_checked_at: string | null;
  created_at: string;
}

// ─────────────────────────────────────────────
// SAFETY
// ─────────────────────────────────────────────

export interface SafetyContact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  relationship: string | null;
  sort_order: number;
  created_at: string;
}

export interface CheckinSession {
  id: string;
  trip_id: string;
  user_id: string;
  interval_mins: number;
  last_checkin_at: string | null;
  next_due_at: string | null;
  is_active: boolean;
  created_at: string;
}

// ─────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────

export type NotificationType =
  | 'price_drop' | 'checkin_reminder' | 'trip_reminder'
  | 'expense_settled' | 'budget_warning' | 'safety_alert' | 'system';

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  is_read: boolean;
  trip_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ─────────────────────────────────────────────
// API RESPONSE WRAPPERS
// ─────────────────────────────────────────────

export interface ApiResponse<T> {
  status: 'ok' | 'complete' | 'error';
  data_label?: string;
  disclaimer?: string;
  data?: T;
  error?: string;
  message?: string;
}
