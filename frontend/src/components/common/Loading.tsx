import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { ActivityIndicator, useTheme } from 'react-native-paper';

interface LoadingProps {
  fullScreen?: boolean;
  message?: string;
}

export function Loading({ fullScreen = false, message }: LoadingProps) {
  const theme = useTheme();

  const containerStyle = fullScreen ? styles.fullScreen : styles.inline;

  return (
    <View style={[containerStyle, { backgroundColor: fullScreen ? theme.colors.background : 'transparent' }]}>
      <ActivityIndicator size={fullScreen ? 'large' : 'small'} color={theme.colors.primary} />
      {!!message && (
        <Text style={[styles.message, { color: theme.colors.onBackground }]}>
          {message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  inline: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
});
