import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { Snackbar, useTheme } from 'react-native-paper';
import { AuthScreenHeader } from '../../src/features/auth/AuthScreenHeader';
import { Button } from '../../src/components/common/Button';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { TextInput } from '../../src/components/common/TextInput';
import { supabase } from '../../src/lib/supabase';
import { loginSchema, type LoginFormData } from '../../src/features/auth/validation';
import { useAuthStore } from '../../src/store/authStore';

export default function LoginScreen() {
  const theme = useTheme();
  const refreshProfile = useAuthStore((state) => state.refreshProfile);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginFormData) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword(values);
      if (error) throw error;
      await refreshProfile();
    } catch (error: any) {
      setMessage(error.message ?? 'Login failed. Check your email and password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer scrollable safeArea contentContainerStyle={styles.container}>
      <AuthScreenHeader title="Welcome back" subtitle="Log in to continue planning your trips." />

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

      <Button onPress={handleSubmit(onSubmit)} loading={submitting} style={styles.submit}>
        Log in
      </Button>

      <Link href="/(auth)/forgot-password" asChild>
        <Text style={[styles.centerLink, { color: theme.colors.primary }]}>Forgot password?</Text>
      </Link>

      <View style={styles.footer}>
        <Text style={{ color: theme.colors.onSurfaceVariant }}>New to TravelAI? </Text>
        <Link href="/(auth)/register" asChild>
          <Text style={[styles.link, { color: theme.colors.primary }]}>Create account</Text>
        </Link>
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
  centerLink: {
    alignSelf: 'center',
    fontWeight: '700',
    marginTop: 16,
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
