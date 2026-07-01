import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { Card } from '../../components/common/Card';
import { formatINR } from '../../utils/currency';
import type { HomeAlert, HomeDestination, HomeSearch, HomeTrip } from './types';

function DemoLabel({ visible }: { visible?: boolean }) {
  const theme = useTheme();
  if (!visible) return null;

  return (
    <View style={[styles.demoPill, { borderColor: theme.colors.outlineVariant }]}>
      <Text style={[styles.demoText, { color: theme.colors.onSurfaceVariant }]}>Demo data</Text>
    </View>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>{title}</Text>
      {action}
    </View>
  );
}

export function ShortcutCard({
  title,
  description,
  icon,
  onPress,
}: {
  title: string;
  description: string;
  icon: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Card onPress={onPress} style={styles.shortcutCard} accessibilityLabel={title}>
      <View style={styles.shortcutContent}>
        <View style={[styles.iconTile, { backgroundColor: theme.colors.primaryContainer }]}>
          <MaterialCommunityIcons name={icon as any} size={24} color={theme.colors.primary} />
        </View>
        <View style={styles.flex}>
          <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>{title}</Text>
          <Text style={[styles.cardBody, { color: theme.colors.onSurfaceVariant }]}>{description}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
      </View>
    </Card>
  );
}

export function TripCard({ trip, onPress }: { trip: HomeTrip; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Card onPress={onPress} style={styles.tripCard} accessibilityLabel={`Open ${trip.title}`}>
      <View style={styles.rowBetween}>
        <View style={styles.flex}>
          <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>{trip.title}</Text>
          <Text style={[styles.cardBody, { color: theme.colors.onSurfaceVariant }]}>
            {trip.destination} · {trip.startDate} to {trip.endDate}
          </Text>
        </View>
        <DemoLabel visible={trip.isDemo} />
      </View>
      <View style={styles.metaRow}>
        <Text style={[styles.metaText, { color: theme.colors.primary }]}>{trip.status}</Text>
        <Text style={[styles.metaText, { color: theme.colors.onSurfaceVariant }]}>
          {formatINR(trip.budgetMinor)}
        </Text>
      </View>
    </Card>
  );
}

export function AlertCard({ alert, onPress }: { alert: HomeAlert; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Card onPress={onPress} style={styles.alertCard} accessibilityLabel={`Open price alert ${alert.route}`}>
      <View style={styles.rowBetween}>
        <View style={styles.flex}>
          <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>{alert.route}</Text>
          <Text style={[styles.cardBody, { color: theme.colors.onSurfaceVariant }]}>
            {alert.mode} · {alert.departOn}
          </Text>
        </View>
        <DemoLabel visible={alert.isDemo} />
      </View>
      <Text style={[styles.metaText, { color: theme.colors.onSurfaceVariant }]}>
        Watching {formatINR(alert.currentMinor)} toward {formatINR(alert.targetMinor)}
      </Text>
    </Card>
  );
}

export function DestinationCard({
  destination,
  onPress,
}: {
  destination: HomeDestination;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Card onPress={onPress} style={styles.destinationCard} accessibilityLabel={`Explore ${destination.name}`}>
      <View style={[styles.destinationIcon, { backgroundColor: theme.colors.secondaryContainer }]}>
        <MaterialCommunityIcons name={destination.icon as any} size={24} color={theme.colors.secondary} />
      </View>
      <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>{destination.name}</Text>
      <Text style={[styles.cardBody, { color: theme.colors.onSurfaceVariant }]}>{destination.region}</Text>
      <Text style={[styles.destinationReason, { color: theme.colors.onSurfaceVariant }]}>
        {destination.reason}
      </Text>
      <View style={styles.rowBetween}>
        <Text style={[styles.metaText, { color: theme.colors.primary }]}>
          From {formatINR(destination.estimateMinor)}
        </Text>
        <DemoLabel visible={destination.isDemo} />
      </View>
    </Card>
  );
}

export function RecentSearchCard({ search, onPress }: { search: HomeSearch; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Card onPress={onPress} style={styles.searchCard} accessibilityLabel={`Open recent search ${search.route}`}>
      <View style={styles.shortcutContent}>
        <MaterialCommunityIcons name="history" size={22} color={theme.colors.primary} />
        <View style={styles.flex}>
          <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>{search.label}</Text>
          <Text style={[styles.cardBody, { color: theme.colors.onSurfaceVariant }]}>
            {search.route} · {search.searchedAt}
          </Text>
        </View>
        <DemoLabel visible={search.isDemo} />
      </View>
    </Card>
  );
}

export function SkeletonBlock({ height = 96 }: { height?: number }) {
  const theme = useTheme();
  return (
    <View
      accessible
      accessibilityLabel="Loading content"
      style={[
        styles.skeleton,
        { height, backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  shortcutCard: {
    padding: 14,
    minHeight: 88,
  },
  shortcutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  cardBody: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  tripCard: {
    padding: 16,
  },
  alertCard: {
    padding: 14,
    minWidth: 260,
  },
  destinationCard: {
    padding: 14,
    width: 220,
  },
  destinationIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  destinationReason: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
    minHeight: 54,
  },
  searchCard: {
    padding: 14,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 10,
    textTransform: 'capitalize',
  },
  demoPill: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  demoText: {
    fontSize: 11,
    fontWeight: '800',
  },
  skeleton: {
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 8,
  },
});
