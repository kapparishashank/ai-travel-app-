import React, { useMemo, useState } from 'react';
import { Alert, Linking, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, Dialog, Portal, SegmentedButtons, Text, TextInput, useTheme } from 'react-native-paper';
import { Button } from '../../src/components/common/Button';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import {
  createSafeCheckin,
  deleteTrustedContact,
  fetchActiveSafetySession,
  fetchSafetyInfo,
  fetchTrustedContacts,
  reportIncorrectSafetyDetail,
  saveTrustedContact,
  startSafetySession,
  stopSafetySession,
} from '../../src/features/safety/api';
import { requestCurrentLocation, type SafetyLocationSnapshot } from '../../src/features/safety/location';
import { formatInterval, missedCheckinWarning } from '../../src/features/safety/schedule';
import { getLocationConsent, saveLocationConsent } from '../../src/features/safety/storage';
import type { EmergencyNumber, SafetyPlace, TrustedContact } from '../../src/features/safety/types';
import { fetchTrips } from '../../src/features/trips/api';
import { useAuthStore } from '../../src/store/authStore';

const officialEmergencyFallback: EmergencyNumber[] = [
  { label: 'India emergency', number: '112', source: 'Government emergency number', lastUpdated: '2026-07-04T00:00:00.000Z', dataLabel: '[VERIFIED]' },
  { label: 'Police', number: '100', source: 'Government emergency number', lastUpdated: '2026-07-04T00:00:00.000Z', dataLabel: '[VERIFIED]' },
  { label: 'Ambulance', number: '108', source: 'Government emergency number', lastUpdated: '2026-07-04T00:00:00.000Z', dataLabel: '[VERIFIED]' },
];

