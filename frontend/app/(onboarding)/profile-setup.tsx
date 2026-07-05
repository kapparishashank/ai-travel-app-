import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text } from 'react-native';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Snackbar, useTheme } from 'react-native-paper';
import { Button } from '../../src/components/common/Button';
import { ChoiceChips } from '../../src/components/common/ChoiceChips';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { TextInput } from '../../src/components/common/TextInput';
import { AuthScreenHeader } from '../../src/features/auth/AuthScreenHeader';
import { currencyOptions, languageOptions } from '../../src/features/auth/options';
import { profileSetupSchema, type ProfileSetupFormData } from '../../src/features/auth/validation';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';

export default function ProfileSetupScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { authUser, user, refreshProfile } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileSetupFormData>({
    resolver: zodResolver(profileSetupSchema),
    defaultValues: {
      fullName: user?.full_name ?? authUser?.user_metadata?.full_name ?? '',
      phone: user?.phone ?? '',
      dateOfBirth: user?.date_of_birth ?? '',
      homeCity: user?.home_city ?? '',
      avatarUrl: user?.avatar_url ?? '',
      preferredCurrency: user?.currency_code ?? 'INR',
      preferredLanguage: user?.preferred_language ?? user?.preferred_lang ?? 'en',
    },
  });

  const onSubmit = async (values: ProfileSetupFormData) => {
    if (!authUser) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: values.fullName,
          phone: values.phone || null,
          date_of_birth: values.dateOfBirth || null,
          home_city: values.homeCity,
          avatar_url: values.avatarUrl || null,
          currency_code: values.preferredCurrency.toUpperCase(),
          preferred_language: values.preferredLanguage,
        })
        .eq('id', authUser.id);

      if (error) throw error;
      await refreshProfile();
      router.replace('/(onboarding)/travel-preferences');
    } catch (error: any) {
      setMessage(error.message ?? 'Could not save your profile.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer scrollable safeArea contentContainerStyle={styles.container}>
      <AuthScreenHeader
        title="Set up your profile"
        subtitle="These basics personalize budgets, local defaults, and trip sharing."
      />

      <Controller control={control} name="fullName" render={({ field: { onChange, value } }) => (
        <TextInput label="Full name" value={value} onChangeText={onChange} error={errors.fullName?.message} autoCapitalize="words" leftIcon="account-outline" />
      )} />
      <Controller control={control} name="phone" render={({ field: { onChange, value } }) => (
        <TextInput label="Phone number, optional" value={value ?? ''} onChangeText={onChange} error={errors.phone?.message} keyboardType="phone-pad" leftIcon="phone-outline" />
      )} />
      <Controller control={control} name="dateOfBirth" render={({ field: { onChange, value } }) => (
        <TextInput label="Date of birth, optional" value={value ?? ''} onChangeText={onChange} error={errors.dateOfBirth?.message} placeholder="YYYY-MM-DD" leftIcon="calendar-outline" />
      )} />
      <Controller control={control} name="homeCity" render={({ field: { onChange, value } }) => (
        <TextInput label="Home city" value={value} onChangeText={onChange} error={errors.homeCity?.message} autoCapitalize="words" leftIcon="home-city-outline" />
      )} />
      <Controller control={control} name="avatarUrl" render={({ field: { onChange, value } }) => (
        <TextInput label="Profile image URL, optional" value={value ?? ''} onChangeText={onChange} error={errors.avatarUrl?.message} autoCapitalize="none" leftIcon="image-outline" />
      )} />

      <Text style={[styles.label, { color: theme.colors.onSurface }]}>Preferred currency</Text>
      <Controller control={control} name="preferredCurrency" render={({ field: { onChange, value } }) => (
        <ChoiceChips options={currencyOptions} selected={[value]} onChange={(items) => onChange(items[0])} multi={false} error={errors.preferredCurrency?.message} />
      )} />

      <Text style={[styles.label, { color: theme.colors.onSurface }]}>Preferred language</Text>
      <Controller control={control} name="preferredLanguage" render={({ field: { onChange, value } }) => (
        <ChoiceChips options={languageOptions.map((item) => item.value)} selected={[value]} onChange={(items) => onChange(items[0])} multi={false} error={errors.preferredLanguage?.message} />
      )} />

      <Button onPress={handleSubmit(onSubmit)} loading={submitting} style={styles.submit}>Save profile</Button>

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
    marginTop: 20,
  },
});
