# TravelAI Security Review

Date: 2026-07-05

## Summary

No critical or high-severity issues remain from this review. The main high-risk finding was unsafe external URL handling before opening partner or latest-result links. That was fixed by validating allowed URL schemes and confirming before navigation.

## Checks Performed

| Area | Status | Notes |
| --- | --- | --- |
| Secret keys in frontend | Passed | Static scan found no service-role key usage in frontend source. |
| Service-role exposure | Passed | Service-role references are limited to Supabase Edge Functions. |
| Input validation | Passed | Forms use Zod/React Hook Form and backend contracts validate request schemas. |
| Output validation | Passed | AI itinerary output is validated before persistence. |
| Authentication enforcement | Passed | Protected routes and server-side admin checks are present. |
| Row Level Security | Passed with limitation | Migrations enable RLS and include ownership policies; live RLS tests are still needed. |
| Rate limiting | Passed by contract | AI generation and alert workers include server-side controls. |
| Safe external URL handling | Fixed | Partner and price-alert links are validated before `Linking.openURL`. |
| Account deletion | Passed by contract | Account deletion is handled through a secure server-side function. |
| Location consent | Passed | Safety mode asks consent and supports denied permission paths. |
| Secure token handling | Passed | Supabase Auth manages session/password tokens; passwords are not stored manually. |
| Error messages | Passed | No secret-bearing error paths were found in frontend scans. |
| Dependency vulnerabilities | Medium issue | Moderate Expo transitive `uuid` advisory remains. |
| Audit logging | Passed | Admin actions are logged through `admin_audit_logs`. |

## Fixes Made

- Added safe external URL validation for partner booking and price-alert latest-result flows.
- Confirmed external navigation before opening links.
- Blocked insecure external `http:` links while still allowing local development HTTP URLs.
- Added static backend security contract tests for RLS, trip membership helpers, AI validation, admin authorization, and frontend secret exposure.
- Added Expo ESLint configuration and Node typings for test files.
- Excluded generated build folders from TypeScript checking.

## Severity Review

### Critical

None.

### High

None remaining.

Fixed during review:

- Unsafe external URL opening for partner/latest-result links.

### Medium

- Live Supabase RLS policy tests are not configured; current coverage is static migration contract testing.
- `npm audit --omit=dev` reports 10 moderate advisories through Expo's transitive `uuid <11.1.1` dependency via `xcode`. The automatic fix is breaking and would downgrade/change Expo dependencies, so it was not applied in this pass.
- Dedicated component test tooling is not configured; current UI assurance is mostly feature-level unit testing and build verification.
- Lint still reports warnings for existing effect-based form hydration and cleanup style issues.

### Low

- Several lint warnings remain for unused imports and style preferences.
- Provider integrations are still mock-labelled, so live availability, booking, and price accuracy depend on future authorized providers.
- Live database migration execution was not run from this workstation during the review.
