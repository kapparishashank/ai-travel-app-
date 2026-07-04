import { supabase } from '../../lib/supabase';
import type { AdminDashboardData } from './types';

export async function fetchAdminDashboard(): Promise<AdminDashboardData> {
  const { data, error } = await supabase.functions.invoke('admin-dashboard', {
    method: 'GET',
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).message ?? 'Admin dashboard failed.');
  return data as AdminDashboardData;
}
