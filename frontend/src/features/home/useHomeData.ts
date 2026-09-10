import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { demoAlerts, demoDestinations, demoSearches, demoTrips } from './demoData';
import type { HomeAlert, HomeSearch, HomeTrip } from './types';

type LoadState = 'idle' | 'loading' | 'success' | 'error';

type HomeDataState = {
  trips: HomeTrip[];
  alerts: HomeAlert[];
  searches: HomeSearch[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  isDemo: boolean;
};

function mapTrip(row: { id: string; title?: string | null; destination_name?: string | null; destination?: string | null; start_date?: string | null; end_date?: string | null; status?: string | null; total_budget_minor?: number | null; budget_inr?: number | null }): HomeTrip {
  return {
    id: row.id,
    title: row.title ?? `${row.destination_name ?? row.destination ?? 'Trip'} plan`,
    destination: row.destination_name ?? row.destination ?? 'Unknown destination',
    startDate: row.start_date ?? '',
    endDate: row.end_date ?? '',
    status: row.status ?? 'planning',
    budgetMinor: row.total_budget_minor ?? row.budget_inr ?? 0,
  };
}

function mapAlert(row: { id: string; origin_name?: string | null; origin?: string | null; destination_name?: string | null; destination?: string | null; mode?: string | null; type?: string | null; target_price_minor?: number | null; target_price_inr?: number | null; last_seen_price_minor?: number | null; last_price_inr?: number | null; depart_on?: string | null; travel_date?: string | null }): HomeAlert {
  return {
    id: row.id,
    route: `${row.origin_name ?? row.origin ?? 'Unknown'} to ${row.destination_name ?? row.destination ?? 'Unknown'}`,
    mode: row.mode ?? row.type ?? 'flight',
    targetMinor: row.target_price_minor ?? row.target_price_inr ?? 0,
    currentMinor: row.last_seen_price_minor ?? row.last_price_inr ?? row.target_price_minor ?? 0,
    departOn: row.depart_on ?? row.travel_date ?? '',
  };
}

function mapSearch(row: { id: string; origin_name?: string | null; destination_name?: string | null; status?: string | null; created_at?: string | null }): HomeSearch {
  return {
    id: row.id,
    label: row.status === 'completed' ? 'Completed search' : 'Journey search',
    route: `${row.origin_name ?? 'Origin'} to ${row.destination_name ?? 'Destination'}`,
    searchedAt: row.created_at ? new Date(row.created_at).toLocaleDateString() : 'Recently',
  };
}

export function useHomeData() {
  const authUser = useAuthStore((state) => state.authUser);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);
  const [state, setState] = useState<HomeDataState>({
    trips: [],
    alerts: [],
    searches: [],
    loading: true,
    refreshing: false,
    error: null,
    isDemo: false,
  });
  const [currentTime] = useState(() => Date.now());

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!authUser) {
        setState((current) => ({
          ...current,
          loading: false,
          refreshing: false,
          error: 'Please sign in to view your trips.',
          isDemo: true,
          trips: demoTrips,
          alerts: demoAlerts,
          searches: demoSearches,
        }));
        return;
      }

      setState((current) => ({
        ...current,
        loading: mode === 'initial',
        refreshing: mode === 'refresh',
        error: null,
        isDemo: false,
      }));

      try {
        await refreshProfile();

        const [tripsResult, alertsResult, searchesResult] = await Promise.all([
          supabase
            .from('trips')
            .select('id,title,destination_name,start_date,end_date,status,total_budget_minor')
            .order('start_date', { ascending: true })
            .limit(3),
          supabase
            .from('price_alerts')
            .select('id,origin_name,destination_name,mode,target_price_minor,last_seen_price_minor,depart_on')
            .limit(4),
          supabase
            .from('journey_searches')
            .select('id,origin_name,destination_name,status,created_at')
            .order('created_at', { ascending: false })
            .limit(3),
        ]);

        if (tripsResult.error || alertsResult.error || searchesResult.error) {
          const msg = (tripsResult.error?.message ?? alertsResult.error?.message ?? searchesResult.error?.message ?? 'Failed to load data.');
          console.warn('Supabase home error:', msg);
          setState((current) => ({
            ...current,
            loading: false,
            refreshing: false,
            error: 'Could not load your trips. Please try again.',
            isDemo: current.trips.length > 0 ? true : false,
            trips: current.trips.length ? current.trips : demoTrips,
            alerts: current.alerts.length ? current.alerts : demoAlerts,
            searches: current.searches.length ? current.searches : demoSearches,
          }));
          return;
        }

        const trips = (tripsResult.data ?? []).map(mapTrip);
        const alerts = (alertsResult.data ?? []).map(mapAlert);
        const searches = (searchesResult.data ?? []).map(mapSearch);

        const hasRealData = trips.length > 0 || alerts.length > 0 || searches.length > 0;

        setState({
          trips: hasRealData ? trips : demoTrips,
          alerts: hasRealData ? alerts : demoAlerts,
          searches: hasRealData ? searches : demoSearches,
          loading: false,
          refreshing: false,
          error: null,
          isDemo: !hasRealData,
        });
      } catch (error) {
        console.warn('Home data load error:', error);
        setState((current) => ({
          ...current,
          loading: false,
          refreshing: false,
          error: 'Could not load your trips. Please try again.',
          isDemo: current.trips.length > 0,
          trips: current.trips.length ? current.trips : demoTrips,
          alerts: current.alerts.length ? current.alerts : demoAlerts,
          searches: current.searches.length ? current.searches : demoSearches,
        }));
      }
    },
    [authUser, refreshProfile]
  );

  const upcomingTrip = useMemo(
    () => state.trips.find((trip) => trip.status !== 'completed' && trip.status !== 'cancelled') ?? null,
    [state.trips]
  );

  const activeTrip = useMemo(
    () => state.trips.find((trip) => trip.status === 'active') ?? null,
    [state.trips]
  );

  const isTripNear = useMemo(() => {
    if (!upcomingTrip) return false;
    const start = new Date(`${upcomingTrip.startDate}T00:00:00`);
    const daysUntil = (start.getTime() - currentTime) / (1000 * 60 * 60 * 24);
    return daysUntil >= 0 && daysUntil <= 14;
  }, [currentTime, upcomingTrip]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      load();
    }, 0);
    return () => clearTimeout(timeout);
  }, [load]);

  return {
    ...state,
    destinations: demoDestinations,
    upcomingTrip,
    activeTrip,
    isTripNear,
    refresh: () => load('refresh'),
  };
}
