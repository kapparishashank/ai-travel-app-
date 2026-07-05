import { describe, expect, it } from 'vitest';
import { getAuthRedirectTarget, isProfileComplete } from '../guards';

describe('auth guards', () => {
  it('does not redirect before auth initialization', () => {
    expect(getAuthRedirectTarget({ initialized: false })).toBeNull();
  });

  it('sends unauthenticated users to auth', () => {
    expect(getAuthRedirectTarget({ initialized: true })).toBe('/(auth)/welcome');
  });

  it('keeps unauthenticated users inside auth routes', () => {
    expect(getAuthRedirectTarget({ initialized: true, inAuthGroup: true })).toBeNull();
  });

  it('sends unverified users to verification', () => {
    expect(
      getAuthRedirectTarget({
        initialized: true,
        sessionUserId: 'user-1',
        emailVerified: false,
      })
    ).toBe('/(auth)/verify-email');
  });

  it('sends incomplete profiles to onboarding', () => {
    expect(
      getAuthRedirectTarget({
        initialized: true,
        sessionUserId: 'user-1',
        emailVerified: true,
        profileComplete: false,
      })
    ).toBe('/(onboarding)/profile-setup');
  });

  it('sends authenticated users away from auth routes', () => {
    expect(
      getAuthRedirectTarget({
        initialized: true,
        sessionUserId: 'user-1',
        emailVerified: true,
        profileComplete: true,
        inAuthGroup: true,
      })
    ).toBe('/(tabs)');
  });

  it('keeps verified users inside onboarding until onboarding is finished', () => {
    expect(
      getAuthRedirectTarget({
        initialized: true,
        sessionUserId: 'user-1',
        emailVerified: true,
        profileComplete: true,
        inOnboardingGroup: true,
      })
    ).toBeNull();
  });

  it('checks required profile fields', () => {
    expect(isProfileComplete(null)).toBe(false);
    expect(
      isProfileComplete({
        full_name: 'Ananya Rao',
        home_city: 'Hyderabad',
        preferred_language: 'en',
        currency_code: 'INR',
      })
    ).toBe(true);
  });
});
