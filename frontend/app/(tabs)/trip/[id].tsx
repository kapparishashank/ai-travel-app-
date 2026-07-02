import React, { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { ProgressBar, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../../src/components/common/Card';
import { EmptyState } from '../../../src/components/common/EmptyState';
import { ErrorState } from '../../../src/components/common/ErrorState';
import { ScreenContainer } from '../../../src/components/common/ScreenContainer';
import { useAuthStore } from '../../../src/store/authStore';
import { fetchTripDetails } from '../../../src/features/trips/api';
import {
  calculatePlanningProgress,
  getEstimatedTotal,
  getSelectedTransport,
  getTripWarnings,
} from '../../../src/features/trips/utils';
import { formatINR } from '../../../src/utils/currency';

const sectionIcons: Record<string, string> = {
  Overview: 'view-dashboard-outline',
  Itinerary: 'calendar-text-outline',
  Journey: 'routes',
  Budget: 'wallet-outline',
  Packing: 'bag-suitcase-outline',
  Safety: 'shield-check-outline',
  Members: 'account-group-outline',
  Expenses: 'receipt-text-outline',
};

export default function TripDetailsScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const authUser = useAuthStore((state) => state.authUser);
  const isWide = width >= 900;

  const tripQuery = useQuery({
    queryKey: ['tripDetails', id, authUser?.id],
    queryFn: () => fetchTripDetails(id, authUser?.id),
    enabled: Boolean(id && authUser?.id),
  });

  const overview = useMemo(() => {
    if (!tripQuery.data) return null;
    const progress = calculatePlanningProgress(tripQuery.data);
    const estimatedTotal = getEstimatedTotal(tripQuery.data);
    const selectedTransport = getSelectedTransport(tripQuery.data);
    const warnings = getTripWarnings(tripQuery.data);
    return { progress, estimatedTotal, selectedTransport, warnings };
  }, [tripQuery.data]);

  if (tripQuery.isLoading) {
    return (
      <ScreenContainer safeArea={false} contentContainerStyle={styles.loadingContainer}>
        <Text style={[styles.loadingTitle, { color: theme.colors.onBackground }]}>Loading trip...</Text>
      </ScreenContainer>
    );
  }

  if (tripQuery.isError || !tripQuery.data || !overview) {
    return (
      <ScreenContainer safeArea={false} contentContainerStyle={styles.loadingContainer}>
        <ErrorState
          message="This trip could not be opened. It may have been deleted, or you may not belong to it."
          onRetry={() => tripQuery.refetch()}
        />
      </ScreenContainer>
    );
  }

  const { trip } = tripQuery.data;

  const sections = [
    { title: 'Overview', body: `${trip.destination_name} · ${trip.start_date} to ${trip.end_date}` },
    { title: 'Itinerary', body: `${tripQuery.data.days.length} days · ${tripQuery.data.itineraryItems.length} planned items` },
    { title: 'Journey', body: overview.selectedTransport },
    { title: 'Budget', body: `${formatINR(overview.estimatedTotal)} estimated total` },
    { title: 'Packing', body: `${tripQuery.data.packingItems.length} packing items` },
    { title: 'Safety', body: `${tripQuery.data.safetySessions.length} safety session${tripQuery.data.safetySessions.length === 1 ? '' : 's'}` },
    { title: 'Members', body: `${tripQuery.data.members.length || trip.travelerCount} traveler${trip.travelerCount === 1 ? '' : 's'}` },
    { title: 'Expenses', body: `${tripQuery.data.expenses.length} expense${tripQuery.data.expenses.length === 1 ? '' : 's'}` },
  ];

  return (
    <ScreenContainer safeArea={false} keyboardAvoiding={false}>
      <ScrollView
        contentContainerStyle={[styles.container, isWide && styles.wideContainer]}
        refreshControl={<RefreshControl refreshing={tripQuery.isRefetching} onRefresh={() => tripQuery.refetch()} />}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.onBackground }]}>{trip.title}</Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            {trip.origin_name} to {trip.destination_name}
          </Text>
        </View>

        <Card style={styles.overviewCard}>
          <View style={[styles.overviewGrid, isWide && styles.overviewGridWide]}>
            <OverviewMetric label="Destination" value={trip.destination_name} icon="map-marker-radius-outline" />
            <OverviewMetric label="Dates" value={`${trip.start_date} to ${trip.end_date}`} icon="calendar-range" />
            <OverviewMetric label="Travelers" value={`${trip.travelerCount}`} icon="account-group-outline" />
            <OverviewMetric label="Budget" value={formatINR(trip.total_budget_minor)} icon="wallet-outline" />
            <OverviewMetric label="Status" value={trip.status} icon="progress-check" />
            <OverviewMetric label="Estimated total" value={formatINR(overview.estimatedTotal)} icon="calculator-variant-outline" />
            <OverviewMetric label="Selected transport" value={overview.selectedTransport} icon="routes" />
          </View>

          <View style={styles.progressBlock}>
            <View style={styles.progressHeader}>
              <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]}>Planning progress</Text>
              <Text style={[styles.progressValue, { color: theme.colors.primary }]}>{overview.progress}%</Text>
            </View>
            <ProgressBar progress={overview.progress / 100} color={theme.colors.primary} style={styles.progress} />
          </View>

          {overview.warnings.length > 0 && (
            <View style={[styles.warningBox, { backgroundColor: theme.colors.errorContainer }]}>
              <Text style={[styles.warningTitle, { color: theme.colors.onErrorContainer }]}>Important warnings</Text>
              {overview.warnings.map((warning) => (
                <Text key={warning} style={[styles.warningText, { color: theme.colors.onErrorContainer }]}>
                  - {warning}
                </Text>
              ))}
            </View>
          )}
        </Card>

        <View style={[styles.sectionGrid, isWide && styles.sectionGridWide]}>
          {sections.map((section) => (
            <Card key={section.title} style={styles.sectionCard} accessibilityLabel={`${section.title} section`}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name={sectionIcons[section.title] as any} size={22} color={theme.colors.primary} />
                <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>{section.title}</Text>
              </View>
              <Text style={[styles.sectionBody, { color: theme.colors.onSurfaceVariant }]}>{section.body}</Text>
            </Card>
          ))}
        </View>

        {sections.length === 0 && (
          <EmptyState
            title="Trip sections are empty"
            description="Generate an itinerary to fill in this trip."
            icon="map-outline"
          />
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function OverviewMetric({ label, value, icon }: { label: string; value: string; icon: string }) {
  const theme = useTheme();
  return (
    <View style={styles.metric}>
      <MaterialCommunityIcons name={icon as any} size={20} color={theme.colors.primary} />
      <View style={styles.metricText}>
        <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
        <Text style={[styles.metricValue, { color: theme.colors.onSurface }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    justifyContent: 'center',
    padding: 24,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  wideContainer: {
    maxWidth: 1180,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  header: {
    marginTop: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 15,
    marginTop: 4,
  },
  overviewCard: {
    padding: 16,
  },
  overviewGrid: {
    gap: 14,
  },
  overviewGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    minWidth: 220,
    flex: 1,
  },
  metricText: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 3,
    textTransform: 'capitalize',
  },
  progressBlock: {
    marginTop: 18,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressValue: {
    fontSize: 13,
    fontWeight: '900',
  },
  progress: {
    height: 8,
    borderRadius: 8,
  },
  warningBox: {
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 6,
  },
  warningText: {
    fontSize: 13,
    lineHeight: 19,
  },
  sectionGrid: {
    gap: 8,
    marginTop: 16,
  },
  sectionGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sectionCard: {
    padding: 14,
    minHeight: 112,
    flexBasis: '48%',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
});
