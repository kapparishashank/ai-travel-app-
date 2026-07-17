import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { Button } from '../../../src/components/common/Button';
import { ScreenContainer } from '../../../src/components/common/ScreenContainer';
import { demoDestinations } from '../../../src/features/home/demoData';

export default function DestinationDetailsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const destination = demoDestinations.find((item) => item.id === id);
  const displayName = destination?.name ?? name ?? titleFromId(id);
  const description =
    destination?.reason ??
    `Start a new plan for ${displayName}. TravelAI can help compare journeys, budget, packing, safety, and expenses for this destination.`;

  return (
    <ScreenContainer safeArea={false} contentContainerStyle={styles.container}>
      <Text style={[styles.title, { color: theme.colors.onBackground }]}>
        {displayName}
      </Text>
      <Text style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>
        {description}
      </Text>
      {destination?.isDemo && (
        <Text style={[styles.demo, { color: theme.colors.primary }]}>Demo data</Text>
      )}
      <View style={styles.actions}>
        <Button icon="map-plus" onPress={() => router.push('/(tabs)/plan-trip')}>
          Plan a Trip
        </Button>
        <Button mode="outlined" icon="wallet-outline" onPress={() => router.push('/(tabs)/budget-discovery')}>
          Budget Discovery
        </Button>
      </View>
    </ScreenContainer>
  );
}

function titleFromId(id?: string) {
  if (!id) return 'Destination';
  return id
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 26, fontWeight: '900', marginBottom: 8 },
  body: { fontSize: 15, lineHeight: 22 },
  demo: { fontSize: 13, fontWeight: '900', marginTop: 16 },
  actions: {
    marginTop: 20,
    gap: 10,
  },
});
