import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { ProgressBar, Snackbar, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../../src/components/common/Button';
import { Card } from '../../../src/components/common/Card';
import { ConfirmationDialog } from '../../../src/components/common/ConfirmationDialog';
import { EmptyState } from '../../../src/components/common/EmptyState';
import { ErrorState } from '../../../src/components/common/ErrorState';
import { ScreenContainer } from '../../../src/components/common/ScreenContainer';
import { useAuthStore } from '../../../src/store/authStore';
import { ActivityDialog } from '../../../src/features/itinerary/ActivityDialog';
import {
  ActivityCard,
  AlternativeSection,
  CostSummary,
  DaySelector,
  ItinerarySummary,
  WarningCards,
} from '../../../src/features/itinerary/ItineraryCards';
import { getDayTotal, hasTimeOverlap, sortActivities } from '../../../src/features/itinerary/utils';
import {
  addActivity,
  fetchTripDetails,
  generateItinerary,
  removeActivity,
  reorderActivities,
  reportActivityRecommendation,
  setActivityLocked,
  updateActivity,
  updateTripStatus,
} from '../../../src/features/trips/api';
import {
  calculatePlanningProgress,
  getEstimatedTotal,
  getSelectedTransport,
  getTripWarnings,
} from '../../../src/features/trips/utils';
import type { ActivityInput, ItineraryActivity, TripDay } from '../../../src/features/trips/types';
import { formatINR } from '../../../src/utils/currency';

type MaterialIconName = keyof typeof MaterialCommunityIcons.glyphMap;

const sectionIcons: Record<string, MaterialIconName> = {
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
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const authUser = useAuthStore((state) => state.authUser);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [activityDialog, setActivityDialog] = useState<{ mode: 'add' | 'edit'; activity?: ItineraryActivity | null } | null>(null);
  const [confirmReplace, setConfirmReplace] = useState<{ day?: TripDay | null } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<ItineraryActivity | null>(null);
  const [message, setMessage] = useState('');
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

  const days = useMemo(() => (tripQuery.data?.days ?? []) as TripDay[], [tripQuery.data?.days]);
  const activities = useMemo(() => (tripQuery.data?.itineraryItems ?? []) as ItineraryActivity[], [tripQuery.data?.itineraryItems]);
  const selectedDay = useMemo(() => {
    if (!days.length) return null;
    return days.find((day) => day.id === selectedDayId) ?? days[0];
  }, [days, selectedDayId]);
  const selectedActivities = useMemo(
    () => sortActivities(activities.filter((activity) => activity.trip_day_id === selectedDay?.id)),
    [activities, selectedDay?.id],
  );
  const dayTotals = useMemo(() => {
    return days.reduce<Record<string, number>>((acc, day) => {
      acc[day.id] = getDayTotal(activities.filter((activity) => activity.trip_day_id === day.id));
      return acc;
    }, {});
  }, [activities, days]);
  const tripItineraryTotal = useMemo(() => getDayTotal(activities), [activities]);
  const allWarnings = useMemo(() => {
    const itemWarnings = activities.flatMap((activity) => activity.metadata?.warnings ?? []);
    return [...new Set([...(overview?.warnings ?? []), ...itemWarnings])].slice(0, 8);
  }, [activities, overview?.warnings]);
  const alternatives = useMemo(
    () => [...new Set(activities.flatMap((activity) => activity.metadata?.alternatives ?? []))].slice(0, 8),
    [activities],
  );
  const confidence = activities.length ? 'medium' : 'low';

  const invalidateTrip = () => {
    queryClient.invalidateQueries({ queryKey: ['tripDetails', id] });
    queryClient.invalidateQueries({ queryKey: ['trips'] });
  };

  const generationMutation = useMutation({
    mutationFn: (day?: TripDay | null) => generateItinerary(id, day ? { regenerateDay: day.day_number } : undefined),
    onSuccess: () => {
      setMessage('Itinerary regenerated. Locked activities were preserved.');
      setConfirmReplace(null);
      invalidateTrip();
    },
    onError: (error: any) => setMessage(error.message ?? 'Could not generate itinerary. Your trip was not changed locally.'),
  });

  const saveMutation = useMutation({
    mutationFn: () => updateTripStatus(id, 'planning'),
    onSuccess: () => {
      setMessage('Itinerary saved.');
      invalidateTrip();
    },
    onError: (error: any) => setMessage(error.message ?? 'Could not save itinerary.'),
  });

  const activityMutation = useMutation({
    mutationFn: async ({ mode, input, activity }: { mode: 'add' | 'edit'; input: ActivityInput; activity?: ItineraryActivity | null }) => {
      if (!selectedDay) throw new Error('Select a day first.');
      if (mode === 'edit' && activity) return updateActivity(activity.id, input);
      return addActivity(id, selectedDay.id, input, selectedActivities.length);
    },
    onSuccess: () => {
      setActivityDialog(null);
      setMessage('Activity saved.');
      invalidateTrip();
    },
    onError: (error: any) => setMessage(error.message ?? 'Could not save activity.'),
  });

  const removeMutation = useMutation({
    mutationFn: (activityId: string) => removeActivity(activityId),
    onSuccess: () => {
      setConfirmRemove(null);
      setMessage('Activity removed.');
      invalidateTrip();
    },
    onError: (error: any) => setMessage(error.message ?? 'Could not remove activity.'),
  });

  const lockMutation = useMutation({
    mutationFn: (activity: ItineraryActivity) => setActivityLocked(activity, !activity.metadata?.locked),
    onSuccess: invalidateTrip,
    onError: (error: any) => setMessage(error.message ?? 'Could not update lock.'),
  });

  const reorderMutation = useMutation({
    mutationFn: (nextActivities: ItineraryActivity[]) => reorderActivities(nextActivities),
    onSuccess: invalidateTrip,
    onError: (error: any) => setMessage(error.message ?? 'Could not reorder activities.'),
  });

  const reportMutation = useMutation({
    mutationFn: (activity: ItineraryActivity) =>
      reportActivityRecommendation(id, activity, 'Incorrect itinerary recommendation reported by user.', authUser!.id),
    onSuccess: () => setMessage('Thanks. The recommendation was reported.'),
    onError: (error: any) => setMessage(error.message ?? 'Could not report recommendation.'),
  });

  const saveActivity = (input: ActivityInput) => {
    const editing = activityDialog?.activity ?? null;
    const candidate = {
      id: editing?.id,
      local_start_time: input.local_start_time,
      local_end_time: input.local_end_time,
    };
    if (hasTimeOverlap(candidate, selectedActivities)) {
      setMessage('That time overlaps another activity on this day. Adjust the time and try again.');
      return;
    }
    activityMutation.mutate({ mode: activityDialog?.mode ?? 'add', input, activity: editing });
  };

  const moveActivity = (activity: ItineraryActivity, direction: -1 | 1) => {
    const currentIndex = selectedActivities.findIndex((item) => item.id === activity.id);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= selectedActivities.length) return;
    const next = [...selectedActivities];
    const [removed] = next.splice(currentIndex, 1);
    next.splice(nextIndex, 0, removed);
    reorderMutation.mutate(next);
  };

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
    { title: 'Overview', body: `${trip.destination_name} - ${trip.start_date} to ${trip.end_date}` },
    { title: 'Itinerary', body: `${days.length} days - ${activities.length} planned items` },
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
        </Card>

        <View style={[styles.sectionGrid, isWide && styles.sectionGridWide]}>
          {sections.map((section) => (
            <Card key={section.title} style={styles.sectionCard} accessibilityLabel={`${section.title} section`}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name={sectionIcons[section.title]} size={22} color={theme.colors.primary} />
                <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>{section.title}</Text>
              </View>
              <Text style={[styles.sectionBody, { color: theme.colors.onSurfaceVariant }]}>{section.body}</Text>
            </Card>
          ))}
        </View>

        <View style={styles.itineraryHeader}>
          <View>
            <Text style={[styles.itineraryTitle, { color: theme.colors.onBackground }]}>Itinerary</Text>
            <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              Review, edit, lock, and regenerate AI-generated suggestions.
            </Text>
          </View>
          <View style={styles.itineraryActions}>
            <Button
              mode="outlined"
              icon="refresh"
              onPress={() => (activities.length ? setConfirmReplace({ day: null }) : generationMutation.mutate(null))}
              loading={generationMutation.isPending && !confirmReplace?.day}
            >
              {activities.length ? 'Regenerate all' : 'Generate'}
            </Button>
            <Button icon="content-save-outline" onPress={() => saveMutation.mutate()} loading={saveMutation.isPending}>
              Save itinerary
            </Button>
          </View>
        </View>

        {activities.length > 0 && (
          <>
            <ItinerarySummary
              dayCount={days.length}
              activityCount={activities.length}
              totalCost={tripItineraryTotal}
              confidence={confidence}
            />
            <WarningCards warnings={allWarnings} />
            <DaySelector days={days} selectedDayId={selectedDay?.id ?? null} onSelect={setSelectedDayId} dayTotals={dayTotals} />
            <CostSummary dayTotal={selectedDay ? dayTotals[selectedDay.id] ?? 0 : 0} tripTotal={tripItineraryTotal} />
            <AlternativeSection alternatives={alternatives} />
          </>
        )}

        {selectedDay && (
          <View style={styles.dayHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
                Day {selectedDay.day_number}: {selectedDay.title ?? selectedDay.local_date}
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>{selectedDay.local_date}</Text>
            </View>
            <View style={styles.itineraryActions}>
              <Button mode="outlined" icon="refresh" onPress={() => setConfirmReplace({ day: selectedDay })}>
                Regenerate day
              </Button>
              <Button icon="plus" onPress={() => setActivityDialog({ mode: 'add' })}>Add activity</Button>
            </View>
          </View>
        )}

        {activities.length === 0 ? (
          <EmptyState
            title="No itinerary yet"
            description="Generate a secure AI itinerary. Your trip remains saved if the network fails."
            icon="calendar-plus"
            actionLabel="Generate itinerary"
            onAction={() => generationMutation.mutate(null)}
          />
        ) : selectedActivities.length === 0 ? (
          <EmptyState
            title="No activities for this day"
            description="Add a custom activity or regenerate this day."
            icon="calendar-blank-outline"
            actionLabel="Add activity"
            onAction={() => setActivityDialog({ mode: 'add' })}
          />
        ) : (
          <View style={styles.timeline}>
            {selectedActivities.map((activity, index) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                index={index}
                total={selectedActivities.length}
                onEdit={() => setActivityDialog({ mode: 'edit', activity })}
                onRemove={() => setConfirmRemove(activity)}
                onMoveUp={() => moveActivity(activity, -1)}
                onMoveDown={() => moveActivity(activity, 1)}
                onToggleLock={() => lockMutation.mutate(activity)}
                onReport={() => reportMutation.mutate(activity)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <ActivityDialog
        key={activityDialog?.activity?.id ?? activityDialog?.mode ?? 'activity-closed'}
        visible={!!activityDialog}
        activity={activityDialog?.activity}
        loading={activityMutation.isPending}
        onDismiss={() => setActivityDialog(null)}
        onSave={saveActivity}
      />

      <ConfirmationDialog
        visible={!!confirmReplace}
        title={confirmReplace?.day ? 'Regenerate this day?' : 'Replace itinerary?'}
        message={
          confirmReplace?.day
            ? 'This will replace unlocked AI suggestions for the selected day. Locked activities will be preserved.'
            : 'This will replace unlocked AI suggestions across the itinerary. Locked activities will be preserved.'
        }
        confirmLabel="Regenerate"
        loading={generationMutation.isPending}
        onDismiss={() => setConfirmReplace(null)}
        onConfirm={() => generationMutation.mutate(confirmReplace?.day ?? null)}
      />

      <ConfirmationDialog
        visible={!!confirmRemove}
        title="Remove activity?"
        message={`Remove "${confirmRemove?.title ?? 'this activity'}" from the itinerary?`}
        confirmLabel="Remove"
        isDestructive
        loading={removeMutation.isPending}
        onDismiss={() => setConfirmRemove(null)}
        onConfirm={() => confirmRemove && removeMutation.mutate(confirmRemove.id)}
      />

      <Snackbar visible={!!message} onDismiss={() => setMessage('')} duration={4500}>
        {message}
      </Snackbar>
    </ScreenContainer>
  );
}

function OverviewMetric({ label, value, icon }: { label: string; value: string; icon: MaterialIconName }) {
  const theme = useTheme();
  return (
    <View style={styles.metric}>
      <MaterialCommunityIcons name={icon} size={20} color={theme.colors.primary} />
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
  itineraryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 24,
    marginBottom: 8,
  },
  itineraryTitle: {
    fontSize: 24,
    fontWeight: '900',
  },
  itineraryActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  timeline: {
    gap: 8,
  },
});
