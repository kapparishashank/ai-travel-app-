import React, { useEffect } from 'react';
import { useSegments, useRouter, Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme, View, Text } from 'react-native';
import { queryClient } from '../src/lib/queryClient';
import { useAuthStore } from '../src/store/authStore';
import { TravelAILightTheme, TravelAIDarkTheme } from '../src/theme';
import { Loading } from '../src/components/common/Loading';
import { Button } from '../src/components/common/Button';
import { getAuthRedirectTarget, isProfileComplete } from '../src/features/auth/guards';
import { OfflineIndicator } from '../src/features/offline/OfflineIndicator';

// Global Error Boundary
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#F8FAFC' }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#EF4444', marginBottom: 8 }}>
        Application Error
      </Text>
      <Text style={{ textAlign: 'center', color: '#64748B', marginBottom: 24 }}>
        {error.message}
      </Text>
      <Button onPress={retry}>Reload Application</Button>
    </View>
  );
}

function RootLayoutNav() {
  const { authUser, user, loading, initialized, emailVerified, initialize } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();
  
  const theme = colorScheme === 'dark' ? TravelAIDarkTheme : TravelAILightTheme;

  // Initialize Auth
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Handle Redirects
  useEffect(() => {
    if (!initialized) return;

    const redirectTarget = getAuthRedirectTarget({
      initialized,
      sessionUserId: authUser?.id,
      emailVerified,
      profileComplete: isProfileComplete(user),
      inAuthGroup: segments[0] === '(auth)',
      inOnboardingGroup: segments[0] === '(onboarding)',
    });

    if (redirectTarget) {
      router.replace(redirectTarget);
    }
  }, [authUser?.id, emailVerified, initialized, router, segments, user]);

  if (loading || !initialized) {
    return <Loading fullScreen message="Loading TravelAI..." />;
  }

  return (
    <PaperProvider theme={theme}>
      <OfflineIndicator />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </PaperProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <RootLayoutNav />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
