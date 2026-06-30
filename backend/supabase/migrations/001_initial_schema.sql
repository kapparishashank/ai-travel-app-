-- TravelAI Initial Database Schema
-- Run this on your Supabase project via the SQL editor or Supabase CLI

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT,
  avatar_url      TEXT,
  phone           TEXT,
  home_city       TEXT,
  preferred_lang  TEXT DEFAULT 'en',
  comfort_level   TEXT DEFAULT 'standard' CHECK (comfort_level IN ('budget','standard','premium')),
  interests       TEXT[] DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- TRIPS
-- ============================================================
CREATE TABLE IF NOT EXISTS trips (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  origin          TEXT NOT NULL,
  destination     TEXT NOT NULL,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  num_travelers   INTEGER NOT NULL DEFAULT 1,
  traveler_type   TEXT DEFAULT 'solo' CHECK (traveler_type IN ('solo','couple','family','friends','work')),
  budget_inr      INTEGER NOT NULL DEFAULT 0,
  interests       TEXT[] DEFAULT '{}',
  comfort_level   TEXT DEFAULT 'standard',
  status          TEXT DEFAULT 'planning' CHECK (status IN ('planning','active','completed','cancelled')),
  is_saved        BOOLEAN DEFAULT FALSE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own trips"
  ON trips FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- ITINERARY DAYS
-- ============================================================
CREATE TABLE IF NOT EXISTS itinerary_days (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id         UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  day_number      INTEGER NOT NULL,
  date            DATE NOT NULL,
  theme           TEXT,
  estimated_cost_inr INTEGER DEFAULT 0,
  notes           TEXT,
  is_locked       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (trip_id, day_number)
);

ALTER TABLE itinerary_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own itinerary days"
  ON itinerary_days FOR ALL
  USING (EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_id AND trips.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_id AND trips.user_id = auth.uid()));

-- ============================================================
-- ITINERARY ACTIVITIES
-- ============================================================
CREATE TABLE IF NOT EXISTS itinerary_activities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id          UUID NOT NULL REFERENCES itinerary_days(id) ON DELETE CASCADE,
  trip_id         UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  title           TEXT NOT NULL,
  description     TEXT,
  location_name   TEXT,
  location_lat    DECIMAL(9,6),
  location_lng    DECIMAL(9,6),
  start_time      TIME,
  end_time        TIME,
  duration_mins   INTEGER,
  category        TEXT CHECK (category IN (
                    'sightseeing','food','transport','accommodation',
                    'activity','rest','shopping','emergency','other'
                  )),
  estimated_cost_inr INTEGER DEFAULT 0,
  is_ai_generated BOOLEAN DEFAULT TRUE,
  is_confirmed    BOOLEAN DEFAULT FALSE,
  source_label    TEXT DEFAULT '[AI ESTIMATE]',
  booking_url     TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE itinerary_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own activities"
  ON itinerary_activities FOR ALL
  USING (EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_id AND trips.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_id AND trips.user_id = auth.uid()));

-- ============================================================
-- TRANSPORT OPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS transport_options (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id         UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  mode            TEXT NOT NULL CHECK (mode IN ('flight','train','bus','cab','ferry','mixed')),
  operator        TEXT,
  departure_time  TIMESTAMPTZ,
  arrival_time    TIMESTAMPTZ,
  duration_mins   INTEGER,
  base_fare_inr   INTEGER,
  taxes_inr       INTEGER DEFAULT 0,
  baggage_cost_inr INTEGER DEFAULT 0,
  last_mile_inr   INTEGER DEFAULT 0,
  total_cost_inr  INTEGER,
  comfort_rating  SMALLINT CHECK (comfort_rating BETWEEN 1 AND 5),
  num_stops       INTEGER DEFAULT 0,
  is_refundable   BOOLEAN DEFAULT FALSE,
  is_recommended  BOOLEAN DEFAULT FALSE,
  recommendation_label TEXT,
  why_recommended TEXT,
  data_label      TEXT DEFAULT '[MOCK DATA]',
  raw_response    JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE transport_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own transport options"
  ON transport_options FOR ALL
  USING (EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_id AND trips.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_id AND trips.user_id = auth.uid()));

-- ============================================================
-- TICKETS
-- ============================================================
CREATE TABLE IF NOT EXISTS tickets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trip_id         UUID REFERENCES trips(id) ON DELETE SET NULL,
  type            TEXT NOT NULL CHECK (type IN ('flight','train','bus')),
  operator        TEXT,
  origin          TEXT NOT NULL,
  destination     TEXT NOT NULL,
  departure_at    TIMESTAMPTZ,
  arrival_at      TIMESTAMPTZ,
  seat_class      TEXT,
  base_fare_inr   INTEGER,
  total_fare_inr  INTEGER,
  booking_ref     TEXT,
  status          TEXT DEFAULT 'saved' CHECK (status IN ('saved','booked','cancelled','refunded')),
  booking_url     TEXT,
  data_label      TEXT DEFAULT '[MOCK DATA]',
  raw_response    JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tickets"
  ON tickets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- EXPENSE GROUPS