export default function SafetyModeScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const authUser = useAuthStore((state) => state.authUser);
  const user = useAuthStore((state) => state.user);
  const [contactDialog, setContactDialog] = useState<TrustedContact | null | undefined>(undefined);
  const [checkinMessage, setCheckinMessage] = useState('I am safe.');
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportText, setReportText] = useState('');
  const [locationSnapshot, setLocationSnapshot] = useState<SafetyLocationSnapshot>({ permission: 'unknown' });
  const [interval, setInterval] = useState('60');

  const tripsQuery = useQuery({
    queryKey: ['trips', authUser?.id],
    queryFn: () => fetchTrips(authUser?.id),
    enabled: !!authUser?.id,
  });
  const activeTrip = tripsQuery.data?.find((trip) => trip.status === 'active') ?? tripsQuery.data?.[0];
  const destination = activeTrip?.destination_name ?? user?.home_city ?? 'Goa';

  const safetyQuery = useQuery({
    queryKey: ['safety-info', destination],
    queryFn: () => fetchSafetyInfo(destination),
  });
  const contactsQuery = useQuery({
    queryKey: ['trusted-contacts', authUser?.id],
    queryFn: () => fetchTrustedContacts(authUser!.id),
    enabled: !!authUser?.id,
  });
  const sessionQuery = useQuery({
    queryKey: ['active-safety-session', authUser?.id],
    queryFn: () => fetchActiveSafetySession(authUser!.id),
    enabled: !!authUser?.id,
    refetchInterval: 60_000,
  });
  const consentQuery = useQuery({
    queryKey: ['safety-location-consent'],
    queryFn: getLocationConsent,
  });

  const safetyInfo = safetyQuery.data;
  const locationSharing = locationSnapshot.permission === 'granted' || Boolean(consentQuery.data);
  const activeSession = sessionQuery.data;
  const warning = activeSession ? missedCheckinWarning(activeSession, new Date().toISOString()) : null;
  const emergencyNumbers = safetyInfo?.emergencyNumbers.length ? safetyInfo.emergencyNumbers : officialEmergencyFallback;
  const refreshing = tripsQuery.isFetching || safetyQuery.isFetching || contactsQuery.isFetching || sessionQuery.isFetching;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['safety-info', destination] });
    queryClient.invalidateQueries({ queryKey: ['trusted-contacts', authUser?.id] });
    queryClient.invalidateQueries({ queryKey: ['active-safety-session', authUser?.id] });
  };

  const startMutation = useMutation({
    mutationFn: () => startSafetySession(authUser!.id, Number(interval), activeTrip?.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['active-safety-session', authUser?.id] }),
  });
  const stopMutation = useMutation({
    mutationFn: () => stopSafetySession(activeSession!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['active-safety-session', authUser?.id] }),
  });
  const checkinMutation = useMutation({
    mutationFn: () => createSafeCheckin(activeSession!, checkinMessage),
    onSuccess: () => {
      setCheckinMessage('I am safe.');
      queryClient.invalidateQueries({ queryKey: ['active-safety-session', authUser?.id] });
    },
  });
  const contactMutation = useMutation({
    mutationFn: (contact: Partial<TrustedContact>) => saveTrustedContact(authUser!.id, contact),
    onSuccess: () => {
      setContactDialog(undefined);
      queryClient.invalidateQueries({ queryKey: ['trusted-contacts', authUser?.id] });
    },
  });
  const deleteContactMutation = useMutation({
    mutationFn: deleteTrustedContact,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trusted-contacts', authUser?.id] }),
  });
  const reportMutation = useMutation({
    mutationFn: () => reportIncorrectSafetyDetail(authUser!.id, destination, reportText),
    onSuccess: () => {
      setReportDialogOpen(false);
      setReportText('');
      Alert.alert('Report sent', 'Thanks. We will review this safety detail.');
    },
  });

  const requestLocation = async () => {
    Alert.alert(
      'Share approximate location?',
      'Location helps show nearby emergency information and can be included in manual check-ins later. You can deny permission and still use emergency numbers, contacts, and offline safety information. TravelAI does not use location for advertising.',
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Allow',
          onPress: async () => {
            const snapshot = await requestCurrentLocation();
            setLocationSnapshot(snapshot);
            const granted = snapshot.permission === 'granted';
            await saveLocationConsent(granted);
            if (!granted) Alert.alert('Location unavailable', snapshot.error ?? 'You can still use basic safety information.');
          },
        },
      ]
    );
  };

  const stopLocationSharing = async () => {
    setLocationSnapshot({ permission: 'denied' });
    await saveLocationConsent(false);
    queryClient.invalidateQueries({ queryKey: ['safety-location-consent'] });
  };

  const callNumber = (number: string, label: string) => {
    Alert.alert('Call emergency number?', `This will open your device dialer for ${label}: ${number}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open dialer', onPress: () => Linking.openURL(`tel:${number}`) },
    ]);
  };

  const contactPerson = (contact: TrustedContact) => {
    Alert.alert('Contact trusted contact?', `Open the dialer for ${contact.name}? TravelAI will not send automatic alerts.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open dialer', onPress: () => Linking.openURL(`tel:${contact.phone}`) },
    ]);
  };

  const formattedLocation = useMemo(() => {
    if (!locationSnapshot.latitude || !locationSnapshot.longitude) return 'Not shared';
    return `${locationSnapshot.latitude.toFixed(3)}, ${locationSnapshot.longitude.toFixed(3)} approximate`;
  }, [locationSnapshot]);

  return (
    <ScreenContainer safeArea={false} keyboardAvoiding={false}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <Card style={styles.card}>
          <Card.Content style={styles.gap}>
            <Text variant="headlineSmall">Safety Mode</Text>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              Guidance only. TravelAI does not guarantee safety, dispatch emergency services, or contact trusted contacts automatically.
            </Text>
            <View style={[styles.notice, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surfaceVariant }]}>
              <Text variant="titleSmall">Visible disclaimer</Text>
              <Text>{safetyInfo?.disclaimer ?? 'Safety information is general guidance. Verify live conditions and contact local authorities in an emergency.'}</Text>
            </View>
            {warning && (
              <View style={[styles.warning, { borderColor: theme.colors.error }]}>
                <Text variant="titleSmall" style={{ color: theme.colors.error }}>Missed check-in warning</Text>
                <Text>{warning}</Text>
              </View>
            )}
            <View style={styles.row}>
              <Button icon="map-marker-radius-outline" onPress={requestLocation}>Location consent</Button>
              <Button mode="outlined" icon="map-marker-off-outline" disabled={!locationSharing} onPress={stopLocationSharing}>
                Stop sharing
              </Button>
              <Button mode="outlined" icon="flag-outline" onPress={() => setReportDialogOpen(true)}>Report detail</Button>
            </View>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              Location: {formattedLocation}. Precise coordinates are not stored in check-in history in this MVP.
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content style={styles.gap}>
            <Text variant="titleLarge">Manual check-ins</Text>
            {activeSession ? (
              <>
                <InfoLine label="Status" value={`Active, every ${formatInterval(activeSession.checkin_interval_minutes)}`} />
                <InfoLine label="Next due" value={activeSession.next_checkin_due_at ? new Date(activeSession.next_checkin_due_at).toLocaleString() : 'Not scheduled'} />
                <TextInput label="Check-in message" value={checkinMessage} onChangeText={setCheckinMessage} />
                <View style={styles.row}>
                  <Button icon="check-circle-outline" loading={checkinMutation.isPending} onPress={() => checkinMutation.mutate()}>
                    I am safe
                  </Button>
                  <Button
                    mode="outlined"
                    icon="stop-circle-outline"
                    loading={stopMutation.isPending}
                    onPress={() => Alert.alert('Stop Safety Mode?', 'This stops check-in reminders and location sharing consent immediately.', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Stop', onPress: () => { stopLocationSharing(); stopMutation.mutate(); } },
                    ])}
                  >
                    Stop
                  </Button>
                </View>
              </>
            ) : (
              <>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>Start a schedule for manual I am safe check-ins.</Text>
                <SegmentedButtons
                  value={interval}
                  onValueChange={setInterval}
                  buttons={[
                    { value: '30', label: '30 min' },
                    { value: '60', label: '1 hr' },
                    { value: '120', label: '2 hr' },
                  ]}
                />
                <Button icon="shield-check-outline" loading={startMutation.isPending} onPress={() => startMutation.mutate()}>
                  Start check-ins
                </Button>
              </>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content style={styles.gap}>
            <View style={styles.headerRow}>
              <Text variant="titleLarge">Trusted contacts</Text>
              <Button icon="plus" onPress={() => setContactDialog(null)}>Add</Button>
            </View>
            {(contactsQuery.data ?? []).length === 0 ? (
              <Text>No trusted contacts yet. Add someone before relying on Safety Mode during a trip.</Text>
            ) : (
              contactsQuery.data?.map((contact) => (
                <View key={contact.id} style={styles.listItem}>
                  <View style={styles.flex}>
                    <Text variant="titleSmall">{contact.name}{contact.is_primary ? ' - Primary' : ''}</Text>
                    <Text style={{ color: theme.colors.onSurfaceVariant }}>{contact.relationship || 'Trusted contact'} - {contact.phone}</Text>
                  </View>
                  <View style={styles.row}>
                    <Button mode="text" icon="phone-outline" onPress={() => contactPerson(contact)}>Call</Button>
                    <Button mode="text" icon="pencil-outline" onPress={() => setContactDialog(contact)}>Edit</Button>
                    <Button
                      mode="text"
                      icon="delete-outline"
                      onPress={() => Alert.alert('Delete contact?', `Remove ${contact.name} from trusted contacts?`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => deleteContactMutation.mutate(contact.id) },
                      ])}
                    >
                      Delete
                    </Button>
                  </View>
                </View>
              ))
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content style={styles.gap}>
            <Text variant="titleLarge">Emergency numbers</Text>
            {emergencyNumbers.map((item) => (
              <EmergencyRow key={`${item.label}-${item.number}`} item={item} onCall={() => callNumber(item.number, item.label)} />
            ))}
          </Card.Content>
        </Card>

        <ServiceSection title="Nearby hospitals" places={safetyInfo?.nearbyHospitals ?? []} onCall={callNumber} />
        <ServiceSection title="Nearby police stations" places={safetyInfo?.nearbyPoliceStations ?? []} onCall={callNumber} />

        <Card style={styles.card}>
          <Card.Content style={styles.gap}>
            <Text variant="titleLarge">Weather warning</Text>
            <Text variant="titleSmall">{safetyInfo?.weatherWarning?.title ?? 'Weather unavailable'}</Text>
            <Text>{safetyInfo?.weatherWarning?.detail ?? 'Check a live forecast before outdoor plans.'}</Text>
            <SourceText source={safetyInfo?.weatherWarning?.source ?? 'Unavailable'} lastUpdated={safetyInfo?.weatherWarning?.lastUpdated ?? new Date().toISOString()} label={safetyInfo?.weatherWarning?.dataLabel ?? '[MOCK DATA]'} />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content style={styles.gap}>
            <Text variant="titleLarge">Offline emergency information</Text>
            <Text>
              Emergency guidance for {destination} is cached after loading. If the network fails, TravelAI shows cached information labelled as cached or mock.
            </Text>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>{safetyInfo?.sourceNote ?? 'Source unavailable. Verify with official channels.'}</Text>
            <Text variant="titleSmall">General guidance</Text>
            {(safetyInfo?.safetyNotes ?? ['Keep official emergency numbers saved.', 'Verify route and weather conditions before travel.']).map((note) => (
              <Text key={note}>- {note}</Text>
            ))}
          </Card.Content>
        </Card>
      </ScrollView>

      <ContactDialog
        key={contactDialog?.id ?? (contactDialog === null ? 'new-contact' : 'closed-contact')}
        visible={contactDialog !== undefined}
        contact={contactDialog ?? undefined}
        loading={contactMutation.isPending}
        onDismiss={() => setContactDialog(undefined)}
        onSave={(contact) => contactMutation.mutate(contact)}
      />

      <Portal>
        <Dialog visible={reportDialogOpen} onDismiss={() => setReportDialogOpen(false)}>
          <Dialog.Title>Report incorrect safety detail</Dialog.Title>
          <Dialog.Content style={styles.gap}>
            <TextInput label="What should we fix?" value={reportText} onChangeText={setReportText} multiline />
          </Dialog.Content>
          <Dialog.Actions>
            <Button mode="text" onPress={() => setReportDialogOpen(false)}>Cancel</Button>
            <Button disabled={reportText.trim().length < 5} loading={reportMutation.isPending} onPress={() => reportMutation.mutate()}>Send</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScreenContainer>
  );
}

