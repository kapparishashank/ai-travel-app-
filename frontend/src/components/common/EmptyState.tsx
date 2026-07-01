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
}

export function EmptyState({
  title,
  description,
  icon = 'wallet-travel',
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons
        name={icon as any}
        size={64}
        color={theme.colors.outline}
        style={styles.icon}
      />
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
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
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
  },
  button: {
    minWidth: 160,
  },
});
