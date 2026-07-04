# AI Travel App — MVP Product Requirements Document

**Version:** 0.1 (Draft)  |  **Date:** July 3, 2026  |  **Owner:** [Your name]  |  **Status:** For review

---

## TL;DR

- Your 10 features split into two very different build categories: **AI + your own database** (cheap, fast, no one has to say yes to you) vs. **live travel marketplace data** (needs GDS/OTA partnerships, weeks-to-months, recurring cost, payment compliance).
- **Phase 1 (MVP) = 6 features**, all buildable with an LLM API plus a couple of cheap utility APIs. This is what "low credits" actually buys you.
- **Phase 2 = 3 features**, shipped the lean way first — deep-links/affiliate redirects instead of building your own search-and-book backend.
- **Phase 3** = real in-app booking + price monitoring, once traction justifies the partnership and compliance overhead.

---

## 1. Overview

**Vision:** An AI-first travel companion that plans a trip end-to-end — itinerary, packing, budget, and safety — so travelers stop bouncing between five different apps to do it themselves.

**Target user (assumed):** Budget-to-mid-range leisure travelers, often in small groups, who want AI to do the planning grunt work and one place to run the whole trip from.

**Competitive reality check:** most of these features exist somewhere already (itinerary tools, Splitwise for expenses, standalone safety apps). Your differentiation is the bundle plus AI quality — not any single feature in isolation. Worth keeping in mind when you get to positioning.