function EmergencyRow({ item, onCall }: { item: EmergencyNumber; onCall: () => void }) {
  return (
    <View style={styles.listItem}>
      <View style={styles.flex}>
        <Text variant="titleSmall">{item.label}</Text>
        <Text>{item.number}</Text>
        <SourceText source={item.source} lastUpdated={item.lastUpdated} label={item.dataLabel} />
      </View>
      <Button icon="phone-outline" onPress={onCall}>Call</Button>
    </View>
  );
}

function ServiceSection({ title, places, onCall }: { title: string; places: SafetyPlace[]; onCall: (number: string, label: string) => void }) {
  return (
    <Card style={styles.card}>
      <Card.Content style={styles.gap}>
        <Text variant="titleLarge">{title}</Text>
        {places.length === 0 ? (
          <Text>No nearby service data loaded. Use official emergency numbers and verify locally.</Text>
        ) : places.map((place) => (
          <View key={place.name} style={styles.listItem}>
            <View style={styles.flex}>
              <Text variant="titleSmall">{place.name}</Text>
              <Text>{place.distanceKm ? `${place.distanceKm} km - ` : ''}{place.note}</Text>
              <SourceText source={place.source} lastUpdated={place.lastUpdated} label={place.dataLabel} />
            </View>
            <Button mode="outlined" icon="phone-outline" onPress={() => onCall(place.phone, place.name)}>Call</Button>
          </View>
        ))}
      </Card.Content>
    </Card>
  );
}

