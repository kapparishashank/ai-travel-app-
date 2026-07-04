import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Snackbar, Text, useTheme } from 'react-native-paper';
import { useMutation } from '@tanstack/react-query';
import { Button } from '../../components/common/Button';
import { useAuthStore } from '../../store/authStore';
import { getConnectivityState, syncOfflineWork, type ConnectivityState } from './status';

export function OfflineIndicator() {
  const theme = useTheme();
  const authUser = useAuthStore((state) => state.authUser);
  const [connectivity, setConnectivity] = React.useState<ConnectivityState>(getConnectivityState());
  const [message, setMessage] = React.useState('');

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => setConnectivity(getConnectivityState());
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const syncMutation = useMutation({
    mutationFn: () => syncOfflineWork(authUser!.id),
    onSuccess: (result) => setMessage(`Sync complete: ${result.synced} synced, ${result.remaining} pending, ${result.conflicts} conflict${result.conflicts === 1 ? '' : 's'}.`),
    onError: (error: any) => setMessage(error.message ?? 'Sync failed. Pending changes remain queued.'),
  });

  if (!authUser) return null;

  const isOffline = connectivity === 'offline';
  const showBar = isOffline || syncMutation.isPending || message;

  return (
    <>
      {showBar && (
        <View style={[styles.bar, { backgroundColor: isOffline ? theme.colors.errorContainer : theme.colors.secondaryContainer }]}>
          <Text style={styles.text}>
            {isOffline ? 'Offline mode: cached trips, itinerary, packing, emergency info, and pending expenses remain available.' : syncMutation.isPending ? 'Synchronizing safe offline changes...' : message}
          </Text>
          {!isOffline && !syncMutation.isPending && (
            <Button mode="text" onPress={() => syncMutation.mutate()}>
              Sync now
            </Button>
          )}
        </View>
      )}
      <Snackbar visible={Boolean(message)} onDismiss={() => setMessage('')} duration={4500}>
        {message}
      </Snackbar>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  text: {
    flex: 1,
    minWidth: 220,
  },
});
