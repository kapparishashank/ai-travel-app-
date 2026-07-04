import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card, Text, useTheme } from 'react-native-paper';
import { Button } from '../src/components/common/Button';
import { ScreenContainer } from '../src/components/common/ScreenContainer';
import { fetchAdminDashboard } from '../src/features/admin/api';
import type { AdminDashboardData } from '../src/features/admin/types';
import { useAuthStore } from '../src/store/authStore';

export default function AdminDashboardScreen() {
  const theme = useTheme();
  const authUser = useAuthStore((state) => state.authUser);
  const query = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: fetchAdminDashboard,
    enabled: !!authUser?.id,
    retry: false,
  });

  if (!authUser) {
    return (
      <ScreenContainer safeArea={false} contentContainerStyle={styles.container}>
        <StateCard title="Admin login required" body="Sign in with an admin account to view this dashboard." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer safeArea={false} keyboardAvoiding={false}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />}
      >
        <Card style={styles.card}>
          <Card.Content style={styles.gap}>
            <View style={styles.headerRow}>
              <View style={styles.flex}>
                <Text variant="headlineSmall">TravelAI Admin</Text>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  Server-verified dashboard. Precise location history and secrets are never displayed.
                </Text>
              </View>
              <Button mode="outlined" icon="refresh" onPress={() => query.refetch()}>Refresh</Button>
            </View>
          </Card.Content>
        </Card>

        {query.isLoading && <StateCard title="Loading" body="Verifying admin role and loading system metrics..." />}
        {query.isError && (
          <StateCard
            title="Access denied or unavailable"
            body={(query.error as Error).message || 'Normal users cannot access admin routes.'}
          />
        )}
        {query.data && <DashboardContent data={query.data} />}
      </ScrollView>
    </ScreenContainer>
  );
}

function DashboardContent({ data }: { data: AdminDashboardData }) {
  return (
    <>
      <View style={styles.metricGrid}>
        <Metric title="Users" value={String(data.metrics.userCount)} />
        <Metric title="Trips" value={String(data.metrics.tripCount)} />
        <Metric title="AI errors" value={String(data.aiGenerationErrors.length)} />
        <Metric title="Reports" value={String(data.reportedRecommendations.length)} />
        <Metric title="Provider health" value={data.metrics.systemHealth} />
        <Metric title="Notification failures" value={String(data.metrics.notificationFailures)} />
        <Metric title="Active price alerts" value={String(data.metrics.activePriceAlerts)} />
        <Metric title="Safety reports" value={String(data.safetyDataReports.length)} />
      </View>

      <AdminSection title="Provider Health" rows={data.providerHealth} />
      <AdminSection title="AI Generation Errors" rows={data.aiGenerationErrors} />
      <AdminSection title="Reported Recommendations" rows={data.reportedRecommendations} />
      <AdminSection title="Safety-data Reports" rows={data.safetyDataReports} />
    </>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <Card style={styles.metricCard}>
      <Card.Content>
        <Text variant="labelLarge">{title}</Text>
        <Text variant="headlineSmall">{value}</Text>
      </Card.Content>
    </Card>
  );
}

function AdminSection({ title, rows }: { title: string; rows: Array<Record<string, any>> }) {
  return (
    <Card style={styles.card}>
      <Card.Content style={styles.gap}>
        <Text variant="titleLarge">{title}</Text>
        {rows.length === 0 ? (
          <Text>No records.</Text>
        ) : rows.map((row, index) => (
          <View key={`${title}-${index}`} style={styles.row}>
            <Text variant="titleSmall">{row.provider ?? row.feature ?? row.feedback_type ?? row.status ?? row.id ?? 'Record'}</Text>
            <Text>{row.message ?? row.error_message ?? row.status ?? 'No message'}</Text>
            {row.created_at || row.last_checked_at ? <Text>{new Date(row.created_at ?? row.last_checked_at).toLocaleString()}</Text> : null}
          </View>
        ))}
      </Card.Content>
    </Card>
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
    maxWidth: 1180,
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    borderRadius: 8,
  },
  gap: {
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  flex: {
    flex: 1,
    minWidth: 220,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    borderRadius: 8,
    minWidth: 180,
    flex: 1,
  },
  row: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#d0d7de',
    paddingVertical: 10,
    gap: 4,
  },
});
