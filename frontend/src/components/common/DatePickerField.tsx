/**
 * DatePickerField
 *
 * A cross-platform date picker that:
 * - On web: uses a hidden <input type="date"> for native browser date picker
 * - On native: renders a text input in YYYY-MM-DD with clear formatting guidance
 *
 * Displays the selected date in "1 Oct 2026" format to the user.
 * Always stores/emits YYYY-MM-DD to the form (backend format).
 * Prevents selection of dates before `minDate` (defaults to today).
 */
import React, { useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatDateLong } from '../../utils/date';
import { todayISO } from '../../utils/date';

type MaterialIconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface DatePickerFieldProps {
  label: string;
  value: string;           // YYYY-MM-DD
  onChange: (iso: string) => void;
  minDate?: string;        // YYYY-MM-DD, defaults to today
  maxDate?: string;        // YYYY-MM-DD
  error?: string;
  icon?: MaterialIconName;
}

export function DatePickerField({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  error,
  icon = 'calendar-outline',
}: DatePickerFieldProps) {
  const theme = useTheme();
  const today = todayISO();
  const effectiveMin = minDate ?? today;
  const inputRef = useRef<HTMLInputElement>(null);

  const hasValue = Boolean(value);
  const displayValue = hasValue ? formatDateLong(value) : '';
  const hasError = Boolean(error);

  const borderColor = hasError
    ? theme.colors.error
    : theme.colors.outlineVariant;
  const labelColor = hasError ? theme.colors.error : theme.colors.onSurfaceVariant;
  const valueColor = hasValue ? theme.colors.onSurface : theme.colors.onSurfaceVariant;

  if (Platform.OS === 'web') {
    return (
      <View style={styles.wrapper}>
        {/* Accessible label */}
        <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
        <Pressable
          style={[styles.field, { borderColor, backgroundColor: theme.colors.surface }]}
          onPress={() => inputRef.current?.showPicker?.()}
          accessibilityLabel={label}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name={icon} size={20} color={theme.colors.primary} style={styles.fieldIcon} />
          <Text style={[styles.valueText, { color: valueColor }]}>
            {displayValue || `Select ${label.toLowerCase()}`}
          </Text>
          <MaterialCommunityIcons name="chevron-down" size={18} color={theme.colors.onSurfaceVariant} />

          {/* Invisible native date input — placed on top via absolute positioning */}
          {/* @ts-ignore — web-only element */}
          <input
            ref={inputRef}
            type="date"
            value={value}
            min={effectiveMin}
            max={maxDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const next = e.target.value; // YYYY-MM-DD
              if (next) onChange(next);
            }}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0,
              cursor: 'pointer',
              width: '100%',
              height: '100%',
              border: 'none',
              background: 'transparent',
            }}
            aria-label={label}
          />
        </Pressable>
        {hasError && (
          <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
        )}
      </View>
    );
  }

  // Native fallback — still a text input but with clear guidance
  // Replace with @react-native-community/datetimepicker if needed
  const [nativeText, setNativeText] = React.useState(value);

  const handleNativeChange = (text: string) => {
    setNativeText(text);
    // Accept when the text matches YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      const d = new Date(text + 'T00:00:00');
      if (!Number.isNaN(d.getTime()) && text >= effectiveMin) {
        onChange(text);
      }
    }
  };

  const { TextInput } = require('react-native');
  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
      <View style={[styles.field, { borderColor, backgroundColor: theme.colors.surface }]}>
        <MaterialCommunityIcons name={icon} size={20} color={theme.colors.primary} style={styles.fieldIcon} />
        <TextInput
          style={[styles.nativeInput, { color: theme.colors.onSurface }]}
          value={nativeText}
          onChangeText={handleNativeChange}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={theme.colors.onSurfaceVariant}
          keyboardType="numeric"
          maxLength={10}
          accessibilityLabel={label}
        />
      </View>
      {hasValue && !hasError && (
        <Text style={[styles.helperText, { color: theme.colors.onSurfaceVariant }]}>
          {displayValue}
        </Text>
      )}
      {hasError && (
        <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 4,
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  fieldIcon: {
    flexShrink: 0,
  },
  valueText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  nativeInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  helperText: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  errorText: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
});
