import { z } from 'zod';

const optionalText = z.string().trim().optional().or(z.literal(''));

export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address.');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .regex(/[A-Za-z]/, 'Password must include at least one letter.')
  .regex(/[0-9]/, 'Password must include at least one number.');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.'),
});

export const signUpSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Enter your full name.'),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your password.'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const profileSetupSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name.'),
  phone: optionalText.refine(
    (value) => !value || /^[+0-9 ()-]{7,20}$/.test(value),
    'Enter a valid phone number.'
  ),
  dateOfBirth: optionalText.refine(
    (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value),
    'Use YYYY-MM-DD format.'
  ),
  homeCity: z.string().trim().min(2, 'Enter your home city.'),
  avatarUrl: optionalText.refine(
    (value) => !value || /^https?:\/\/.+/.test(value),
    'Enter a valid image URL.'
  ),
  preferredCurrency: z.string().trim().length(3, 'Use a 3-letter currency code.'),
  preferredLanguage: z.string().trim().min(2, 'Choose a preferred language.'),
});

export const travelPreferencesSchema = z.object({
  budgetStyle: z.enum(['shoestring', 'budget', 'balanced', 'premium']),
  preferredTransport: z.array(z.string()).min(1, 'Choose at least one transport option.'),
  comfortPreference: z.enum(['budget', 'standard', 'premium']),
  travelPace: z.enum(['slow', 'balanced', 'packed']),
  interests: z.array(z.string()),
  foodPreferences: z.array(z.string()),
  accessibilityRequirements: z.array(z.string()),
  safetyPreference: z.enum(['standard', 'extra_checkins', 'share_with_contacts']),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ProfileSetupFormData = z.infer<typeof profileSetupSchema>;
export type TravelPreferencesFormData = z.infer<typeof travelPreferencesSchema>;
