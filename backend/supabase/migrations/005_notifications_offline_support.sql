create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  price_drop boolean not null default true,
  upcoming_trip boolean not null default true,
  packing_reminder boolean not null default true,
  expense_reminder boolean not null default true,
  weather_warning boolean not null default true,
  safety_checkin boolean not null default true,
  booking_update boolean not null default true,
  system_message boolean not null default true,
  push_enabled boolean not null default false,
  push_permission_status text not null default 'unknown' check (push_permission_status in ('unknown', 'granted', 'denied', 'unavailable')),
  push_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notifications
  add column if not exists category text not null default 'system_message'
    check (category in ('price_drop', 'upcoming_trip', 'packing_reminder', 'expense_reminder', 'weather_warning', 'safety_checkin', 'booking_update', 'system_message')),
  add column if not exists delivery_key text,
  add column if not exists delivered_at timestamptz;

comment on table public.notification_preferences is 'Per-user notification category and push-registration preferences.';
comment on column public.notifications.delivery_key is 'Optional idempotency key used to prevent duplicate notification delivery.';
comment on column public.notifications.body is 'Do not include sensitive precise location details in notification text.';

create unique index if not exists notifications_user_delivery_key_unique
  on public.notifications (user_id, delivery_key)
  where delivery_key is not null;

create index if not exists notifications_category_idx on public.notifications (category);
create index if not exists notification_preferences_push_status_idx on public.notification_preferences (push_permission_status);

alter table public.notification_preferences enable row level security;

drop policy if exists "notification_preferences_own_all" on public.notification_preferences;
create policy "notification_preferences_own_all" on public.notification_preferences
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists set_notification_preferences_updated_at on public.notification_preferences;
create trigger set_notification_preferences_updated_at before update on public.notification_preferences
  for each row execute function public.set_updated_at();
