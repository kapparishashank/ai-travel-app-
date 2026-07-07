import React, { useState } from 'react';
import { StyleSheet, Text, View, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { Snackbar, useTheme } from 'react-native-paper';
import { AuthScreenHeader } from '../../src/features/auth/AuthScreenHeader';
import { Button } from '../../src/components/common/Button';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { GlassCard } from '../../src/components/common/GlassCard';
import { MOUNTAIN_IMAGES } from '../../src/constants/images';
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
            title="Verify your email"
            subtitle="Open the confirmation link we sent to your inbox. This protects your account and keeps trip data tied to the right person."
            titleColor="#FFFFFF"
            subtitleColor="rgba(255,255,255,0.85)"
          />

          <Text style={[styles.email, { color: 'rgba(255,255,255,0.85)' }]}>
            {authUser?.email ?? 'After signing up, return here once your email is verified.'}
          </Text>

          <Button onPress={refresh} loading={loading} color={theme.colors.secondary}>
            I verified my email
          </Button>
          <Button mode="outlined" onPress={resend} loading={loading} style={styles.btnOutlined} color="#FFFFFF">
            Resend email
          </Button>
          <Button mode="text" onPress={signOut} style={styles.btnText} color="rgba(255,255,255,0.70)">
            Use a different account
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
  email: {
    fontSize: 15,
    marginBottom: 20,
  },
  btnOutlined: {
    marginTop: 8,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  btnText: {
    marginTop: 8,
  },
});
