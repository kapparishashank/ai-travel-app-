type TableStore = Record<string, any[]>;
type AuthUser = {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  user_metadata: Record<string, any>;
};
type MockSession = {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
};

const dbKey = 'travelai.mockSupabase.db.v1';
const sessionKey = 'travelai.mockSupabase.session.v1';
const authKey = 'travelai.mockSupabase.auth.v1';

const tables = [
  'profiles',
  'travel_preferences',
  'analytics_preferences',
  'analytics_events',
  'trips',
  'trip_members',
  'trip_days',
  'itinerary_items',
  'journey_searches',
  'journey_options',
  'journey_segments',
  'trip_budgets',
  'cost_items',
  'packing_lists',
  'packing_items',
  'expenses',
  'expense_participants',
  'expense_splits',
  'settlements',
  'trusted_contacts',
  'safety_sessions',
  'safety_checkins',
  'price_alerts',
  'price_history',
  'notifications',
  'notification_preferences',
  'saved_destinations',
  'user_feedback',
] as const;

const studentNames = ['Amit', 'Diya', 'Neha', 'Rahul'];

function now() {
  return new Date().toISOString();
}

function id(prefix = 'mock') {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

function emptyDb(): TableStore {
  return Object.fromEntries(tables.map((table) => [table, []]));
}

function readDb(): TableStore {
  return { ...emptyDb(), ...readJson<TableStore>(dbKey, emptyDb()) };
}

function writeDb(db: TableStore) {
  writeJson(dbKey, db);
}

function readSession(): MockSession | null {
  return readJson<MockSession | null>(sessionKey, null);
}

function writeSession(session: MockSession | null) {
  if (typeof localStorage === 'undefined') return;
  if (session) writeJson(sessionKey, session);
  else localStorage.removeItem(sessionKey);
}

function readAuth() {
  return readJson<Record<string, { user: AuthUser; password: string }>>(authKey, {});
}

function writeAuth(auth: Record<string, { user: AuthUser; password: string }>) {
  writeJson(authKey, auth);
}

function withTimestamps(row: any) {
  const timestamp = now();
  return {
    id: row.id ?? id(),
    created_at: row.created_at ?? timestamp,
    updated_at: row.updated_at ?? timestamp,
    ...row,
  };
}

function matches(row: any, filters: { field: string; op: 'eq' | 'in'; value: any }[]) {
  return filters.every((filter) => {
    if (filter.op === 'eq') return row[filter.field] === filter.value;
    if (filter.op === 'in') return filter.value.includes(row[filter.field]);
    return true;
  });
}

function attachRelations(table: string, rows: any[], db: TableStore) {
  if (table === 'trips') {
    return rows.map((trip) => ({
      ...trip,
      trip_members: db.trip_members.filter((member) => member.trip_id === trip.id),
    }));
  }
  if (table === 'journey_options') {
    return rows.map((option) => ({
      ...option,
      journey_segments: db.journey_segments.filter((segment) => segment.journey_option_id === option.id),
    }));
  }
  return rows;
}

class MockQuery {
  private filters: { field: string; op: 'eq' | 'in'; value: any }[] = [];
  private orderBy: { field: string; ascending: boolean }[] = [];
  private maxRows: number | null = null;
  private singleMode: 'single' | 'maybeSingle' | null = null;
  private mutation: 'insert' | 'update' | 'delete' | 'upsert' | null = null;
  private payload: any;

  constructor(private table: string) {}

  select() {
    return this;
  }

  eq(field: string, value: any) {
    this.filters.push({ field, op: 'eq', value });
    return this;
  }

  in(field: string, value: any[]) {
    this.filters.push({ field, op: 'in', value });
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.orderBy.push({ field, ascending: options?.ascending !== false });
    return this;
  }

  limit(count: number) {
    this.maxRows = count;
    return this;
  }

  single() {
    this.singleMode = 'single';
    return this;
  }

  maybeSingle() {
    this.singleMode = 'maybeSingle';
    return this;
  }

  insert(payload: any) {
    this.mutation = 'insert';
    this.payload = payload;
    return this;
  }

  update(payload: any) {
    this.mutation = 'update';
    this.payload = payload;
    return this;
  }

  delete() {
    this.mutation = 'delete';
    return this;
  }

  upsert(payload: any, options?: { onConflict?: string }) {
    this.mutation = 'upsert';
    this.payload = { payload, onConflict: options?.onConflict };
    return this;
  }

  then(resolve: (value: any) => void, reject?: (reason: unknown) => void) {
    return this.execute().then(resolve, reject);
  }

  private async execute() {
    const db = readDb();
    db[this.table] = db[this.table] ?? [];

    if (this.mutation === 'insert') {
      const rows = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((row) => withTimestamps(row));
      db[this.table].push(...rows);
      if (this.table === 'trips') rows.forEach((trip) => seedTripMembers(db, trip));
      writeDb(db);
      return this.format(rows, db);
    }

    if (this.mutation === 'update') {
      const changed: any[] = [];
      db[this.table] = db[this.table].map((row) => {
        if (!matches(row, this.filters)) return row;
        const next = { ...row, ...this.payload, updated_at: now() };
        changed.push(next);
        return next;
      });
      writeDb(db);
      return this.format(changed, db);
    }

    if (this.mutation === 'delete') {
      const removed = db[this.table].filter((row) => matches(row, this.filters));
      db[this.table] = db[this.table].filter((row) => !matches(row, this.filters));
      writeDb(db);
      return this.format(removed, db);
    }

    if (this.mutation === 'upsert') {
      const conflict = this.payload.onConflict ?? 'id';
      const rows = Array.isArray(this.payload.payload) ? this.payload.payload : [this.payload.payload];
      const saved = rows.map((row: any) => {
        const index = db[this.table].findIndex((current) => current[conflict] === row[conflict]);
        if (index >= 0) {
          db[this.table][index] = { ...db[this.table][index], ...row, updated_at: now() };
          return db[this.table][index];
        }
        const next = withTimestamps(row);
        db[this.table].push(next);
        return next;
      });
      writeDb(db);
      return this.format(saved, db);
    }

    let rows = db[this.table].filter((row) => matches(row, this.filters));
    for (const order of [...this.orderBy].reverse()) {
      rows = rows.sort((a, b) => {
        const result = String(a[order.field] ?? '').localeCompare(String(b[order.field] ?? ''));
        return order.ascending ? result : -result;
      });
    }
    if (this.maxRows !== null) rows = rows.slice(0, this.maxRows);
    return this.format(rows, db);
  }

  private format(rows: any[], db: TableStore) {
    const data = attachRelations(this.table, rows, db);
    if (this.singleMode === 'single') {
      if (!data.length) return { data: null, error: { message: `No ${this.table} row found.` } };
      return { data: data[0], error: null };
    }
    if (this.singleMode === 'maybeSingle') {
      return { data: data[0] ?? null, error: null };
    }
    return { data, error: null };
  }
}

function seedTripMembers(db: TableStore, trip: any) {
  if (db.trip_members.some((member) => member.trip_id === trip.id)) return;
  const ownerProfile = db.profiles.find((profile) => profile.id === trip.created_by);
  const members = studentNames.map((name, index) =>
    withTimestamps({
      id: `${trip.id}-member-${index + 1}`,
      trip_id: trip.id,
      user_id: index === 0 ? trip.created_by : null,
      display_name: index === 0 ? ownerProfile?.full_name || name : name,
      email: index === 0 ? ownerProfile?.email ?? null : `${name.toLowerCase()}@example.test`,
      role: index === 0 ? 'organizer' : 'member',
      status: 'accepted',
    }),
  );
  db.trip_members.push(...members);
}

function currentUserId() {
  return readSession()?.user.id ?? null;
}

function createDay(date: Date, tripId: string, index: number, title: string) {
  return withTimestamps({
    id: `${tripId}-day-${index}`,
    trip_id: tripId,
    day_number: index,
    local_date: date.toISOString().slice(0, 10),
    title,
    notes: null,
  });
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function mockItinerary(tripId: string) {
  const db = readDb();
  const trip = db.trips.find((row) => row.id === tripId);
  if (!trip) return { error: true, message: 'Trip not found.' };

  db.trip_days = db.trip_days.filter((day) => day.trip_id !== tripId);
  db.itinerary_items = db.itinerary_items.filter((item) => item.trip_id !== tripId || item.metadata?.locked);

  const start = new Date(`${trip.start_date}T00:00:00`);
  const dayTitles = ['Arrival and beach evening', 'North Goa food crawl', 'Old Goa and Panjim', 'Slow checkout morning'];
  const days = dayTitles.map((title, index) => createDay(addDays(start, index), tripId, index + 1, title));
  db.trip_days.push(...days);

  const activities = [
    ['Train arrival and check-in', '10:00', '12:00', 'transport', 'Madgaon to stay transfer', 180000],
    ['Baga Beach sunset', '16:00', '18:30', 'activity', 'Baga Beach', 120000],
    ['Local Goan dinner', '20:00', '21:30', 'food', 'Calangute', 240000],
    ['Fort Aguada visit', '09:30', '11:30', 'sightseeing', 'Fort Aguada', 80000],
    ['Beach shack lunch', '13:00', '14:30', 'food', 'Anjuna', 220000],
    ['Night market walk', '19:00', '21:00', 'shopping', 'Arpora', 160000],
    ['Old Goa churches', '10:00', '12:00', 'sightseeing', 'Old Goa', 60000],
    ['Panjim cafe hop', '13:00', '15:00', 'food', 'Fontainhas', 200000],
    ['Mandovi riverfront', '17:00', '18:30', 'activity', 'Panjim', 80000],
    ['Breakfast and packing', '09:00', '10:30', 'rest', 'Stay', 120000],
    ['Local market souvenirs', '11:00', '12:30', 'shopping', 'Mapusa', 150000],
    ['Depart for Hyderabad', '15:00', '17:00', 'transport', 'Madgaon station', 180000],
  ].map(([title, startTime, endTime, category, location, cost], index) => {
    const day = days[Math.floor(index / 3)];
    return withTimestamps({
      id: `${tripId}-activity-${index + 1}`,
      trip_id: tripId,
      trip_day_id: day.id,
      title,
      description: 'AI-generated suggestion for the four-student Hyderabad-to-Goa MVP test trip.',
      category,
      location_name: location,
      starts_at: `${day.local_date}T${startTime}:00+05:30`,
      ends_at: `${day.local_date}T${endTime}:00+05:30`,
      local_start_time: startTime,
      local_end_time: endTime,
      estimated_cost_minor: cost,
      source: 'ai',
      status: 'planned',
      sort_order: index % 3,
      metadata: {
        recommendation_reason: 'Balances student budget, beach time, food, and nightlife.',
        safety_note: 'Guidance only. Verify routes locally and avoid isolated areas late at night.',
        weather_note: 'Warm coastal conditions. Verify live forecast before outdoor plans.',
        alternatives: ['Colva Beach', 'Miramar walk', 'Dona Paula viewpoint'],
        warnings: ['Availability, opening hours, and prices require live verification.'],
        data_status: 'AI estimate',
      },
    });
  });
  db.itinerary_items.push(...activities);
  writeDb(db);
  return {
    status: 'complete',
    data_label: '[MOCK DATA]',
    summary: 'Four-day Hyderabad-to-Goa student itinerary generated from local mock data.',
  };
}

function mockPacking(tripId: string, body: any) {
  const db = readDb();
  const trip = db.trips.find((row) => row.id === tripId);
  if (!trip) return { error: true, message: 'Trip not found.' };
  const list = withTimestamps({
    id: `${tripId}-packing-list`,
    trip_id: tripId,
    user_id: currentUserId(),
    title: `${trip.destination_name} packing checklist`,
    status: 'active',
  });
  db.packing_lists = db.packing_lists.filter((row) => row.trip_id !== tripId);
  db.packing_items = db.packing_items.filter((row) => row.trip_id !== tripId);
  db.packing_lists.push(list);

  const items = [
    ['College ID and government ID', 'documents', 1, 'Required for travel, hotel check-in, and emergencies.', 'high'],
    ['Train tickets screenshot', 'documents', 1, 'Keep offline proof of booking details.', 'high'],
    ['Light cotton outfits', 'clothing', 4, 'Goa is warm and humid in the demo context.', 'high'],
    ['Swimwear', 'clothing', 1, 'Useful for beach activities where appropriate.', 'medium'],
    ['Comfortable sandals', 'footwear', 1, 'Good for beach and short local walks.', 'high'],
    ['Sunscreen', 'toiletries', 1, 'General sun-protection reminder, not medical advice.', 'high'],
    ['Personal medicines reminder', 'medicines', 1, 'Carry prescribed personal medicines if you already use them. This is not medical advice.', 'high'],
    ['Phone charger and power bank', 'electronics', 1, 'Useful for long train travel and local navigation.', 'high'],
    ['Small first-aid kit', 'safety', 1, 'General safety reminder for minor issues.', 'medium'],
    ['Reusable water bottle', 'food_and_water', 1, 'Helps during warm weather and day trips.', 'medium'],
    ['Extra heavy luggage', 'not_recommended', 0, body?.baggageLimit ?? 'Avoid overpacking for train/local transport.', 'low'],
  ].map(([name, category, quantity, reason, priority], index) =>
    withTimestamps({
      id: `${tripId}-packing-${index + 1}`,
      packing_list_id: list.id,
      trip_id: tripId,
      assigned_to: null,
      category,
      item_name: name,
      quantity,
      is_packed: false,
      packed_at: null,
      source: 'ai',
      notes: JSON.stringify({ packingCategory: category, reason, priority, aiGenerated: true }),
      sort_order: index,
    }),
  );
  db.packing_items.push(...items);
  writeDb(db);
  return { status: 'complete', data_label: '[MOCK DATA]', listId: list.id, itemCount: items.length };
}

function mockSafety(destination: string) {
  return {
    data_label: '[MOCK DATA]',
    destination,
    disclaimer: 'Safety information is guidance only. TravelAI cannot guarantee safety or dispatch emergency services.',
    sourceNote: 'Development mock emergency information. Verify official local sources before travel.',
    lastUpdated: now(),
    emergencyNumbers: { nationalEmergency: '112', ambulance: '108', police: '100' },
    nearbyHospitals: [
      { name: 'Goa Medical College Hospital', phone: '0832-2495000', distanceKm: 11, note: 'Mock-labelled hospital information.' },
      { name: 'Manipal Hospital Goa', phone: '0832-6632500', distanceKm: 18, note: 'Mock-labelled hospital information.' },
    ],
    nearbyPoliceStations: [
      { name: 'Calangute Police Station', phone: '0832-2278284', distanceKm: 3, note: 'Mock-labelled police information.' },
      { name: 'Panjim Police Station', phone: '0832-2428990', distanceKm: 12, note: 'Mock-labelled police information.' },
    ],
    safetyNotes: ['Use official taxis or known local transport.', 'Avoid isolated beach stretches late at night.', 'Share plans with trusted contacts.'],
    weatherAlert: 'Mock weather note: warm and humid; verify live weather before beach plans.',
  };
}

function mockPriceAlert(body: any) {
  const db = readDb();
  const alert = db.price_alerts.find((row) => !body?.alertId || row.id === body.alertId);
  if (!alert) return { error: true, message: 'Price alert not found.' };
  const previous = alert.last_seen_price_minor ?? 0;
  const latest = Math.max(100, Math.round(previous * (1 - (body?.forceDropPercent ?? 20) / 100)));
  const observed = withTimestamps({
    id: id('price-history'),
    price_alert_id: alert.id,
    journey_option_id: alert.journey_option_id,
    mode: alert.mode,
    origin_name: alert.origin_name,
    destination_name: alert.destination_name,
    depart_on: alert.depart_on,
    observed_price_minor: latest,
    currency_code: alert.currency_code,
    provider: alert.provider,
    data_status: 'mock',
    observed_at: now(),
  });
  db.price_history.push(observed);
  Object.assign(alert, {
    last_seen_price_minor: latest,
    last_checked_at: now(),
    last_notified_at: now(),
    last_notification_price_minor: latest,
    status: 'triggered',
    updated_at: now(),
  });
  db.notifications.unshift(
    withTimestamps({
      user_id: alert.user_id,
      trip_id: alert.trip_id,
      category: 'price_drop',
      type: 'price_alert',
      title: 'Mock price drop alert',
      body: `${alert.origin_name} to ${alert.destination_name} dropped to an estimated mock price.`,
      status: 'unread',
      read_at: null,
      action_url: '/(tabs)/price-alerts',
      metadata: { alertId: alert.id, category: 'price_drop' },
    }),
  );
  writeDb(db);
  return { status: 'complete', data_label: '[MOCK DATA]', previousPriceMinor: previous, latestPriceMinor: latest, notified: true };
}

function createMockSession(user: AuthUser): MockSession {
  return { access_token: `mock-token-${user.id}`, refresh_token: `mock-refresh-${user.id}`, user };
}

export function createMockSupabaseClient() {
  const listeners = new Set<(event: string, session: MockSession | null) => void>();
  const notify = (event: string, session: MockSession | null) => listeners.forEach((listener) => listener(event, session));

  return {
    auth: {
      async signUp({ email, password, options }: any) {
        const auth = readAuth();
        const key = String(email).toLowerCase();
        if (auth[key]) return { data: { user: null, session: null }, error: { message: 'User already registered in local demo mode.' } };
        const user: AuthUser = {
          id: id('user'),
          email: key,
          email_confirmed_at: null,
          user_metadata: options?.data ?? {},
        };
        auth[key] = { user, password };
        writeAuth(auth);
        const db = readDb();
        db.profiles.push(
          withTimestamps({
            id: user.id,
            email: key,
            full_name: options?.data?.full_name ?? '',
            avatar_url: null,
            phone: null,
            date_of_birth: null,
            home_city: null,
            preferred_language: 'en',
            preferred_lang: 'en',
            currency_code: 'INR',
            timezone: 'Asia/Kolkata',
          }),
        );
        writeDb(db);
        const session = createMockSession(user);
        writeSession(session);
        notify('SIGNED_IN', session);
        return { data: { user, session }, error: null };
      },
      async signInWithPassword({ email, password }: any) {
        const auth = readAuth();
        const record = auth[String(email).toLowerCase()];
        if (!record || record.password !== password) return { data: { user: null, session: null }, error: { message: 'Invalid login credentials.' } };
        const session = createMockSession(record.user);
        writeSession(session);
        notify('SIGNED_IN', session);
        return { data: { user: record.user, session }, error: null };
      },
      async signOut() {
        writeSession(null);
        notify('SIGNED_OUT', null);
        return { error: null };
      },
      async getSession() {
        return { data: { session: readSession() }, error: null };
      },
      async getUser() {
        return { data: { user: readSession()?.user ?? null }, error: null };
      },
      async refreshSession() {
        const session = readSession();
        if (!session) return { data: { user: null, session: null }, error: { message: 'No active session.' } };
        session.user.email_confirmed_at = session.user.email_confirmed_at ?? now();
        const auth = readAuth();
        if (auth[session.user.email]) {
          auth[session.user.email].user = session.user;
          writeAuth(auth);
        }
        writeSession(session);
        notify('TOKEN_REFRESHED', session);
        return { data: { user: session.user, session }, error: null };
      },
      async resend() {
        return { data: {}, error: null };
      },
      async verifyOtp({ email, token }: any) {
        const auth = readAuth();
        const key = String(email).toLowerCase();
        const record = auth[key];
        if (!record) return { data: { user: null, session: null }, error: { message: 'No local demo user found for this email.' } };
        if (String(token) !== '123456') return { data: { user: null, session: null }, error: { message: 'Invalid demo verification code. Use 123456 in local demo mode.' } };

        record.user.email_confirmed_at = record.user.email_confirmed_at ?? now();
        auth[key] = record;
        writeAuth(auth);

        const session = createMockSession(record.user);
        writeSession(session);
        notify('SIGNED_IN', session);
        return { data: { user: record.user, session }, error: null };
      },
      async resetPasswordForEmail() {
        return { data: {}, error: null };
      },
      onAuthStateChange(callback: (event: string, session: MockSession | null) => void) {
        listeners.add(callback);
        return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } };
      },
    },
    from(table: string) {
      return new MockQuery(table);
    },
    functions: {
      async invoke(name: string, options?: { body?: any }) {
        if (name === 'ai-planner') return { data: mockItinerary(options?.body?.tripId), error: null };
        if (name === 'packing-checklist') return { data: mockPacking(options?.body?.tripId, options?.body), error: null };
        if (name === 'safety-info') return { data: mockSafety(options?.body?.destination ?? 'Goa'), error: null };
        if (name === 'price-alerts') return { data: mockPriceAlert(options?.body), error: null };
        if (name === 'delete-account') {
          const session = readSession();
          if (session) {
            const auth = readAuth();
            delete auth[session.user.email];
            writeAuth(auth);
          }
          writeSession(null);
          return { data: { status: 'complete' }, error: null };
        }
        if (name === 'admin-dashboard') return { data: { error: 'forbidden' }, error: { message: 'forbidden' } };
        return { data: { status: 'complete', data_label: '[MOCK DATA]' }, error: null };
      },
    },
  };
}
