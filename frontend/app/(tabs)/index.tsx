import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { Card } from '../../src/components/common/Card';
import { Button } from '../../src/components/common/Button';
import { useAuthStore } from '../../src/store/authStore';
import { EmptyState } from '../../src/components/common/EmptyState';

export default function HomeScreen() {
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);

  return (
    <ScreenContainer scrollable safeArea={false} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.welcome, { color: theme.colors.onBackground }]}>
          Namaste, {user?.full_name ?? 'Traveler'}!
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          Where are we traveling next?
        </Text>
      </View>

      <Card style={styles.plannerCard}>
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>AI Trip Planner</Text>
          <Text style={[styles.cardBody, { color: theme.colors.onSurfaceVariant }]}>
            Generate a personalized, day-by-day itinerary tailored to your budget and travel interests in seconds.
          </Text>
          <Button mode="contained" onPress={() => {}} style={styles.planBtn}>
            Plan New Trip
          </Button>
        </View>
      </Card>

      <View style={styles.tripsSection}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>Active Journey</Text>
        <EmptyState
          title="No Active Trips"
          description="Create a trip to compare transports, split group expenses, and access localized safety guidance."
          icon="airplane-takeoff"
          actionLabel="Create Trip"
          onAction={() => {}}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    marginVertical: 16,
  },
  welcome: {
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  plannerCard: {
    padding: 16,
    marginBottom: 24,
  },
  cardContent: {
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  planBtn: {
    alignSelf: 'flex-start',
  },
  tripsSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
});
