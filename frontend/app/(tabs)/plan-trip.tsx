import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { ProgressBar, Switch, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '../../src/components/common/Button';
import { ChoiceChips } from '../../src/components/common/ChoiceChips';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { TextInput } from '../../src/components/common/TextInput';
import { supabase } from '../../src/lib/supabase';
import { trackAnalyticsEvent } from '../../src/features/analytics/analytics';
import { useAuthStore } from '../../src/store/authStore';
import {
  accessibilityOptions,
  emptyPlanTripDraft,
  foodOptions,
  hyderabadToGoaDemoInput,
  interestOptions,
  planTripSteps,
  transportOptions,
} from '../../src/features/tripPlanner/options';
import { usePlanTripDraftStore } from '../../src/features/tripPlanner/store';
import {
  budgetSchema,
  interestsSchema,
  planTripSchema,
  preferencesSchema,
  sourceDestinationSchema,
  travelDatesSchema,
  travelersSchema,
  type PlanTripFormData,
} from '../../src/features/tripPlanner/validation';
import { formatINR, rupeesToPaise } from '../../src/utils/currency';

const editableStepCount = 7;

function createTripId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

const stepSchemas = [
  sourceDestinationSchema,
  travelDatesSchema,
  travelersSchema,
  budgetSchema,
  interestsSchema,
  preferencesSchema,
  planTripSchema,
];

export default function PlanTripScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const authUser = useAuthStore((state) => state.authUser);
  const { draft, hydrated, hydrate, updateDraft, replaceDraft, clearDraft } = usePlanTripDraftStore();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const createdTripIdRef = useRef<string | null>(null);
  const hasResetFromStore = useRef(false);
  const isWide = width >= 800;

  const {
    control,
    handleSubmit,
    getValues,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm<PlanTripFormData>({
    resolver: zodResolver(planTripSchema),
    defaultValues: draft,
    mode: 'onBlur',
  });

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && !hasResetFromStore.current) {
      reset(draft);
      hasResetFromStore.current = true;
    }
  }, [draft, hydrated, reset]);

  useEffect(() => {
    if (!hydrated) return;
    const subscription = watch((value) => {
      updateDraft(value as Partial<PlanTripFormData>);
    });
    return () => subscription.unsubscribe();
  }, [hydrated, updateDraft, watch]);

  const progress = (step + 1) / planTripSteps.length;
  const values = watch();

  const reviewRows = useMemo(
    () => [
      ['Route', `${values.startingCity || 'Starting city'} to ${values.destination || 'Destination'}`],
      ['Dates', `${values.startDate || 'Start'} to ${values.endDate || 'End'}${values.flexibleDates ? ' · flexible' : ''}`],
      ['Travelers', `${values.adults} adults, ${values.children} children · ${values.tripType}`],
      ['Budget', `${values.currency} ${Number(values.totalBudget || 0).toLocaleString('en-IN')}`],
      ['Interests', values.interests.length ? values.interests.join(', ') : 'None selected'],
      ['Transport', values.preferredTransport.length ? values.preferredTransport.join(', ') : 'None selected'],
      ['Pace and comfort', `${values.travelPace} pace · ${values.comfortPreference} comfort`],
      ['Accommodation', values.accommodationPreference],
      ['Food', values.foodPreferences.length ? values.foodPreferences.join(', ') : 'No preference'],
      ['Accessibility', values.accessibilityNeeds.length ? values.accessibilityNeeds.join(', ') : 'No special needs'],
    ],
    [values]
  );

  const applyDemoInput = async () => {
    reset(hyderabadToGoaDemoInput);
    await replaceDraft(hyderabadToGoaDemoInput);
    setStep(0);
    setErrorMessage('');
  };

  const clearForm = async () => {
    reset(emptyPlanTripDraft);
    await clearDraft();
    setStep(0);
    setErrorMessage('');
    createdTripIdRef.current = null;
  };

  const validateCurrentStep = () => {
    const currentValues = getValues();
    const result = stepSchemas[step].safeParse(currentValues);

    if (result.success) return true;

    result.error.issues.forEach((issue) => {
      const fieldName = issue.path[0] as keyof PlanTripFormData | undefined;
      if (fieldName) {
        setError(fieldName, { type: 'manual', message: issue.message });
      }
    });

    return false;
  };

  const goNext = async () => {
    setErrorMessage('');
    if (!validateCurrentStep()) return;
    await updateDraft(getValues());
    setStep((current) => Math.min(current + 1, editableStepCount - 1));
  };

  const goBack = async () => {
    await updateDraft(getValues());
    setStep((current) => Math.max(current - 1, 0));
  };

  const saveDraftTrip = async (formData: PlanTripFormData) => {
    if (!authUser) {
      setErrorMessage('Please log in again before creating a trip.');
      return;
    }

    if (submitting || createdTripIdRef.current) return;

    setSubmitting(true);
    setErrorMessage('');
    await trackAnalyticsEvent({
      userId: authUser.id,
      name: 'trip_creation_started',
      properties: {
        source: 'plan_trip_wizard',
        travelerCount: formData.adults + formData.children,
        budgetMinor: rupeesToPaise(formData.totalBudget),
        currency: formData.currency,
      },
    });

    const tripId = createTripId();
    createdTripIdRef.current = tripId;

    try {
      const { error } = await supabase.from('trips').insert({
        id: tripId,
        created_by: authUser.id,
        title: `${formData.startingCity} to ${formData.destination}`,
        origin_name: formData.startingCity,
        destination_name: formData.destination,
        start_date: formData.startDate,
        end_date: formData.endDate,
        status: 'draft',
        currency_code: formData.currency.toUpperCase(),
        total_budget_minor: rupeesToPaise(formData.totalBudget),
        metadata: {
          flexible_dates: formData.flexibleDates,
          travelers: {
            adults: formData.adults,
            children: formData.children,
            total: formData.adults + formData.children,
            trip_type: formData.tripType,
          },
          interests: formData.interests,
          preferred_transport: formData.preferredTransport,
          travel_pace: formData.travelPace,
          comfort_preference: formData.comfortPreference,
          accommodation_preference: formData.accommodationPreference,
          food_preferences: formData.foodPreferences,
          accessibility_needs: formData.accessibilityNeeds,
        },
      });

      if (error) throw error;
      await trackAnalyticsEvent({
        userId: authUser.id,
        name: 'trip_created',
        properties: {
          tripId,
          source: 'plan_trip_wizard',
          destination: formData.destination,
          durationDays: Math.max(1, Math.round((new Date(formData.endDate).getTime() - new Date(formData.startDate).getTime()) / 86_400_000) + 1),
          travelerCount: formData.adults + formData.children,
          budgetMinor: rupeesToPaise(formData.totalBudget),
          currency: formData.currency,
        },
      });

      await clearDraft();
      router.replace(`/(tabs)/trip-generation/${tripId}`);
    } catch (error: any) {
      createdTripIdRef.current = null;
      setErrorMessage(error.message ?? 'Could not save your trip draft.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <>
            <StepTitle title="Source and destination" subtitle="Tell TravelAI where the journey starts and where it should end." />
            <Controller control={control} name="startingCity" render={({ field: { onChange, value } }) => (
              <TextInput label="Starting city" value={value} onChangeText={onChange} error={errors.startingCity?.message} autoCapitalize="words" leftIcon="map-marker-outline" />
            )} />
            <Controller control={control} name="destination" render={({ field: { onChange, value } }) => (
              <TextInput label="Destination" value={value} onChangeText={onChange} error={errors.destination?.message} autoCapitalize="words" leftIcon="map-marker-star-outline" />
            )} />
          </>
        );
      case 1:
        return (
          <>
            <StepTitle title="Travel dates" subtitle="Use exact dates or mark them flexible if you want options nearby." />
            <Controller control={control} name="startDate" render={({ field: { onChange, value } }) => (
              <TextInput label="Start date" value={value} onChangeText={onChange} error={errors.startDate?.message} placeholder="YYYY-MM-DD" leftIcon="calendar-start" />
            )} />
            <Controller control={control} name="endDate" render={({ field: { onChange, value } }) => (
              <TextInput label="End date" value={value} onChangeText={onChange} error={errors.endDate?.message} placeholder="YYYY-MM-DD" leftIcon="calendar-end" />
            )} />
            <Controller control={control} name="flexibleDates" render={({ field: { onChange, value } }) => (
              <View style={styles.switchRow}>
                <View style={styles.switchText}>
                  <Text style={[styles.fieldLabel, { color: theme.colors.onSurface }]}>Flexible dates</Text>
                  <Text style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>Show nearby date options during generation.</Text>
                </View>
                <Switch value={value} onValueChange={onChange} accessibilityLabel="Flexible date preference" />
              </View>
            )} />
          </>
        );
      case 2:
        return (
          <>
            <StepTitle title="Travelers" subtitle="Traveler counts help estimate stays, transport, and shared costs." />
            <View style={[styles.twoColumn, isWide && styles.twoColumnWide]}>
              <Controller control={control} name="adults" render={({ field: { onChange, value } }) => (
                <TextInput label="Adults" value={String(value)} onChangeText={(text) => onChange(Number.parseInt(text || '0', 10))} error={errors.adults?.message} keyboardType="number-pad" leftIcon="account-outline" />
              )} />
              <Controller control={control} name="children" render={({ field: { onChange, value } }) => (
                <TextInput label="Children" value={String(value)} onChangeText={(text) => onChange(Number.parseInt(text || '0', 10))} error={errors.children?.message} keyboardType="number-pad" leftIcon="human-child" />
              )} />
            </View>
            <Text style={[styles.fieldLabel, { color: theme.colors.onSurface }]}>Trip type</Text>
            <Controller control={control} name="tripType" render={({ field: { onChange, value } }) => (
              <ChoiceChips options={['solo', 'couple', 'family', 'friends', 'work']} selected={[value]} onChange={(items) => onChange(items[0])} multi={false} error={errors.tripType?.message} />
            )} />
          </>
        );
      case 3:
        return (
          <>
            <StepTitle title="Budget" subtitle="Set the total budget for everyone. You can change this later." />
            <Controller control={control} name="totalBudget" render={({ field: { onChange, value } }) => (
              <TextInput label="Total budget" value={String(value)} onChangeText={(text) => onChange(Number.parseInt(text || '0', 10))} error={errors.totalBudget?.message} keyboardType="number-pad" leftIcon="wallet-outline" />
            )} />
            <Text style={[styles.fieldLabel, { color: theme.colors.onSurface }]}>Currency</Text>
            <Controller control={control} name="currency" render={({ field: { onChange, value } }) => (
              <ChoiceChips options={['INR', 'USD', 'EUR', 'GBP', 'SGD', 'AED']} selected={[value]} onChange={(items) => onChange(items[0])} multi={false} error={errors.currency?.message} />
            )} />
            <Text style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
              Current estimate: {formatINR(rupeesToPaise(Number(values.totalBudget || 0)))}
            </Text>
          </>
        );
      case 4:
        return (
          <>
            <StepTitle title="Interests" subtitle="Pick the themes that should shape the itinerary." />
            <Controller control={control} name="interests" render={({ field: { onChange, value } }) => (
              <ChoiceChips options={interestOptions} selected={value} onChange={onChange} error={errors.interests?.message} />
            )} />
          </>
        );
      case 5:
        return (
          <>
            <StepTitle title="Travel preferences" subtitle="These preferences keep the generated plan practical for your group." />
            <Text style={[styles.fieldLabel, { color: theme.colors.onSurface }]}>Preferred transport</Text>
            <Controller control={control} name="preferredTransport" render={({ field: { onChange, value } }) => (
              <ChoiceChips options={transportOptions} selected={value} onChange={onChange} error={errors.preferredTransport?.message} />
            )} />
            <Text style={[styles.fieldLabel, { color: theme.colors.onSurface }]}>Travel pace</Text>
            <Controller control={control} name="travelPace" render={({ field: { onChange, value } }) => (
              <ChoiceChips options={['slow', 'moderate', 'packed']} selected={[value]} onChange={(items) => onChange(items[0])} multi={false} error={errors.travelPace?.message} />
            )} />
            <Text style={[styles.fieldLabel, { color: theme.colors.onSurface }]}>Comfort preference</Text>
            <Controller control={control} name="comfortPreference" render={({ field: { onChange, value } }) => (
              <ChoiceChips options={['budget', 'standard', 'premium']} selected={[value]} onChange={(items) => onChange(items[0])} multi={false} error={errors.comfortPreference?.message} />
            )} />
            <Text style={[styles.fieldLabel, { color: theme.colors.onSurface }]}>Accommodation preference</Text>
            <Controller control={control} name="accommodationPreference" render={({ field: { onChange, value } }) => (
              <ChoiceChips options={['hostel', 'budget_hotel', 'hotel', 'apartment', 'resort']} selected={[value]} onChange={(items) => onChange(items[0])} multi={false} error={errors.accommodationPreference?.message} />
            )} />
            <Text style={[styles.fieldLabel, { color: theme.colors.onSurface }]}>Food preferences, optional</Text>
            <Controller control={control} name="foodPreferences" render={({ field: { onChange, value } }) => (
              <ChoiceChips options={foodOptions} selected={value} onChange={onChange} />
            )} />
            <Text style={[styles.fieldLabel, { color: theme.colors.onSurface }]}>Accessibility needs, optional</Text>
            <Controller control={control} name="accessibilityNeeds" render={({ field: { onChange, value } }) => (
              <ChoiceChips options={accessibilityOptions} selected={value} onChange={onChange} />
            )} />
          </>
        );
      default:
        return (
          <>
            <StepTitle title="Review" subtitle="Check the complete trip brief before creating a draft." />
            <View style={[styles.reviewCard, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface }]}>
              {reviewRows.map(([label, value]) => (
                <View key={label} style={styles.reviewRow}>
                  <Text style={[styles.reviewLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
                  <Text style={[styles.reviewValue, { color: theme.colors.onSurface }]}>{value}</Text>
                </View>
              ))}
            </View>
          </>
        );
    }
  };

  return (
    <ScreenContainer safeArea={false} keyboardAvoiding>
      <ScrollView contentContainerStyle={[styles.container, isWide && styles.wideContainer]} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <MaterialCommunityIcons name="map-plus" size={26} color={theme.colors.primary} />
            <Text style={[styles.title, { color: theme.colors.onBackground }]}>Plan a Trip</Text>
          </View>
          <Text style={[styles.stepCounter, { color: theme.colors.onSurfaceVariant }]}>
            Step {step + 1} of {planTripSteps.length}: {planTripSteps[step]}
          </Text>
          <ProgressBar progress={progress} color={theme.colors.primary} style={styles.progress} />
        </View>

        <View style={styles.demoActions}>
          <Button mode="outlined" icon="auto-fix" onPress={applyDemoInput}>Use Hyderabad-Goa demo</Button>
          <Button mode="text" icon="backup-restore" onPress={clearForm}>Reset</Button>
        </View>

        <View style={[styles.formPanel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
          {renderStep()}
          {!!errorMessage && (
            <Text accessibilityRole="alert" style={[styles.errorText, { color: theme.colors.error }]}>
              {errorMessage}
            </Text>
          )}
        </View>

        <View style={styles.footer}>
          <Button mode="outlined" onPress={goBack} disabled={step === 0 || submitting}>
            Back
          </Button>
          {step < editableStepCount - 1 ? (
            <Button onPress={goNext} disabled={submitting}>Continue</Button>
          ) : (
            <Button onPress={handleSubmit(saveDraftTrip)} loading={submitting} disabled={!!createdTripIdRef.current}>
              Create draft
            </Button>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function StepTitle({ title, subtitle }: { title: string; subtitle: string }) {
  const theme = useTheme();
  return (
    <View style={styles.stepTitleBlock}>
      <Text style={[styles.stepTitle, { color: theme.colors.onSurface }]}>{title}</Text>
      <Text style={[styles.stepSubtitle, { color: theme.colors.onSurfaceVariant }]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  wideContainer: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 820,
    paddingHorizontal: 24,
  },
  header: {
    marginTop: 12,
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
  },
  stepCounter: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  progress: {
    height: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  demoActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  formPanel: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
  },
  stepTitleBlock: {
    marginBottom: 12,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  stepSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  twoColumn: {
    gap: 0,
  },
  twoColumnWide: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '900',
    marginTop: 14,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 12,
  },
  switchText: {
    flex: 1,
  },
  reviewCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
  },
  reviewRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#CBD5E1',
  },
  reviewLabel: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  reviewValue: {
    fontSize: 15,
    lineHeight: 21,
    marginTop: 3,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 16,
  },
});
