alter table public.price_alerts
  add column if not exists journey_option_id uuid references public.journey_options(id) on delete set null,
  add column if not exists percentage_drop_threshold numeric(5,2) not null default 10 check (percentage_drop_threshold > 0 and percentage_drop_threshold <= 90),
  add column if not exists notification_cooldown_minutes integer not null default 1440 check (notification_cooldown_minutes > 0),
  add column if not exists minimum_change_minor integer not null default 10000 check (minimum_change_minor >= 0),
  add column if not exists last_notified_at timestamptz,
  add column if not exists last_notification_price_minor integer check (last_notification_price_minor is null or last_notification_price_minor >= 0),
  add column if not exists provider text not null default 'mock-price-provider',
  add column if not exists latest_result_url text,
  add column if not exists alert_label text not null default '[MOCK DATA]',
  add column if not exists last_worker_error text;

alter table public.price_history
  add column if not exists data_status text not null default 'mock' check (data_status in ('mock', 'estimated', 'cached', 'live')),
  add column if not exists raw_payload jsonb not null default '{}'::jsonb;

comment on column public.price_alerts.percentage_drop_threshold is 'Notification condition: alert when latest price drops at least this percent from the previous observed price.';
comment on column public.price_alerts.notification_cooldown_minutes is 'Minimum interval between notifications for this alert.';
comment on column public.price_alerts.minimum_change_minor is 'Ignore tiny price movements below this minor-unit amount.';
comment on column public.price_alerts.alert_label is 'Data label shown to users. MVP mock-provider alerts must remain clearly labelled.';
comment on column public.price_alerts.last_worker_error is 'Latest scheduled-worker error for this alert, if any.';
comment on column public.price_history.data_status is 'Price freshness label such as mock, estimated, cached, or live.';

create index if not exists price_alerts_journey_option_id_idx on public.price_alerts (journey_option_id);
create index if not exists price_alerts_last_notified_at_idx on public.price_alerts (last_notified_at);
create index if not exists price_history_observed_at_idx on public.price_history (observed_at desc);
