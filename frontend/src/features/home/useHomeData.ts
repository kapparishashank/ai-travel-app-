import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { demoAlerts, demoDestinations, demoSearches, demoTrips } from './demoData';
import type { HomeAlert, HomeSearch, HomeTrip } from './types';

type HomeDataState = {
  trips: HomeTrip[];
  alerts: HomeAlert[];
  searches: HomeSearch[];
  loading: boolean;
  refreshing: boolean;
};

function mapTrip(row: any): HomeTrip {
  return {
    id: row.id,
    title: row.title ?? `${row.destination_name ?? row.destination ?? 'Trip'} plan`,
    destination: row.destination_name ?? row.destination ?? 'Unknown destination',
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status ?? 'planning',
    budgetMinor: row.total_budget_minor ?? row.budget_inr ?? 0,
  };
}

function mapAlert(row: any): HomeAlert {
  return {
    id: row.id,
    route: `${row.origin_name ?? row.origin} to ${row.destination_name ?? row.destination}`,
    mode: row.mode ?? row.type ?? 'flight',
    targetMinor: row.target_price_minor ?? row.target_price_inr ?? 0,
    currentMinor: row.last_seen_price_minor ?? row.last_price_inr ?? row.target_price_minor ?? 0,
    departOn: row.depart_on ?? row.travel_date,
  };
}

function mapSearch(row: any): HomeSearch {
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
  });

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!authUser) return;

      setState((current) => ({
        ...current,
        loading: mode === 'initial',
        refreshing: mode === 'refresh',
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

        const trips = tripsResult.data?.map(mapTrip) ?? [];
        const alerts = alertsResult.data?.map(mapAlert) ?? [];
        const searches = searchesResult.data?.map(mapSearch) ?? [];

        setState({
          trips: trips.length ? trips : demoTrips,
          alerts: alerts.length ? alerts : demoAlerts,
          searches: searches.length ? searches : demoSearches,
          loading: false,
          refreshing: false,
        });
      } catch (error) {
        console.warn('Falling back to demo home data:', error);
        setState({
          trips: demoTrips,
          alerts: demoAlerts,
          searches: demoSearches,
          loading: false,
          refreshing: false,
        });
      }
    },
    [authUser, refreshProfile]
  );

  useEffect(() => {
    load();
  }, [load]);

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
    const daysUntil = (start.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysUntil >= 0 && daysUntil <= 14;
  }, [upcomingTrip]);

  return {
    ...state,
    destinations: demoDestinations,
    upcomingTrip,
    activeTrip,
    isTripNear,
    refresh: () => load('refresh'),
  };
}
