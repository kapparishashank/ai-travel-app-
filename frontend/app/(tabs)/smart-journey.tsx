import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Snackbar, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '../../src/components/common/Button';
import { Card } from '../../src/components/common/Card';
import { EmptyState } from '../../src/components/common/EmptyState';
import { ErrorState } from '../../src/components/common/ErrorState';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { TextInput } from '../../src/components/common/TextInput';
import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
} from '../../src/components/animate-ui/primitives/radix/accordion';
import { trackAnalyticsEvent } from '../../src/features/analytics/analytics';
import { saveJourneyOptionToTrip } from '../../src/features/smartJourney/api';
import { getMockJourneyOptions } from '../../src/features/smartJourney/mockProviders';
import { rankJourneyOptions } from '../../src/features/smartJourney/ranking';
import type { JourneyMode, JourneyPriority, JourneySearchInput, JourneySort, RankedJourneyOption } from '../../src/features/smartJourney/types';
import { fetchTrips } from '../../src/features/trips/api';
import { useAuthStore } from '../../src/store/authStore';
import { formatINR } from '../../src/utils/currency';

const priorityOptions: JourneyPriority[] = ['balanced', 'price', 'time', 'comfort', 'convenience'];
const sortOptions: JourneySort[] = ['recommended', 'price', 'duration', 'comfort', 'departure'];
const modeOptions: (JourneyMode | 'all')[] = ['all', 'bus', 'train', 'flight', 'cab', 'mixed'];

export default function SmartJourneyScreen() {
  const theme = useTheme();
  const authUser = useAuthStore((state) => state.authUser);
  const [search, setSearch] = useState<JourneySearchInput>({
    origin: 'Hyderabad',
    destination: 'Goa',
    travelDate: '2026-08-14',
    travelers: 4,
  });
  const [priority, setPriority] = useState<JourneyPriority>('balanced');
  const [sort, setSort] = useState<JourneySort>('recommended');
  const [modeFilter, setModeFilter] = useState<JourneyMode | 'all'>('all');
  const [message, setMessage] = useState('');

  React.useEffect(() => {
    if (!authUser?.id) return;
    trackAnalyticsEvent({
      userId: authUser.id,
      name: 'journey_search_started',
      properties: {
        source: 'smart_journey',
        mode: 'mixed',
        travelerCount: search.travelers,
        dataLabel: '[MOCK DATA]',
      },
    }).catch(() => undefined);
  }, [authUser?.id, search.destination, search.origin, search.travelDate, search.travelers]);

  const tripsQuery = useQuery({
    queryKey: ['trips', authUser?.id],
    queryFn: () => fetchTrips(authUser?.id),
    enabled: Boolean(authUser?.id),
  });

  const selectedTrip = useMemo(() => {
    const trips = tripsQuery.data ?? [];
    return trips.find((trip) => trip.destination_name.toLowerCase().includes(search.destination.toLowerCase())) ?? trips[0] ?? null;
  }, [search.destination, tripsQuery.data]);

  const options = useMemo(() => getMockJourneyOptions(search), [search]);
  const ranked = useMemo(() => {
    const filtered = modeFilter === 'all' ? options : options.filter((option) => option.mode === modeFilter);
    return rankJourneyOptions(filtered, priority, sort);
  }, [modeFilter, options, priority, sort]);

  const saveMutation = useMutation({
    mutationFn: (option: RankedJourneyOption) => {
      if (!authUser?.id) throw new Error('Sign in to save a journey option.');
      if (!selectedTrip) throw new Error('Create or open a trip before saving an option.');
      return saveJourneyOptionToTrip({ tripId: selectedTrip.id, userId: authUser.id, search, option });
    },
    onSuccess: () => setMessage('Journey option saved to your trip.'),
    onError: (error: any) => setMessage(error.message ?? 'Could not save journey option.'),
  });

  return (
    <ScreenContainer safeArea={false} keyboardAvoiding={false}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={tripsQuery.isRefetching} onRefresh={() => tripsQuery.refetch()} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: theme.colors.onBackground }]}>Smart Journey</Text>
            <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              Demo estimates compare total journey cost, not only base fare.
            </Text>
          </View>
        </View>

        <Card style={styles.panel}>
          <View style={styles.searchGrid}>
            <TextInput label="From" value={search.origin} onChangeText={(origin) => setSearch((current) => ({ ...current, origin }))} />
            <TextInput label="To" value={search.destination} onChangeText={(destination) => setSearch((current) => ({ ...current, destination }))} />
            <TextInput label="Travel date" value={search.travelDate} onChangeText={(travelDate) => setSearch((current) => ({ ...current, travelDate }))} />
            <TextInput
              label="Travelers"
              value={String(search.travelers)}
              onChangeText={(travelers) => setSearch((current) => ({ ...current, travelers: Math.max(1, Number(travelers.replace(/[^\d]/g, '') || 1)) }))}
              keyboardType="number-pad"
            />
          </View>
          <Text style={[styles.notice, { color: theme.colors.onSurfaceVariant }]}>
            Initial results are structured demo estimates. Verify live schedules, availability, fares, baggage, and cancellation rules before booking.
          </Text>
        </Card>

        <ControlSection title="Priority">
          {priorityOptions.map((item) => (
            <Button key={item} mode={priority === item ? 'contained' : 'outlined'} onPress={() => setPriority(item)}>
              {labelCase(item)}
            </Button>
          ))}
        </ControlSection>

        <ControlSection title="Mode filter">
          {modeOptions.map((item) => (
            <Button key={item} mode={modeFilter === item ? 'contained' : 'outlined'} onPress={() => setModeFilter(item)}>
              {item === 'all' ? 'All' : labelCase(item)}
            </Button>
          ))}
        </ControlSection>

        <ControlSection title="Sort">
          {sortOptions.map((item) => (
            <Button key={item} mode={sort === item ? 'contained' : 'outlined'} onPress={() => setSort(item)}>
              {labelCase(item)}
            </Button>
          ))}
        </ControlSection>

        {tripsQuery.isError && (
          <ErrorState message="Trips could not be loaded. You can still compare demo journey options." onRetry={() => tripsQuery.refetch()} />
        )}

        {ranked.length === 0 ? (
          <EmptyState title="No journey options" description="Adjust filters to compare available demo estimates." icon="routes" />
        ) : (
          <View style={styles.optionsList}>
            {ranked.map((option) => (
              <JourneyOptionCard
                key={option.id}
                option={option}
                saving={saveMutation.isPending}
                canSave={Boolean(authUser?.id && selectedTrip)}
                onSave={() => saveMutation.mutate(option)}
              />
            ))}
          </View>
        )}
      </ScrollView>
      <Snackbar visible={!!message} onDismiss={() => setMessage('')} duration={4000}>{message}</Snackbar>
    </ScreenContainer>
  );
}

