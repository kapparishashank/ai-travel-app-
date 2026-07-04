import React, { useMemo, useState } from 'react';
import { Alert, Linking, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, Dialog, Portal, SegmentedButtons, Text, TextInput, useTheme } from 'react-native-paper';
import { Button } from '../../src/components/common/Button';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import {
  createPriceAlert,
  deletePriceAlert,
  fetchJourneyOptionsForAlerts,
  fetchPriceAlerts,
  fetchPriceHistory,
  runPriceAlertCheck,
  simulatePriceDrop,
  updatePriceAlertStatus,
} from '../../src/features/priceAlerts/api';
import { calculatePercentageChange } from '../../src/features/priceAlerts/logic';
import type { JourneyOptionForAlert, PriceAlertRow, PriceHistoryRow } from '../../src/features/priceAlerts/types';
import { useAuthStore } from '../../src/store/authStore';
import { formatINR, rupeesToPaise } from '../../src/utils/currency';

export default function PriceAlertsScreen() {
  const queryClient = useQueryClient();
  const authUser = useAuthStore((state) => state.authUser);
  const [createDialog, setCreateDialog] = useState(false);
  const [historyAlert, setHistoryAlert] = useState<PriceAlertRow | null>(null);

  const alertsQuery = useQuery({
    queryKey: ['price-alerts'],
    queryFn: fetchPriceAlerts,
    enabled: !!authUser?.id,
  });
  const optionsQuery = useQuery({
    queryKey: ['journey-options-for-alerts'],
    queryFn: fetchJourneyOptionsForAlerts,
    enabled: !!authUser?.id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['price-alerts'] });
    if (historyAlert) queryClient.invalidateQueries({ queryKey: ['price-history', historyAlert.id] });
  };

  const statusMutation = useMutation({
    mutationFn: ({ alertId, status }: { alertId: string; status: 'active' | 'paused' | 'cancelled' }) => updatePriceAlertStatus(alertId, status),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: deletePriceAlert,
    onSuccess: invalidate,
  });
  const simulateMutation = useMutation({
    mutationFn: (alertId: string) => simulatePriceDrop(alertId, 20),
    onSuccess: invalidate,
    onError: (err: any) => Alert.alert('Simulation failed', err.message ?? 'Could not simulate price drop.'),
  });
  const checkMutation = useMutation({
    mutationFn: (alertId: string) => runPriceAlertCheck(alertId),
    onSuccess: invalidate,
  });

  return (
    <ScreenContainer safeArea={false} keyboardAvoiding={false}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={alertsQuery.isFetching} onRefresh={() => alertsQuery.refetch()} />}
      >
        <Card style={styles.card}>
          <Card.Content style={styles.gap}>
            <View style={styles.headerRow}>
              <View style={styles.flex}>
                <Text variant="headlineSmall">Price Drop Alerts</Text>
                <Text>Mock-provider alerts for saved journey options. Prices may change before booking and future prices are not guaranteed.</Text>
              </View>
              <Button icon="plus" onPress={() => setCreateDialog(true)}>Create alert</Button>
            </View>
          </Card.Content>
        </Card>

        {alertsQuery.isLoading && <StateCard title="Loading alerts" body="Checking your saved price watches..." />}
        {alertsQuery.isError && <StateCard title="Could not load alerts" body={(alertsQuery.error as Error).message} />}
        {!alertsQuery.isLoading && !alertsQuery.data?.length && (
          <StateCard title="No price alerts yet" body="Save a Smart Journey or ticket option first, then create a target-price alert here." />
        )}

        {alertsQuery.data?.map((alert) => (
          <AlertCard
            key={alert.id}
            alert={alert}
            onPause={() => statusMutation.mutate({ alertId: alert.id, status: 'paused' })}
            onResume={() => statusMutation.mutate({ alertId: alert.id, status: 'active' })}
            onDelete={() => Alert.alert('Delete alert?', 'This removes the alert and its price history.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(alert.id) },
            ])}
            onHistory={() => setHistoryAlert(alert)}
            onOpenLatest={() => {
              if (alert.latest_result_url) Linking.openURL(alert.latest_result_url);
              else Alert.alert('No booking link', 'The latest mock result does not include a partner URL.');
            }}
            onCheck={() => checkMutation.mutate(alert.id)}
            onSimulate={() => simulateMutation.mutate(alert.id)}
          />
        ))}
      </ScrollView>

      <CreateAlertDialog
        visible={createDialog}
        options={optionsQuery.data ?? []}
        loadingOptions={optionsQuery.isLoading}
        onDismiss={() => setCreateDialog(false)}
        onCreated={() => {
          setCreateDialog(false);
          invalidate();
        }}
      />
      <HistoryDialog alert={historyAlert} onDismiss={() => setHistoryAlert(null)} />
    </ScreenContainer>
  );
}

