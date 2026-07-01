-- TravelAI MVP initial database schema
-- Money is stored in integer minor units. For INR, 100 paise = 1 rupee.

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Controlled values
-- ---------------------------------------------------------------------------
do $$ begin
  create type trip_status as enum ('draft', 'planning', 'active', 'completed', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type trip_member_role as enum ('owner', 'organizer', 'traveler', 'viewer');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type trip_member_status as enum ('invited', 'accepted', 'declined', 'removed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type transport_mode as enum ('flight', 'train', 'bus', 'cab', 'ferry', 'walk', 'mixed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type item_category as enum ('transport', 'stay', 'food', 'activity', 'shopping', 'safety', 'document', 'clothing', 'toiletry', 'medicine', 'gear', 'other');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type journey_search_status as enum ('queued', 'running', 'completed', 'failed', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type journey_option_status as enum ('available', 'selected', 'expired', 'unavailable');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type expense_split_status as enum ('pending', 'settled', 'waived');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type settlement_status as enum ('pending', 'completed', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type safety_session_status as enum ('active', 'paused', 'completed', 'escalated', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type safety_checkin_status as enum ('scheduled', 'ok', 'missed', 'escalated', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type alert_status as enum ('active', 'paused', 'triggered', 'expired', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type notification_status as enum ('unread', 'read', 'archived');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type ai_generation_status as enum ('queued', 'running', 'succeeded', 'failed', 'cancelled');
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Shared trigger functions
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Core identity and preferences
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  home_city text,
  preferred_language text not null default 'en',
  timezone text not null default 'Asia/Kolkata',
  currency_code char(3) not null default 'INR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Public user profile linked 1:1 to auth.users.';
comment on column public.profiles.id is 'Same UUID as auth.users.id. Supabase Auth remains the authentication source.';
comment on column public.profiles.currency_code is 'ISO 4217 display currency. Money columns are stored in minor units.';

create table public.travel_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  comfort_level text not null default 'standard' check (comfort_level in ('budget', 'standard', 'premium')),
  traveler_type text not null default 'solo' check (traveler_type in ('solo', 'couple', 'family', 'friends', 'work')),
  interests text[] not null default '{}',
  dietary_preferences text[] not null default '{}',
  accessibility_needs text[] not null default '{}',
  preferred_transport_modes transport_mode[] not null default '{}',
  max_daily_budget_minor integer check (max_daily_budget_minor is null or max_daily_budget_minor >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.travel_preferences is 'Default planning preferences for one authenticated user.';

create table public.traveler_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  linked_user_id uuid references public.profiles(id) on delete set null,
  display_name text not null,
  age_band text check (age_band in ('child', 'teen', 'adult', 'senior')),
  relationship text,
  dietary_preferences text[] not null default '{}',
  accessibility_needs text[] not null default '{}',
  passport_last4 text check (passport_last4 is null or length(passport_last4) <= 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.traveler_profiles is 'Reusable traveler records owned by a user; may represent companions without accounts.';

-- ---------------------------------------------------------------------------
-- Trips and membership
-- ---------------------------------------------------------------------------
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  origin_name text not null,
  destination_name text not null,
  origin_place_id text,
  destination_place_id text,
  start_date date not null,
  end_date date not null,
  timezone text not null default 'Asia/Kolkata',
  status trip_status not null default 'planning',
  currency_code char(3) not null default 'INR',
  total_budget_minor integer not null default 0 check (total_budget_minor >= 0),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trips_date_order check (end_date >= start_date)
);

comment on column public.trips.total_budget_minor is 'Total trip budget in minor units, e.g. paise for INR.';
comment on column public.trips.timezone is 'IANA timezone used to interpret local itinerary dates and times.';

create table public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  traveler_profile_id uuid references public.traveler_profiles(id) on delete set null,
  display_name text not null,
  email text,
  role trip_member_role not null default 'traveler',
  status trip_member_status not null default 'accepted',
  joined_at timestamptz,
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trip_members_identity check (user_id is not null or traveler_profile_id is not null or email is not null),
  unique (trip_id, user_id),
  unique (trip_id, traveler_profile_id)
);

comment on table public.trip_members is 'Membership and invited companions for trip-level RLS.';

create or replace function public.is_trip_member(check_trip_id uuid, check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(check_user_id is not null and (
    exists (
      select 1
      from public.trips t
      where t.id = check_trip_id
        and t.created_by = check_user_id
    )
    or exists (
      select 1
      from public.trip_members tm
      where tm.trip_id = check_trip_id
        and tm.user_id = check_user_id
        and tm.status = 'accepted'
    )
  ), false);
$$;

create or replace function public.is_trip_organizer(check_trip_id uuid, check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(check_user_id is not null and (
    exists (
      select 1
      from public.trips t
      where t.id = check_trip_id
        and t.created_by = check_user_id
    )
    or exists (
      select 1
      from public.trip_members tm
      where tm.trip_id = check_trip_id
        and tm.user_id = check_user_id
        and tm.role in ('owner', 'organizer')
        and tm.status = 'accepted'
    )
  ), false);
$$;

-- ---------------------------------------------------------------------------
-- Itinerary
-- ---------------------------------------------------------------------------
create table public.trip_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  day_number integer not null check (day_number > 0),
  local_date date not null,
  title text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, day_number),
  unique (trip_id, local_date)
);

create table public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  trip_day_id uuid references public.trip_days(id) on delete cascade,
  title text not null,
  description text,
  category item_category not null default 'activity',
  location_name text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  starts_at timestamptz,
  ends_at timestamptz,
  local_start_time time,
  local_end_time time,
  estimated_cost_minor integer not null default 0 check (estimated_cost_minor >= 0),
  booking_url text,
  source text not null default 'manual' check (source in ('manual', 'ai', 'imported')),
  status text not null default 'planned' check (status in ('idea', 'planned', 'booked', 'done', 'skipped', 'cancelled')),
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint itinerary_item_time_order check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

comment on column public.itinerary_items.starts_at is 'Absolute instant for scheduled items. Use local_* fields only for floating local times.';

-- ---------------------------------------------------------------------------
-- Journey search and options
-- ---------------------------------------------------------------------------
create table public.journey_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete cascade,
  origin_name text not null,
  destination_name text not null,
  depart_at timestamptz,
  return_at timestamptz,
  passenger_count integer not null default 1 check (passenger_count > 0),
  modes transport_mode[] not null default '{}',
  status journey_search_status not null default 'queued',
  provider text,
  request_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.journey_options (
  id uuid primary key default gen_random_uuid(),
  journey_search_id uuid not null references public.journey_searches(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete cascade,
  mode transport_mode not null,
  provider text,
  operator_name text,
  option_code text,
  depart_at timestamptz not null,
  arrive_at timestamptz not null,
  duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  base_fare_minor integer not null default 0 check (base_fare_minor >= 0),
  taxes_minor integer not null default 0 check (taxes_minor >= 0),
  fees_minor integer not null default 0 check (fees_minor >= 0),
  total_price_minor integer not null check (total_price_minor >= 0),
  currency_code char(3) not null default 'INR',
  status journey_option_status not null default 'available',
  is_recommended boolean not null default false,
  recommendation_reason text,
  booking_url text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint journey_option_time_order check (arrive_at >= depart_at)
);

create table public.journey_segments (
  id uuid primary key default gen_random_uuid(),
  journey_option_id uuid not null references public.journey_options(id) on delete cascade,
  segment_number integer not null check (segment_number > 0),
  mode transport_mode not null,
  carrier_name text,
  service_number text,
  origin_name text not null,
  destination_name text not null,
  depart_at timestamptz not null,
  arrive_at timestamptz not null,
  duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (journey_option_id, segment_number),
  constraint journey_segment_time_order check (arrive_at >= depart_at)
);

-- ---------------------------------------------------------------------------
-- Budgets and costs
-- ---------------------------------------------------------------------------
create table public.trip_budgets (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  category item_category not null,
  planned_amount_minor integer not null default 0 check (planned_amount_minor >= 0),
  actual_amount_minor integer not null default 0 check (actual_amount_minor >= 0),
  currency_code char(3) not null default 'INR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, category)
);

create table public.cost_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  trip_budget_id uuid references public.trip_budgets(id) on delete set null,
  itinerary_item_id uuid references public.itinerary_items(id) on delete set null,
  title text not null,
  category item_category not null default 'other',
  amount_minor integer not null check (amount_minor >= 0),
  currency_code char(3) not null default 'INR',
  cost_date date,
  source text not null default 'manual' check (source in ('manual', 'ai_estimate', 'booking', 'expense')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Packing
-- ---------------------------------------------------------------------------
create table public.packing_lists (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null default 'Packing list',
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.packing_items (
  id uuid primary key default gen_random_uuid(),
  packing_list_id uuid not null references public.packing_lists(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  assigned_to uuid references public.trip_members(id) on delete set null,
  category item_category not null default 'other',
  item_name text not null,
  quantity integer not null default 1 check (quantity > 0),
  is_packed boolean not null default false,
  packed_at timestamptz,
  source text not null default 'manual' check (source in ('manual', 'ai')),
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Expenses and settlement
-- ---------------------------------------------------------------------------
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  paid_by_member_id uuid references public.trip_members(id) on delete set null,
  paid_by_user_id uuid references public.profiles(id) on delete set null,
  title text not null,
  category item_category not null default 'other',
  amount_minor integer not null check (amount_minor > 0),
  currency_code char(3) not null default 'INR',
  spent_at timestamptz not null default now(),
  receipt_url text,
  notes text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.expense_participants (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  trip_member_id uuid not null references public.trip_members(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (expense_id, trip_member_id)
);

create table public.expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  trip_member_id uuid not null references public.trip_members(id) on delete cascade,
  owed_by_user_id uuid references public.profiles(id) on delete set null,
  amount_minor integer not null check (amount_minor >= 0),
  status expense_split_status not null default 'pending',
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (expense_id, trip_member_id)
);

create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  from_member_id uuid not null references public.trip_members(id) on delete cascade,
  to_member_id uuid not null references public.trip_members(id) on delete cascade,
  amount_minor integer not null check (amount_minor > 0),
  currency_code char(3) not null default 'INR',
  status settlement_status not null default 'pending',
  settled_at timestamptz,
  notes text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint settlements_distinct_members check (from_member_id <> to_member_id)
);

-- ---------------------------------------------------------------------------
-- Safety
-- ---------------------------------------------------------------------------
create table public.trusted_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  relationship text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.safety_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete cascade,
  status safety_session_status not null default 'active',
  checkin_interval_minutes integer not null default 60 check (checkin_interval_minutes > 0),
  started_at timestamptz not null default now(),
  ends_at timestamptz,
  last_checkin_at timestamptz,
  next_checkin_due_at timestamptz,
  escalation_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint safety_session_time_order check (ends_at is null or ends_at >= started_at)
);

create table public.safety_checkins (
  id uuid primary key default gen_random_uuid(),
  safety_session_id uuid not null references public.safety_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status safety_checkin_status not null default 'scheduled',
  due_at timestamptz not null,
  checked_in_at timestamptz,
  latitude numeric(9,6),
  longitude numeric(9,6),
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Price tracking and notifications
-- ---------------------------------------------------------------------------
create table public.price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete cascade,
  mode transport_mode not null,
  origin_name text not null,
  destination_name text not null,
  depart_on date not null,
  target_price_minor integer not null check (target_price_minor > 0),
  last_seen_price_minor integer check (last_seen_price_minor is null or last_seen_price_minor >= 0),
  currency_code char(3) not null default 'INR',
  status alert_status not null default 'active',
  last_checked_at timestamptz,
  next_check_at timestamptz,
  triggered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.price_alerts.next_check_at is 'Indexed scheduler field for alert-processing jobs.';

create table public.price_history (
  id uuid primary key default gen_random_uuid(),
  price_alert_id uuid references public.price_alerts(id) on delete cascade,
  journey_option_id uuid references public.journey_options(id) on delete set null,
  mode transport_mode not null,
  origin_name text not null,
  destination_name text not null,
  depart_on date not null,
  observed_price_minor integer not null check (observed_price_minor >= 0),
  currency_code char(3) not null default 'INR',
  provider text,
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete cascade,
  type text not null check (type in ('price_alert', 'safety_checkin', 'trip_update', 'expense', 'packing', 'ai_generation', 'system')),
  status notification_status not null default 'unread',
  title text not null,
  body text,
  action_url text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- AI audit and feedback
-- ---------------------------------------------------------------------------
create table public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete cascade,
  feature text not null check (feature in ('itinerary', 'journey', 'packing', 'budget', 'safety', 'other')),
  status ai_generation_status not null default 'queued',
  model text,
  prompt_version text,
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete cascade,
  ai_generation_id uuid references public.ai_generations(id) on delete set null,
  rating smallint check (rating between 1 and 5),
  feedback_type text not null default 'general' check (feedback_type in ('general', 'bug', 'content_quality', 'price_accuracy', 'safety', 'support')),
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index profiles_home_city_idx on public.profiles (home_city);
create index travel_preferences_user_id_idx on public.travel_preferences (user_id);
create index traveler_profiles_owner_user_id_idx on public.traveler_profiles (owner_user_id);
create index traveler_profiles_linked_user_id_idx on public.traveler_profiles (linked_user_id);

create index trips_created_by_idx on public.trips (created_by);
create index trips_status_idx on public.trips (status);
create index trips_dates_idx on public.trips (start_date, end_date);

create index trip_members_trip_id_idx on public.trip_members (trip_id);
create index trip_members_user_id_idx on public.trip_members (user_id);
create index trip_members_status_idx on public.trip_members (status);

create index trip_days_trip_id_idx on public.trip_days (trip_id);
create index trip_days_local_date_idx on public.trip_days (local_date);
create index itinerary_items_trip_id_idx on public.itinerary_items (trip_id);
create index itinerary_items_trip_day_id_idx on public.itinerary_items (trip_day_id);
create index itinerary_items_status_idx on public.itinerary_items (status);
create index itinerary_items_starts_at_idx on public.itinerary_items (starts_at);

create index journey_searches_user_id_idx on public.journey_searches (user_id);
create index journey_searches_trip_id_idx on public.journey_searches (trip_id);
create index journey_searches_status_idx on public.journey_searches (status);
create index journey_searches_depart_at_idx on public.journey_searches (depart_at);
create index journey_options_search_id_idx on public.journey_options (journey_search_id);
create index journey_options_trip_id_idx on public.journey_options (trip_id);
create index journey_options_status_idx on public.journey_options (status);
create index journey_options_depart_at_idx on public.journey_options (depart_at);
create index journey_segments_option_id_idx on public.journey_segments (journey_option_id);

create index trip_budgets_trip_id_idx on public.trip_budgets (trip_id);
create index cost_items_trip_id_idx on public.cost_items (trip_id);
create index cost_items_cost_date_idx on public.cost_items (cost_date);

create index packing_lists_trip_id_idx on public.packing_lists (trip_id);
create index packing_lists_user_id_idx on public.packing_lists (user_id);
create index packing_lists_status_idx on public.packing_lists (status);
create index packing_items_trip_id_idx on public.packing_items (trip_id);
create index packing_items_list_id_idx on public.packing_items (packing_list_id);

create index expenses_trip_id_idx on public.expenses (trip_id);
create index expenses_paid_by_user_id_idx on public.expenses (paid_by_user_id);
create index expenses_created_by_idx on public.expenses (created_by);
create index expenses_spent_at_idx on public.expenses (spent_at);
create index expense_participants_expense_id_idx on public.expense_participants (expense_id);
create index expense_splits_expense_id_idx on public.expense_splits (expense_id);
create index expense_splits_status_idx on public.expense_splits (status);
create index settlements_trip_id_idx on public.settlements (trip_id);
create index settlements_status_idx on public.settlements (status);

create index trusted_contacts_user_id_idx on public.trusted_contacts (user_id);
create index safety_sessions_user_id_idx on public.safety_sessions (user_id);
create index safety_sessions_trip_id_idx on public.safety_sessions (trip_id);
create index safety_sessions_status_idx on public.safety_sessions (status);
create index safety_sessions_next_checkin_due_at_idx on public.safety_sessions (next_checkin_due_at);
create index safety_checkins_session_id_idx on public.safety_checkins (safety_session_id);
create index safety_checkins_user_id_idx on public.safety_checkins (user_id);
create index safety_checkins_status_due_idx on public.safety_checkins (status, due_at);

create index price_alerts_user_id_idx on public.price_alerts (user_id);
create index price_alerts_trip_id_idx on public.price_alerts (trip_id);
create index price_alerts_status_idx on public.price_alerts (status);
create index price_alerts_depart_on_idx on public.price_alerts (depart_on);
create index price_alerts_processing_idx on public.price_alerts (status, next_check_at) where status = 'active';
create index price_history_alert_id_idx on public.price_history (price_alert_id);
create index price_history_route_date_idx on public.price_history (mode, origin_name, destination_name, depart_on, observed_at desc);

create index notifications_user_id_idx on public.notifications (user_id);
create index notifications_trip_id_idx on public.notifications (trip_id);
create index notifications_status_idx on public.notifications (status);
create index notifications_created_at_idx on public.notifications (created_at desc);
create index ai_generations_user_id_idx on public.ai_generations (user_id);
create index ai_generations_trip_id_idx on public.ai_generations (trip_id);
create index ai_generations_status_idx on public.ai_generations (status);
create index user_feedback_user_id_idx on public.user_feedback (user_id);
create index user_feedback_trip_id_idx on public.user_feedback (trip_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'profiles', 'travel_preferences', 'traveler_profiles', 'trips', 'trip_members',
    'trip_days', 'itinerary_items', 'journey_searches', 'journey_options',
    'journey_segments', 'trip_budgets', 'cost_items', 'packing_lists',
    'packing_items', 'expenses', 'expense_participants', 'expense_splits',
    'settlements', 'trusted_contacts', 'safety_sessions', 'safety_checkins',
    'price_alerts', 'price_history', 'notifications', 'ai_generations',
    'user_feedback'
  ]
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', tbl, tbl);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', tbl, tbl);
  end loop;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.travel_preferences enable row level security;
alter table public.traveler_profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.trip_days enable row level security;
alter table public.itinerary_items enable row level security;
alter table public.journey_searches enable row level security;
alter table public.journey_options enable row level security;
alter table public.journey_segments enable row level security;
alter table public.trip_budgets enable row level security;
alter table public.cost_items enable row level security;
alter table public.packing_lists enable row level security;
alter table public.packing_items enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_participants enable row level security;
alter table public.expense_splits enable row level security;
alter table public.settlements enable row level security;
alter table public.trusted_contacts enable row level security;
alter table public.safety_sessions enable row level security;
alter table public.safety_checkins enable row level security;
alter table public.price_alerts enable row level security;
alter table public.price_history enable row level security;
alter table public.notifications enable row level security;
alter table public.ai_generations enable row level security;
alter table public.user_feedback enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "travel_preferences_own_all" on public.travel_preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "traveler_profiles_own_all" on public.traveler_profiles for all using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);

create policy "trips_select_member" on public.trips for select using (public.is_trip_member(id));
create policy "trips_insert_creator" on public.trips for insert with check (auth.uid() = created_by);
create policy "trips_update_organizer" on public.trips for update using (public.is_trip_organizer(id)) with check (public.is_trip_organizer(id));
create policy "trips_delete_creator" on public.trips for delete using (auth.uid() = created_by);

create policy "trip_members_select_member" on public.trip_members for select using (public.is_trip_member(trip_id));
create policy "trip_members_insert_organizer" on public.trip_members for insert with check (public.is_trip_organizer(trip_id));
create policy "trip_members_update_organizer_or_self" on public.trip_members for update using (public.is_trip_organizer(trip_id) or auth.uid() = user_id) with check (public.is_trip_organizer(trip_id) or auth.uid() = user_id);
create policy "trip_members_delete_organizer" on public.trip_members for delete using (public.is_trip_organizer(trip_id));

create policy "trip_days_trip_member_all" on public.trip_days for all using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));
create policy "itinerary_items_trip_member_all" on public.itinerary_items for all using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));

create policy "journey_searches_select_own_or_trip" on public.journey_searches for select using (auth.uid() = user_id or public.is_trip_member(trip_id));
create policy "journey_searches_insert_own" on public.journey_searches for insert with check (auth.uid() = user_id and (trip_id is null or public.is_trip_member(trip_id)));
create policy "journey_searches_update_own_or_trip" on public.journey_searches for update using (auth.uid() = user_id or public.is_trip_member(trip_id)) with check (auth.uid() = user_id and (trip_id is null or public.is_trip_member(trip_id)));
create policy "journey_searches_delete_own" on public.journey_searches for delete using (auth.uid() = user_id);

create policy "journey_options_trip_member_all" on public.journey_options for all using (
  public.is_trip_member(trip_id)
  or exists (select 1 from public.journey_searches js where js.id = journey_search_id and js.user_id = auth.uid())
) with check (
  public.is_trip_member(trip_id)
  or exists (select 1 from public.journey_searches js where js.id = journey_search_id and js.user_id = auth.uid())
);

create policy "journey_segments_via_option_all" on public.journey_segments for all using (
  exists (
    select 1 from public.journey_options jo
    join public.journey_searches js on js.id = jo.journey_search_id
    where jo.id = journey_option_id
      and (public.is_trip_member(jo.trip_id) or js.user_id = auth.uid())
  )
) with check (
  exists (
    select 1 from public.journey_options jo
    join public.journey_searches js on js.id = jo.journey_search_id
    where jo.id = journey_option_id
      and (public.is_trip_member(jo.trip_id) or js.user_id = auth.uid())
  )
);

create policy "trip_budgets_trip_member_all" on public.trip_budgets for all using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));
create policy "cost_items_trip_member_all" on public.cost_items for all using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));

create policy "packing_lists_trip_member_all" on public.packing_lists for all using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));
create policy "packing_items_trip_member_all" on public.packing_items for all using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));

