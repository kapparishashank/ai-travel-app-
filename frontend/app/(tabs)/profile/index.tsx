import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Switch, useTheme } from 'react-native-paper';
import { Button } from '../../../src/components/common/Button';
import { ScreenContainer } from '../../../src/components/common/ScreenContainer';
import { getAnalyticsConsent, setAnalyticsConsent } from '../../../src/features/analytics/analytics';
import { useAuthStore } from '../../../src/store/authStore';

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user, authUser, signOut } = useAuthStore();
  const [analyticsEnabled, setAnalyticsEnabled] = React.useState(true);

  React.useEffect(() => {
    getAnalyticsConsent(authUser?.id).then(setAnalyticsEnabled);
  }, [authUser?.id]);

  const toggleAnalytics = async (enabled: boolean) => {
    setAnalyticsEnabled(enabled);
    await setAnalyticsConsent(authUser?.id, enabled);
  };

  return (
    <ScreenContainer safeArea={false} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.name, { color: theme.colors.onBackground }]}>
          {user?.full_name ?? 'Traveler'}
        </Text>
        <Text style={[styles.email, { color: theme.colors.onSurfaceVariant }]}>
          {authUser?.email}
        </Text>
      </View>

      <View style={styles.details}>
        <Text style={[styles.row, { color: theme.colors.onSurface }]}>Home city: {user?.home_city ?? 'Not set'}</Text>
        <Text style={[styles.row, { color: theme.colors.onSurface }]}>Currency: {user?.currency_code ?? 'INR'}</Text>
        <Text style={[styles.row, { color: theme.colors.onSurface }]}>Language: {user?.preferred_language ?? user?.preferred_lang ?? 'en'}</Text>
      </View>

      <View style={styles.preferenceRow}>
        <View style={styles.preferenceText}>
          <Text style={[styles.row, { color: theme.colors.onSurface }]}>Product analytics</Text>
          <Text style={[styles.helper, { color: theme.colors.onSurfaceVariant }]}>
            Privacy-conscious usage analytics. No precise location or personal contact details.
          </Text>
        </View>
        <Switch value={analyticsEnabled} onValueChange={toggleAnalytics} />
      </View>

      <Button onPress={() => router.push('/(tabs)/profile/settings')}>Account settings</Button>
      <Button mode="outlined" icon="bell-outline" onPress={() => router.push('/(tabs)/notifications')}>Notifications</Button>
      <Button mode="outlined" onPress={signOut}>Log out</Button>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  name: {
    fontSize: 28,
    fontWeight: '900',
  },
  email: {
    fontSize: 14,
    marginTop: 6,
  },
  details: {
    gap: 10,
    marginBottom: 24,
  },
  row: {
    fontSize: 15,
  },
  helper: {
    fontSize: 13,
    marginTop: 4,
  },
  preferenceRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  preferenceText: {
    flex: 1,
  },
});