function SourceText({ source, lastUpdated, label }: { source: string; lastUpdated: string; label: string }) {
  const theme = useTheme();
  return (
    <Text style={{ color: theme.colors.onSurfaceVariant }}>
      {label} - Source: {source} - Updated: {new Date(lastUpdated).toLocaleString()}
    </Text>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoLine}>
      <Text>{label}</Text>
      <Text>{value}</Text>
    </View>
  );
}

function ContactDialog({
  visible,
  contact,
  loading,
  onDismiss,
  onSave,
}: {
  visible: boolean;
  contact?: TrustedContact;
  loading: boolean;
  onDismiss: () => void;
  onSave: (contact: Partial<TrustedContact>) => void;
}) {
  const [name, setName] = useState(contact?.name ?? '');
  const [phone, setPhone] = useState(contact?.phone ?? '');
  const [relationship, setRelationship] = useState(contact?.relationship ?? '');
  const [isPrimary, setIsPrimary] = useState(contact?.is_primary ? 'yes' : 'no');

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>{contact ? 'Edit trusted contact' : 'Add trusted contact'}</Dialog.Title>
        <Dialog.Content style={styles.gap}>
          <TextInput label="Name" value={name} onChangeText={setName} />
          <TextInput label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <TextInput label="Relationship" value={relationship} onChangeText={setRelationship} />
          <SegmentedButtons
            value={isPrimary}
            onValueChange={setIsPrimary}
            buttons={[
              { value: 'yes', label: 'Primary' },
              { value: 'no', label: 'Backup' },
            ]}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button mode="text" onPress={onDismiss}>Cancel</Button>
          <Button
            loading={loading}
            disabled={name.trim().length < 2 || phone.trim().length < 3}
            onPress={() => onSave({ ...contact, name, phone, relationship, is_primary: isPrimary === 'yes' })}
          >
            Save
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
    maxWidth: 1180,
    width: '100%',
    alignSelf: 'center',
    gap: 16,
  },
  card: {
    borderRadius: 8,
  },
  gap: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
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
  notice: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    padding: 12,
    gap: 6,
  },
  warning: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    gap: 6,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#d0d7de',
    flexWrap: 'wrap',
  },
  infoLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
});
