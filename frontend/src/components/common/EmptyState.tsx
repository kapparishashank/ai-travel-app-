import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useTheme } from 'react-native-paper';
import { Button } from './Button';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}
type MaterialIconName = keyof typeof MaterialCommunityIcons.glyphMap;

export function EmptyState({
  title,
  description,
  icon = 'wallet-travel',
  actionLabel,
  onAction,
  compact = false,
}: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, compact && styles.compact, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
      <View style={[styles.iconShell, { backgroundColor: theme.colors.primaryContainer }]}>
        <MaterialCommunityIcons
          name={icon as MaterialIconName}
          size={compact ? 28 : 36}
          color={theme.colors.primary}
        />
      </View>
      <Text style={[styles.title, { color: theme.colors.onBackground }]}>{title}</Text>
      <Text style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>{description}</Text>
      {!!actionLabel && !!onAction && (
        <Button mode="contained" onPress={onAction} style={styles.button}>
          {actionLabel}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    marginVertical: 8,
  },
  compact: {
    padding: 18,
  },
  iconShell: {
    width: 64,
    height: 64,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    maxWidth: 420,
  },
  button: {
    minWidth: 160,
  },
});
