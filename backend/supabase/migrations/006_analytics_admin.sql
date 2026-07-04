create table if not exists public.analytics_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  analytics_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  event_name text not null check (event_name in (
    'signup_completed',
    'trip_creation_started',
    'trip_created',
    'itinerary_generated',
    'itinerary_regenerated',
    'journey_search_started',
    'journey_option_selected',
    'hidden_cost_viewed',
    'packing_item_checked',
    'expense_added',
    'settlement_completed',
    'safety_mode_activated',
    'price_alert_created',
    'price_alert_triggered',
    'trip_completed'
  )),
  properties jsonb not null default '{}'::jsonb,
  session_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin', 'support', 'viewer')),
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now()
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.provider_health (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  feature text not null check (feature in ('ai', 'journey', 'ticket', 'packing', 'price_alert', 'safety', 'notifications', 'system')),
  status text not null check (status in ('healthy', 'degraded', 'down', 'mock')),
  last_checked_at timestamptz not null default now(),
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.analytics_events is 'Privacy-conscious product analytics. Properties must not include unnecessary personal information, precise locations, payment credentials, or secrets.';
comment on table public.admin_roles is 'Server-verified admin role mapping. Normal users must never access admin routes or data.';
comment on table public.admin_audit_logs is 'Audit log for sensitive administrative reads and actions.';
comment on table public.provider_health is 'Latest provider health observations for admin dashboard.';

create index if not exists analytics_events_user_id_idx on public.analytics_events (user_id);
create index if not exists analytics_events_event_created_idx on public.analytics_events (event_name, created_at desc);
create index if not exists admin_audit_logs_admin_user_id_idx on public.admin_audit_logs (admin_user_id);
create index if not exists admin_audit_logs_created_at_idx on public.admin_audit_logs (created_at desc);
create index if not exists provider_health_feature_idx on public.provider_health (feature, last_checked_at desc);

alter table public.analytics_preferences enable row level security;
alter table public.analytics_events enable row level security;
alter table public.admin_roles enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.provider_health enable row level security;

drop policy if exists "analytics_preferences_own_all" on public.analytics_preferences;
create policy "analytics_preferences_own_all" on public.analytics_preferences
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "analytics_events_own_insert" on public.analytics_events;
create policy "analytics_events_own_insert" on public.analytics_events
  for insert with check (auth.uid() = user_id);

drop policy if exists "analytics_events_own_read" on public.analytics_events;
create policy "analytics_events_own_read" on public.analytics_events
  for select using (auth.uid() = user_id);

drop policy if exists "admin_roles_self_read" on public.admin_roles;
create policy "admin_roles_self_read" on public.admin_roles
  for select using (auth.uid() = user_id);

drop trigger if exists set_analytics_preferences_updated_at on public.analytics_preferences;
create trigger set_analytics_preferences_updated_at before update on public.analytics_preferences
  for each row execute function public.set_updated_at();
