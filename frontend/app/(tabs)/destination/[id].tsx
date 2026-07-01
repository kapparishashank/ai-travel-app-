import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { ScreenContainer } from '../../../src/components/common/ScreenContainer';
import { demoDestinations } from '../../../src/features/home/demoData';

export default function DestinationDetailsScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const destination = demoDestinations.find((item) => item.id === id);

  return (
    <ScreenContainer safeArea={false} contentContainerStyle={styles.container}>
      <Text style={[styles.title, { color: theme.colors.onBackground }]}>
        {destination?.name ?? 'Destination'}
      </Text>
      <Text style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>
        {destination?.reason ?? 'Destination details will appear here.'}
      </Text>
      {destination?.isDemo && (
        <Text style={[styles.demo, { color: theme.colors.primary }]}>Demo data</Text>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 26, fontWeight: '900', marginBottom: 8 },
  body: { fontSize: 15, lineHeight: 22 },
  demo: { fontSize: 13, fontWeight: '900', marginTop: 16 },
});
