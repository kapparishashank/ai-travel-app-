export type SafetyInfoLabel = '[MOCK DATA]' | '[VERIFIED]' | '[CACHED]' | '[ESTIMATED]';

export type EmergencyNumber = {
  label: string;
  number: string;
  source: string;
  lastUpdated: string;
  dataLabel: SafetyInfoLabel;
};

export type SafetyPlace = {
  name: string;
  phone: string;
  distanceKm?: number;
  note: string;
  source: string;
  lastUpdated: string;
  dataLabel: SafetyInfoLabel;
};

export type SafetyInfo = {
  destination: string;
  dataLabel: SafetyInfoLabel;
  disclaimer: string;
  sourceNote: string;
  lastUpdated: string;
  emergencyNumbers: EmergencyNumber[];
  nearbyHospitals: SafetyPlace[];
  nearbyPoliceStations: SafetyPlace[];
  safetyNotes: string[];
  weatherWarning: {
    title: string;
    detail: string;
    source: string;
    lastUpdated: string;
    dataLabel: SafetyInfoLabel;
  } | null;
};

export type TrustedContact = {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email?: string | null;
  relationship?: string | null;
  is_primary: boolean;
};

export type SafetySession = {
  id: string;
  user_id: string;
  trip_id?: string | null;
  status: 'active' | 'paused' | 'completed' | 'escalated' | 'cancelled';
  checkin_interval_minutes: number;
  started_at: string;
  ends_at?: string | null;
  last_checkin_at?: string | null;
  next_checkin_due_at?: string | null;
  escalation_message?: string | null;
};

export type LocationPermissionState = 'unknown' | 'granted' | 'denied' | 'unavailable';