function AlertCard({
  alert,
  onPause,
  onResume,
  onDelete,
  onHistory,
  onOpenLatest,
  onCheck,
  onSimulate,
}: {
  alert: PriceAlertRow;
  onPause: () => void;
  onResume: () => void;
  onDelete: () => void;
  onHistory: () => void;
  onOpenLatest: () => void;
  onCheck: () => void;
  onSimulate: () => void;
}) {
  const theme = useTheme();
  const previous = alert.last_notification_price_minor ?? null;
  const change = calculatePercentageChange(previous, alert.last_seen_price_minor ?? 0);
  return (
    <Card style={styles.card}>
      <Card.Content style={styles.gap}>
        <View style={styles.headerRow}>
          <View style={styles.flex}>
            <Text variant="titleLarge">{alert.origin_name} to {alert.destination_name}</Text>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              {alert.mode} - {alert.depart_on} - {alert.alert_label || '[MOCK DATA]'}
            </Text>
          </View>
          <Text style={{ color: alert.status === 'active' ? theme.colors.primary : theme.colors.onSurfaceVariant }}>{alert.status}</Text>
        </View>
        <View style={styles.metricGrid}>
          <Metric label="Current" value={alert.last_seen_price_minor != null ? formatINR(alert.last_seen_price_minor) : 'Not checked'} />
          <Metric label="Previous notified" value={previous != null ? formatINR(previous) : 'None'} />
          <Metric label="Target" value={formatINR(alert.target_price_minor)} />
          <Metric label="Change" value={`${change.toFixed(1)}%`} />
          <Metric label="Drop condition" value={`${Number(alert.percentage_drop_threshold).toFixed(0)}%`} />
          <Metric label="Last checked" value={alert.last_checked_at ? new Date(alert.last_checked_at).toLocaleString() : 'Never'} />
        </View>
        {!!alert.last_worker_error && <Text style={{ color: theme.colors.error }}>Worker error: {alert.last_worker_error}</Text>}
        <Text style={{ color: theme.colors.onSurfaceVariant }}>
          Prices are mock or estimated during development and may change before booking. TravelAI does not guarantee future prices.
        </Text>
        <View style={styles.actions}>
          {alert.status === 'active' ? <Button mode="outlined" icon="pause" onPress={onPause}>Pause</Button> : <Button mode="outlined" icon="play" onPress={onResume}>Resume</Button>}
          <Button mode="outlined" icon="history" onPress={onHistory}>History</Button>
          <Button mode="outlined" icon="refresh" onPress={onCheck}>Check now</Button>
          <Button mode="outlined" icon="trending-down" onPress={onSimulate}>Simulate drop</Button>
          <Button mode="outlined" icon="open-in-new" onPress={onOpenLatest}>Latest result</Button>
          <Button mode="text" icon="delete-outline" onPress={onDelete}>Delete</Button>
        </View>
      </Card.Content>
    </Card>
  );
}