**Assumptions this PRD makes** (flag anything wrong and I'll adjust):

- Small team or solo founder, likely building with AI-assisted coding tools — hence the "low credits" framing driving every scoping decision below.
- Mobile-first, cross-platform (one codebase, not separate iOS/Android builds) for v1.
- India-first launch market, based on the feature set and phrasing ("cab," group expense splitting). Examples below use IRCTC, RedBus, Ola/Uber, and MakeMyTrip where concrete examples help — the structure itself is market-agnostic.
- Monetization isn't specified, so this PRD stays focused on scope, not business model — though Phase 2's affiliate approach (§5) can double as an early revenue stream.

---

## 2. The Core Scoping Decision

This is really the whole game for building on a tight budget. Your 10 features split into two categories:

**Category A — "AI + your own database."** Needs an LLM API call and maybe a cheap third-party API (weather, maps). Nobody has to approve you first. Ship in days; cost is basically your LLM bill.

**Category B — "Live travel marketplace."** Needs real-time inventory/pricing from airlines, railways, bus operators, or OTAs. I checked the current landscape for you:

- **Amadeus for Developers** has a genuinely free, self-serve sandbox for flight search — but actual ticket issuance requires an airline consolidator partner on top, since Self-Service doesn't process the airline payment itself.
- **Skyscanner's** API is not self-serve at all — you apply to their Partnerships team, they review, and approval favors platforms that already have an audience. No public API key exists.
- **Duffel** is the exception that's genuinely fast: self-serve signup, no airline accreditation needed, pay-per-booking pricing, real booking in minutes. (It's already the backend for consumer travel-fintech apps that combine trip budgeting, split expenses, and booking — a similar shape to what you're building.)
- **Travelpayouts** (Aviasales/Hotellook) is a free-to-join affiliate network with ready-made deep-links and widgets — the easiest path to "show flight options" without building anything.
- **IRCTC** (Indian trains) restricts direct booking-API access; nearly everyone integrates through an authorized reseller/white-label provider instead of going direct. Informational data (PNR/running status) is more open than booking is.
- **RedBus/SeatSeller, AbhiBus** (Indian buses) require registering as a business partner — again a B2B relationship, not a public key.

The pattern is consistent: **search** is often accessible quickly; **booking** always requires a business relationship on top. That's a business-development timeline, not an engineering one — no amount of AI-assisted coding changes it.

**The MVP below is every Category A feature, fully built**, plus a trimmed **Safety Mode**, plus **Split Expense** (pure app logic, zero external dependency). The four features needing live travel data move to Phase 2 (lean deep-links) and Phase 3 (real booking).

---

## 3. Feature Prioritization Snapshot

#
Feature (as you defined it)
Phase
Why

1
AI Trip Planner
**Phase 1**
Core differentiator — pure LLM + your DB

7
Budget-Based Discovery
**Phase 1** (merged into #1)
Same inputs/output shape as the Trip Planner; building separately duplicates work

2
Smart Journey
**Phase 1** — as an *advisory*, not live comparison
"Flight is faster, train is cheaper" doesn't need live prices, just typical ones — which an LLM can estimate

8
AI Packing Checklist
**Phase 1**
LLM + one weather API call

9
Hidden Cost Calculator
**Phase 1**
LLM-estimated ranges, clearly labeled as estimates

4
Split Expense Feature
**Phase 1**
Zero AI, zero external API — just well-tested math. Drives group/viral usage

6
Safety Mode
**Phase 1** — trimmed scope
Emergency contacts + SOS + live-location share + "nearby help." No safety-scored routing yet

5
Cheapest Flight Finder
**Phase 2**
Needs live prices across providers — start via affiliate/deep-link

3
Smart Ticket Finder
**Phase 2 → 3**
Deep-link search in Phase 2; real in-app booking in Phase 3 once a GDS/OTA partnership is in place

10
Price Drop Alerts
**Phase 3**
Can't alert on a price feed that doesn't exist yet — depends on #3/#5 going live first

---

## 4. Phase 1 (MVP) — Feature Specs

**Suggested build order:**

1. **Trip Planner + Budget Discovery** — the foundation; every other Phase 1 feature reads from the `Trip` object this creates.
2. **Packing Checklist + Hidden Cost Calculator + Smart Journey advisory** — fast follows, same trip data, different prompts.
3. **Split Expense** — independent module; a second person on the team can build this in parallel.
4. **Safety Mode (Lite)** — independent module.

### 4.1 AI Trip Planner (incl. Budget-Based Discovery)

**User story:** "I enter my destination (or leave it blank), dates, budget, group size, and interests, and get a day-by-day plan that fits my budget."

**Inputs:** destination (optional — if blank, suggest 2–3 options), start/end date, traveler count, interests (multi-select), total budget + currency.

**Output:** day-by-day itinerary (activities, meals, accommodation tier, running estimated cost vs. budget); or, if destination was left blank, 2–3 destination suggestions with a one-line reason each.

**Tech approach:** one structured prompt to Claude/GPT requesting JSON output (day → activities/meals/est. cost). No live pricing needed — everything is labeled "AI-estimated." This is the cheapest possible version of "real."

**Out of scope for v1:** live price checking, actual hotel/activity booking, multi-city route optimization.

### 4.2 Smart Journey (Advisory Mode)

**User story:** "I want to know whether flight, train, bus, or cab makes sense for my route, without searching fares myself."

**Output:** a short per-leg comparison — mode, typical price range, typical duration, comfort note, plus a recommendation — folded into the itinerary output above.

**Tech approach:** same LLM call as the Trip Planner, extended with a transport-advisory block. Label clearly: "typical prices, not live fares — tap to check live fares" (that tap is your Phase 2 deep-link).

**Out of scope for v1:** live comparison, booking.

### 4.3 AI Recommended Packing Checklist

**Inputs:** destination, dates (duration derived), trip type/activities, traveler type.

**Output:** categorized checklist (clothing, documents, electronics, destination-specific items) with checkboxes.

**Tech approach:** pull a weather forecast/climate summary (OpenWeatherMap or similar has a workable free tier), feed it plus trip details into an LLM prompt for a structured checklist.

**Out of scope for v1:** "buy missing item" shopping links (a nice Phase 2 affiliate add-on).

### 4.4 Hidden Cost Calculator

**Inputs:** destination, duration, traveler count, chosen transport mode, accommodation type.

**Output:** estimated ranges for local transport, food/day, entry tickets, baggage norms, tourist taxes, tipping, SIM/data, insurance, plus a total.

**Tech approach:** LLM estimate from general destination knowledge, clearly labeled as an estimate. Optional later upgrade: blend with a small hand-maintained baseline-cost table per city.

**Out of scope for v1:** live per-airline baggage-fee lookups — too variable to estimate reliably and low value for the engineering cost.

### 4.5 Split Expense Feature

**Inputs:** trip group + members; expenses (payer, amount, split type — equal/custom/percentage, category).

**Output:** running per-person balance, "settle up" suggestions via debt-simplification (minimum number of payments to zero everyone out), expense history.

**Tech approach:** pure app logic — no AI, no external API. The cheapest, best-understood feature on this list.

**Out of scope for v1:** actually moving money in-app (UPI/PayPal payout) — that's a payments/compliance project on its own. v1 tracks who-owes-whom; people settle outside the app.

### 4.6 Safety Mode (Lite)

**Inputs:** emergency contacts (added manually), a "share live location" toggle for an active trip.

**Output:** SOS button sending current GPS + a message to emergency contacts; time-boxed live location sharing; "nearby help" (hospitals, police, embassies) via Google Places API.

**Tech approach:** device GPS + Google Places nearby-search for the relevant categories, plus either a real SMS API (Twilio, pay-per-message) or — cheaper and faster to ship — the phone's native share sheet to open WhatsApp/SMS pre-filled with a location link.

**Out of scope for v1:** safety-scored route suggestions (needs crime/safety data most map APIs don't provide), automatic dispatch to local emergency numbers (112/911) — a liability-heavy integration that needs legal review before it's anywhere near a feature.

**Flag for attention:** Safety Mode touches real emergencies. Even in "lite" form, put a clear in-app disclaimer ("this does not replace calling local emergency services") and get a legal read before launch — not because it's unusually hard to build, but because the cost of getting it wrong is unusually high.

---

## 5. Phase 2 — Lean Travel Search (Deep-Link / Affiliate Pattern)

Don't build your own search-and-compare backend yet. Redirect the user to an existing provider with the search pre-filled from their trip data. You get most of the perceived feature at a fraction of the engineering cost — and some of these pay you a referral commission.

Need
Option
Access model
Notes

Flight search (global)
Amadeus Self-Service
Self-serve signup, free sandbox
Search/price APIs are open; ticket issuance needs a consolidator partner

Flight search (global)
Skyscanner Travel API
Apply to Partnerships team; not guaranteed
Best once you have real traffic to show them

Flight/hotel deep-links
Travelpayouts (Aviasales/Hotellook)
Free signup, affiliate network
Easiest starting point — widgets + deep-links + commission

Train (India)
IRCTC
Restricted direct access
Go through an authorized reseller/white-label provider rather than direct

Bus (India)
redBus/SeatSeller, AbhiBus
Business partner registration
Same pattern as IRCTC

**How this maps to your features:**

- **#5 Cheapest Flight Finder** → power the "compare" view with Travelpayouts/Amadeus search data; the "book" button deep-links out (and earns commission where available).
- **#3 Smart Ticket Finder** → same deep-link pattern, extended to train/bus via a reseller partner for IRCTC/bus inventory.

---

## 6. Phase 3 — Full Integration & Scale

- **Real in-app booking:** move from deep-links to owning the booking flow. Duffel is the fastest path for flights specifically (self-serve, pay-per-booking, no accreditation needed) if you want in-app booking without the full GDS/consolidator route. Trains/buses still require the reseller relationships noted above.
- **Price Drop Alerts (#10):** needs a live price feed to exist first (from whichever Phase 2/3 integration you picked) plus a scheduled job to poll it and Firebase Cloud Messaging (or similar) to notify.
- **Advanced Safety Mode:** safety-scored routing, direct emergency-service dispatch — both need data partnerships or legal frameworks that are separate projects in themselves.
- **Split Expense settlement:** actual in-app money movement (UPI/PayPal payout), once you're ready for the compliance overhead that comes with it.

---

## 7. Suggested Lean Tech Stack

Every layer here is chosen because it has almost no backend code to write yourself — which is what keeps an AI-assisted build fast and cheap. Check current pricing/limits before committing, since free-tier terms shift over time.

Layer
Suggestion
Why

Frontend
React Native (Expo) or Flutter
One codebase for iOS + Android

Backend / DB
Supabase or Firebase
Auth, database, storage, and realtime (needed for live-location sharing) out of the box

AI
Claude or GPT API
Powers §4.1–4.4 via structured JSON output

Weather
OpenWeatherMap or similar
Feeds the Packing Checklist

Maps/Places
Google Maps Platform (Places API)
Powers "nearby help" in Safety Mode

Notifications
Firebase Cloud Messaging
Needed later for Price Drop Alerts; useful now for safety alerts

SOS delivery
Native share-sheet (WhatsApp/SMS) for v1
Costs nothing, ships in a day; upgrade to Twilio later if needed

---

## 8. Core Data Entities

Design this once before prompting your AI coding tool to build anything — the Trip Planner, Packing Checklist, Hidden Cost Calculator, and Smart Journey advisory all read/write the same `Trip` and `Itinerary` objects. Defining the shape upfront avoids rebuilding it four times.

- **User** — id, name, email, phone, home_currency, emergency_contacts[]
- **Trip** — id, owner_id, destination, start_date, end_date, budget_total, budget_currency, interests[], traveler_count, status
- **Itinerary** — id, trip_id, day_number, activities[], meals[], transport_advisory, estimated_cost
- **PackingList** — id, trip_id, items[] {name, category, checked}
- **HiddenCostEstimate** — id, trip_id, category, est_min, est_max, notes
- **ExpenseGroup** — id, trip_id, member_ids[]
- **Expense** — id, group_id, paid_by, amount, currency, split_type, split_details, category, date
- **SafetySession** — id, user_id, trip_id, emergency_contacts[], share_active, expires_at

---

## 9. Non-Functional Requirements

- **Performance:** itinerary generation should feel responsive — show a loading state, target under ~10s for a full itinerary.
- **Privacy/security:** location data and emergency contacts are sensitive. Encrypt at rest, time-box any location share, get explicit consent, and define a retention/deletion policy. India-based users fall under the DPDP Act; EU users would add GDPR obligations.
- **Cost control:** cache LLM responses for repeated/common queries, set a sensible per-user generation limit, especially before a paid tier exists.
- **Clarity of "AI-estimated" content:** visually distinguish AI estimates from confirmed/live data everywhere, so no one mistakes a guess for a quote.

---

## 10. Risks & Mitigations

Risk
Mitigation

LLM gives wrong/outdated specifics (hours, closed venues, prices)
Label everything as AI-estimated, make it easy to edit, collect feedback

Safety Mode liability if a response is delayed or fails
Clear disclaimers, legal review, never claim "guaranteed safety"

Location-data privacy concerns
Explicit consent, time-boxed sharing, minimal retention, relevant privacy-law compliance

LLM API cost scaling with growth
Cache common queries, rate-limit free users, track cost per user

Feature overlap/confusion (#2 vs. #5 vs. #3)
Position clearly in-app: Trip Planner = advisory, Ticket Finder = live/bookable (Phase 2+)

Travel-data partnerships slower/costlier than expected
Deep-link/affiliate model ships value before formal partnerships land

---

## 11. Success Metrics for MVP

- **Activation:** % of signups who generate at least one complete itinerary
- **Engagement:** avg. AI itineraries generated per user per month
- **Retention:** % of users who return within 30 days to plan another trip
- **Group virality:** % of trips with 2+ members (Split Expense usage) — proxy for network effect
- **Safety adoption:** % of trips with Safety Mode activated
- **Unit economics:** LLM cost per itinerary generated
- **Quality:** user feedback (thumbs up/down) on generated itineraries

---

## 12. Explicitly Out of Scope for MVP

- In-app flight/train/bus ticket booking and payments
- Live price comparison across multiple OTA providers
- Real-time price-drop monitoring/alerts
- Safety-scored route suggestions
- Automatic dispatch to local emergency authorities
- In-app settlement/payment of split expenses
- Multi-currency live FX conversion
- Separate native iOS/Android codebases

---

## 13. Open Questions for You

- Primary launch market/geography — India-only to start, or wider from day one?
- Monetization model — freemium, subscription, affiliate commissions (§5), or booking fees later?
- Platform priority — iOS, Android, or both equally?
- Team size and technical skill level — changes how aggressively Phase 1's build order (§4) can parallelize?
- Existing brand/app name/design assets to build around?

---

## 14. Building This Efficiently (Minimizing Dev/AI-Tool Cost)

- Design the schema in §8 before writing a single prompt to your AI coding tool — redoing a data model mid-build burns far more credits than getting it right once upfront.
- Build one feature fully (backend + UI) before starting the next, in the order suggested in §4 — half-finished parallel features are the biggest source of wasted iterations, since the tool re-loads context every time you switch.
- Use structured JSON output from the LLM (not free text you parse yourself) for every AI feature — far fewer follow-up fixes.
- Ship on one platform pattern (cross-platform framework, or even mobile-web first) rather than two native codebases.
- Lean on free tiers (Supabase/Firebase, Google Maps, OpenWeatherMap) as long as usage allows — check current limits before building against them.
- Don't touch Phase 2/3 until Phase 1 is live. The temptation to "just add live flight prices" early is exactly what turns a low-cost MVP into an expensive one.
