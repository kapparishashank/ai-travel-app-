import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { ScreenContainer } from '../../../src/components/common/ScreenContainer';
import { demoTrips } from '../../../src/features/home/demoData';
import { formatINR } from '../../../src/utils/currency';

export default function TripDetailsScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const trip = demoTrips.find((item) => item.id === id);

  return (
    <ScreenContainer safeArea={false} contentContainerStyle={styles.container}>
      <Text style={[styles.title, { color: theme.colors.onBackground }]}>
        {trip?.title ?? 'Trip details'}
      </Text>
      <Text style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>
        {trip
          ? `${trip.destination} · ${trip.startDate} to ${trip.endDate} · ${formatINR(trip.budgetMinor)}`
          : 'Trip details will appear here.'}
      </Text>
      {trip?.isDemo && <Text style={[styles.demo, { color: theme.colors.primary }]}>Demo data</Text>}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 26, fontWeight: '900', marginBottom: 8 },
  body: { fontSize: 15, lineHeight: 22 },
  demo: { fontSize: 13, fontWeight: '900', marginTop: 16 },
});
