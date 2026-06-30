# TravelAI — Architecture

## Overview

TravelAI is a cross-platform application (Android, iOS, responsive web) built with Expo React Native (frontend) and Supabase (backend-as-a-service). All AI and third-party API calls are executed inside Supabase Edge Functions so secret keys are never exposed to the client.

---

## System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                  │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  Expo React Native (frontend/)                                  │  │
│  │  • Expo Router (file-based navigation)                         │  │
│  │  • React Native Paper (custom TravelAI theme)                  │  │
│  │  • TanStack Query  (server-state cache)                        │  │
│  │  • Zustand         (ephemeral client state)                    │  │
│  │  • React Hook Form + Zod (form validation)                     │  │
│  │  • SecureStore     (auth tokens on mobile)                     │  │
│  │  • AsyncStorage    (non-sensitive offline cache)               │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└──────────────────────┬───────────────────────────────────────────────┘
                       │  HTTPS / WebSocket
┌──────────────────────▼───────────────────────────────────────────────┐
│                     SUPABASE LAYER  (backend/)                        │
│                                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  ┌────────────┐  │
│  │  Auth       │  │  PostgreSQL  │  │  Storage   │  │  Realtime  │  │
│  │  (JWT)      │  │  (Row Level  │  │  (receipts,│  │  (price    │  │
│  │             │  │   Security)  │  │   avatars) │  │   alerts)  │  │
│  └─────────────┘  └──────────────┘  └────────────┘  └────────────┘  │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │  Supabase Edge Functions (Deno runtime)                       │   │
│  │  • ai-planner         → AI itinerary generation (mock/Gemini) │   │
│  │  • packing-checklist  → AI packing list (mock/Gemini)         │   │
│  │  • smart-journey      → Transport comparison (mock data)      │   │
│  │  • ticket-search      → Ticket finder (mock data)             │   │
│  │  • hidden-cost-calc   → Cost estimation logic                 │   │
│  │  • safety-info        → Safety data (mock/external API)       │   │
│  │  • price-alerts       → Price change checker (scheduled)      │   │
│  └───────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────┬──────────────────────────────┘
                                        │ (optional future)
                              ┌─────────▼──────────┐
                              │  External Partners  │
                              │  IRCTC / MakeMyTrip │
                              │  RedBus / EaseMyTrip│
                              │  Gemini / OpenAI    │
                              └────────────────────┘
