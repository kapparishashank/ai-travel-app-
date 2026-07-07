import React, { useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Card, Chip, ProgressBar, Text, TextInput, useTheme } from 'react-native-paper';
import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
} from '../../src/components/animate-ui/primitives/radix/accordion';
import { Button } from '../../src/components/common/Button';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { SegmentedTabs } from '../../src/components/common/SegmentedTabs';
import { createTripDraftFromSuggestion, saveBudgetDestination } from '../../src/features/budgetDiscovery/api';
import { discoverBudgetDestinations, parseRupeesToMinor } from '../../src/features/budgetDiscovery/calculations';
import { budgetDiscoveryTags, type BudgetDestinationSuggestion, type BudgetDiscoveryInput, type BudgetDiscoveryTag, type DiscoveryTransport } from '../../src/features/budgetDiscovery/types';
import { useAuthStore } from '../../src/store/authStore';
import { formatINR } from '../../src/utils/currency';
import { HeroBanner } from '../../src/components/common/HeroBanner';
import { MOUNTAIN_IMAGES } from '../../src/constants/images';

const tagLabels: Record<BudgetDiscoveryTag, string> = {
  beach: 'Beach',
  mountains: 'Mountains',
  heritage: 'Heritage',
  adventure: 'Adventure',
  food: 'Food',
  nature: 'Nature',
  nightlife: 'Nightlife',
  relaxation: 'Relaxation',
  weekend: 'Weekend',
  one_day_outing: 'One-day outing',
};

const today = new Date().toISOString().slice(0, 10);