function ControlSection({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.controlSection}>
      <Text style={[styles.controlTitle, { color: theme.colors.onBackground }]}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.controlRow}>
        {children}
      </ScrollView>
    </View>
  );
}

function JourneyOptionCard({
  option,
  saving,
  canSave,
  onSave,
}: {
  option: RankedJourneyOption;
  saving: boolean;
  canSave: boolean;
  onSave: () => void;
}) {
  const theme = useTheme();
  return (
    <Card style={styles.optionCard} accessibilityLabel={`${option.mode} journey option`}>
      <View style={styles.optionHeader}>
        <View style={styles.modeBlock}>
          <MaterialCommunityIcons name={modeIcon(option.mode) as any} size={26} color={theme.colors.primary} />
          <View>
            <Text style={[styles.optionTitle, { color: theme.colors.onSurface }]}>{labelCase(option.mode)}</Text>
            <Text style={[styles.provider, { color: theme.colors.onSurfaceVariant }]}>{option.provider}</Text>
          </View>
        </View>
        <View style={styles.scoreBlock}>
          <Text style={[styles.score, { color: theme.colors.primary }]}>{option.weightedScore}</Text>
          <Text style={[styles.scoreLabel, { color: theme.colors.onSurfaceVariant }]}>score</Text>
        </View>
      </View>

      <View style={styles.labelRow}>
        {option.labels.map((label) => (
          <View key={label} style={[styles.labelChip, { borderColor: theme.colors.outlineVariant }]}>
            <Text style={[styles.labelText, { color: theme.colors.primary }]}>{label}</Text>
          </View>
        ))}
        <View style={[styles.labelChip, { borderColor: theme.colors.outlineVariant }]}>
          <Text style={[styles.labelText, { color: theme.colors.onSurfaceVariant }]}>Estimated demo data</Text>
        </View>
      </View>

      <View style={styles.metricsGrid}>
        <Metric label="Departure" value={formatTime(option.departure)} />
        <Metric label="Arrival" value={formatTime(option.arrival)} />
        <Metric label="Duration" value={formatDuration(option.durationMinutes)} />
        <Metric label="Waiting" value={formatDuration(option.waitingTimeMinutes)} />
        <Metric label="Transfers" value={String(option.transfers)} />
        <Metric label="Total cost" value={formatINR(option.totalEstimatedCostMinor)} />
      </View>

      <View style={styles.costBreakdown}>
        <CostLine label="Base fare" value={option.baseFareMinor} />
        <CostLine label="Taxes" value={option.taxesMinor} />
        <CostLine label="Baggage" value={option.baggageCostMinor} />
        <CostLine label="First-mile" value={option.firstMileCostMinor} />
        <CostLine label="Last-mile" value={option.lastMileCostMinor} />
      </View>

      <View style={styles.scoreGrid}>
        <ScorePill label="Comfort" value={option.comfortScore} />
        <ScorePill label="Convenience" value={option.convenienceScore} />
        <ScorePill label="Reliability" value={option.reliabilityScore} />
        <ScorePill label="Flexibility" value={option.flexibilityScore} />
        <ScorePill label="Safety" value={option.safetyGuidanceScore} />
      </View>

      <Accordion type="single" collapsible style={styles.detailAccordion}>
        <AccordionItem value={`${option.id}-recommendation`}>
          <AccordionHeader>
            <AccordionTrigger textStyle={styles.accordionTitle}>Why recommended?</AccordionTrigger>
          </AccordionHeader>
          <AccordionContent>
            <Text style={[styles.whyText, { color: theme.colors.onSurfaceVariant }]}>{option.whyRecommended}</Text>
            <Text style={[styles.whyText, { color: theme.colors.onSurfaceVariant }]}>{option.safetyGuidance}</Text>
            <Text style={[styles.dataStatus, { color: theme.colors.onSurfaceVariant }]}>
              Data status: {option.dataStatus === 'demo_estimate' ? 'Demo estimate' : 'Provider estimate'} - Last checked {new Date(option.lastCheckedAt).toLocaleString()}
            </Text>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <View style={styles.actionRow}>
        <Button icon="content-save-outline" disabled={!canSave} loading={saving} onPress={onSave}>
          Save to trip
        </Button>
      </View>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: theme.colors.onSurface }]}>{value}</Text>
    </View>
  );
}

