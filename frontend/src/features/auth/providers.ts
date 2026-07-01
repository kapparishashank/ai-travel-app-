export type AuthProviderId = 'email' | 'phone' | 'google' | 'apple';

export type AuthProviderConfig = {
  id: AuthProviderId;
  label: string;
  enabled: boolean;
};

export const authProviders: AuthProviderConfig[] = [
  { id: 'email', label: 'Email and password', enabled: true },
  { id: 'phone', label: 'Phone OTP', enabled: false },
  { id: 'google', label: 'Google', enabled: false },
  { id: 'apple', label: 'Apple', enabled: false },
];

export const visibleAuthProviders = authProviders.filter((provider) => provider.enabled);
