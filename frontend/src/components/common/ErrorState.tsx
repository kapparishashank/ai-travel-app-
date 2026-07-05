import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useTheme } from 'react-native-paper';
import { Button } from './Button';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.errorContainer, borderColor: theme.colors.error }]}>
      <View style={[styles.iconShell, { backgroundColor: theme.colors.surface }]}>
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={34}
          color={theme.colors.error}
        />
      </View>
      <Text style={[styles.title, { color: theme.colors.error }]}>Something went wrong</Text>
      <Text style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>{message}</Text>
      {!!onRetry && (
        <Button mode="outlined" onPress={onRetry} style={styles.button} color={theme.colors.error}>
          Try Again
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
  message: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    minWidth: 160,
  },
});
