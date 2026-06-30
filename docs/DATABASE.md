# TravelAI — Database Schema

All dates are stored in **ISO 8601** format. Default currency is **INR (₹)**.  
All monetary values are stored as `INTEGER` (paise / paisa — multiply by 100 before storing, divide by 100 for display).  
Row Level Security (RLS) is enabled on all tables.

---

## Tables

### `profiles`
Extends Supabase `auth.users`. Created by trigger on user signup.

```sql
CREATE TABLE profiles (
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
```

RLS: `SELECT / UPDATE` only for `auth.uid() = id`.

---

### `trips`
A trip record created by the user.

```sql
CREATE TABLE trips (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  origin          TEXT NOT NULL,
  destination     TEXT NOT NULL,
  start_date      DATE NOT NULL,                       -- ISO format
  end_date        DATE NOT NULL,
  num_travelers   INTEGER NOT NULL DEFAULT 1,
  traveler_type   TEXT DEFAULT 'solo'
                  CHECK (traveler_type IN ('solo','couple','family','friends','work')),
  budget_inr      INTEGER NOT NULL,                    -- stored in paise
  interests       TEXT[] DEFAULT '{}',
  comfort_level   TEXT DEFAULT 'standard',
  status          TEXT DEFAULT 'planning'
                  CHECK (status IN ('planning','active','completed','cancelled')),
  is_saved        BOOLEAN DEFAULT FALSE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

RLS: All operations for `auth.uid() = user_id`.

---

### `itinerary_days`
One row per day of a trip's AI-generated plan.

```sql
CREATE TABLE itinerary_days (
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
```

RLS: Via `trips` relationship — user must own the trip.

---

### `itinerary_activities`
Individual activities within a day.

```sql
CREATE TABLE itinerary_activities (
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
  is_confirmed    BOOLEAN DEFAULT FALSE,              -- FALSE = AI estimate only
  source_label    TEXT DEFAULT '[AI ESTIMATE]',       -- displayed on UI
  booking_url     TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### `transport_options`
Saved journey comparison results for a trip.

```sql
CREATE TABLE transport_options (
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
  data_label      TEXT DEFAULT '[MOCK DATA]',         -- label as mock or live
  raw_response    JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### `tickets`
Ticket search results saved by the user.

```sql
CREATE TABLE tickets (
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
  status          TEXT DEFAULT 'saved'
                  CHECK (status IN ('saved','booked','cancelled','refunded')),
  booking_url     TEXT,
  data_label      TEXT DEFAULT '[MOCK DATA]',
  raw_response    JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### `expense_groups`
A shared expense group (usually one per trip).

```sql
CREATE TABLE expense_groups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id         UUID REFERENCES trips(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  created_by      UUID NOT NULL REFERENCES profiles(id),
  invite_code     TEXT UNIQUE DEFAULT LEFT(gen_random_uuid()::TEXT, 8),
  currency        TEXT DEFAULT 'INR',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `expense_group_members`
```sql
CREATE TABLE expense_group_members (
  group_id        UUID NOT NULL REFERENCES expense_groups(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  display_name    TEXT,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);
```

---

### `expenses`
Individual expense entries.

```sql
CREATE TABLE expenses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID NOT NULL REFERENCES expense_groups(id) ON DELETE CASCADE,
  trip_id         UUID REFERENCES trips(id),
  paid_by         UUID NOT NULL REFERENCES profiles(id),
  title           TEXT NOT NULL,
  amount_inr      INTEGER NOT NULL,                  -- in paise
  category        TEXT DEFAULT 'miscellaneous'
                  CHECK (category IN (
                    'transport','accommodation','food','activities',
                    'shopping','fuel','emergency','miscellaneous'
                  )),
  receipt_url     TEXT,
  notes           TEXT,
  expense_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `expense_splits`
How each expense is split among members.

```sql
CREATE TABLE expense_splits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id      UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id),
  share_amount_inr INTEGER NOT NULL,                 -- in paise
  is_settled      BOOLEAN DEFAULT FALSE,
  settled_at      TIMESTAMPTZ
);
```

---

### `packing_items`
AI-generated and user-added packing list items.

```sql
CREATE TABLE packing_items (
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
```

---

### `price_alerts`
Price tracking records for flights/trains.

```sql
CREATE TABLE price_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trip_id         UUID REFERENCES trips(id),
  type            TEXT NOT NULL CHECK (type IN ('flight','train','bus')),
  origin          TEXT NOT NULL,
  destination     TEXT NOT NULL,
  travel_date     DATE,
  target_price_inr INTEGER,                          -- alert when below this
  last_price_inr  INTEGER,
  is_active       BOOLEAN DEFAULT TRUE,
  last_checked_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### `safety_contacts`
Trusted emergency contacts for Safety Mode.

```sql
CREATE TABLE safety_contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  phone           TEXT NOT NULL,
  relationship    TEXT,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### `checkin_sessions`
Safety Mode check-in timer sessions.

```sql
CREATE TABLE checkin_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id         UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id),
  interval_mins   INTEGER NOT NULL DEFAULT 60,
  last_checkin_at TIMESTAMPTZ,
  next_due_at     TIMESTAMPTZ,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### `notifications`
Notification log.

```sql
CREATE TABLE notifications (
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
```

---

## Key Relationships Diagram

```
auth.users
    └── profiles (1:1)
            └── trips (1:N)
                    ├── itinerary_days (1:N)
                    │       └── itinerary_activities (1:N)
                    ├── transport_options (1:N)
                    ├── tickets (1:N)
                    ├── expense_groups (1:N)
                    │       ├── expense_group_members (N:N via profiles)
                    │       └── expenses (1:N)
                    │               └── expense_splits (1:N)
                    ├── packing_items (1:N)
                    ├── checkin_sessions (1:N)
                    └── notifications (1:N via user_id)
            ├── tickets (1:N via user_id)
            ├── price_alerts (1:N)
            └── safety_contacts (1:N)
```

---

## Row Level Security Policies

All tables have RLS enabled. General policy pattern:

```sql
-- Example for trips table
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own trips"
  ON trips FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

Expense group members can read group expenses but cannot modify records they didn't create.

---

## Triggers

```sql
-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```
