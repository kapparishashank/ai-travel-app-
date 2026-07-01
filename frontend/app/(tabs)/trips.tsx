import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useTheme } from 'react-native-paper';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';

export default function TripsScreen() {
  const theme = useTheme();
  return (
    <ScreenContainer safeArea={false} contentContainerStyle={styles.container}>
      <Text style={[styles.title, { color: theme.colors.onBackground }]}>Trips</Text>
      <Text style={{ color: theme.colors.onSurfaceVariant }}>Saved trips and itineraries will appear here.</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 24, fontWeight: '900', marginBottom: 8 },
});
