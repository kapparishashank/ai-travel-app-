import { createClient } from '@supabase/supabase-js';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  const corsResult = handleCors(req);
  if (corsResult) return corsResult;

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return errorResponse('unauthorized', 'Missing authorization header.', 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return errorResponse('misconfigured', 'Admin dashboard is not configured.', 500);

  const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) return errorResponse('unauthorized', 'Invalid token.', 401);

  const { data: role, error: roleError } = await adminClient
    .from('admin_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();
  if (roleError) return errorResponse('db_error', roleError.message, 500);
  if (!role || !['admin', 'support', 'viewer'].includes(role.role)) {
    return errorResponse('forbidden', 'Admin access required.', 403);
  }

  const action = req.method === 'GET' ? 'admin_dashboard_viewed' : 'admin_dashboard_action';
  await adminClient.from('admin_audit_logs').insert({
    admin_user_id: user.id,
    action,
    target_type: 'admin_dashboard',
    metadata: { role: role.role },
  });

  const [
    users,
    trips,
    aiErrors,
    reportedRecommendations,
    notificationFailures,
    activePriceAlerts,
    safetyReports,
    providerHealth,
  ] = await Promise.all([
    count(adminClient.from('profiles').select('id', { count: 'exact', head: true })),
    count(adminClient.from('trips').select('id', { count: 'exact', head: true })),
    adminClient.from('ai_generations').select('id,feature,status,error_message,created_at').eq('status', 'failed').order('created_at', { ascending: false }).limit(10),
    adminClient.from('user_feedback').select('id,feedback_type,message,created_at,metadata').in('feedback_type', ['content_quality', 'safety']).order('created_at', { ascending: false }).limit(10),
    count(adminClient.from('notifications').select('id', { count: 'exact', head: true }).eq('status', 'unread').eq('category', 'system_message')),
    count(adminClient.from('price_alerts').select('id', { count: 'exact', head: true }).eq('status', 'active')),
    adminClient.from('user_feedback').select('id,message,created_at,metadata').eq('feedback_type', 'safety').order('created_at', { ascending: false }).limit(10),
    adminClient.from('provider_health').select('provider,feature,status,last_checked_at,message').order('last_checked_at', { ascending: false }).limit(20),
  ]);

  return jsonResponse({
    role: role.role,
    metrics: {
      userCount: users,
      tripCount: trips,
      notificationFailures,
      activePriceAlerts,
      systemHealth: buildSystemHealth({ aiErrors: aiErrors.data ?? [], providerHealth: providerHealth.data ?? [] }),
    },
    aiGenerationErrors: sanitizeRows(aiErrors.data ?? [], ['error_message']),
    reportedRecommendations: sanitizeRows(reportedRecommendations.data ?? [], ['message']),
    safetyDataReports: sanitizeRows(safetyReports.data ?? [], ['message']),
    providerHealth: providerHealth.data ?? mockProviderHealth(),
  });
});

async function count(query: PromiseLike<{ count: number | null; error: Error | null }>) {
  const result = await query;
  if (result.error) throw result.error;
  return result.count ?? 0;
}

function sanitizeRows(rows: any[], textFields: string[]) {
  return rows.map((row) => {
    const next = { ...row };
    for (const field of textFields) {
      if (typeof next[field] === 'string') next[field] = stripLocationLikeText(next[field]);
    }
    if (next.metadata) next.metadata = sanitizeMetadata(next.metadata);
    return next;
  });
}

function sanitizeMetadata(metadata: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(metadata).filter(([key]) => !/latitude|longitude|precise|location|phone|email|token|secret|card/i.test(key)),
  );
}

function stripLocationLikeText(value: string) {
  return value.replace(/-?\d{1,2}\.\d{3,},\s*-?\d{1,3}\.\d{3,}/g, '[location redacted]');
}

function buildSystemHealth({ aiErrors, providerHealth }: { aiErrors: any[]; providerHealth: any[] }) {
  if (providerHealth.some((provider) => provider.status === 'down') || aiErrors.length >= 5) return 'degraded';
  if (providerHealth.length === 0) return 'mock';
  return 'healthy';
}

function mockProviderHealth() {
  const now = new Date().toISOString();
  return [
    { provider: 'mock-ticket-provider', feature: 'ticket', status: 'mock', last_checked_at: now, message: 'Mock provider configured.' },
    { provider: 'mock-price-provider', feature: 'price_alert', status: 'mock', last_checked_at: now, message: 'Mock provider configured.' },
    { provider: 'safety-info', feature: 'safety', status: 'mock', last_checked_at: now, message: 'Mock safety data configured.' },
  ];
}
