import React, { useMemo, useState } from 'react';
import { Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Dialog, Portal, Snackbar, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '../../src/components/common/Button';
import { Card } from '../../src/components/common/Card';
import { EmptyState } from '../../src/components/common/EmptyState';
import { ErrorState } from '../../src/components/common/ErrorState';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { TextInput } from '../../src/components/common/TextInput';
import { saveTicketResultToTrip } from '../../src/features/ticketFinder/api';
import { getProviderById, searchMockProviders } from '../../src/features/ticketFinder/providers';
import type { RefundabilityFilter, TicketFilters, TicketMode, TicketResult, TicketSearchInput, TicketSort } from '../../src/features/ticketFinder/types';
import { filterTicketResults, priceStatusLabel, sortTicketResults } from '../../src/features/ticketFinder/utils';
import { fetchTrips } from '../../src/features/trips/api';
import { useAuthStore } from '../../src/store/authStore';
import { formatINR } from '../../src/utils/currency';
import { isSafeExternalUrl } from '../../src/utils/externalLinks';

const modeOptions: Array<TicketMode | 'all'> = ['all', 'flight', 'train', 'bus'];
const sortOptions: TicketSort[] = ['recommended', 'price', 'departure', 'arrival', 'duration'];
const refundOptions: RefundabilityFilter[] = ['all', 'refundable', 'non_refundable'];
const timeWindows: TicketFilters['departureWindow'][] = ['any', 'morning', 'afternoon', 'evening', 'night'];

export default function TicketFinderScreen() {
  const theme = useTheme();
  const authUser = useAuthStore((state) => state.authUser);
  const [search, setSearch] = useState<TicketSearchInput>({
    origin: 'Hyderabad',
    destination: 'Goa',
    departDate: '2026-08-14',
    passengers: 4,
    modes: ['flight', 'train', 'bus'],
    seatClass: '',
  });
  const [filters, setFilters] = useState<TicketFilters>({
    modes: ['all'],
    maxPriceMinor: 50_000_00,
    departureWindow: 'any',
    arrivalWindow: 'any',
    maxDurationMinutes: 1200,
    maxStops: 10,
    refundability: 'all',
    seatClass: '',
    operator: '',
  });
  const [sort, setSort] = useState<TicketSort>('recommended');
  const [results, setResults] = useState<TicketResult[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TicketResult | null>(null);
  const [bookingTicket, setBookingTicket] = useState<TicketResult | null>(null);
  const [message, setMessage] = useState('');

  const tripsQuery = useQuery({
    queryKey: ['trips', authUser?.id],
    queryFn: () => fetchTrips(authUser?.id),
    enabled: Boolean(authUser?.id),
  });

  const selectedTrip = useMemo(() => {
    const trips = tripsQuery.data ?? [];
    return trips.find((trip) => trip.destination_name.toLowerCase().includes(search.destination.toLowerCase())) ?? trips[0] ?? null;
  }, [search.destination, tripsQuery.data]);

  const visibleResults = useMemo(() => sortTicketResults(filterTicketResults(results, filters), sort), [filters, results, sort]);

  const searchMutation = useMutation({
    mutationFn: () => searchMockProviders(search),
    onSuccess: ({ results: nextResults, failures }) => {
      setResults(nextResults);
      setMessage(failures ? `${nextResults.length} results loaded. ${failures} provider failed.` : `${nextResults.length} mock results loaded.`);
    },
    onError: (error: any) => setMessage(error.message ?? 'Ticket providers failed. Try again.'),
  });

  const saveMutation = useMutation({
    mutationFn: (ticket: TicketResult) => {
      if (!authUser?.id) throw new Error('Sign in to save ticket results.');
      if (!selectedTrip) throw new Error('Create or open a trip before saving a ticket result.');
      return saveTicketResultToTrip({ tripId: selectedTrip.id, userId: authUser.id, search, result: ticket });
    },
    onSuccess: () => setMessage('Ticket result saved to your trip. Revalidate before checkout.'),
    onError: (error: any) => setMessage(error.message ?? 'Could not save ticket result.'),
  });

  const confirmPartnerRedirect = async () => {
    if (!bookingTicket) return;
    const provider = getProviderById(bookingTicket.providerId);
    try {
      const validation = await provider?.validateLatestPrice(bookingTicket.id);
      if (validation) {
        setMessage(validation.message);
      }
      if (!isSafeExternalUrl(bookingTicket.partnerBookingUrl)) {
        setMessage('Unsafe partner URL blocked.');
        return;
      }
      await Linking.openURL(bookingTicket.partnerBookingUrl);
    } catch {
      setMessage('Could not validate mock ticket before redirect. Try again.');
    } finally {
      setBookingTicket(null);
    }
  };

  return (
    <ScreenContainer safeArea={false} keyboardAvoiding={false}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={tripsQuery.isRefetching} onRefresh={() => tripsQuery.refetch()} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: theme.colors.onBackground }]}>Smart Ticket Finder</Text>
            <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              Mock provider architecture for flights, trains, and buses. No live inventory or payment-card data.
            </Text>
          </View>
        </View>

        <Card style={styles.panel}>
          <Text style={[styles.panelTitle, { color: theme.colors.onSurface }]}>Search</Text>
          <View style={styles.formGrid}>
            <TextInput label="Origin" value={search.origin} onChangeText={(origin) => setSearch((current) => ({ ...current, origin }))} />
            <TextInput label="Destination" value={search.destination} onChangeText={(destination) => setSearch((current) => ({ ...current, destination }))} />
            <TextInput label="Departure date" value={search.departDate} onChangeText={(departDate) => setSearch((current) => ({ ...current, departDate }))} />
            <TextInput
              label="Passengers"
              value={String(search.passengers)}
              onChangeText={(passengers) => setSearch((current) => ({ ...current, passengers: Math.max(1, Number(passengers.replace(/[^\d]/g, '') || 1)) }))}
              keyboardType="number-pad"
            />
            <TextInput label="Seat or cabin class" value={search.seatClass ?? ''} onChangeText={(seatClass) => setSearch((current) => ({ ...current, seatClass }))} />
          </View>
          <ModeSelector selected={search.modes} onChange={(modes) => setSearch((current) => ({ ...current, modes }))} />
          <Button icon="magnify" onPress={() => searchMutation.mutate()} loading={searchMutation.isPending}>
            Search tickets
          </Button>
          <Text style={[styles.notice, { color: theme.colors.onSurfaceVariant }]}>
            Prices are marked live, cached, estimated, or mock. This first version returns only mock and estimated data.
          </Text>
        </Card>

        <Card style={styles.panel}>
          <Text style={[styles.panelTitle, { color: theme.colors.onSurface }]}>Filters and sorting</Text>
          <ChipRow>
            {modeOptions.map((mode) => (
              <Button key={mode} mode={filters.modes.includes(mode) ? 'contained' : 'outlined'} onPress={() => setFilters((current) => ({ ...current, modes: [mode] }))}>
                {label(mode)}
              </Button>
            ))}
          </ChipRow>
          <View style={styles.formGrid}>
            <TextInput label="Max price" value={String(filters.maxPriceMinor / 100)} onChangeText={(value) => setFilters((current) => ({ ...current, maxPriceMinor: Math.max(0, Number(value.replace(/[^\d]/g, '') || 0) * 100) }))} keyboardType="number-pad" />
            <TextInput label="Max duration minutes" value={String(filters.maxDurationMinutes)} onChangeText={(value) => setFilters((current) => ({ ...current, maxDurationMinutes: Math.max(1, Number(value.replace(/[^\d]/g, '') || 1)) }))} keyboardType="number-pad" />
            <TextInput label="Max stops" value={String(filters.maxStops)} onChangeText={(value) => setFilters((current) => ({ ...current, maxStops: Math.max(0, Number(value.replace(/[^\d]/g, '') || 0)) }))} keyboardType="number-pad" />
            <TextInput label="Operator" value={filters.operator} onChangeText={(operator) => setFilters((current) => ({ ...current, operator }))} />
            <TextInput label="Class filter" value={filters.seatClass} onChangeText={(seatClass) => setFilters((current) => ({ ...current, seatClass }))} />
          </View>
          <ControlGroup title="Departure">
            {timeWindows.map((window) => (
              <Button key={window} mode={filters.departureWindow === window ? 'contained' : 'outlined'} onPress={() => setFilters((current) => ({ ...current, departureWindow: window }))}>{label(window)}</Button>
            ))}
          </ControlGroup>
          <ControlGroup title="Arrival">
            {timeWindows.map((window) => (
              <Button key={window} mode={filters.arrivalWindow === window ? 'contained' : 'outlined'} onPress={() => setFilters((current) => ({ ...current, arrivalWindow: window }))}>{label(window)}</Button>
            ))}
          </ControlGroup>
          <ControlGroup title="Refundability">
            {refundOptions.map((option) => (
              <Button key={option} mode={filters.refundability === option ? 'contained' : 'outlined'} onPress={() => setFilters((current) => ({ ...current, refundability: option }))}>{label(option)}</Button>
            ))}
          </ControlGroup>
          <ControlGroup title="Sort">
            {(['recommended', 'price', 'departure', 'arrival', 'duration'] as TicketSort[]).map((option) => (
              <Button key={option} mode={sort === option ? 'contained' : 'outlined'} onPress={() => setSort(option)}>{label(option)}</Button>
            ))}
          </ControlGroup>
        </Card>

        {tripsQuery.isError && <ErrorState message="Trips could not be loaded. You can still search mock tickets." onRetry={() => tripsQuery.refetch()} />}

        {visibleResults.length === 0 ? (
          <EmptyState title="No ticket results" description="Run a search or loosen filters. Provider failures will not crash this screen." icon="ticket-confirmation-outline" actionLabel="Search tickets" onAction={() => searchMutation.mutate()} />
        ) : (
          <View style={styles.results}>
            {visibleResults.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                canSave={Boolean(authUser?.id && selectedTrip)}
                saving={saveMutation.isPending}
                onDetails={() => setSelectedTicket(ticket)}
                onSave={() => saveMutation.mutate(ticket)}
                onBook={() => setBookingTicket(ticket)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <TicketDetailsDialog ticket={selectedTicket} onDismiss={() => setSelectedTicket(null)} />
      <PartnerRedirectDialog ticket={bookingTicket} onCancel={() => setBookingTicket(null)} onConfirm={confirmPartnerRedirect} />
      <Snackbar visible={!!message} onDismiss={() => setMessage('')} duration={4500}>{message}</Snackbar>
    </ScreenContainer>
  );
}

function TicketCard({ ticket, canSave, saving, onDetails, onSave, onBook }: { ticket: TicketResult; canSave: boolean; saving: boolean; onDetails: () => void; onSave: () => void; onBook: () => void }) {
  const theme = useTheme();
  return (
    <Card style={styles.ticketCard}>
      <View style={styles.ticketHeader}>
        <View style={styles.modeTitle}>
          <MaterialCommunityIcons name={modeIcon(ticket.mode) as any} size={24} color={theme.colors.primary} />
          <View>
            <Text style={[styles.ticketTitle, { color: theme.colors.onSurface }]}>{ticket.operator}</Text>
            <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>{label(ticket.mode)} - {ticket.serviceCode} - {ticket.seatClass}</Text>
          </View>
        </View>
        <Text style={[styles.price, { color: theme.colors.primary }]}>{formatINR(ticket.fare.totalMinor)}</Text>
      </View>
      <View style={styles.metricGrid}>
        <Metric label="Departure" value={formatDateTime(ticket.departureAt)} />
        <Metric label="Arrival" value={formatDateTime(ticket.arrivalAt)} />
        <Metric label="Duration" value={formatDuration(ticket.durationMinutes)} />
        <Metric label="Stops" value={String(ticket.stops)} />
        <Metric label="Availability" value={`${label(ticket.availabilityStatus)}${ticket.availableSeats === null ? '' : ` (${ticket.availableSeats})`}`} />
        <Metric label="Price status" value={priceStatusLabel(ticket.priceStatus)} />
      </View>
      <Text style={[styles.notice, { color: theme.colors.onSurfaceVariant }]}>
        Last checked {new Date(ticket.lastCheckedAt).toLocaleString()} - {ticket.dataFreshness.message}
      </Text>
      <View style={styles.tagRow}>
        {ticket.tags.map((tag) => <Text key={tag} style={[styles.tag, { color: theme.colors.primary, borderColor: theme.colors.outlineVariant }]}>{tag}</Text>)}
      </View>
      <View style={styles.actions}>
        <Button mode="outlined" icon="information-outline" onPress={onDetails}>Details</Button>
        <Button mode="outlined" icon="content-save-outline" disabled={!canSave} loading={saving} onPress={onSave}>Save</Button>
        <Button icon="open-in-new" onPress={onBook}>Partner site</Button>
      </View>
    </Card>
  );
}

function TicketDetailsDialog({ ticket, onDismiss }: { ticket: TicketResult | null; onDismiss: () => void }) {
  const theme = useTheme();
  return (
    <Portal>
      <Dialog visible={!!ticket} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title>Ticket details</Dialog.Title>
        {ticket && (
          <Dialog.ScrollArea>
            <ScrollView contentContainerStyle={styles.dialogContent}>
              <Text style={[styles.ticketTitle, { color: theme.colors.onSurface }]}>{ticket.operator}</Text>
              <Metric label="Route" value={`${ticket.origin} to ${ticket.destination}`} />
              <Metric label="Class" value={ticket.seatClass} />
              <Metric label="Availability" value={label(ticket.availabilityStatus)} />
              <Text style={[styles.panelTitle, { color: theme.colors.onSurface }]}>Fare breakdown</Text>
              <FareLine label="Base fare" value={ticket.fare.baseFareMinor} />
              <FareLine label="Taxes" value={ticket.fare.taxesMinor} />
              <FareLine label="Convenience fee" value={ticket.fare.convenienceFeeMinor} />
              <FareLine label="Baggage" value={ticket.fare.baggageCostMinor} />
              <FareLine label="Total" value={ticket.fare.totalMinor} strong />
              <Text style={[styles.panelTitle, { color: theme.colors.onSurface }]}>Refund information</Text>
              <Text style={[styles.notice, { color: theme.colors.onSurfaceVariant }]}>{ticket.cancellationInfo.summary}</Text>
              <Text style={[styles.notice, { color: theme.colors.onSurfaceVariant }]}>
                Revalidate through {ticket.providerId} before any future checkout. No payment-card data is stored.
              </Text>
            </ScrollView>
          </Dialog.ScrollArea>
        )}
        <Dialog.Actions><Button mode="text" onPress={onDismiss}>Close</Button></Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

function PartnerRedirectDialog({ ticket, onCancel, onConfirm }: { ticket: TicketResult | null; onCancel: () => void; onConfirm: () => void }) {
  return (
    <Portal>
      <Dialog visible={!!ticket} onDismiss={onCancel} style={styles.dialog}>
        <Dialog.Title>Open partner site?</Dialog.Title>
        <Dialog.Content>
          <Text>This will open {ticket?.partnerBookingUrl}. Revalidate price and availability before checkout. Do not enter payment details unless you trust the partner site.</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button mode="text" onPress={onCancel}>Cancel</Button>
          <Button icon="open-in-new" onPress={onConfirm}>Open</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

function ModeSelector({ selected, onChange }: { selected: TicketMode[]; onChange: (modes: TicketMode[]) => void }) {
  const modes: TicketMode[] = ['flight', 'train', 'bus'];
  const toggle = (mode: TicketMode) => {
    const next = selected.includes(mode) ? selected.filter((item) => item !== mode) : [...selected, mode];
    onChange(next.length ? next : [mode]);
  };
  return <ChipRow>{modes.map((mode) => <Button key={mode} mode={selected.includes(mode) ? 'contained' : 'outlined'} onPress={() => toggle(mode)}>{label(mode)}</Button>)}</ChipRow>;
}

function ControlGroup({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return <View style={styles.controlGroup}><Text style={[styles.controlTitle, { color: theme.colors.onSurface }]}>{title}</Text><ChipRow>{children}</ChipRow></View>;
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>{children}</ScrollView>;
}

function Metric({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return <View style={styles.metric}><Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text><Text style={[styles.metricValue, { color: theme.colors.onSurface }]}>{value}</Text></View>;
}

function FareLine({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  const theme = useTheme();
  return <View style={styles.fareLine}><Text style={{ color: theme.colors.onSurfaceVariant }}>{label}</Text><Text style={[strong ? styles.strong : styles.fareValue, { color: theme.colors.onSurface }]}>{formatINR(value)}</Text></View>;
}

function label(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDuration(minutes: number) {
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function modeIcon(mode: TicketMode) {
  return { flight: 'airplane', train: 'train', bus: 'bus' }[mode];
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 32, maxWidth: 1180, width: '100%', alignSelf: 'center' },
  header: { marginTop: 8, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '900' },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: 4 },
  panel: { padding: 16 },
  panelTitle: { fontSize: 17, fontWeight: '900', marginTop: 4 },
  formGrid: { gap: 4 },
  notice: { fontSize: 13, lineHeight: 19, marginTop: 8 },
  chipRow: { gap: 8, paddingVertical: 8 },
  controlGroup: { marginTop: 8 },
  controlTitle: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  results: { gap: 8 },
  ticketCard: { padding: 16 },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  modeTitle: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  ticketTitle: { fontSize: 18, fontWeight: '900' },
  price: { fontSize: 20, fontWeight: '900' },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  metric: { minWidth: 145, flex: 1 },
  metricLabel: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  metricValue: { fontSize: 14, fontWeight: '800', marginTop: 2 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tag: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, fontSize: 12, fontWeight: '800' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, marginTop: 10 },
  dialog: { borderRadius: 8 },
  dialogContent: { paddingHorizontal: 16, paddingBottom: 8 },
  fareLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  fareValue: { fontWeight: '800' },
  strong: { fontWeight: '900', fontSize: 16 },
});
