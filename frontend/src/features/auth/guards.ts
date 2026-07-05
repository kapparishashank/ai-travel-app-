export type AuthRouteState = {
  initialized: boolean;
  sessionUserId?: string | null;
  emailVerified?: boolean;
  profileComplete?: boolean;
  inAuthGroup?: boolean;
  inOnboardingGroup?: boolean;
};

export type AuthRedirectTarget =
  | '/(auth)/welcome'
  | '/(auth)/verify-email'
  | '/(onboarding)/profile-setup'
  | '/(tabs)'
  | null;

export function isProfileComplete(profile?: {
  full_name?: string | null;
  home_city?: string | null;
  preferred_language?: string | null;
  preferred_lang?: string | null;
  currency_code?: string | null;
} | null) {
  if (!profile) return false;

  return Boolean(
    profile.full_name?.trim() &&
      profile.home_city?.trim() &&
      (profile.preferred_language?.trim() || profile.preferred_lang?.trim()) &&
      profile.currency_code?.trim()
  );
}

export function getAuthRedirectTarget(state: AuthRouteState): AuthRedirectTarget {
  if (!state.initialized) return null;

  const isAuthenticated = Boolean(state.sessionUserId);

  if (!isAuthenticated) {
    return state.inAuthGroup ? null : '/(auth)/welcome';
  }

  if (!state.emailVerified) {
    return state.inAuthGroup ? null : '/(auth)/verify-email';
  }

  if (!state.profileComplete) {
    return state.inOnboardingGroup ? null : '/(onboarding)/profile-setup';
  }

  if (state.inAuthGroup) {
    return '/(tabs)';
  }

  return null;
}
