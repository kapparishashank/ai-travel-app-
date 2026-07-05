# TravelAI Release Checklist

Date: 2026-07-05

## Required Before Release

- [x] TypeScript check passes.
- [x] Unit and contract tests pass.
- [x] Lint command is configured and passes without errors.
- [x] Expo public config validates.
- [x] Web export build succeeds.
- [x] Supabase Edge Functions pass Deno type checks.
- [x] No service-role keys are referenced by frontend code.
- [x] External partner URLs are validated and confirmed before opening.
- [x] Admin access uses server-side role verification.
- [x] AI itinerary responses are schema-validated before saving.
- [x] Safety mode has explicit consent and does not claim automatic dispatch.
- [x] Account deletion is implemented through a secure backend function.

## Required In Deployment Environment

- [ ] Configure Supabase project URL and anon key for frontend runtime.
- [ ] Store service-role keys only in Supabase Edge Function secrets.
- [ ] Store AI provider keys only in backend/Edge Function secrets.
- [ ] Apply all Supabase migrations in order.
- [ ] Run seed data only in non-production or approved demo environments.
- [ ] Verify RLS with real Supabase users and trip memberships.
- [ ] Configure allowed redirect URLs for Supabase Auth.
- [ ] Configure email verification and password-reset templates.
- [ ] Configure notification permission and push-token registration when ready.
- [ ] Configure admin roles in `admin_roles` before exposing admin routes.
- [ ] Validate partner booking domains before enabling real providers.

## Preflight Commands

```bash
cd frontend
npm run typecheck
npm run lint
npm test -- --run
npx expo config --type public
npx expo export --platform web --output-dir dist-review
npm audit --omit=dev
```

```bash
deno check --import-map backend/supabase/functions/deno.json \
  backend/supabase/functions/ai-planner/index.ts \
  backend/supabase/functions/packing-checklist/index.ts \
  backend/supabase/functions/price-alerts/index.ts \
  backend/supabase/functions/admin-dashboard/index.ts \
  backend/supabase/functions/ticket-search/index.ts \
  backend/supabase/functions/delete-account/index.ts \
  backend/supabase/functions/safety-info/index.ts \
  backend/supabase/functions/smart-journey/index.ts \
  backend/supabase/functions/hidden-cost-calc/index.ts
```

Remove the generated `frontend/dist-review` folder after local verification unless it is intentionally being published.

## Go/No-Go Notes

- No critical or high-severity issue is open.
- Medium issues should be accepted explicitly before a beta release.
- Do not place service-role keys, AI provider keys, or payment credentials in frontend code.
- Do not enable real booking checkout until provider contracts, revalidation, and payment handling are reviewed separately.
