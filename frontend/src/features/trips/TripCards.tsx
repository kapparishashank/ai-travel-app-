import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { IconButton, Menu, ProgressBar, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '../../components/common/Card';
import { formatINR } from '../../utils/currency';
import type { TripSummary } from './types';

type TripCardProps = {
  trip: TripSummary;
  menuVisible: boolean;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  onOpen: () => void;
  onRename: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
};

export function ManagedTripCard({
  trip,
  menuVisible,
  onOpenMenu,
  onCloseMenu,
  onOpen,
  onRename,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
}: TripCardProps) {
  const theme = useTheme();
  const progress = trip.status === 'draft' ? 0.25 : trip.status === 'planning' ? 0.55 : trip.status === 'active' ? 0.8 : 1;

  return (
    <Card onPress={onOpen} style={styles.card} accessibilityLabel={`Open ${trip.title}`}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="map-marker-radius-outline" size={24} color={theme.colors.primary} />
        </View>
        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>{trip.title}</Text>
          <Text style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}>
            {trip.origin_name} to {trip.destination_name}
          </Text>
          <Text style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}>
            {trip.start_date} to {trip.end_date} · {trip.travelerCount} traveler{trip.travelerCount === 1 ? '' : 's'}
          </Text>
          <View style={styles.footer}>
            <Text style={[styles.status, { color: theme.colors.primary }]}>{trip.status}</Text>
            <Text style={[styles.budget, { color: theme.colors.onSurfaceVariant }]}>
              {formatINR(trip.total_budget_minor)}
            </Text>
          </View>
          <ProgressBar progress={progress} color={theme.colors.primary} style={styles.progress} />
        </View>
        <Menu
          visible={menuVisible}
          onDismiss={onCloseMenu}
          anchor={
            <IconButton
              icon="dots-vertical"
              onPress={onOpenMenu}
              accessibilityLabel={`Trip actions for ${trip.title}`}
            />
          }
        >
          <Menu.Item onPress={onOpen} title="Open" leadingIcon="open-in-new" />
          <Menu.Item onPress={onRename} title="Rename" leadingIcon="pencil-outline" />
          <Menu.Item onPress={onEdit} title="Edit basics" leadingIcon="calendar-edit" />
          <Menu.Item onPress={onDuplicate} title="Duplicate" leadingIcon="content-copy" />
          {trip.status !== 'archived' && <Menu.Item onPress={onArchive} title="Archive" leadingIcon="archive-outline" />}
          <Menu.Item onPress={onDelete} title="Delete" leadingIcon="delete-outline" />
        </Menu>
      </View>
    </Card>
  );
}

export function TripSkeleton() {
  const theme = useTheme();
  return <View style={[styles.skeleton, { backgroundColor: theme.colors.surfaceVariant }]} />;
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
  },
  meta: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 10,
  },
  status: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  budget: {
    fontSize: 12,
    fontWeight: '800',
  },
  progress: {
    height: 6,
    borderRadius: 8,
    marginTop: 8,
  },
  skeleton: {
    height: 132,
    borderRadius: 8,
    marginVertical: 8,
  },
});
