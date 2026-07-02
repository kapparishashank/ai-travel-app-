import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ProgressBar, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../../../src/components/common/Button';
import { ScreenContainer } from '../../../src/components/common/ScreenContainer';
import { supabase } from '../../../src/lib/supabase';

const generationStages = [
  'Saving draft trip',
  'Validating trip request',
  'Calling secure planner',
  'Checking structured response',
  'Saving itinerary',
];

type GenerationState = 'running' | 'complete' | 'error';

export default function TripGenerationScreen() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [stageIndex, setStageIndex] = useState(0);
  const [state, setState] = useState<GenerationState>('running');
  const [errorMessage, setErrorMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!id || startedRef.current) return;
    startedRef.current = true;

    const runGeneration = async () => {
      setState('running');
      setErrorMessage('');

      const timer = setInterval(() => {
        setStageIndex((current) => Math.min(current + 1, generationStages.length - 2));
      }, 900);

      try {
        const { data, error } = await supabase.functions.invoke('ai-planner', {
          method: 'POST',
          body: { tripId: id },
        });

        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).message ?? 'Planner failed.');

        clearInterval(timer);
        setStageIndex(generationStages.length - 1);
        setState('complete');
        queryClient.invalidateQueries({ queryKey: ['tripDetails', id] });
        queryClient.invalidateQueries({ queryKey: ['trips'] });
      } catch (error: any) {
        clearInterval(timer);
        setState('error');
        setErrorMessage(error.message ?? 'TravelAI could not generate this itinerary.');
      }
    };

    runGeneration();
  }, [attempt, id, queryClient]);

  const progress = useMemo(() => {
    if (state === 'complete') return 1;
    if (state === 'error') return Math.max(0.2, stageIndex / generationStages.length);
    return (stageIndex + 1) / generationStages.length;
  }, [stageIndex, state]);

  return (
    <ScreenContainer safeArea={false} contentContainerStyle={styles.container}>
      <View style={[styles.panel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
        <View style={[styles.iconTile, { backgroundColor: state === 'error' ? theme.colors.errorContainer : theme.colors.primaryContainer }]}>
          <MaterialCommunityIcons
            name={state === 'error' ? 'alert-circle-outline' : 'auto-fix'}
            size={30}
            color={state === 'error' ? theme.colors.error : theme.colors.primary}
          />
        </View>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>
          {state === 'complete' ? 'Itinerary created' : state === 'error' ? 'Generation failed' : 'Generating your trip'}
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          {state === 'complete'
            ? 'Your structured itinerary has been validated and saved.'
            : state === 'error'
              ? errorMessage
              : generationStages[stageIndex]}
        </Text>
        <ProgressBar progress={progress} color={state === 'error' ? theme.colors.error : theme.colors.primary} style={styles.progress} />
        <Text style={[styles.tripId, { color: theme.colors.onSurfaceVariant }]}>Trip ID: {id}</Text>

        <View style={styles.actions}>
          {state === 'complete' && <Button onPress={() => router.replace(`/(tabs)/trip/${id}`)}>Open trip</Button>}
          {state === 'error' && (
            <Button
              onPress={() => {
                startedRef.current = false;
                setStageIndex(0);
                setAttempt((current) => current + 1);
              }}
            >
              Try again
            </Button>
          )}
          <Button mode="outlined" onPress={() => router.replace('/(tabs)')}>Back home</Button>
        </View>
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
