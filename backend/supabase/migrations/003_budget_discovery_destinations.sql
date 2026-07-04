create table if not exists public.destinations (
  id text primary key,
  name text not null,
  region text not null,
  state text not null,
  country_code char(2) not null default 'IN',
  latitude numeric(9,6),
  longitude numeric(9,6),
  tags text[] not null default '{}',
  best_months text[] not null default '{}',
  estimated_daily_stay_minor integer not null check (estimated_daily_stay_minor >= 0),
  estimated_daily_food_minor integer not null check (estimated_daily_food_minor >= 0),
  estimated_daily_local_travel_minor integer not null check (estimated_daily_local_travel_minor >= 0),
  estimated_daily_activities_minor integer not null check (estimated_daily_activities_minor >= 0),
  estimated_fees_minor integer not null default 0 check (estimated_fees_minor >= 0),
  confidence text not null default 'medium' check (confidence in ('high', 'medium', 'low')),
  source_note text not null default 'Curated TravelAI MVP estimate. Verify live prices before booking.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.destinations is 'Curated destination catalog used by Budget Discovery. Stored separately from user-generated trips and itineraries.';
comment on column public.destinations.estimated_daily_stay_minor is 'Estimated accommodation cost per traveler per night in minor currency units.';
comment on column public.destinations.source_note is 'Human-readable source and verification note for estimated destination costs.';

create table if not exists public.saved_destinations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  destination_id text not null references public.destinations(id) on delete cascade,
  source_city text not null,
  max_budget_minor integer not null check (max_budget_minor > 0),
  traveler_count integer not null check (traveler_count > 0),
  trip_length_days integer not null check (trip_length_days > 0),
  selected_tags text[] not null default '{}',
  estimate_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, destination_id, source_city, trip_length_days)
);

comment on table public.saved_destinations is 'User-saved Budget Discovery suggestions. These are not itineraries until converted into a trip draft.';
comment on column public.saved_destinations.estimate_payload is 'Snapshot of deterministic estimated costs shown to the user when the destination was saved.';

create index if not exists destinations_tags_idx on public.destinations using gin (tags);
create index if not exists destinations_country_idx on public.destinations (country_code);
create index if not exists saved_destinations_user_id_idx on public.saved_destinations (user_id);
create index if not exists saved_destinations_destination_id_idx on public.saved_destinations (destination_id);

alter table public.destinations enable row level security;
alter table public.saved_destinations enable row level security;

drop policy if exists "destinations_read_all" on public.destinations;
create policy "destinations_read_all" on public.destinations for select using (true);

drop policy if exists "saved_destinations_own_all" on public.saved_destinations;
create policy "saved_destinations_own_all" on public.saved_destinations
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists set_destinations_updated_at on public.destinations;
create trigger set_destinations_updated_at before update on public.destinations
  for each row execute function public.set_updated_at();

drop trigger if exists set_saved_destinations_updated_at on public.saved_destinations;
create trigger set_saved_destinations_updated_at before update on public.saved_destinations
  for each row execute function public.set_updated_at();
