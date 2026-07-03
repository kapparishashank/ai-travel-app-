import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { IconButton, ProgressBar, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { formatINR } from '../../utils/currency';
import type { ItineraryActivity, TripDay } from '../trips/types';
import { durationLabel, getDataStatus, getDayTotal } from './utils';

export function ItinerarySummary({
  dayCount,
  activityCount,
  totalCost,
  confidence,
}: {
  dayCount: number;
  activityCount: number;
  totalCost: number;
  confidence: 'low' | 'medium' | 'high';
}) {
  const theme = useTheme();
  const confidenceValue = confidence === 'high' ? 0.9 : confidence === 'medium' ? 0.62 : 0.32;

  return (
    <Card style={styles.summaryCard}>
      <Text style={[styles.notice, { color: theme.colors.primary }]}>AI-generated suggestion</Text>
      <View style={styles.summaryGrid}>
        <SummaryMetric label="Days" value={String(dayCount)} icon="calendar-range" />
        <SummaryMetric label="Activities" value={String(activityCount)} icon="format-list-checks" />
        <SummaryMetric label="Estimated total" value={formatINR(totalCost)} icon="wallet-outline" />
      </View>
      <Text style={[styles.confidenceLabel, { color: theme.colors.onSurfaceVariant }]}>Confidence: {confidence}</Text>
      <ProgressBar progress={confidenceValue} color={theme.colors.primary} style={styles.progress} />
      <Text style={[styles.smallText, { color: theme.colors.onSurfaceVariant }]}>
        Estimates are not live prices. Verify tickets, opening hours, weather, and safety before booking.
      </Text>
    </Card>
  );
}

function SummaryMetric({ label, value, icon }: { label: string; value: string; icon: string }) {
  const theme = useTheme();
  return (
    <View style={styles.metric}>
      <MaterialCommunityIcons name={icon as any} size={20} color={theme.colors.primary} />
      <View>
        <Text style={[styles.metricValue, { color: theme.colors.onSurface }]}>{value}</Text>
        <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      </View>
    </View>
  );
}

export function DaySelector({
  days,
  selectedDayId,
  onSelect,
  dayTotals,
}: {
  days: TripDay[];
  selectedDayId: string | null;
  onSelect: (dayId: string) => void;
  dayTotals: Record<string, number>;
}) {
  const theme = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayList}>
      {days.map((day) => {
        const selected = day.id === selectedDayId;
        return (
          <Button
            key={day.id}
            mode={selected ? 'contained' : 'outlined'}
            onPress={() => onSelect(day.id)}
            accessibilityLabel={`Open day ${day.day_number}`}
            style={styles.dayButton}
          >
            {`Day ${day.day_number} - ${formatINR(dayTotals[day.id] ?? 0)}`}
          </Button>
        );
      })}
      {days.length === 0 && <Text style={{ color: theme.colors.onSurfaceVariant }}>No itinerary days yet.</Text>}
    </ScrollView>
  );
}

export function WarningCards({ warnings }: { warnings: string[] }) {
  const theme = useTheme();
  if (warnings.length === 0) return null;
  return (
    <View style={styles.warningList}>
      {warnings.map((warning) => (
        <View key={warning} style={[styles.warningCard, { backgroundColor: theme.colors.errorContainer }]}>
          <MaterialCommunityIcons name="alert-outline" size={18} color={theme.colors.error} />
          <Text style={[styles.warningText, { color: theme.colors.onErrorContainer }]}>{warning}</Text>
        </View>
      ))}
    </View>
  );
}

