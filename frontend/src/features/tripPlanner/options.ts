import { addDays, todayISO } from '../../utils/date';
import type { PlanTripFormData } from './validation';

export const interestOptions = ['beach', 'food', 'nightlife', 'nature', 'history', 'shopping', 'adventure', 'wellness'];
export const transportOptions = ['flight', 'train', 'bus', 'cab', 'self_drive'];
export const foodOptions = ['vegetarian', 'vegan', 'halal', 'jain', 'seafood', 'street food', 'local cuisine'];
export const accessibilityOptions = ['low walking', 'wheelchair access', 'step-free routes', 'quiet stays', 'senior friendly'];

export const emptyPlanTripDraft: PlanTripFormData = {
  startingCity: '',
  destination: '',
  startDate: '',
  endDate: '',
  flexibleDates: false,
  adults: 1,
  children: 0,
  tripType: 'solo',
  totalBudget: 40000,
  currency: 'INR',
  interests: [],
  preferredTransport: ['flight'],
  travelPace: 'moderate',
  comfortPreference: 'standard',
  accommodationPreference: 'hotel',
  foodPreferences: [],
  accessibilityNeeds: [],
};

/** Returns a fresh Hyderabad-to-Goa demo payload with dates always in the future. */
export function createHyderabadToGoaDemoInput(): PlanTripFormData {
  const today = todayISO();
  return {
    startingCity: 'Hyderabad',
    destination: 'Goa',
    startDate: addDays(today, 7),
    endDate: addDays(today, 10),
    flexibleDates: false,
    adults: 4,
    children: 0,
    tripType: 'friends',
    totalBudget: 40000,
    currency: 'INR',
    interests: ['beach', 'food', 'nightlife'],
    preferredTransport: ['flight', 'cab'],
    travelPace: 'moderate',
    comfortPreference: 'standard',
    accommodationPreference: 'apartment',
    foodPreferences: ['local cuisine', 'seafood'],
    accessibilityNeeds: [],
  };
}

/**
 * @deprecated Use createHyderabadToGoaDemoInput() — dates are now computed at call time.
 * Kept as a getter-style alias so existing import sites don't break immediately.
 */
export const hyderabadToGoaDemoInput: PlanTripFormData = createHyderabadToGoaDemoInput();

export const planTripSteps = [
  'Source and destination',
  'Travel dates',
  'Travelers',
  'Budget',
  'Interests',
  'Travel preferences',
  'Review',
  'Generation progress',
] as const;
