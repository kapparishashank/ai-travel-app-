import { z } from 'zod';

export const tripTypes = ['solo', 'couple', 'family', 'friends', 'work'] as const;
export const travelPaces = ['slow', 'moderate', 'packed'] as const;
export const comfortPreferences = ['budget', 'standard', 'premium'] as const;
export const accommodationPreferences = ['hostel', 'budget_hotel', 'hotel', 'apartment', 'resort'] as const;

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format.');

const planTripBaseSchema = z.object({
    startingCity: z.string().trim().min(2, 'Enter your starting city.'),
    destination: z.string().trim().min(2, 'Enter your destination.'),
    startDate: dateString,
    endDate: dateString,
    flexibleDates: z.boolean(),
    adults: z.number().int('Adults must be a whole number.').min(0, 'Adults cannot be negative.'),
    children: z.number().int('Children must be a whole number.').min(0, 'Children cannot be negative.'),
    tripType: z.enum(tripTypes),
    totalBudget: z
      .number()
      .finite('Enter a valid budget.')
      .min(1000, 'Budget should be at least 1,000.')
      .max(10_000_000, 'Budget is too high for this planner.'),
    currency: z.string().trim().length(3, 'Use a 3-letter currency code.'),
    interests: z.array(z.string()).min(1, 'Choose at least one interest.'),
    preferredTransport: z.array(z.string()).min(1, 'Choose at least one transport option.'),
    travelPace: z.enum(travelPaces),
    comfortPreference: z.enum(comfortPreferences),
    accommodationPreference: z.enum(accommodationPreferences),
    foodPreferences: z.array(z.string()),
    accessibilityNeeds: z.array(z.string()),
});

export const planTripSchema = planTripBaseSchema.superRefine((value, ctx) => {
    const start = new Date(`${value.startDate}T00:00:00`);
    const end = new Date(`${value.endDate}T00:00:00`);

    if (Number.isNaN(start.getTime())) {
      ctx.addIssue({ code: 'custom', path: ['startDate'], message: 'Enter a valid start date.' });
    }

    if (Number.isNaN(end.getTime())) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'Enter a valid end date.' });
    }

    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end <= start) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'End date must be after the start date.' });
    }

    if (value.adults + value.children < 1) {
      ctx.addIssue({ code: 'custom', path: ['adults'], message: 'Add at least one traveler.' });
    }

    if (value.tripType === 'solo' && value.adults + value.children > 1) {
      ctx.addIssue({ code: 'custom', path: ['tripType'], message: 'Solo trips can only have one traveler.' });
    }
});

export const sourceDestinationSchema = planTripBaseSchema.pick({
  startingCity: true,
  destination: true,
});

export const travelDatesSchema = planTripBaseSchema
  .pick({
    startDate: true,
    endDate: true,
    flexibleDates: true,
  })
  .superRefine((value, ctx) => {
    const start = new Date(`${value.startDate}T00:00:00`);
    const end = new Date(`${value.endDate}T00:00:00`);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end <= start) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'End date must be after the start date.' });
    }
  });

export const travelersSchema = planTripBaseSchema
  .pick({
    adults: true,
    children: true,
    tripType: true,
  })
  .superRefine((value, ctx) => {
    if (value.adults + value.children < 1) {
      ctx.addIssue({ code: 'custom', path: ['adults'], message: 'Add at least one traveler.' });
    }
    if (value.tripType === 'solo' && value.adults + value.children > 1) {
      ctx.addIssue({ code: 'custom', path: ['tripType'], message: 'Solo trips can only have one traveler.' });
    }
  });

export const budgetSchema = planTripBaseSchema.pick({
  totalBudget: true,
  currency: true,
});

export const interestsSchema = planTripBaseSchema.pick({
  interests: true,
});

export const preferencesSchema = planTripBaseSchema.pick({
  preferredTransport: true,
  travelPace: true,
  comfortPreference: true,
  accommodationPreference: true,
  foodPreferences: true,
  accessibilityNeeds: true,
});

export type PlanTripFormData = z.infer<typeof planTripSchema>;