create policy "expenses_trip_member_all" on public.expenses for all using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id) and auth.uid() = created_by);
create policy "expense_participants_via_expense_all" on public.expense_participants for all using (
  exists (select 1 from public.expenses e where e.id = expense_id and public.is_trip_member(e.trip_id))
) with check (
  exists (select 1 from public.expenses e where e.id = expense_id and public.is_trip_member(e.trip_id))
);
create policy "expense_splits_via_expense_all" on public.expense_splits for all using (
  exists (select 1 from public.expenses e where e.id = expense_id and public.is_trip_member(e.trip_id))
) with check (
  exists (select 1 from public.expenses e where e.id = expense_id and public.is_trip_member(e.trip_id))
);
create policy "settlements_trip_member_all" on public.settlements for all using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id) and auth.uid() = created_by);

create policy "trusted_contacts_own_all" on public.trusted_contacts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "safety_sessions_own_all" on public.safety_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id and (trip_id is null or public.is_trip_member(trip_id)));
create policy "safety_checkins_own_all" on public.safety_checkins for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "price_alerts_own_all" on public.price_alerts for all using (auth.uid() = user_id) with check (auth.uid() = user_id and (trip_id is null or public.is_trip_member(trip_id)));
create policy "price_history_own_alert_select" on public.price_history for select using (
  exists (select 1 from public.price_alerts pa where pa.id = price_alert_id and pa.user_id = auth.uid())
  or exists (select 1 from public.journey_options jo where jo.id = journey_option_id and public.is_trip_member(jo.trip_id))
);

create policy "notifications_own_all" on public.notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_generations_own_or_trip_all" on public.ai_generations for all using (auth.uid() = user_id or public.is_trip_member(trip_id)) with check (auth.uid() = user_id and (trip_id is null or public.is_trip_member(trip_id)));
create policy "user_feedback_own_all" on public.user_feedback for all using (auth.uid() = user_id) with check (auth.uid() = user_id and (trip_id is null or public.is_trip_member(trip_id)));

commit;
