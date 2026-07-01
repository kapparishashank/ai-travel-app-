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

export const hyderabadToGoaDemoInput: PlanTripFormData = {
  startingCity: 'Hyderabad',
  destination: 'Goa',
  startDate: '2026-08-14',
  endDate: '2026-08-17',
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
