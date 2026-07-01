import React, { useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTheme, Snackbar } from 'react-native-paper';
import { Link, useRouter } from 'expo-router';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { TextInput } from '../../src/components/common/TextInput';
import { Button } from '../../src/components/common/Button';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';

const registerSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const theme = useTheme();
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '' },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setSubmitting(true);
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
          },
        },
      });

      if (error) throw error;

      if (authData.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (profile) {
          setUser(profile);
          setToastMessage('Account created successfully!');
        } else {
          setToastMessage('Account created! Please log in.');
        }
      }
    } catch (err: any) {
      setToastMessage(err.message ?? 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer scrollable safeArea contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.primary }]}>Create Account</Text>
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          Join TravelAI to start planning
        </Text>
      </View>

      <View style={styles.form}>
        <Controller
          control={control}
          name="fullName"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Full Name"
              value={value}
              onChangeText={onChange}
              error={errors.fullName?.message}
              autoCapitalize="words"
              leftIcon="account-outline"
              accessibilityLabel="Full Name input"
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
              accessibilityLabel="Email input"
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
              accessibilityLabel="Password input"
            />
          )}
        />

        <Button
          mode="contained"
          onPress={handleSubmit(onSubmit)}
          loading={submitting}
          style={styles.submitBtn}
          accessibilityLabel="Register button"
        >
          Register
        </Button>

        <View style={styles.footer}>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <Text style={[styles.link, { color: theme.colors.primary }]}>Log In</Text>
          </Link>
        </View>
      </View>

      <Snackbar
        visible={!!toastMessage}
        onDismiss={() => setToastMessage('')}
        duration={3000}
        style={{ backgroundColor: theme.colors.inverseSurface }}
      >
        {toastMessage}
      </Snackbar>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingVertical: 48,
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
  },
  form: {
    width: '100%',
  },
  submitBtn: {
    marginTop: 16,
    paddingVertical: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  link: {
    fontWeight: '700',
  },
});
