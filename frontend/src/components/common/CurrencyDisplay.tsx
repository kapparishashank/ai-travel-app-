import React from 'react';
import { View, StyleSheet, Text, StyleProp, TextStyle } from 'react-native';
import { useTheme } from 'react-native-paper';
import { formatMinorAmount } from '../../utils/currency';

interface CurrencyDisplayProps {
  /** Amount in minor units (paise, cents, etc.) */
  paise: number;
  /** ISO 4217 currency code. Defaults to 'INR'. */
  currency?: string;
  label?: string;
  showDecimal?: boolean;
  compact?: boolean;
  style?: StyleProp<TextStyle>;
}

export function CurrencyDisplay({
  paise,
  currency = 'INR',
  label,
  showDecimal = false,
  compact = false,
  style,
}: CurrencyDisplayProps) {
  const theme = useTheme();

  // Pick color for labels
  const getLabelColor = (lbl: string) => {
    const l = lbl.toUpperCase();
    if (l.includes('AI')) return '#8B5CF6';    // Purple
    if (l.includes('MOCK')) return '#6B7280';  // Gray
    if (l.includes('LIVE') || l.includes('CONFIRMED')) return '#10B981'; // Green
    return '#6B7280';
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.amount, { color: theme.colors.onBackground }, style]}>
        {formatMinorAmount(paise, currency, { showDecimal, compact })}
      </Text>
      {!!label && (
        <View style={[styles.badge, { backgroundColor: getLabelColor(label) }]}>
          <Text style={styles.badgeText}>{label}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