export function ActivityCard({
  activity,
  index,
  total,
  onEdit,
  onRemove,
  onMoveUp,
  onMoveDown,
  onToggleLock,
  onReport,
}: {
  activity: ItineraryActivity;
  index: number;
  total: number;
  onEdit: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleLock: () => void;
  onReport: () => void;
}) {
  const theme = useTheme();
  const locked = Boolean(activity.metadata?.locked);
  const status = getDataStatus(activity);

  return (
    <Card style={styles.activityCard} accessibilityLabel={`Activity ${activity.title}`}>
      <View style={styles.activityHeader}>
        <View style={styles.timelineDot} />
        <View style={styles.activityTitleBlock}>
          <Text style={[styles.activityTitle, { color: theme.colors.onSurface }]}>{activity.title}</Text>
          <Text style={[styles.smallText, { color: theme.colors.onSurfaceVariant }]}>
            {activity.local_start_time ?? 'Flexible'}-{activity.local_end_time ?? 'Flexible'} - {durationLabel(activity.local_start_time, activity.local_end_time)}
          </Text>
        </View>
        <View style={styles.cardActions}>
          <IconButton icon={locked ? 'lock' : 'lock-open-outline'} size={18} onPress={onToggleLock} accessibilityLabel={locked ? 'Unlock activity' : 'Lock activity'} />
          <IconButton icon="pencil-outline" size={18} onPress={onEdit} accessibilityLabel="Edit activity" />
        </View>
      </View>

      <Text style={[styles.activityDescription, { color: theme.colors.onSurfaceVariant }]}>{activity.description}</Text>

      <View style={styles.chipRow}>
        <InfoChip icon="cash" text={formatINR(activity.estimated_cost_minor)} />
        <InfoChip icon="car-outline" text={activity.metadata?.recommended_transport ?? 'Transport TBD'} />
        <InfoChip icon="database-outline" text={status} />
      </View>

      <Text style={[styles.detailLabel, { color: theme.colors.onSurface }]}>Reason</Text>
      <Text style={[styles.smallText, { color: theme.colors.onSurfaceVariant }]}>{activity.metadata?.recommendation_reason ?? 'No reason saved.'}</Text>
      <Text style={[styles.detailLabel, { color: theme.colors.onSurface }]}>Safety note</Text>
      <Text style={[styles.smallText, { color: theme.colors.onSurfaceVariant }]}>{activity.metadata?.safety_note ?? 'Verify safety locally.'}</Text>
      <Text style={[styles.detailLabel, { color: theme.colors.onSurface }]}>Weather note</Text>
      <Text style={[styles.smallText, { color: theme.colors.onSurfaceVariant }]}>{activity.metadata?.weather_note ?? 'Verify weather before travel.'}</Text>

      <View style={styles.actionRow}>
        <Button mode="text" icon="arrow-up" onPress={onMoveUp} disabled={index === 0}>Up</Button>
        <Button mode="text" icon="arrow-down" onPress={onMoveDown} disabled={index === total - 1}>Down</Button>
        <Button mode="text" icon="flag-outline" onPress={onReport}>Report</Button>
        <Button mode="text" icon="delete-outline" onPress={onRemove}>Remove</Button>
      </View>
    </Card>
  );
}

function InfoChip({ icon, text }: { icon: string; text: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.infoChip, { borderColor: theme.colors.outlineVariant }]}>
      <MaterialCommunityIcons name={icon as any} size={14} color={theme.colors.primary} />
      <Text style={[styles.infoChipText, { color: theme.colors.onSurfaceVariant }]}>{text}</Text>
    </View>
  );
}

export function CostSummary({ dayTotal, tripTotal }: { dayTotal: number; tripTotal: number }) {
  const theme = useTheme();
  return (
    <View style={[styles.costSummary, { borderColor: theme.colors.outlineVariant }]}>
      <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]}>Selected day</Text>
      <Text style={[styles.metricValue, { color: theme.colors.onSurface }]}>{formatINR(dayTotal)}</Text>
      <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]}>Trip itinerary total</Text>
      <Text style={[styles.metricValue, { color: theme.colors.onSurface }]}>{formatINR(tripTotal)}</Text>
    </View>
  );
}

export function AlternativeSection({ alternatives }: { alternatives: string[] }) {
  const theme = useTheme();
  if (!alternatives.length) return null;

  return (
    <Card style={styles.summaryCard}>
      <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Alternative activity ideas</Text>
      {alternatives.map((alternative) => (
        <Text key={alternative} style={[styles.smallText, { color: theme.colors.onSurfaceVariant }]}>
          - {alternative}
        </Text>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    padding: 16,
  },
  notice: {
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 10,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 150,
  },
  metricValue: {
    fontSize: 17,
    fontWeight: '900',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  confidenceLabel: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 14,
  },
  progress: {
    height: 7,
    borderRadius: 8,
    marginTop: 6,
  },
  smallText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  dayList: {
    gap: 8,
    paddingVertical: 8,
  },
  dayButton: {
    minWidth: 132,
  },
  warningList: {
    gap: 8,
    marginVertical: 8,
  },
  warningCard: {
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  activityCard: {
    padding: 14,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B5BDB',
    marginTop: 8,
  },
  activityTitleBlock: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  cardActions: {
    flexDirection: 'row',
  },
  activityDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  infoChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  infoChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginTop: 10,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  costSummary: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 6,
  },
});
