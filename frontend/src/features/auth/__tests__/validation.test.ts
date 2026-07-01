import { describe, expect, it } from 'vitest';
import {
  loginSchema,
  profileSetupSchema,
  signUpSchema,
  travelPreferencesSchema,
} from '../validation';

describe('auth validation', () => {
  it('rejects invalid login email', () => {
    const result = loginSchema.safeParse({ email: 'bad-email', password: 'secret' });
    expect(result.success).toBe(false);
  });

  it('requires strong signup passwords and matching confirmation', () => {
    const result = signUpSchema.safeParse({
      fullName: 'A',
      email: 'user@example.com',
      password: 'short',
      confirmPassword: 'different',
    });

    expect(result.success).toBe(false);
  });

  it('accepts valid profile setup with optional fields skipped', () => {
    const result = profileSetupSchema.safeParse({
      fullName: 'Ananya Rao',
      phone: '',
      dateOfBirth: '',
      homeCity: 'Hyderabad',
      avatarUrl: '',
      preferredCurrency: 'INR',
      preferredLanguage: 'en',
    });

    expect(result.success).toBe(true);
  });

  it('requires at least one preferred transport', () => {
    const result = travelPreferencesSchema.safeParse({
      budgetStyle: 'balanced',
      preferredTransport: [],
      comfortPreference: 'standard',
      travelPace: 'balanced',
      interests: [],
      foodPreferences: [],
      accessibilityRequirements: [],
      safetyPreference: 'standard',
    });

    expect(result.success).toBe(false);
  });
});