function CostLine({ label, value }: { label: string; value: number }) {
  const theme = useTheme();
  return (
    <View style={styles.costLine}>
      <Text style={[styles.costLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      <Text style={[styles.costValue, { color: theme.colors.onSurface }]}>{formatINR(value)}</Text>
    </View>
  );
}

function ScorePill({ label, value }: { label: string; value: number }) {
  const theme = useTheme();
  return (
    <View style={[styles.scorePill, { borderColor: theme.colors.outlineVariant }]}>
      <Text style={[styles.scorePillText, { color: theme.colors.onSurfaceVariant }]}>{label}: {value}</Text>
    </View>
  );
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function labelCase(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function modeIcon(mode: JourneyMode) {
  return {
    bus: 'bus',
    train: 'train',
    flight: 'airplane',
    cab: 'car',
    mixed: 'routes',
  }[mode];
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 32, maxWidth: 1180, width: '100%', alignSelf: 'center' },
  header: { marginTop: 8, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '900' },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: 4 },
  panel: { padding: 16 },
  searchGrid: { gap: 4 },
  notice: { fontSize: 13, lineHeight: 19, marginTop: 8 },
  controlSection: { marginTop: 8 },
  controlTitle: { fontSize: 14, fontWeight: '900', textTransform: 'uppercase', marginBottom: 4 },
  controlRow: { gap: 8, paddingVertical: 4 },
  optionsList: { gap: 8, marginTop: 8 },
  optionCard: { padding: 16 },
  optionHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  modeBlock: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  optionTitle: { fontSize: 20, fontWeight: '900' },
  provider: { fontSize: 13, marginTop: 2 },
  scoreBlock: { alignItems: 'flex-end' },
  score: { fontSize: 24, fontWeight: '900' },
  scoreLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  labelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  labelChip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  labelText: { fontSize: 12, fontWeight: '900' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  metric: { minWidth: 150, flex: 1 },
  metricLabel: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  metricValue: { fontSize: 15, fontWeight: '900', marginTop: 2 },
  costBreakdown: { marginTop: 12, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8 },
  costLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  costLabel: { fontSize: 13 },
  costValue: { fontSize: 13, fontWeight: '900' },
  scoreGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  scorePill: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  scorePillText: { fontSize: 12, fontWeight: '800' },
  detailAccordion: { marginTop: 10 },
  accordionTitle: { fontSize: 13, textTransform: 'uppercase' },
  whyText: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  dataStatus: { fontSize: 12, marginTop: 8 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
});
