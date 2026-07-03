export type TripStatus = 'draft' | 'planning' | 'active' | 'completed' | 'cancelled' | 'archived';

export type TripRecord = {
  id: string;
  created_by: string;
  title: string;
  origin_name: string;
  destination_name: string;
  start_date: string;
  end_date: string;
  timezone: string;
  status: TripStatus;
  currency_code: string;
  total_budget_minor: number;
  notes: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  trip_members?: Array<{ id: string; display_name: string; status: string; role: string }>;
};

export type TripSummary = TripRecord & {
  travelerCount: number;
  isOwner: boolean;
};

export type TripDetails = {
  trip: TripSummary;
  days: any[];
  itineraryItems: any[];
  journeyOptions: any[];
  budgets: any[];
  costItems: any[];
  packingLists: any[];
  packingItems: any[];
  safetySessions: any[];
  members: any[];
  expenses: any[];
};

export type ItineraryActivity = {
  id: string;
  trip_id: string;
  trip_day_id: string;
  title: string;
  description: string | null;
  category: string;
  location_name: string | null;
  starts_at: string | null;
  ends_at: string | null;
  local_start_time: string | null;
  local_end_time: string | null;
  estimated_cost_minor: number;
  source: 'manual' | 'ai' | 'imported';
  status: string;
  sort_order: number;
  metadata: Record<string, any>;
};

export type TripDay = {
  id: string;
  trip_id: string;
  day_number: number;
  local_date: string;
  title: string | null;
  notes: string | null;
};

export type ActivityInput = {
  title: string;
  description?: string | null;
  category: string;
  location_name?: string | null;
  local_start_time: string;
  local_end_time: string;
  estimated_cost_minor: number;
  metadata?: Record<string, any>;
};

export type TripBasicsInput = {
  title: string;
  origin_name: string;
  destination_name: string;
  start_date: string;
  end_date: string;
  total_budget_minor: number;
  currency_code: string;
  notes?: string | null;
};
