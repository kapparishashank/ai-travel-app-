import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View, ImageBackground } from 'react-native';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Snackbar, useTheme } from 'react-native-paper';
import { AuthScreenHeader } from '../../src/features/auth/AuthScreenHeader';
import { Button } from '../../src/components/common/Button';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { TextInput } from '../../src/components/common/TextInput';
import { GlassCard } from '../../src/components/common/GlassCard';
import { MOUNTAIN_IMAGES } from '../../src/constants/images';
import { trackAnalyticsEvent } from '../../src/features/analytics/analytics';
import { supabase } from '../../src/lib/supabase';
import { signUpSchema, type SignUpFormData } from '../../src/features/auth/validation';

export default function RegisterScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: SignUpFormData) => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: { full_name: values.fullName },
        },
      });

      if (error) throw error;
      await trackAnalyticsEvent({
        userId: data.user?.id,
        name: 'signup_completed',
        properties: { source: 'email_password' },
      });
      router.replace({ pathname: '/(auth)/verify-email', params: { email: values.email } });
    } catch (error: any) {
      setMessage(error.message ?? 'Could not create your account.');
    } finally {
      setSubmitting(false);
    }
  };

  const appendGmailDomain = (currentEmail: string) => {
    const trimmed = currentEmail.trim();
    if (!trimmed) {
      setValue('email', '@gmail.com', { shouldDirty: true, shouldValidate: true });
      return;
    }
    if (trimmed.toLowerCase().endsWith('@gmail.com')) return;
    const localPart = trimmed.includes('@') ? trimmed.split('@')[0] : trimmed;
    setValue('email', `${localPart}@gmail.com`, { shouldDirty: true, shouldValidate: true });
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
            title="Create account"
            subtitle="Use email and password. Supabase stores credentials securely; TravelAI never stores passwords manually."
            titleColor="#FFFFFF"
            subtitleColor="rgba(255,255,255,0.85)"
          />

          <Controller
            control={control}
            name="fullName"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Full name"
                value={value}
                onChangeText={onChange}
                error={errors.fullName?.message}
                autoCapitalize="words"
                leftIcon="account-outline"
              />
            )}
          />

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <>
                <TextInput
                  label="Email"
                  value={value}
                  onChangeText={onChange}
                  error={errors.email?.message}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leftIcon="email-outline"
                />
                <Button
                  mode="outlined"
                  icon="email-plus-outline"
                  onPress={() => appendGmailDomain(value)}
                  style={styles.gmailButton}
                  accessibilityLabel="Add Gmail domain"
                >
                  @gmail.com
                </Button>
              </>
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Password"
                value={value}
                onChangeText={onChange}
                error={errors.password?.message}
                secureTextEntry={!showPassword}
                leftIcon="lock-outline"
                rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                onRightIconPress={() => setShowPassword((current) => !current)}
                accessibilityLabel="Password"
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Confirm password"
                value={value}
                onChangeText={onChange}
                error={errors.confirmPassword?.message}
                secureTextEntry={!showConfirmPassword}
                leftIcon="lock-check-outline"
                rightIcon={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                onRightIconPress={() => setShowConfirmPassword((current) => !current)}
                accessibilityLabel="Confirm password"
              />
            )}
          />

          <Button onPress={handleSubmit(onSubmit)} loading={submitting} style={styles.submit} color={theme.colors.secondary}>
            Sign up
          </Button>

          <View style={styles.footer}>
            <Text style={{ color: 'rgba(255,255,255,0.85)' }}>Already registered? </Text>
            <Text
              accessibilityRole="button"
              onPress={() => router.push('/(auth)/login')}
              style={[styles.link, { color: theme.colors.primary }]}
            >
              Log in
            </Text>
          </View>
        </GlassCard>
      </View>

      <Snackbar visible={!!message} onDismiss={() => setMessage('')} duration={4000}>
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
  gmailButton: {
    alignSelf: 'flex-end',
    minHeight: 36,
    marginTop: -2,
    marginBottom: 8,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },
  link: {
    fontWeight: '800',
  },
});
