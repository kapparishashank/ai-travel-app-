# TravelAI — Known Limitations

This document records all known limitations, mock data usage, safety disclaimers, and technical constraints of the MVP. This list must be kept current.

---

## Mandatory Disclaimers (must appear in UI)

### AI-Generated Content
> "This itinerary is AI-generated and should be treated as a planning suggestion only. Places may have different hours, prices, or availability. Always verify before visiting."

### Price Estimates
> "All prices shown are estimates based on typical rates. Actual prices at the time of booking may differ. TravelAI does not guarantee any price."

### Safety Information
> "Safety information is provided as general guidance only. TravelAI does not guarantee safety at any location and is not responsible for any incidents during travel. Always exercise personal judgment."

### Mock Data
> All screens displaying mock data must show a visible badge: **[MOCK DATA]**  
> All AI-estimated prices must show: **[AI ESTIMATE]**

---

## Current MVP Limitations

### Authentication
| Limitation | Reason | Planned Fix |
|---|---|---|
| No social login (Google, Apple) | MVP scope | Phase 2 |
| No OTP / phone-based auth | MVP scope | Phase 2 |
| Password reset via Supabase email only | MVP scope | Phase 2 |

### AI Trip Planner
| Limitation | Reason | Planned Fix |
|---|---|---|
| Uses mock data when AI key not configured | Dev mode | Configure Gemini key |
| No real-time place data (opening hours, ratings) | No Places API key | Phase 2 |
| Map view not implemented | MVP scope | Phase 2 |
| PDF/share export not implemented | MVP scope | Phase 2 |
| Itinerary regeneration regenerates full trip (single-day regen in backlog) | MVP scope | Phase 2 |

### Smart Journey
| Limitation | Reason | Planned Fix |
|---|---|---|
| All transport data is mock | No live IRCTC/RedBus API integration | Phase 2 |
| No live seat availability | Mock data | Phase 2 |
| No actual booking — redirects to partner site | Partner API not integrated | Phase 2 |
| Cab (Ola/Uber) pricing is estimated only | No live cab API | Phase 2 |

### Smart Ticket Finder
| Limitation | Reason | Planned Fix |
|---|---|---|
| All ticket data is mock | No live provider API | Phase 2 |
| IRCTC requires external login | No IRCTC partner agreement | Future |
| No in-app booking | MVP scope | Phase 2 |

### Hidden Cost Calculator
| Limitation | Reason | Planned Fix |
|---|---|---|
| All estimates are AI-generated, not live pricing | No price feeds | Phase 2 |
| Food cost is a per-day average estimate | No restaurant API | Future |
| Baggage fees vary by airline — averages used | No airline ancillary API | Phase 2 |

### Split Expenses
| Limitation | Reason | Planned Fix |
|---|---|---|
| UPI payment links are static | No UPI deep link API | Phase 2 |
| Receipt OCR not implemented | Edge Function AI cost | Phase 2 |
| Offline sync limited to AsyncStorage cache | No conflict resolution | Phase 2 |

### Budget-Based Discovery
| Limitation | Reason | Planned Fix |
|---|---|---|
| Destination list is seeded/mock data | No live data aggregation | Phase 2 |
| No hotel price integration | No hotel API | Phase 2 |

### Safety Mode
| Limitation | Reason | Planned Fix |
|---|---|---|
| All safety scores are mock data | No live crime/advisory API | Phase 2 |
| Live location sharing not implemented | MVP scope | Phase 2 |
| Trusted contact SMS alerts not implemented | Requires SMS provider | Phase 2 |
| Missed check-in push notification not implemented | Requires scheduled job | Phase 2 |

### Price Drop Alerts
| Limitation | Reason | Planned Fix |
|---|---|---|
| All price checks use mock data | No live price API | Phase 2 |
| No scheduled background price checking | Requires pg_cron or external scheduler | Phase 2 |
| Alerts are checked on-demand only | MVP scope | Phase 2 |

### Notifications
| Limitation | Reason | Planned Fix |
|---|---|---|
| Local notifications only | Expo push not configured for FCM/APNs | Phase 2 |
| No email notifications | No email provider integrated | Phase 2 |

---

## Technical Constraints

| Constraint | Detail |
|---|---|
| **Supabase free tier limits** | 500 MB DB, 1 GB Storage, 2M Edge Function invocations/month |
| **Expo Go limits** | Native modules (camera, background fetch) need dev build |
| **SecureStore** | Available on mobile only; web uses Supabase cookie sessions |
| **Edge Function cold starts** | First call may be slow (~1-2s). Subsequent calls are fast |
| **TanStack Query cache** | Client-side only; clears on app restart unless AsyncStorage is used |
| **TypeScript strict mode** | All `any` types must be documented with `// TODO: type this` |

---

## INR Currency Assumption

- All monetary values are displayed in INR (₹) throughout the app.
- Values are stored in the database as **paise** (integer × 100).
- Multi-currency support is not planned for MVP.

---

## Data Freshness Labels

All data shown in the app must carry one of these labels:

| Label | Meaning |
|---|---|
| `[LIVE]` | Fetched from a live partner API in real time |
| `[AI ESTIMATE]` | Generated by AI, not verified with live providers |
| `[MOCK DATA]` | Static mock data, for development/demo only |
| `[CACHED]` | Fetched from Supabase but may be stale (show timestamp) |

---

## Not in MVP Scope

The following features from the PRD are explicitly **out of scope** for Phase 1 MVP:

- Visa and immigration information
- Travel insurance
- Loyalty program integration
- Multi-language support (UI is English only)
- International destinations (India-first for MVP)
- Cryptocurrency payments
- Social/community features
- Real-time traffic routing
- Hotel booking
- Car rental booking
- Autonomous emergency response
- Guaranteed future price predictions
