import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Snackbar, useTheme } from 'react-native-paper';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Button } from '../../src/components/common/Button';
import { ConfirmationDialog } from '../../src/components/common/ConfirmationDialog';
import { EmptyState } from '../../src/components/common/EmptyState';
import { ErrorState } from '../../src/components/common/ErrorState';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { SegmentedTabs } from '../../src/components/common/SegmentedTabs';
import { useAuthStore } from '../../src/store/authStore';
import { ManagedTripCard, TripSkeleton } from '../../src/features/trips/TripCards';
import { EditTripBasicsDialog, RenameTripDialog } from '../../src/features/trips/TripDialogs';
import {
  deleteTrip,
  duplicateTrip,
  fetchTrips,
  renameTrip,
  updateTripBasics,
  updateTripStatus,
} from '../../src/features/trips/api';
import { groupTrips } from '../../src/features/trips/utils';
import type { TripBasicsInput, TripSummary } from '../../src/features/trips/types';

type TripBucket = 'Upcoming' | 'Draft' | 'Past' | 'Archived';

export default function TripsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const authUser = useAuthStore((state) => state.authUser);
  const [bucket, setBucket] = useState<TripBucket>('Upcoming');
  const [menuTripId, setMenuTripId] = useState<string | null>(null);
  const [renameTripTarget, setRenameTripTarget] = useState<TripSummary | null>(null);
  const [editTripTarget, setEditTripTarget] = useState<TripSummary | null>(null);
  const [deleteTripTarget, setDeleteTripTarget] = useState<TripSummary | null>(null);
  const [message, setMessage] = useState('');
  const isWide = width >= 900;

  const tripsQuery = useQuery({
    queryKey: ['trips', authUser?.id],
    queryFn: () => fetchTrips(authUser?.id),
    enabled: Boolean(authUser?.id),
  });

  const grouped = useMemo(() => groupTrips(tripsQuery.data ?? []), [tripsQuery.data]);
  const currentTrips = grouped[bucket];

  const invalidateTrips = () => {
    queryClient.invalidateQueries({ queryKey: ['trips'] });
    queryClient.invalidateQueries({ queryKey: ['tripDetails'] });
  };

  const renameMutation = useMutation({
    mutationFn: ({ tripId, title }: { tripId: string; title: string }) => renameTrip(tripId, title),
    onMutate: async ({ tripId, title }) => {
      await queryClient.cancelQueries({ queryKey: ['trips', authUser?.id] });
      const previousTrips = queryClient.getQueryData<TripSummary[]>(['trips', authUser?.id]);
      queryClient.setQueryData<TripSummary[]>(['trips', authUser?.id], (old) =>
        old?.map((trip) => (trip.id === tripId ? { ...trip, title } : trip)) ?? old
      );
      return { previousTrips };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(['trips', authUser?.id], context?.previousTrips);
      setMessage('Could not rename trip.');
    },
    onSuccess: () => setMessage('Trip renamed.'),
    onSettled: invalidateTrips,
  });

  const basicsMutation = useMutation({
    mutationFn: ({ tripId, basics }: { tripId: string; basics: TripBasicsInput }) => updateTripBasics(tripId, basics),
    onSuccess: () => {
      setMessage('Trip basics updated.');
      setEditTripTarget(null);
    },
    onError: (error: any) => setMessage(error.message ?? 'Could not update trip.'),
    onSettled: invalidateTrips,
  });

  const archiveMutation = useMutation({
    mutationFn: (tripId: string) => updateTripStatus(tripId, 'archived'),
    onMutate: async (tripId) => {
      await queryClient.cancelQueries({ queryKey: ['trips', authUser?.id] });
      const previousTrips = queryClient.getQueryData<TripSummary[]>(['trips', authUser?.id]);
      queryClient.setQueryData<TripSummary[]>(['trips', authUser?.id], (old) =>
        old?.map((trip) => (trip.id === tripId ? { ...trip, status: 'archived' } : trip)) ?? old
      );
      return { previousTrips };
    },
    onError: (_error, _tripId, context) => {
      queryClient.setQueryData(['trips', authUser?.id], context?.previousTrips);
      setMessage('Could not archive trip.');
    },
    onSuccess: () => setMessage('Trip archived.'),
    onSettled: invalidateTrips,
  });

  const duplicateMutation = useMutation({
    mutationFn: (trip: TripSummary) => duplicateTrip(trip, authUser!.id),
    onSuccess: (newTripId) => {
      setMessage('Trip duplicated as a draft.');
      invalidateTrips();
      router.push(`/(tabs)/trip/${newTripId}`);
    },
    onError: (error: any) => setMessage(error.message ?? 'Could not duplicate trip.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (tripId: string) => deleteTrip(tripId),
    onSuccess: () => {
      setMessage('Trip deleted.');
      setDeleteTripTarget(null);
      invalidateTrips();
    },
    onError: (error: any) => setMessage(error.message ?? 'Could not delete trip.'),
  });

  const openTrip = (trip: TripSummary) => {
    router.push(`/(tabs)/trip/${trip.id}`);
  };

  const closeMenus = () => setMenuTripId(null);

  return (
    <ScreenContainer safeArea={false} keyboardAvoiding={false}>
      <ScrollView
        contentContainerStyle={[styles.container, isWide && styles.wideContainer]}
        refreshControl={<RefreshControl refreshing={tripsQuery.isRefetching} onRefresh={() => tripsQuery.refetch()} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: theme.colors.onBackground }]}>Trips</Text>
            <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              Manage drafts, upcoming plans, past trips, and archived records.
            </Text>
          </View>
          <Button icon="plus" onPress={() => router.push('/(tabs)/plan-trip')}>Plan a Trip</Button>
        </View>

        <SegmentedTabs
          name="trip-bucket"
          ariaLabel="Trip status"
          value={bucket}
          onChange={(value) => setBucket(value as TripBucket)}
          options={[
            { value: 'Upcoming', label: `Upcoming (${grouped.Upcoming.length})` },
            { value: 'Draft', label: `Draft (${grouped.Draft.length})` },
            { value: 'Past', label: `Past (${grouped.Past.length})` },
            { value: 'Archived', label: `Archived (${grouped.Archived.length})` },
          ]}
          style={styles.segments}
        />

        {tripsQuery.isLoading ? (
          <>
            <TripSkeleton />
            <TripSkeleton />
            <TripSkeleton />
          </>
        ) : tripsQuery.isError ? (
          <ErrorState
            message="Refresh to try loading your trip data again."
            onRetry={() => tripsQuery.refetch()}
          />
        ) : currentTrips.length === 0 ? (
          <EmptyState
            title={`No ${bucket.toLowerCase()} trips`}
            description={bucket === 'Draft' ? 'Create a draft from the Plan a Trip flow.' : 'Trips in this category will appear here.'}
            icon="wallet-travel"
            actionLabel="Plan a Trip"
            onAction={() => router.push('/(tabs)/plan-trip')}
          />
        ) : (
          <View style={[styles.tripGrid, isWide && styles.tripGridWide]}>
            {currentTrips.map((trip) => (
              <View key={trip.id} style={isWide ? styles.tripGridItem : undefined}>
                <ManagedTripCard
                  trip={trip}
                  menuVisible={menuTripId === trip.id}
                  onOpenMenu={() => setMenuTripId(trip.id)}
                  onCloseMenu={closeMenus}
                  onOpen={() => {
                    closeMenus();
                    openTrip(trip);
                  }}
                  onRename={() => {
                    closeMenus();
                    setRenameTripTarget(trip);
                  }}
                  onEdit={() => {
                    closeMenus();
                    setEditTripTarget(trip);
                  }}
                  onDuplicate={() => {
                    closeMenus();
                    duplicateMutation.mutate(trip);
                  }}
                  onArchive={() => {
                    closeMenus();
                    archiveMutation.mutate(trip.id);
                  }}
                  onDelete={() => {
                    closeMenus();
                    setDeleteTripTarget(trip);
                  }}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <RenameTripDialog
        key={renameTripTarget?.id ?? 'rename-closed'}
        trip={renameTripTarget}
        visible={!!renameTripTarget}
        loading={renameMutation.isPending}
        onDismiss={() => setRenameTripTarget(null)}
        onSave={(title) => {
          if (!renameTripTarget) return;
          renameMutation.mutate(
            { tripId: renameTripTarget.id, title },
            { onSuccess: () => setRenameTripTarget(null) }
          );
        }}
      />

      <EditTripBasicsDialog
        key={editTripTarget?.id ?? 'basics-closed'}
        trip={editTripTarget}
        visible={!!editTripTarget}
        loading={basicsMutation.isPending}
        onDismiss={() => setEditTripTarget(null)}
        onSave={(basics) => {
          if (!editTripTarget) return;
          basicsMutation.mutate({ tripId: editTripTarget.id, basics });
        }}
      />

      <ConfirmationDialog
        visible={!!deleteTripTarget}
        title="Delete trip?"
        message={`This permanently deletes "${deleteTripTarget?.title ?? 'this trip'}" and related trip data. This cannot be undone.`}
        confirmLabel="Delete"
        isDestructive
        loading={deleteMutation.isPending}
        onDismiss={() => setDeleteTripTarget(null)}
        onConfirm={() => {
          if (deleteTripTarget) deleteMutation.mutate(deleteTripTarget.id);
        }}
      />

      <Snackbar visible={!!message} onDismiss={() => setMessage('')} duration={3500}>
        {message}
      </Snackbar>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  segments: {
    marginBottom: 14,
  },
  tripGrid: {
    gap: 8,
  },
  tripGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tripGridItem: {
    width: '48.8%',
  },
});
