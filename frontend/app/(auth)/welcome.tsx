import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { Button } from '../../src/components/common/Button';

export default function WelcomeScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <ScreenContainer safeArea contentContainerStyle={styles.container}>
      <View>
        <Text style={[styles.brand, { color: theme.colors.primary }]}>TravelAI</Text>
        <Text style={[styles.title, { color: theme.colors.onBackground }]}>
          Plan trips that fit your people, budget, and pace.
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          Compare routes, build itineraries, split costs, and keep safety check-ins close without sharing more than you need to.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button onPress={() => router.push('/(auth)/register')}>Create account</Button>
        <Button mode="outlined" onPress={() => router.push('/(auth)/login')}>
          Log in
        </Button>
        <Text style={[styles.note, { color: theme.colors.onSurfaceVariant }]}>
          Phone, Google, and Apple sign-in are planned. They stay hidden until configured.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'space-between',
    padding: 24,
  },
  brand: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 48,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 40,
    marginTop: 18,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    marginTop: 16,
  },
  actions: {
    gap: 8,
    paddingBottom: 16,
  },
  note: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 8,
  },
});