-- ============================================================
CREATE TABLE IF NOT EXISTS expense_groups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id         UUID REFERENCES trips(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  created_by      UUID NOT NULL REFERENCES profiles(id),
  invite_code     TEXT UNIQUE DEFAULT LEFT(gen_random_uuid()::TEXT, 8),
  currency        TEXT DEFAULT 'INR',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE expense_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view expense groups"
  ON expense_groups FOR SELECT
  USING (
    auth.uid() = created_by OR
    EXISTS (SELECT 1 FROM expense_group_members WHERE group_id = id AND user_id = auth.uid())
  );

CREATE POLICY "Creator can manage expense group"
  ON expense_groups FOR ALL USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

-- ============================================================
-- EXPENSE GROUP MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS expense_group_members (
  group_id        UUID NOT NULL REFERENCES expense_groups(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  display_name    TEXT,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

ALTER TABLE expense_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group membership"
  ON expense_group_members FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM expense_groups WHERE id = group_id AND created_by = auth.uid()
  ));

-- ============================================================
-- EXPENSES
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID NOT NULL REFERENCES expense_groups(id) ON DELETE CASCADE,
  trip_id         UUID REFERENCES trips(id),
  paid_by         UUID NOT NULL REFERENCES profiles(id),
  title           TEXT NOT NULL,
  amount_inr      INTEGER NOT NULL,
  category        TEXT DEFAULT 'miscellaneous' CHECK (category IN (
                    'transport','accommodation','food','activities',
                    'shopping','fuel','emergency','miscellaneous'
                  )),
  receipt_url     TEXT,
  notes           TEXT,
  expense_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view expenses"
  ON expenses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM expense_group_members WHERE group_id = expenses.group_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM expense_groups WHERE id = expenses.group_id AND created_by = auth.uid()
  ));

CREATE POLICY "Members can add expenses"
  ON expenses FOR INSERT WITH CHECK (
    auth.uid() = paid_by AND EXISTS (
      SELECT 1 FROM expense_group_members WHERE group_id = expenses.group_id AND user_id = auth.uid()
    )
  );

-- ============================================================
-- EXPENSE SPLITS
-- ============================================================
CREATE TABLE IF NOT EXISTS expense_splits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id      UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id),
  share_amount_inr INTEGER NOT NULL,
  is_settled      BOOLEAN DEFAULT FALSE,
  settled_at      TIMESTAMPTZ
);

ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own splits"
  ON expense_splits FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Members can update own splits"
  ON expense_splits FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- PACKING ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS packing_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id         UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  category        TEXT NOT NULL,
  item_name       TEXT NOT NULL,
  quantity        INTEGER DEFAULT 1,
  is_packed       BOOLEAN DEFAULT FALSE,
  is_ai_generated BOOLEAN DEFAULT TRUE,
  notes           TEXT,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE packing_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own packing items"
  ON packing_items FOR ALL
  USING (EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_id AND trips.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_id AND trips.user_id = auth.uid()));

-- ============================================================
-- PRICE ALERTS
-- ============================================================
CREATE TABLE IF NOT EXISTS price_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trip_id         UUID REFERENCES trips(id),
  type            TEXT NOT NULL CHECK (type IN ('flight','train','bus')),
  origin          TEXT NOT NULL,
  destination     TEXT NOT NULL,
  travel_date     DATE,
  target_price_inr INTEGER,
  last_price_inr  INTEGER,
  is_active       BOOLEAN DEFAULT TRUE,
  last_checked_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own price alerts"
  ON price_alerts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- SAFETY CONTACTS
-- ============================================================
CREATE TABLE IF NOT EXISTS safety_contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  phone           TEXT NOT NULL,
  relationship    TEXT,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE safety_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own safety contacts"
  ON safety_contacts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- CHECKIN SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS checkin_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id         UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id),
  interval_mins   INTEGER NOT NULL DEFAULT 60,
  last_checkin_at TIMESTAMPTZ,
  next_due_at     TIMESTAMPTZ,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE checkin_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own checkin sessions"
  ON checkin_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN (
                    'price_drop','checkin_reminder','trip_reminder',
                    'expense_settled','budget_warning','safety_alert','system'
                  )),
  title           TEXT NOT NULL,
  body            TEXT,
  is_read         BOOLEAN DEFAULT FALSE,
  trip_id         UUID REFERENCES trips(id),
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notifications"
  ON notifications FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON trips;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at ON profiles;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
