-- TravelAI demo seed data
-- Loaded by `supabase db reset` after migrations.

begin;

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'ananya.demo@travelai.local', crypt('TravelAI123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ananya Rao"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'rohan.demo@travelai.local', crypt('TravelAI123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Rohan Mehta"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'meera.demo@travelai.local', crypt('TravelAI123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Meera Iyer"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'kabir.demo@travelai.local', crypt('TravelAI123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Kabir Khan"}', now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, full_name, phone, home_city, preferred_language, timezone, currency_code)
values
  ('10000000-0000-0000-0000-000000000001', 'Ananya Rao', '+919900000001', 'Hyderabad', 'en', 'Asia/Kolkata', 'INR'),
  ('10000000-0000-0000-0000-000000000002', 'Rohan Mehta', '+919900000002', 'Hyderabad', 'en', 'Asia/Kolkata', 'INR'),
  ('10000000-0000-0000-0000-000000000003', 'Meera Iyer', '+919900000003', 'Hyderabad', 'en', 'Asia/Kolkata', 'INR'),
  ('10000000-0000-0000-0000-000000000004', 'Kabir Khan', '+919900000004', 'Hyderabad', 'en', 'Asia/Kolkata', 'INR')
on conflict (id) do update set
  full_name = excluded.full_name,
  phone = excluded.phone,
  home_city = excluded.home_city,
  updated_at = now();

insert into public.travel_preferences (id, user_id, comfort_level, traveler_type, interests, dietary_preferences, preferred_transport_modes, max_daily_budget_minor)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'standard', 'friends', array['beaches','food','nightlife'], array['vegetarian-friendly'], array['flight','cab']::transport_mode[], 1000000)
on conflict (user_id) do update set
  comfort_level = excluded.comfort_level,
  traveler_type = excluded.traveler_type,
  interests = excluded.interests,
  updated_at = now();

insert into public.traveler_profiles (id, owner_user_id, linked_user_id, display_name, age_band, relationship, dietary_preferences)
values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Ananya Rao', 'adult', 'self', array['vegetarian-friendly']),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Rohan Mehta', 'adult', 'friend', array[]::text[]),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'Meera Iyer', 'adult', 'friend', array['vegetarian']),
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'Kabir Khan', 'adult', 'friend', array[]::text[])
on conflict (id) do update set display_name = excluded.display_name, updated_at = now();

insert into public.trips (
  id,
  created_by,
  title,
  origin_name,
  destination_name,
  start_date,
  end_date,
  timezone,
  status,
  currency_code,
  total_budget_minor,
  notes
) values (
  '40000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Hyderabad to Goa friends trip',
  'Hyderabad, Telangana',
  'Goa, India',
  '2026-08-14',
  '2026-08-17',
  'Asia/Kolkata',
  'planning',
  'INR',
  4000000,
  'Demo MVP trip for four travelers with a Rs 40,000 total budget.'
) on conflict (id) do update set
  total_budget_minor = excluded.total_budget_minor,
  status = excluded.status,
  updated_at = now();

