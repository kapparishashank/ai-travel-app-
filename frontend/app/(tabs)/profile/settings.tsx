import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, StyleSheet, Text } from 'react-native';
import { zodResolver } from '@hookform/resolvers/zod';
import { Snackbar, useTheme } from 'react-native-paper';
import { Button } from '../../../src/components/common/Button';
import { ChoiceChips } from '../../../src/components/common/ChoiceChips';
import { ScreenContainer } from '../../../src/components/common/ScreenContainer';
import { TextInput } from '../../../src/components/common/TextInput';
import { currencyOptions, languageOptions } from '../../../src/features/auth/options';
import { profileSetupSchema, type ProfileSetupFormData } from '../../../src/features/auth/validation';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/store/authStore';

export default function AccountSettingsScreen() {
  const theme = useTheme();
  const { authUser, user, refreshProfile, deleteAccount } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileSetupFormData>({
    resolver: zodResolver(profileSetupSchema),
    defaultValues: {
      fullName: user?.full_name ?? '',
      phone: user?.phone ?? '',
      dateOfBirth: user?.date_of_birth ?? '',
      homeCity: user?.home_city ?? '',
      avatarUrl: user?.avatar_url ?? '',
      preferredCurrency: user?.currency_code ?? 'INR',
      preferredLanguage: user?.preferred_language ?? user?.preferred_lang ?? 'en',
    },
  });

  const save = async (values: ProfileSetupFormData) => {
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
      setMessage('Profile updated.');
    } catch (error: any) {
      setMessage(error.message ?? 'Could not update profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your auth account and profile data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAccount();
            } catch (error: any) {
              setMessage(error.message ?? 'Could not delete account.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer scrollable safeArea={false} contentContainerStyle={styles.container}>
      <Controller control={control} name="fullName" render={({ field: { onChange, value } }) => (
        <TextInput label="Full name" value={value} onChangeText={onChange} error={errors.fullName?.message} autoCapitalize="words" />
      )} />
      <Controller control={control} name="phone" render={({ field: { onChange, value } }) => (
        <TextInput label="Phone number, optional" value={value ?? ''} onChangeText={onChange} error={errors.phone?.message} keyboardType="phone-pad" />
      )} />
      <Controller control={control} name="dateOfBirth" render={({ field: { onChange, value } }) => (
        <TextInput label="Date of birth, optional" value={value ?? ''} onChangeText={onChange} error={errors.dateOfBirth?.message} placeholder="YYYY-MM-DD" />
      )} />
      <Controller control={control} name="homeCity" render={({ field: { onChange, value } }) => (
        <TextInput label="Home city" value={value} onChangeText={onChange} error={errors.homeCity?.message} autoCapitalize="words" />
      )} />
      <Controller control={control} name="avatarUrl" render={({ field: { onChange, value } }) => (
        <TextInput label="Profile image URL, optional" value={value ?? ''} onChangeText={onChange} error={errors.avatarUrl?.message} autoCapitalize="none" />
      )} />

      <Text style={[styles.label, { color: theme.colors.onSurface }]}>Preferred currency</Text>
      <Controller control={control} name="preferredCurrency" render={({ field: { onChange, value } }) => (
        <ChoiceChips options={currencyOptions} selected={[value]} onChange={(items) => onChange(items[0])} multi={false} />
      )} />

      <Text style={[styles.label, { color: theme.colors.onSurface }]}>Preferred language</Text>
      <Controller control={control} name="preferredLanguage" render={({ field: { onChange, value } }) => (
        <ChoiceChips options={languageOptions.map((item) => item.value)} selected={[value]} onChange={(items) => onChange(items[0])} multi={false} />
      )} />

      <Button onPress={handleSubmit(save)} loading={submitting} style={styles.submit}>Update profile</Button>
      <Button mode="outlined" onPress={confirmDelete} loading={deleting} color={theme.colors.error}>
        Delete account
      </Button>

      <Snackbar visible={!!message} onDismiss={() => setMessage('')} duration={5000}>
        {message}
      </Snackbar>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
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
