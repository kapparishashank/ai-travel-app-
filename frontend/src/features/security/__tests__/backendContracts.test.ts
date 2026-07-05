import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../../../../..');

function file(path: string) {
  return readFileSync(resolve(root, path), 'utf8');
}

describe('backend security contracts', () => {
  it('enables RLS and creates ownership policies for sensitive user tables', () => {
    const initial = file('backend/supabase/migrations/001_initial_schema.sql');
    const later = [
      file('backend/supabase/migrations/003_budget_discovery_destinations.sql'),
      file('backend/supabase/migrations/005_notifications_offline_support.sql'),
      file('backend/supabase/migrations/006_analytics_admin.sql'),
    ].join('\n');
    const sql = `${initial}\n${later}`;

    [
      'profiles',
      'trips',
      'expenses',
      'packing_lists',
      'safety_sessions',
      'price_alerts',
      'notifications',
      'analytics_events',
      'admin_roles',
    ].forEach((table) => {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    });

    expect(sql).toContain('create policy "trips_select_member"');
    expect(sql).toContain('create policy "expenses_trip_member_all"');
    expect(sql).toContain('create policy "notifications_own_all"');
    expect(sql).toContain('create policy "analytics_events_own_insert"');
    expect(sql).toContain('create policy "admin_roles_self_read"');
  });

  it('uses helper functions for trip membership checks', () => {
    const sql = file('backend/supabase/migrations/001_initial_schema.sql');
    expect(sql).toContain('create or replace function public.is_trip_member');
    expect(sql).toContain('create or replace function public.is_trip_organizer');
    expect(sql).toContain('public.is_trip_member(trip_id)');
  });

  it('validates AI planner input/output and persists only validated itinerary data', () => {
    const planner = file('backend/supabase/functions/ai-planner/index.ts');
    expect(planner).toContain('const requestSchema = z.object');
    expect(planner).toContain('const itineraryResponseSchema = z.object');
    expect(planner).toContain('requestSchema.safeParse');
    expect(planner).toContain('itineraryResponseSchema.safeParse');
    expect(planner).toContain('repairStructuredResponse');
    expect(planner).toContain('await saveItinerary');
    expect(planner).toContain('function sanitizeInputForLog');
    expect(planner).toContain('function sanitizeOutputForLog');
  });

  it('requires server-side admin role verification and audit logging', () => {
    const admin = file('backend/supabase/functions/admin-dashboard/index.ts');
    expect(admin).toContain("Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')");
    expect(admin).toContain(".from('admin_roles')");
    expect(admin).toContain("return errorResponse('forbidden'");
    expect(admin).toContain(".from('admin_audit_logs').insert");
    expect(admin).toContain('sanitizeMetadata');
  });

  it('does not reference service-role secrets in frontend source', () => {
    const frontendFiles = [
      'frontend/src/lib/env.ts',
      'frontend/src/lib/supabase.ts',
      'frontend/app/admin.tsx',
      'frontend/src/features/admin/api.ts',
    ];
    frontendFiles.forEach((path) => {
      expect(file(path)).not.toMatch(/SERVICE_ROLE|service_role|SUPABASE_SERVICE_ROLE_KEY/);
    });
  });
});
