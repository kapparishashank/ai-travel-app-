import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ProgressBar, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '../../../src/components/common/Button';
import { ScreenContainer } from '../../../src/components/common/ScreenContainer';

const generationStages = [
  'Saving draft trip',
  'Reading preferences',
  'Comparing journey options',
  'Sketching itinerary',
  'Preparing budget and packing prompts',
];

export default function TripGenerationScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStageIndex((current) => Math.min(current + 1, generationStages.length - 1));
    }, 900);

    return () => clearInterval(timer);
  }, []);

  const progress = useMemo(
    () => (stageIndex + 1) / generationStages.length,
    [stageIndex]
  );

  const complete = stageIndex === generationStages.length - 1;

  return (
    <ScreenContainer safeArea={false} contentContainerStyle={styles.container}>
      <View style={[styles.panel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
        <View style={[styles.iconTile, { backgroundColor: theme.colors.primaryContainer }]}>
          <MaterialCommunityIcons name="auto-fix" size={30} color={theme.colors.primary} />
        </View>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>
          {complete ? 'Draft created' : 'Generating your trip'}
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          {complete
            ? 'Your draft is ready. AI generation hooks can continue from this trip ID.'
            : generationStages[stageIndex]}
        </Text>
        <ProgressBar progress={progress} color={theme.colors.primary} style={styles.progress} />
        <Text style={[styles.tripId, { color: theme.colors.onSurfaceVariant }]}>Trip ID: {id}</Text>

        {complete && (
          <View style={styles.actions}>
            <Button onPress={() => router.replace(`/(tabs)/trip/${id}`)}>Open trip</Button>
            <Button mode="outlined" onPress={() => router.replace('/(tabs)')}>Back home</Button>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    padding: 20,
  },
  panel: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 22,
    alignItems: 'center',
  },
  iconTile: {
    width: 58,
    height: 58,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 8,
  },
  progress: {
    height: 8,
    borderRadius: 8,
    width: '100%',
    marginTop: 22,
  },
  tripId: {
    fontSize: 12,
    marginTop: 12,
  },
  actions: {
    width: '100%',
    marginTop: 20,
  },
});