export default function BudgetDiscoveryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const authUser = useAuthStore((state) => state.authUser);
  const [startingCity, setStartingCity] = useState('Hyderabad');
  const [maxBudget, setMaxBudget] = useState('40000');
  const [travelerCount, setTravelerCount] = useState('4');
  const [tripLengthDays, setTripLengthDays] = useState('4');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState('');
  const [transport, setTransport] = useState<DiscoveryTransport>('train');
  const [maxDistance, setMaxDistance] = useState('900');
  const [interests, setInterests] = useState<BudgetDiscoveryTag[]>(['beach', 'food', 'nightlife']);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const input = useMemo<BudgetDiscoveryInput | null>(() => {
    try {
      return {
        startingCity,
        maxBudgetMinor: parseRupeesToMinor(maxBudget),
        travelerCount: Number(travelerCount),
        tripLengthDays: Number(tripLengthDays),
        startDate,
        endDate: endDate || undefined,
        interests,
        preferredTransport: transport,
        maxDistanceKm: Number(maxDistance),
      };
    } catch {
      return null;
    }
  }, [startingCity, maxBudget, travelerCount, tripLengthDays, startDate, endDate, interests, transport, maxDistance]);

  const suggestions = useMemo(() => {
    if (!submitted || !input) return [];
    return discoverBudgetDestinations(input);
  }, [input, submitted]);

  const saveMutation = useMutation({
    mutationFn: (suggestion: BudgetDestinationSuggestion) => {
      if (!authUser?.id || !input) throw new Error('Please sign in before saving a destination.');
      return saveBudgetDestination(authUser.id, input, suggestion);
    },
    onSuccess: () => Alert.alert('Saved', 'Destination saved to your Budget Discovery list.'),
    onError: (err: any) => Alert.alert('Could not save', err.message ?? 'Apply the latest Supabase migration and try again.'),
  });

  const draftMutation = useMutation({
    mutationFn: (suggestion: BudgetDestinationSuggestion) => {
      if (!authUser?.id || !input) throw new Error('Please sign in before creating a trip draft.');
      return createTripDraftFromSuggestion(authUser.id, input, suggestion);
    },
    onSuccess: (tripId) => router.push(`/(tabs)/trip/${tripId}`),
    onError: (err: any) => Alert.alert('Could not create draft', err.message ?? 'Please try again.'),
  });

  const toggleInterest = (tag: BudgetDiscoveryTag) => {
    setInterests((current) => (current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]));
  };

  const runDiscovery = () => {
    setError('');
    setLoading(true);
    setTimeout(() => {
      try {
        if (!input) throw new Error('Check the budget and number fields.');
        if (input.travelerCount <= 0) throw new Error('Number of travelers must be positive.');
        if (input.tripLengthDays <= 0) throw new Error('Trip length must be positive.');
        if (input.maxDistanceKm <= 0) throw new Error('Maximum travel distance must be positive.');
        setSubmitted(true);
      } catch (err) {
        setSubmitted(false);
        setError(err instanceof Error ? err.message : 'Could not run discovery.');
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  return (
    <ScreenContainer safeArea={false} keyboardAvoiding={false}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={runDiscovery} />}
      >
        <HeroBanner
          imageUrl={MOUNTAIN_IMAGES.greenHills}
          height={180}
          overlayOpacity={0.45}
        >
          <Text style={[styles.bannerTitle, { color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }]}>Budget Discovery</Text>
          <Text style={[styles.bannerSubtitle, { color: 'rgba(255,255,255,0.90)', textShadowColor: 'rgba(0,0,0,0.30)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }]}>
            Curated India-focused estimates. Costs are not live prices; verify transport, stay, fees, weather, and availability before booking.
          </Text>
        </HeroBanner>

        <View style={styles.container}>
          <Card style={styles.card}>
            <Card.Content style={styles.gap}>
              <View style={styles.grid}>
              <TextInput label="Starting city" value={startingCity} onChangeText={setStartingCity} style={styles.input} />
              <TextInput label="Maximum budget (INR)" value={maxBudget} onChangeText={setMaxBudget} keyboardType="decimal-pad" style={styles.input} />
              <TextInput label="Travelers" value={travelerCount} onChangeText={setTravelerCount} keyboardType="number-pad" style={styles.input} />
              <TextInput label="Trip length (days)" value={tripLengthDays} onChangeText={setTripLengthDays} keyboardType="number-pad" style={styles.input} />
              <TextInput label="Start date (YYYY-MM-DD)" value={startDate} onChangeText={setStartDate} style={styles.input} />
              <TextInput label="End date (optional)" value={endDate} onChangeText={setEndDate} style={styles.input} />
              <TextInput label="Maximum distance (km)" value={maxDistance} onChangeText={setMaxDistance} keyboardType="number-pad" style={styles.input} />
            </View>
            <Text variant="titleSmall">Preferred transport</Text>
            <SegmentedTabs
              name="discovery-transport"
              ariaLabel="Preferred transport"
              value={transport}
              onChange={(value) => setTransport(value as DiscoveryTransport)}
              options={[
                { value: 'train', label: 'Train' },
                { value: 'bus', label: 'Bus' },
                { value: 'flight', label: 'Flight' },
                { value: 'cab', label: 'Cab' },
                { value: 'mixed', label: 'Mixed' },
              ]}
            />
            <Text variant="titleSmall">Filters</Text>
            <View style={styles.chips}>
              {budgetDiscoveryTags.map((tag) => (
                <Chip key={tag} selected={interests.includes(tag)} onPress={() => toggleInterest(tag)} accessibilityLabel={`Filter ${tagLabels[tag]}`}>
                  {tagLabels[tag]}
                </Chip>
              ))}
            </View>
            {!!error && <Text style={{ color: theme.colors.error }}>{error}</Text>}
            <Button icon="wallet-outline" loading={loading} onPress={runDiscovery}>Find destinations</Button>
          </Card.Content>
        </Card>

        {loading && (
          <Card style={styles.card}>
            <Card.Content style={styles.gap}>
              <Text>Loading estimated destinations...</Text>
              <ProgressBar indeterminate />
            </Card.Content>
          </Card>
        )}

        {!loading && submitted && suggestions.length === 0 && (
          <Card style={styles.card}>
            <Card.Content style={styles.gap}>
              <Text variant="titleMedium">No matches found</Text>
              <Text>Try increasing distance, budget, or removing one filter. Lower-cost alternatives appear when there is enough data.</Text>
            </Card.Content>
          </Card>
        )}

        {!loading && suggestions.map((suggestion) => (
          <SuggestionCard
            key={suggestion.destination.id}
            suggestion={suggestion}
            onSave={() => saveMutation.mutate(suggestion)}
            onCreateDraft={() => draftMutation.mutate(suggestion)}
            saving={saveMutation.isPending}
            creating={draftMutation.isPending}
          />
        ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function SuggestionCard({
  suggestion,
  onSave,
  onCreateDraft,
  saving,
  creating,
}: {
  suggestion: BudgetDestinationSuggestion;
  onSave: () => void;
  onCreateDraft: () => void;
  saving: boolean;
  creating: boolean;
}) {
  const theme = useTheme();
  const c = suggestion.costs;
  const warning = suggestion.affordabilityLabel === 'not_realistically_affordable';
  return (
    <Card style={[styles.card, warning && { borderColor: theme.colors.error, borderWidth: 1 }]}>
      <Card.Content style={styles.gap}>
        <View style={styles.headerRow}>
          <View style={styles.flex}>
            <Text variant="titleLarge">{suggestion.destination.name}</Text>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              {suggestion.destination.region}, {suggestion.destination.state} - {Math.round(suggestion.distanceKm)} km
            </Text>
          </View>
          <Chip>{suggestion.estimatedLabel}</Chip>
        </View>
        <Text style={{ color: warning ? theme.colors.error : theme.colors.primary }}>
          {warning ? 'Not realistically affordable for this budget' : suggestion.affordabilityLabel === 'tight' ? 'Tight but within budget' : 'Within budget'}
        </Text>
        <View style={styles.costGrid}>
          <Metric label="Transport" value={formatINR(c.transportMinor)} />
          <Metric label="Accommodation" value={formatINR(c.accommodationMinor)} />
          <Metric label="Food" value={formatINR(c.foodMinor)} />
          <Metric label="Local travel" value={formatINR(c.localTravelMinor)} />
          <Metric label="Activities" value={formatINR(c.activitiesMinor)} />
          <Metric label="Fees" value={formatINR(c.feesMinor)} />
          <Metric label="Emergency buffer" value={formatINR(c.emergencyBufferMinor)} />
          <Metric label="Expected total" value={formatINR(c.expectedTotalMinor)} strong />
          <Metric label="Budget remaining" value={formatINR(suggestion.budgetRemainingMinor)} />
          <Metric label="Confidence" value={suggestion.confidence} />
        </View>
        <Accordion type="single" collapsible>
          <AccordionItem value={`${suggestion.destination.id}-why`}>
            <AccordionHeader>
              <AccordionTrigger textStyle={styles.accordionTitle}>Why recommended?</AccordionTrigger>
            </AccordionHeader>
            <AccordionContent>
              {suggestion.reasons.map((reason) => <Text key={reason}>- {reason}</Text>)}
              {suggestion.lowerCostAlternatives.length > 0 && (
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  Lower-cost alternatives: {suggestion.lowerCostAlternatives.join(', ')}
                </Text>
              )}
              <Text style={{ color: theme.colors.onSurfaceVariant }}>{suggestion.destination.sourceNote}</Text>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <View style={styles.actions}>
          <Button mode="outlined" icon="bookmark-outline" loading={saving} onPress={onSave}>Save</Button>
          <Button icon="file-plus-outline" loading={creating} onPress={onCreateDraft}>Create trip draft</Button>
        </View>
      </Card.Content>
    </Card>
  );
}

function Metric({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const theme = useTheme();
  return (
    <View style={styles.metric}>
      <Text style={{ color: theme.colors.onSurfaceVariant }}>{label}</Text>
      <Text variant={strong ? 'titleMedium' : 'bodyLarge'}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
  },
  bannerTitle: {
    fontSize: 28,
    fontWeight: '900',
  },
  bannerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  card: {
    borderRadius: 8,
  },
  gap: {
    gap: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  input: {
    flexGrow: 1,
    minWidth: 220,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  flex: {
    flex: 1,
    minWidth: 220,
  },
  costGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metric: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d0d7de',
    borderRadius: 8,
    padding: 10,
    minWidth: 150,
    flexGrow: 1,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  accordionTitle: {
    fontSize: 13,
    textTransform: 'uppercase',
  },
});