insert into public.trip_members (id, trip_id, user_id, traveler_profile_id, display_name, email, role, status, joined_at, invited_by)
values
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Ananya Rao', 'ananya.demo@travelai.local', 'owner', 'accepted', now(), null),
  ('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 'Rohan Mehta', 'rohan.demo@travelai.local', 'traveler', 'accepted', now(), '10000000-0000-0000-0000-000000000001'),
  ('50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', 'Meera Iyer', 'meera.demo@travelai.local', 'traveler', 'accepted', now(), '10000000-0000-0000-0000-000000000001'),
  ('50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000004', 'Kabir Khan', 'kabir.demo@travelai.local', 'traveler', 'accepted', now(), '10000000-0000-0000-0000-000000000001')
on conflict (id) do update set status = excluded.status, updated_at = now();

insert into public.trip_days (id, trip_id, day_number, local_date, title, notes)
values
  ('60000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 1, '2026-08-14', 'Arrival and North Goa', 'Land, check in, beach sunset.'),
  ('60000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 2, '2026-08-15', 'Beaches and forts', 'Candolim, Aguada, and cafes.'),
  ('60000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', 3, '2026-08-16', 'South Goa day trip', 'Palolem and Cabo de Rama.'),
  ('60000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000001', 4, '2026-08-17', 'Checkout and return', 'Breakfast, souvenirs, airport transfer.')
on conflict (id) do update set title = excluded.title, updated_at = now();

insert into public.itinerary_items (id, trip_id, trip_day_id, title, category, location_name, starts_at, ends_at, local_start_time, local_end_time, estimated_cost_minor, source, status, sort_order)
values
  ('61000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'Flight HYD to GOI', 'transport', 'Rajiv Gandhi International Airport', '2026-08-14 08:00:00+05:30', '2026-08-14 09:20:00+05:30', '08:00', '09:20', 1800000, 'manual', 'planned', 1),
  ('61000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'Baga beach sunset', 'activity', 'Baga Beach', '2026-08-14 17:30:00+05:30', '2026-08-14 19:30:00+05:30', '17:30', '19:30', 120000, 'ai', 'planned', 2),
  ('61000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000002', 'Fort Aguada and Candolim cafes', 'activity', 'Fort Aguada', '2026-08-15 10:00:00+05:30', '2026-08-15 15:00:00+05:30', '10:00', '15:00', 250000, 'ai', 'planned', 1),
  ('61000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000003', 'South Goa cab day', 'transport', 'Palolem Beach', '2026-08-16 09:00:00+05:30', '2026-08-16 20:00:00+05:30', '09:00', '20:00', 650000, 'ai', 'planned', 1)
on conflict (id) do update set title = excluded.title, updated_at = now();

insert into public.journey_searches (id, user_id, trip_id, origin_name, destination_name, depart_at, passenger_count, modes, status, provider)
values ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Hyderabad', 'Goa', '2026-08-14 08:00:00+05:30', 4, array['flight','train']::transport_mode[], 'completed', 'demo')
on conflict (id) do update set status = excluded.status, updated_at = now();

insert into public.journey_options (id, journey_search_id, trip_id, mode, provider, operator_name, option_code, depart_at, arrive_at, duration_minutes, base_fare_minor, taxes_minor, fees_minor, total_price_minor, is_recommended, recommendation_reason, booking_url)
values
  ('71000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'flight', 'demo', 'IndiGo', '6E-DEMO', '2026-08-14 08:00:00+05:30', '2026-08-14 09:20:00+05:30', 80, 1600000, 160000, 40000, 1800000, true, 'Fastest option and still inside the group budget.', 'https://example.com/demo-flight'),
  ('71000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'train', 'demo', 'Indian Railways', 'HYD-GOA-DEMO', '2026-08-13 21:00:00+05:30', '2026-08-14 12:30:00+05:30', 930, 520000, 0, 0, 520000, false, 'Cheapest option, but uses an overnight travel day.', null)
on conflict (id) do update set total_price_minor = excluded.total_price_minor, updated_at = now();

insert into public.journey_segments (id, journey_option_id, segment_number, mode, carrier_name, service_number, origin_name, destination_name, depart_at, arrive_at, duration_minutes)
values
  ('72000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001', 1, 'flight', 'IndiGo', '6E-DEMO', 'Hyderabad', 'Goa', '2026-08-14 08:00:00+05:30', '2026-08-14 09:20:00+05:30', 80),
  ('72000000-0000-0000-0000-000000000002', '71000000-0000-0000-0000-000000000002', 1, 'train', 'Indian Railways', 'HYD-GOA-DEMO', 'Hyderabad', 'Madgaon', '2026-08-13 21:00:00+05:30', '2026-08-14 12:30:00+05:30', 930)
on conflict (id) do update set duration_minutes = excluded.duration_minutes, updated_at = now();

insert into public.trip_budgets (id, trip_id, category, planned_amount_minor)
values
  ('80000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'transport', 2000000),
  ('80000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 'stay', 1000000),
  ('80000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', 'food', 600000),
  ('80000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000001', 'activity', 400000)
on conflict (trip_id, category) do update set planned_amount_minor = excluded.planned_amount_minor, updated_at = now();

insert into public.cost_items (id, trip_id, trip_budget_id, title, category, amount_minor, cost_date, source, notes)
values
  ('81000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 'Round-trip flights estimate', 'transport', 1800000, '2026-08-14', 'ai_estimate', 'Four travelers, Hyderabad to Goa.'),
  ('81000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000002', 'Three-night apartment stay', 'stay', 960000, '2026-08-14', 'ai_estimate', 'Shared stay near North Goa.')
on conflict (id) do update set amount_minor = excluded.amount_minor, updated_at = now();

insert into public.packing_lists (id, trip_id, user_id, title)
values ('90000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', null, 'Goa group packing list')
on conflict (id) do update set title = excluded.title, updated_at = now();

insert into public.packing_items (id, packing_list_id, trip_id, category, item_name, quantity, source, sort_order)
values
  ('91000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'document', 'Government ID', 4, 'ai', 1),
  ('91000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'clothing', 'Beachwear', 4, 'ai', 2),
  ('91000000-0000-0000-0000-000000000003', '90000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'medicine', 'Sunscreen SPF 50', 2, 'ai', 3),
  ('91000000-0000-0000-0000-000000000004', '90000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'gear', 'Power bank', 2, 'manual', 4)
on conflict (id) do update set item_name = excluded.item_name, updated_at = now();

insert into public.expenses (id, trip_id, paid_by_member_id, paid_by_user_id, title, category, amount_minor, spent_at, created_by)
values
  ('a0000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Flight booking advance', 'transport', 1800000, '2026-07-20 10:00:00+05:30', '10000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Stay deposit', 'stay', 400000, '2026-07-21 12:00:00+05:30', '10000000-0000-0000-0000-000000000002')
on conflict (id) do update set amount_minor = excluded.amount_minor, updated_at = now();

insert into public.expense_participants (expense_id, trip_member_id)
select e.id, m.id
from public.expenses e
cross join public.trip_members m
where e.trip_id = '40000000-0000-0000-0000-000000000001'
  and m.trip_id = e.trip_id
on conflict (expense_id, trip_member_id) do nothing;

insert into public.expense_splits (expense_id, trip_member_id, owed_by_user_id, amount_minor)
select 'a0000000-0000-0000-0000-000000000001', id, user_id, 450000 from public.trip_members where trip_id = '40000000-0000-0000-0000-000000000001'
on conflict (expense_id, trip_member_id) do update set amount_minor = excluded.amount_minor, updated_at = now();

insert into public.expense_splits (expense_id, trip_member_id, owed_by_user_id, amount_minor)
select 'a0000000-0000-0000-0000-000000000002', id, user_id, 100000 from public.trip_members where trip_id = '40000000-0000-0000-0000-000000000001'
on conflict (expense_id, trip_member_id) do update set amount_minor = excluded.amount_minor, updated_at = now();

insert into public.settlements (id, trip_id, from_member_id, to_member_id, amount_minor, status, created_by, notes)
values ('a1000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000001', 450000, 'pending', '10000000-0000-0000-0000-000000000001', 'Meera share for flight booking advance.')
on conflict (id) do update set amount_minor = excluded.amount_minor, updated_at = now();

insert into public.trusted_contacts (id, user_id, name, phone, relationship, is_primary)
values ('b0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Suresh Rao', '+919900009999', 'Father', true)
on conflict (id) do update set phone = excluded.phone, updated_at = now();

insert into public.safety_sessions (id, user_id, trip_id, status, checkin_interval_minutes, started_at, next_checkin_due_at, escalation_message)
values ('b1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'active', 120, '2026-08-14 10:30:00+05:30', '2026-08-14 12:30:00+05:30', 'Please check on Ananya from the Goa trip.')
on conflict (id) do update set status = excluded.status, updated_at = now();

insert into public.safety_checkins (id, safety_session_id, user_id, status, due_at, checked_in_at, latitude, longitude, message)
values ('b2000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'ok', '2026-08-14 12:30:00+05:30', '2026-08-14 12:10:00+05:30', 15.4909, 73.8278, 'Checked in after reaching the stay.')
on conflict (id) do update set status = excluded.status, updated_at = now();

insert into public.price_alerts (id, user_id, trip_id, mode, origin_name, destination_name, depart_on, target_price_minor, last_seen_price_minor, status, last_checked_at, next_check_at)
values ('c0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'flight', 'Hyderabad', 'Goa', '2026-08-14', 1600000, 1800000, 'active', now(), now() + interval '6 hours')
on conflict (id) do update set last_seen_price_minor = excluded.last_seen_price_minor, updated_at = now();

insert into public.price_history (id, price_alert_id, mode, origin_name, destination_name, depart_on, observed_price_minor, provider, observed_at)
values
  ('c1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'flight', 'Hyderabad', 'Goa', '2026-08-14', 1950000, 'demo', now() - interval '2 days'),
  ('c1000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'flight', 'Hyderabad', 'Goa', '2026-08-14', 1800000, 'demo', now())
on conflict (id) do update set observed_price_minor = excluded.observed_price_minor, updated_at = now();

insert into public.notifications (id, user_id, trip_id, type, status, title, body, metadata)
values ('d0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'price_alert', 'unread', 'Goa flight price watch is active', 'We will alert you if the group fare drops below Rs 16,000.', '{"price_alert_id":"c0000000-0000-0000-0000-000000000001"}')
on conflict (id) do update set status = excluded.status, updated_at = now();

insert into public.ai_generations (id, user_id, trip_id, feature, status, model, prompt_version, input, output, started_at, completed_at)
values ('e0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'itinerary', 'succeeded', 'demo-model', 'mvp-v1', '{"origin":"Hyderabad","destination":"Goa","travelers":4}', '{"days":4,"budget_minor":4000000}', now() - interval '5 minutes', now() - interval '4 minutes')
on conflict (id) do update set status = excluded.status, updated_at = now();

insert into public.user_feedback (id, user_id, trip_id, ai_generation_id, rating, feedback_type, message)
values ('e1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 5, 'content_quality', 'Good starter itinerary for a friends trip.')
on conflict (id) do update set rating = excluded.rating, updated_at = now();

commit;