```

---

## Directory Structure

```
ai-travel-app-/
├── frontend/                          # Expo React Native app
│   ├── app/                           # Expo Router file-based routes
│   │   ├── _layout.tsx                # Root layout: providers, auth guard
│   │   ├── (auth)/                    # Unauthenticated screens
│   │   │   ├── _layout.tsx
│   │   │   ├── login.tsx
│   │   │   └── register.tsx
│   │   ├── (tabs)/                    # Bottom tab screens
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx              # Home/Dashboard
│   │   │   ├── trips.tsx              # Saved trips
│   │   │   ├── discover.tsx           # Budget-Based Discovery
│   │   │   └── profile.tsx            # User Profile
│   │   ├── trip/
│   │   │   ├── create.tsx             # Trip creation form
│   │   │   └── [id].tsx               # Trip detail
│   │   ├── planner/[tripId].tsx       # AI Trip Planner
│   │   ├── journey/compare.tsx        # Smart Journey
│   │   ├── tickets/search.tsx         # Smart Ticket Finder
│   │   ├── packing/[tripId].tsx       # AI Packing Checklist
│   │   ├── expenses/[tripId].tsx      # Split Expenses
│   │   ├── safety/[tripId].tsx        # Safety Mode
│   │   └── alerts/index.tsx           # Price Drop Alerts
│   ├── src/
│   │   ├── components/                # Reusable UI components
│   │   │   ├── common/                # Buttons, cards, inputs, badges
│   │   │   ├── trip/                  # TripCard, ItineraryDay, etc.
│   │   │   ├── tickets/               # TicketCard, FilterBar, etc.
│   │   │   └── expenses/              # ExpenseItem, BalanceSummary
│   │   ├── hooks/                     # TanStack Query hooks
│   │   ├── lib/
│   │   │   ├── supabase.ts            # Supabase client
│   │   │   └── queryClient.ts         # TanStack Query client
│   │   ├── store/
│   │   │   ├── authStore.ts           # Zustand: current user
│   │   │   └── tripStore.ts           # Zustand: active trip
│   │   ├── theme/
│   │   │   └── index.ts               # React Native Paper theme
│   │   ├── types/
│   │   │   └── index.ts               # Shared TypeScript types
│   │   └── utils/
│   │       ├── currency.ts            # INR formatting
│   │       └── date.ts                # ISO date helpers
│   ├── app.json
│   ├── tsconfig.json
│   ├── .eslintrc.js
│   └── package.json
│
├── backend/                           # Supabase backend
│   └── supabase/
│       ├── config.toml                # Supabase CLI config
│       ├── migrations/
│       │   └── 001_initial_schema.sql # Full DB schema
│       ├── seed.sql                   # Mock development data
│       └── functions/
│           ├── _shared/cors.ts        # CORS helper
│           ├── ai-planner/index.ts
│           ├── packing-checklist/index.ts
│           ├── smart-journey/index.ts
│           ├── ticket-search/index.ts
│           ├── hidden-cost-calc/index.ts
│           ├── safety-info/index.ts
│           └── price-alerts/index.ts
│
├── docs/
│   ├── ARCHITECTURE.md                # This file
│   ├── BUILD_STATUS.md
│   ├── DATABASE.md
│   ├── API_CONTRACTS.md
│   └── KNOWN_LIMITATIONS.md
│
├── .env.example
└── README.md
```

---

## Data Flow Examples

### Auth Flow
```
App start → Root _layout.tsx checks Supabase session
  → session exists  → redirect to (tabs)/index
  → no session      → redirect to (auth)/login
Login form → supabase.auth.signInWithPassword()
  → success → save session to SecureStore → navigate to tabs
  → error   → show error state on form
```

### AI Trip Planner Flow
```
User fills TripCreate form → saved to DB (trips table)
User taps "Generate Itinerary" → POST /functions/v1/ai-planner
  Edge Function:
    → reads trip from DB
    → calls Gemini API (or returns mock data if key absent)
    → writes itinerary_days + itinerary_activities to DB
    → returns { status: "complete", tripId }
  Frontend:
    → TanStack Query invalidates ["itinerary", tripId]
    → Planner screen re-fetches and renders day cards
```

### Split Expense Flow
```
User adds expense → form validated with Zod
  → saved to expenses table with payer_id + trip_id
  → expense_splits table records per-member amounts
  → TanStack Query invalidates ["expenses", tripId]
  → BalanceSummary hook recalculates min-transfer settlements
  → UI shows each person's net balance (owed / owes)
```

---

## Security Model

| Concern | Approach |
|---|---|
| Auth tokens (mobile) | `expo-secure-store` (encrypted hardware-backed) |
| Auth tokens (web) | Supabase JS SDK handles in-memory / cookie |
| Secret API keys | Stored only in Supabase Edge Function secrets |
| Database access | Row Level Security on all tables |
| User data isolation | RLS policies enforce `auth.uid() = user_id` |
| Location data | Opt-in only, not persisted beyond session |
| Receipt images | Stored in private Supabase Storage bucket |

---

## Performance Strategy

| Concern | Approach |
|---|---|
| Offline-first | AsyncStorage caches trips, itineraries locally |
| Stale data | TanStack Query `staleTime` + background refetch |
| Image loading | Progressive loading with skeleton screens |
| Large lists | FlatList with `windowSize` tuning |
| Edge Function cold start | Keep functions lightweight, shared `_shared/` module |

---

## Environment Variables

See `.env.example` for the full list. All secrets are server-side only.
