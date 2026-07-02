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
