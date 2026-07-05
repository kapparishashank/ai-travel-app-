import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, Switch, Text, useTheme } from 'react-native-paper';
import { Button } from '../../src/components/common/Button';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import {
  deepLinkForNotification,
  fetchNotificationPreferences,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  registerForPushNotifications,
  saveNotificationPreferences,
} from '../../src/features/notifications/api';
import {
  notificationCategories,
  notificationCategoryLabels,
  type NotificationCategory,
  type TravelNotification,
} from '../../src/features/notifications/types';
import { useAuthStore } from '../../src/store/authStore';

export default function NotificationsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const authUser = useAuthStore((state) => state.authUser);

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    enabled: !!authUser?.id,
  });
  const preferencesQuery = useQuery({
    queryKey: ['notification-preferences', authUser?.id],
    queryFn: () => fetchNotificationPreferences(authUser!.id),
    enabled: !!authUser?.id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notification-preferences', authUser?.id] });
  };

  const readMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: invalidate,
  });
  const markAllMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(authUser!.id),
    onSuccess: invalidate,
  });
  const preferencesMutation = useMutation({
    mutationFn: saveNotificationPreferences,
    onSuccess: invalidate,
  });
  const pushMutation = useMutation({
    mutationFn: () => registerForPushNotifications(authUser!.id),
    onSuccess: invalidate,
  });

  const preferences = preferencesQuery.data;
  const unreadCount = notificationsQuery.data?.filter((item) => item.status === 'unread').length ?? 0;

  const toggleCategory = (category: NotificationCategory, enabled: boolean) => {
    if (!preferences) return;
    preferencesMutation.mutate({ ...preferences, [category]: enabled });
  };

  const openNotification = (notification: TravelNotification) => {
    if (notification.status === 'unread') readMutation.mutate(notification.id);
    router.push(deepLinkForNotification(notification) as any);
  };

  return (
    <ScreenContainer safeArea={false} keyboardAvoiding={false}>
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={styles.card}>
          <Card.Content style={styles.gap}>
            <View style={styles.headerRow}>
              <View style={styles.flex}>
                <Text variant="headlineSmall">Notification Center</Text>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  {unreadCount} unread. Notification text avoids precise location details and uses deep links for context.
                </Text>
              </View>
              <Button icon="check-all" disabled={!unreadCount} loading={markAllMutation.isPending} onPress={() => markAllMutation.mutate()}>
                Mark all read
              </Button>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content style={styles.gap}>
            <Text variant="titleLarge">Preferences</Text>
            {!preferences ? <Text>Loading preferences...</Text> : (
              <>
                {notificationCategories.map((category) => (
                  <PreferenceRow
                    key={category}
                    label={notificationCategoryLabels[category]}
                    value={Boolean(preferences[category])}
                    onValueChange={(value) => toggleCategory(category, value)}
                  />
                ))}
                <View style={styles.preferenceRow}>
                  <View style={styles.flex}>
                    <Text variant="titleSmall">Push notifications</Text>
                    <Text style={{ color: theme.colors.onSurfaceVariant }}>
                      Status: {preferences.push_permission_status}. Registration is prepared; native push provider setup can be added later.
                    </Text>
                  </View>
                  <Button mode="outlined" loading={pushMutation.isPending} onPress={() => pushMutation.mutate()}>
                    Enable push
                  </Button>
                </View>
                {preferences.push_permission_status === 'denied' && (
                  <Text style={{ color: theme.colors.error }}>
                    Notification permission is denied. You can still use the in-app notification center.
                  </Text>
                )}
              </>
            )}
          </Card.Content>
        </Card>

        {notificationsQuery.isLoading && <StateCard title="Loading" body="Fetching notification history..." />}
        {notificationsQuery.isError && <StateCard title="Could not load notifications" body={(notificationsQuery.error as Error).message} />}
        {!notificationsQuery.isLoading && !notificationsQuery.data?.length && (
          <StateCard title="No notifications" body="Price drops, packing reminders, safety check-ins, booking updates, and system messages will appear here." />
        )}

        {notificationsQuery.data?.map((notification) => (
          <Card key={notification.id} style={[styles.card, notification.status === 'unread' && { borderWidth: 1, borderColor: theme.colors.primary }]}>
            <Card.Content style={styles.gap}>
              <View style={styles.headerRow}>
                <View style={styles.flex}>
                  <Text variant="titleMedium">{notification.title}</Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    {notificationCategoryLabels[notification.category]} - {new Date(notification.created_at).toLocaleString()}
                  </Text>
                </View>
                <Text style={{ color: notification.status === 'unread' ? theme.colors.primary : theme.colors.onSurfaceVariant }}>
                  {notification.status}
                </Text>
              </View>
              {!!notification.body && <Text>{notification.body}</Text>}
              <View style={styles.actions}>
                <Button mode="outlined" icon="open-in-app" onPress={() => openNotification(notification)}>Open</Button>
                {notification.status === 'unread' && (
                  <Button mode="text" icon="check" loading={readMutation.isPending} onPress={() => readMutation.mutate(notification.id)}>
                    Mark read
                  </Button>
                )}
              </View>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

function PreferenceRow({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (value: boolean) => void }) {
  return (
    <View style={styles.preferenceRow}>
      <Text>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} />
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  flex: {
    flex: 1,
    minWidth: 220,
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