function CreateAlertDialog({
  visible,
  options,
  loadingOptions,
  onDismiss,
  onCreated,
}: {
  visible: boolean;
  options: JourneyOptionForAlert[];
  loadingOptions: boolean;
  onDismiss: () => void;
  onCreated: () => void;
}) {
  const authUser = useAuthStore((state) => state.authUser);
  const [optionId, setOptionId] = useState('');
  const [targetPrice, setTargetPrice] = useState('16000');
  const [percentageDrop, setPercentageDrop] = useState('10');
  const selected = options.find((option) => option.id === optionId) ?? options[0];
  const mutation = useMutation({
    mutationFn: () => {
      if (!authUser?.id || !selected) throw new Error('Select a journey option first.');
      return createPriceAlert({
        userId: authUser.id,
        option: selected,
        targetPriceMinor: rupeesToPaise(Number(targetPrice)),
        percentageDropThreshold: Number(percentageDrop),
      });
    },
    onSuccess: onCreated,
    onError: (err: any) => Alert.alert('Could not create alert', err.message ?? 'Please try again.'),
  });

  React.useEffect(() => {
    if (visible && options[0] && !optionId) setOptionId(options[0].id);
  }, [visible, options, optionId]);

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>Create price alert</Dialog.Title>
        <Dialog.ScrollArea>
          <ScrollView contentContainerStyle={styles.dialogContent}>
            {loadingOptions ? <Text>Loading journey options...</Text> : null}
            {!loadingOptions && options.length === 0 ? <Text>No saved journey options found. Save one from Smart Journey or Ticket Finder first.</Text> : null}
            {!!options.length && (
              <>
                <Text variant="titleSmall">Journey option</Text>
                <SegmentedButtons
                  value={selected?.id ?? ''}
                  onValueChange={setOptionId}
                  buttons={options.slice(0, 4).map((option) => ({
                    value: option.id,
                    label: `${option.mode} ${formatINR(option.total_price_minor)}`,
                  }))}
                />
                <TextInput label="Target price (INR)" value={targetPrice} onChangeText={setTargetPrice} keyboardType="decimal-pad" />
                <TextInput label="Percentage drop condition" value={percentageDrop} onChangeText={setPercentageDrop} keyboardType="decimal-pad" />
                <Text>Alert data is labelled [MOCK DATA] until a supported live provider is configured.</Text>
              </>
            )}
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button mode="text" onPress={onDismiss}>Cancel</Button>
          <Button disabled={!selected || Number(targetPrice) <= 0 || Number(percentageDrop) <= 0} loading={mutation.isPending} onPress={() => mutation.mutate()}>Create</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

function HistoryDialog({ alert, onDismiss }: { alert: PriceAlertRow | null; onDismiss: () => void }) {
  const historyQuery = useQuery({
    queryKey: ['price-history', alert?.id],
    queryFn: () => fetchPriceHistory(alert!.id),
    enabled: !!alert?.id,
  });
  return (
    <Portal>
      <Dialog visible={!!alert} onDismiss={onDismiss}>
        <Dialog.Title>Price history</Dialog.Title>
        <Dialog.ScrollArea>
          <ScrollView contentContainerStyle={styles.dialogContent}>
            {historyQuery.isLoading && <Text>Loading history...</Text>}
            {!historyQuery.isLoading && !historyQuery.data?.length && <Text>No history yet. Run a check to create the first entry.</Text>}
            {historyQuery.data?.map((row: PriceHistoryRow) => (
              <View key={row.id} style={styles.historyRow}>
                <Text>{formatINR(row.observed_price_minor)}</Text>
                <Text>{row.data_status ?? 'mock'} - {new Date(row.observed_at).toLocaleString()}</Text>
              </View>
            ))}
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions><Button onPress={onDismiss}>Close</Button></Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text>{label}</Text>
      <Text variant="titleSmall">{value}</Text>
    </View>
  );
}

function StateCard({ title, body }: { title: string; body: string }) {
  return (
    <Card style={styles.card}>
      <Card.Content style={styles.gap}>
        <Text variant="titleMedium">{title}</Text>
        <Text>{body}</Text>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
  },
  card: { borderRadius: 8 },
  gap: { gap: 12 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  flex: { flex: 1, minWidth: 220 },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metric: {
    minWidth: 150,
    flexGrow: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d0d7de',
    borderRadius: 8,
    padding: 10,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dialogContent: {
    padding: 16,
    gap: 12,
  },
  historyRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#d0d7de',
    paddingVertical: 10,
    gap: 4,
  },
});
