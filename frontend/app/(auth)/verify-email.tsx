import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Snackbar, useTheme } from 'react-native-paper';
import { AuthScreenHeader } from '../../src/features/auth/AuthScreenHeader';
import { Button } from '../../src/components/common/Button';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { authUser, signOut } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const resend = async () => {
    if (!authUser?.email) {
      setMessage('Log in again to resend verification.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: authUser.email,
      });
      if (error) throw error;
      setMessage('Verification email sent.');
    } catch (error: any) {
      setMessage(error.message ?? 'Could not resend verification email.');
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.refreshSession();
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data.user?.email_confirmed_at) {
      router.replace('/(onboarding)/profile-setup');
    } else {
      setMessage('Still waiting for verification. Open the email link, then try again.');
    }
  };

  return (
    <ScreenContainer safeArea contentContainerStyle={styles.container}>
      <AuthScreenHeader
        title="Verify your email"
        subtitle="Open the confirmation link we sent to your inbox. This protects your account and keeps trip data tied to the right person."
      />

      <Text style={[styles.email, { color: theme.colors.onSurfaceVariant }]}>
        {authUser?.email ?? 'After signing up, return here once your email is verified.'}
      </Text>

      <Button onPress={refresh} loading={loading}>I verified my email</Button>
      <Button mode="outlined" onPress={resend} loading={loading}>Resend email</Button>
      <Button mode="text" onPress={signOut}>Use a different account</Button>

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
  email: {
    fontSize: 15,
    marginBottom: 20,
  },
});
