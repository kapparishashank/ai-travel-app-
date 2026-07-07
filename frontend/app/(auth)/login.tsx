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
import { supabase } from '../../src/lib/supabase';
import { loginSchema, type LoginFormData } from '../../src/features/auth/validation';
import { useAuthStore } from '../../src/store/authStore';

export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
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
            title="Welcome back" 
            subtitle="Log in to continue planning your trips." 
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

          <Button onPress={handleSubmit(onSubmit)} loading={submitting} style={styles.submit} color={theme.colors.secondary}>
            Log in
          </Button>

          <Text
            accessibilityRole="button"
            onPress={() => router.push('/(auth)/forgot-password')}
            style={[styles.centerLink, { color: theme.colors.primary }]}
          >
            Forgot password?
          </Text>

          <View style={styles.footer}>
            <Text style={{ color: 'rgba(255,255,255,0.85)' }}>New to TravelAI? </Text>
            <Text
              accessibilityRole="button"
              onPress={() => router.push('/(auth)/register')}
              style={[styles.link, { color: theme.colors.primary }]}
            >
              Create account
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
