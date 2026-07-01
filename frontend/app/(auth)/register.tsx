import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Snackbar, useTheme } from 'react-native-paper';
import { AuthScreenHeader } from '../../src/features/auth/AuthScreenHeader';
import { Button } from '../../src/components/common/Button';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { TextInput } from '../../src/components/common/TextInput';
import { supabase } from '../../src/lib/supabase';
import { signUpSchema, type SignUpFormData } from '../../src/features/auth/validation';

export default function RegisterScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: SignUpFormData) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: { full_name: values.fullName },
        },
      });

      if (error) throw error;
      router.replace('/(auth)/verify-email');
    } catch (error: any) {
      setMessage(error.message ?? 'Could not create your account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer scrollable safeArea contentContainerStyle={styles.container}>
      <AuthScreenHeader
        title="Create account"
        subtitle="Use email and password. Supabase stores credentials securely; TravelAI never stores passwords manually."
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

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value } }) => (
          <TextInput
            label="Password"
            value={value}
            onChangeText={onChange}
            error={errors.password?.message}
            secureTextEntry
            leftIcon="lock-outline"
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
            secureTextEntry
            leftIcon="lock-check-outline"
          />
        )}
      />

      <Button onPress={handleSubmit(onSubmit)} loading={submitting} style={styles.submit}>
        Sign up
      </Button>

      <View style={styles.footer}>
        <Text style={{ color: theme.colors.onSurfaceVariant }}>Already registered? </Text>
        <Text
          accessibilityRole="button"
          onPress={() => router.push('/(auth)/login')}
          style={[styles.link, { color: theme.colors.primary }]}
        >
          Log in
        </Text>
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
    padding: 24,
  },
  submit: {
    marginTop: 14,
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
