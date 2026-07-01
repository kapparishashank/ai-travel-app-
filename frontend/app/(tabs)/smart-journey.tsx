import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useTheme } from 'react-native-paper';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';

export default function SmartJourneyScreen() {
  const theme = useTheme();
  return (
    <ScreenContainer safeArea={false} contentContainerStyle={styles.container}>
      <Text style={[styles.title, { color: theme.colors.onBackground }]}>Smart Journey</Text>
      <Text style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>
        Compare route options by price, duration, comfort, and hidden transfer costs.
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 26, fontWeight: '900', marginBottom: 8 },
  body: { fontSize: 15, lineHeight: 22 },
});
