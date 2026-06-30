import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

// TravelAI Custom Theme
// Primary: Deep Indigo/Blue — professional travel feel
// Secondary: Amber — warm accent for CTAs
// Surface: Elevated dark card look

export const TravelAIColors = {
  // Brand palette
  primary: '#3B5BDB',         // Indigo-600
  primaryContainer: '#DBE4FF', // Indigo-100
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#1E3A8A',

  secondary: '#F59E0B',       // Amber-500
  secondaryContainer: '#FEF3C7',
  onSecondary: '#1C1917',
  onSecondaryContainer: '#92400E',

  tertiary: '#10B981',        // Emerald-500 (success, live data)
  tertiaryContainer: '#D1FAE5',
  onTertiary: '#FFFFFF',
  onTertiaryContainer: '#065F46',

  // Semantic
  error: '#EF4444',
  errorContainer: '#FEE2E2',
  onError: '#FFFFFF',
  onErrorContainer: '#7F1D1D',

  warning: '#F59E0B',
  warningContainer: '#FEF3C7',

  // Mock / AI data label colors
  mockLabel: '#6B7280',       // Gray — mock data is secondary info
  aiLabel: '#8B5CF6',         // Purple — AI generated
  liveLabel: '#10B981',       // Green — live confirmed data

  // Surfaces
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceVariant: '#F1F5F9',
  outline: '#CBD5E1',
  outlineVariant: '#E2E8F0',

  // Dark mode surfaces
  darkBackground: '#0F172A',
  darkSurface: '#1E293B',
  darkSurfaceVariant: '#334155',
};

export const TravelAILightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: TravelAIColors.primary,
    primaryContainer: TravelAIColors.primaryContainer,
    onPrimary: TravelAIColors.onPrimary,
    onPrimaryContainer: TravelAIColors.onPrimaryContainer,
    secondary: TravelAIColors.secondary,
    secondaryContainer: TravelAIColors.secondaryContainer,
    onSecondary: TravelAIColors.onSecondary,
    onSecondaryContainer: TravelAIColors.onSecondaryContainer,
    tertiary: TravelAIColors.tertiary,
    tertiaryContainer: TravelAIColors.tertiaryContainer,
    onTertiary: TravelAIColors.onTertiary,
    onTertiaryContainer: TravelAIColors.onTertiaryContainer,
    error: TravelAIColors.error,
    errorContainer: TravelAIColors.errorContainer,
    onError: TravelAIColors.onError,
    background: TravelAIColors.background,
    surface: TravelAIColors.surface,
    surfaceVariant: TravelAIColors.surfaceVariant,
    outline: TravelAIColors.outline,
    outlineVariant: TravelAIColors.outlineVariant,
  },
};

export const TravelAIDarkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#818CF8',               // Indigo-400 (lighter for dark)
    primaryContainer: '#1E3A8A',
    onPrimary: '#0F172A',
    onPrimaryContainer: '#C7D2FE',
    secondary: '#FCD34D',             // Amber-300
    secondaryContainer: '#78350F',
    onSecondary: '#1C1917',
    onSecondaryContainer: '#FEF3C7',
    tertiary: '#34D399',
    tertiaryContainer: '#065F46',
    onTertiary: '#022C22',
    onTertiaryContainer: '#D1FAE5',
    error: '#FC8181',
    errorContainer: '#7F1D1D',
    onError: '#1C0000',
    background: TravelAIColors.darkBackground,
    surface: TravelAIColors.darkSurface,
    surfaceVariant: TravelAIColors.darkSurfaceVariant,
    outline: '#475569',
    outlineVariant: '#334155',
  },
};

// Typography scale
export const TravelAITypography = {
  headingLarge: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  headingMedium: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  headingSmall: { fontSize: 18, fontWeight: '600' as const },
  bodyLarge: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodyMedium: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  bodySmall: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  labelLarge: { fontSize: 14, fontWeight: '600' as const, letterSpacing: 0.1 },
  labelMedium: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.5 },
  labelSmall: { fontSize: 10, fontWeight: '600' as const, letterSpacing: 0.5, textTransform: 'uppercase' as const },
};

// Spacing scale
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border radii
export const radii = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

// Shadows (Android elevation / iOS shadow)
export const shadows = {
  sm: { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  md: { elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4 },
  lg: { elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
};
