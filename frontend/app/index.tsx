import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { ScreenContainer } from '../src/components/common/ScreenContainer';
import { useAuthStore } from '../src/store/authStore';
import { getAuthRedirectTarget, isProfileComplete } from '../src/features/auth/guards';

export default function SplashScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { initialized, authUser, emailVerified, user } = useAuthStore();

  useEffect(() => {
    if (!initialized) return;

    const target =
      getAuthRedirectTarget({
        initialized,
        sessionUserId: authUser?.id,
        emailVerified,
        profileComplete: isProfileComplete(user),
      }) ?? '/(tabs)';

    const timeout = setTimeout(() => router.replace(target), 700);
    return () => clearTimeout(timeout);
  }, [authUser?.id, emailVerified, initialized, router, user]);

  return (
    <ScreenContainer safeArea contentContainerStyle={styles.container}>
      <View style={[styles.mark, { backgroundColor: theme.colors.primary }]}>
        <Text style={styles.markText}>TA</Text>
      </View>
      <Text style={[styles.title, { color: theme.colors.onBackground }]}>TravelAI</Text>
      <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
        Planning smarter journeys
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  mark: {
    width: 72,
    height: 72,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  markText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 15,
    marginTop: 6,
  },
});
