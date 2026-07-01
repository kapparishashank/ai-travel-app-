import { createClient } from '@supabase/supabase-js';
import { errorResponse, handleCors, jsonResponse } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  const corsResult = handleCors(req);
  if (corsResult) return corsResult;

  if (req.method !== 'POST') {
    return errorResponse('method_not_allowed', 'Use POST to delete an account.', 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return errorResponse('unauthorized', 'Missing authorization header.', 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return errorResponse('misconfigured', 'Account deletion is not configured.', 500);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return errorResponse('unauthorized', 'Invalid or expired session.', 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { error } = await adminClient.auth.admin.deleteUser(user.id);

  if (error) {
    console.error('delete-account error:', error);
    return errorResponse('delete_failed', 'Could not delete account.', 500);
  }

  return jsonResponse({ status: 'ok' });
});
