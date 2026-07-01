import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet } from 'react-native';
import { zodResolver } from '@hookform/resolvers/zod';
import { Snackbar } from 'react-native-paper';
import { AuthScreenHeader } from '../../src/features/auth/AuthScreenHeader';
import { Button } from '../../src/components/common/Button';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { TextInput } from '../../src/components/common/TextInput';
import { supabase } from '../../src/lib/supabase';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '../../src/features/auth/validation';

export default function ForgotPasswordScreen() {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async ({ email }: ForgotPasswordFormData) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      setMessage('Password reset email sent. Check your inbox for the secure reset link.');
    } catch (error: any) {
      setMessage(error.message ?? 'Could not send reset email.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer scrollable safeArea contentContainerStyle={styles.container}>
      <AuthScreenHeader
        title="Reset password"
        subtitle="Enter your account email and we will send a secure password reset link."
      />

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <TextInput
            label="Email"
            value={value}
            onChangeText={onChange}
            error={errors.email?.message}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon="email-outline"
          />
        )}
      />

      <Button onPress={handleSubmit(onSubmit)} loading={submitting} style={styles.submit}>
        Send reset link
      </Button>

      <Snackbar visible={!!message} onDismiss={() => setMessage('')} duration={5000}>
        {message}
      </Snackbar>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    padding: 24,
  },
  submit: {
    marginTop: 14,
  },
});
