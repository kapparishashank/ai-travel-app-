import type { HomeAlert, HomeDestination, HomeSearch, HomeTrip } from './types';

export const demoTrips: HomeTrip[] = [
  {
    id: 'demo-goa',
    title: 'Hyderabad to Goa friends trip',
    destination: 'Goa',
    startDate: '2026-08-14',
    endDate: '2026-08-17',
    status: 'planning',
    budgetMinor: 4000000,
    isDemo: true,
  },
];

export const demoAlerts: HomeAlert[] = [
  {
    id: 'demo-alert-goa',
    route: 'Hyderabad to Goa',
    mode: 'flight',
    targetMinor: 1600000,
    currentMinor: 1800000,
    departOn: '2026-08-14',
    isDemo: true,
  },
  {
    id: 'demo-alert-jaipur',
    route: 'Hyderabad to Jaipur',
    mode: 'train',
    targetMinor: 420000,
    currentMinor: 510000,
    departOn: '2026-09-05',
    isDemo: true,
  },
];

export const demoDestinations: HomeDestination[] = [
  {
    id: 'coorg',
    name: 'Coorg',
    region: 'Karnataka',
    reason: 'Easy long weekend with coffee estates and cool weather.',
    estimateMinor: 1800000,
    icon: 'terrain',
    isDemo: true,
  },
  {
    id: 'pondicherry',
    name: 'Pondicherry',
    region: 'Tamil Nadu',
    reason: 'Good for slow travel, cafes, beaches, and walkable stays.',
    estimateMinor: 2200000,
    icon: 'beach',
    isDemo: true,
  },
  {
    id: 'udaipur',
    name: 'Udaipur',
    region: 'Rajasthan',
    reason: 'Romantic lakes, forts, and reliable flight connections.',
    estimateMinor: 2600000,
    icon: 'castle',
    isDemo: true,
  },
];

export const demoSearches: HomeSearch[] = [
  {
    id: 'demo-search-goa',
    label: 'Weekend beach trip',
    route: 'Hyderabad to Goa',
    searchedAt: 'Today',
    isDemo: true,
  },
  {
    id: 'demo-search-kerala',
    label: 'Monsoon getaway',
    route: 'Hyderabad to Kochi',
    searchedAt: 'Yesterday',
    isDemo: true,
  },
];
