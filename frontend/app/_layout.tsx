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
  const { user, loading, initialized, initialize } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();
  
  const theme = colorScheme === 'dark' ? TravelAIDarkTheme : TravelAILightTheme;

  // Initialize Auth
  useEffect(() => {
    initialize();
  }, []);

  // Handle Redirects
  useEffect(() => {
    if (!initialized) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Redirect to login if not logged in
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Redirect to tabs if logged in
      router.replace('/(tabs)');
    }
  }, [user, initialized, segments]);

  if (loading || !initialized) {
    return <Loading fullScreen message="Loading TravelAI..." />;
  }

  return (
    <PaperProvider theme={theme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
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
