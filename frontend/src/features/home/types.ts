export type HomeTrip = {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: 'planning' | 'active' | 'completed' | 'cancelled' | 'draft';
  budgetMinor: number;
  isDemo?: boolean;
};

export type HomeAlert = {
  id: string;
  route: string;
  mode: string;
  targetMinor: number;
  currentMinor: number;
  departOn: string;
  isDemo?: boolean;
};

export type HomeDestination = {
  id: string;
  name: string;
  region: string;
  reason: string;
  estimateMinor: number;
  icon: string;
  isDemo?: boolean;
};

export type HomeSearch = {
  id: string;
  label: string;
  route: string;
  searchedAt: string;
  isDemo?: boolean;
};
