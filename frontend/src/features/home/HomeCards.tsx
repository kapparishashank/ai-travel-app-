import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { Card } from '../../components/common/Card';
import { GlassCard } from '../../components/common/GlassCard';
import { getDestinationImage } from '../../constants/images';
import { formatINR } from '../../utils/currency';
import type { HomeAlert, HomeDestination, HomeSearch, HomeTrip } from './types';

type MaterialIconName = keyof typeof MaterialCommunityIcons.glyphMap;

function DemoLabel({ visible }: { visible?: boolean }) {
  const theme = useTheme();
  if (!visible) return null;

  return (
    <View style={[styles.demoPill, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surfaceVariant }]}>
      <MaterialCommunityIcons name="database-outline" size={12} color={theme.colors.onSurfaceVariant} />
      <Text style={[styles.demoText, { color: theme.colors.onSurfaceVariant }]}>Demo</Text>
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
          <MaterialCommunityIcons name={icon as MaterialIconName} size={24} color={theme.colors.primary} />
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
        <View style={[styles.statusPill, { backgroundColor: theme.colors.primaryContainer }]}>
          <Text style={[styles.statusText, { color: theme.colors.primary }]}>{trip.status}</Text>
        </View>
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
  const imageUrl = getDestinationImage(destination.name || destination.id);

  return (
    <GlassCard
      imageUrl={imageUrl}
      overlayOpacity={0.12}
      onPress={onPress}
      style={styles.destinationCard}
      accessibilityLabel={`Explore ${destination.name}`}
    >
      <Text style={styles.destinationCardTitle}>{destination.name}</Text>
      <Text style={styles.destinationCardRegion}>{destination.region}</Text>
      <Text style={styles.destinationCardReason} numberOfLines={3}>
        {destination.reason}
      </Text>
      <View style={styles.rowBetween}>
        <Text style={styles.destinationCardPrice}>
          From {formatINR(destination.estimateMinor)}
        </Text>
        <DemoLabel visible={destination.isDemo} />
      </View>
    </GlassCard>
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
    padding: 16,
    minHeight: 96,
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
    fontWeight: '900',
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
    padding: 18,
  },
  alertCard: {
    padding: 16,
    minWidth: 280,
  },
  destinationCard: {
    width: 250,
    minHeight: 220,
    justifyContent: 'flex-end',
  },
  destinationCardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.40)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  destinationCardRegion: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '700',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.30)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  destinationCardReason: {
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 8,
    minHeight: 54,
    textShadowColor: 'rgba(0,0,0,0.30)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  destinationCardPrice: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.30)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginTop: 10,
  },
  searchCard: {
    padding: 16,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  demoText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statusPill: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  skeleton: {
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 8,
  },
});
