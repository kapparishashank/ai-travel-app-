import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text } from 'react-native';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Snackbar, useTheme } from 'react-native-paper';
import { Button } from '../../src/components/common/Button';
import { ChoiceChips } from '../../src/components/common/ChoiceChips';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { AuthScreenHeader } from '../../src/features/auth/AuthScreenHeader';
import {
  accessibilityOptions,
  foodOptions,
  interestOptions,
  transportOptions,
} from '../../src/features/auth/options';
import {
  travelPreferencesSchema,
  type TravelPreferencesFormData,
} from '../../src/features/auth/validation';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';

export default function TravelPreferencesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const authUser = useAuthStore((state) => state.authUser);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<TravelPreferencesFormData>({
    resolver: zodResolver(travelPreferencesSchema),
    defaultValues: {
      budgetStyle: 'balanced',
      preferredTransport: ['flight', 'train'],
      comfortPreference: 'standard',
      travelPace: 'balanced',
      interests: [],
      foodPreferences: [],
      accessibilityRequirements: [],
      safetyPreference: 'standard',
    },
  });

  const save = async (values: TravelPreferencesFormData) => {
    if (!authUser) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('travel_preferences').upsert(
        {
          user_id: authUser.id,
          budget_style: values.budgetStyle,
          preferred_transport_modes: values.preferredTransport,
          comfort_level: values.comfortPreference,
          travel_pace: values.travelPace,
          interests: values.interests,
          food_preferences: values.foodPreferences,
          dietary_preferences: values.foodPreferences,
          accessibility_needs: values.accessibilityRequirements,
          safety_preference: values.safetyPreference,
        },
        { onConflict: 'user_id' }
      );

      if (error) throw error;
      router.replace('/(onboarding)/permissions');
    } catch (error: any) {
      setMessage(error.message ?? 'Could not save travel preferences.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer scrollable safeArea contentContainerStyle={styles.container}>
      <AuthScreenHeader
        title="Travel preferences"
        subtitle="Answer what you know now. You can skip optional choices and update them later."
      />

      <Text style={[styles.label, { color: theme.colors.onSurface }]}>Budget style</Text>
      <Controller control={control} name="budgetStyle" render={({ field: { onChange, value } }) => (
        <ChoiceChips options={['shoestring', 'budget', 'balanced', 'premium']} selected={[value]} onChange={(items) => onChange(items[0])} multi={false} />
      )} />

      <Text style={[styles.label, { color: theme.colors.onSurface }]}>Preferred transport</Text>
      <Controller control={control} name="preferredTransport" render={({ field: { onChange, value } }) => (
        <ChoiceChips options={transportOptions} selected={value} onChange={onChange} error={errors.preferredTransport?.message} />
      )} />

      <Text style={[styles.label, { color: theme.colors.onSurface }]}>Comfort preference</Text>
      <Controller control={control} name="comfortPreference" render={({ field: { onChange, value } }) => (
        <ChoiceChips options={['budget', 'standard', 'premium']} selected={[value]} onChange={(items) => onChange(items[0])} multi={false} />
      )} />

      <Text style={[styles.label, { color: theme.colors.onSurface }]}>Travel pace</Text>
      <Controller control={control} name="travelPace" render={({ field: { onChange, value } }) => (
        <ChoiceChips options={['slow', 'balanced', 'packed']} selected={[value]} onChange={(items) => onChange(items[0])} multi={false} />
      )} />

      <Text style={[styles.label, { color: theme.colors.onSurface }]}>Interests, optional</Text>
      <Controller control={control} name="interests" render={({ field: { onChange, value } }) => (
        <ChoiceChips options={interestOptions} selected={value} onChange={onChange} />
      )} />

      <Text style={[styles.label, { color: theme.colors.onSurface }]}>Food preferences, optional</Text>
      <Controller control={control} name="foodPreferences" render={({ field: { onChange, value } }) => (
        <ChoiceChips options={foodOptions} selected={value} onChange={onChange} />
      )} />

      <Text style={[styles.label, { color: theme.colors.onSurface }]}>Accessibility requirements, optional</Text>
      <Controller control={control} name="accessibilityRequirements" render={({ field: { onChange, value } }) => (
        <ChoiceChips options={accessibilityOptions} selected={value} onChange={onChange} />
      )} />

      <Text style={[styles.label, { color: theme.colors.onSurface }]}>Safety preference</Text>
      <Controller control={control} name="safetyPreference" render={({ field: { onChange, value } }) => (
        <ChoiceChips options={['standard', 'extra_checkins', 'share_with_contacts']} selected={[value]} onChange={(items) => onChange(items[0])} multi={false} />
      )} />

      <Button onPress={handleSubmit(save)} loading={submitting} style={styles.submit}>Save preferences</Button>
      <Button mode="text" onPress={() => router.replace('/(onboarding)/permissions')}>Skip for now</Button>

      <Snackbar visible={!!message} onDismiss={() => setMessage('')} duration={5000}>
        {message}
      </Snackbar>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 14,
  },
  submit: {
    marginTop: 22,
  },
});
