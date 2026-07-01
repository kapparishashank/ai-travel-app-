import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useTheme } from 'react-native-paper';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';

export default function PackingScreen() {
  const theme = useTheme();
  return (
    <ScreenContainer safeArea={false} contentContainerStyle={styles.container}>
      <Text style={[styles.title, { color: theme.colors.onBackground }]}>Packing</Text>
      <Text style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>
        Weather-aware and trip-specific packing reminders will appear here.
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 26, fontWeight: '900', marginBottom: 8 },
  body: { fontSize: 15, lineHeight: 22 },
});
