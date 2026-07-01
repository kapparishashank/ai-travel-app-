import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { Button } from '../../src/components/common/Button';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { AuthScreenHeader } from '../../src/features/auth/AuthScreenHeader';

export default function PermissionExplanationScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <ScreenContainer safeArea contentContainerStyle={styles.container}>
      <AuthScreenHeader
        title="Permissions, explained"
        subtitle="TravelAI will ask only when a feature needs access. We do not request precise location during onboarding."
      />

      <View style={styles.list}>
        <Text style={[styles.item, { color: theme.colors.onSurface }]}>
          Notifications: for price drops, safety check-ins, and trip reminders.
        </Text>
        <Text style={[styles.item, { color: theme.colors.onSurface }]}>
          Location: only when you use maps, nearby safety help, or an active check-in.
        </Text>
        <Text style={[styles.item, { color: theme.colors.onSurface }]}>
          Photos: only if you choose to upload a profile image or receipt.
        </Text>
      </View>

      <Button onPress={() => router.replace('/(tabs)')}>Continue to TravelAI</Button>
      <Button mode="text" onPress={() => router.replace('/(tabs)')}>Decide later</Button>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    padding: 24,
  },
  list: {
    gap: 14,
    marginBottom: 28,
  },
  item: {
    fontSize: 15,
    lineHeight: 22,
  },
});
