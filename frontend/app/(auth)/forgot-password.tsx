import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View, ImageBackground } from 'react-native';
import { zodResolver } from '@hookform/resolvers/zod';
import { Snackbar, useTheme } from 'react-native-paper';
import { AuthScreenHeader } from '../../src/features/auth/AuthScreenHeader';
import { Button } from '../../src/components/common/Button';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { TextInput } from '../../src/components/common/TextInput';
import { GlassCard } from '../../src/components/common/GlassCard';
import { MOUNTAIN_IMAGES } from '../../src/constants/images';
import { supabase } from '../../src/lib/supabase';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '../../src/features/auth/validation';

export default function ForgotPasswordScreen() {
  const theme = useTheme();
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
      <ImageBackground
        source={{ uri: MOUNTAIN_IMAGES.road }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        resizeMode="cover"
      >
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.45)' }} />
      </ImageBackground>

      <View style={styles.wrapper}>
        <GlassCard style={styles.cardContainer}>
          <AuthScreenHeader
            title="Reset password"
            subtitle="Enter your account email and we will send a secure password reset link."
            titleColor="#FFFFFF"
            subtitleColor="rgba(255,255,255,0.85)"
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

          <Button onPress={handleSubmit(onSubmit)} loading={submitting} style={styles.submit} color={theme.colors.secondary}>
            Send reset link
          </Button>
        </GlassCard>
      </View>

      <Snackbar visible={!!message} onDismiss={() => setMessage('')} duration={5000}>
        {message}
      </Snackbar>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    padding: 16,
    minHeight: '100%',
  },
  wrapper: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    marginVertical: 24,
    zIndex: 2,
  },
  cardContainer: {
    padding: 24,
    borderRadius: 24,
    backgroundColor: 'rgba(15,23,42,0.65)',
    borderColor: 'rgba(255,255,255,0.15)',
  },
  submit: {
    marginTop: 14,
  },
});
