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
    <View style={styles.container}>
      <MaterialCommunityIcons 
        name="alert-circle-outline" 
        size={64} 
        color={theme.colors.error} 
        style={styles.icon} 
      />
      <Text style={[styles.title, { color: theme.colors.error }]}>Something Went Wrong</Text>
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
