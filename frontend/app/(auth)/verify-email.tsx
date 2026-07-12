import React, { useState } from 'react';
import { StyleSheet, Text, View, ImageBackground } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Snackbar, useTheme } from 'react-native-paper';
import { AuthScreenHeader } from '../../src/features/auth/AuthScreenHeader';
import { Button } from '../../src/components/common/Button';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { GlassCard } from '../../src/components/common/GlassCard';
import { TextInput } from '../../src/components/common/TextInput';
import { MOUNTAIN_IMAGES } from '../../src/constants/images';
import { isLocalMockSupabase, supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const theme = useTheme();
  const { authUser, refreshProfile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [code, setCode] = useState('');
  const initialEmail = (params.email || authUser?.email || '').trim().toLowerCase();
  const [email, setEmail] = useState(initialEmail);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const pendingEmail = email.trim().toLowerCase();

  const updateCode = (value: string) => {
    setCode(value.replace(/\D/g, '').slice(0, 6));
  };

  const saveEditedEmail = () => {
    const nextEmail = pendingEmail;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      setMessage('Enter a valid email address.');
      return;
    }

    setEmail(nextEmail);
    setCode('');
    setIsEditingEmail(false);
    setMessage('Email updated. Resend the 6-digit code to this address.');
  };

  const resend = async () => {
    if (!pendingEmail) {
      setMessage('Log in again to resend verification.');
      return;
    }

    if (isLocalMockSupabase) {
      setMessage('Local demo mode cannot send Gmail. Use demo code 123456, or add real Supabase keys to frontend/.env.local.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: pendingEmail,
      });
      if (error) throw error;
      setMessage('6-digit verification code sent. Check your Gmail inbox.');
    } catch (error: any) {
      setMessage(error.message ?? 'Could not resend verification email.');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!pendingEmail) {
      setMessage('Missing email address. Please sign up again.');
      return;
    }
    if (code.length !== 6) {
      setMessage('Enter the 6-digit code from your email.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: pendingEmail,
        token: code,
        type: 'signup',
      });
      if (error) throw error;
      await refreshProfile();
      router.replace('/(onboarding)/profile-setup');
    } catch (error: any) {
      setMessage(error.message ?? 'Could not verify the code.');
    } finally {
      setLoading(false);
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
            subtitle="Enter the 6-digit code we sent to your Gmail inbox. This protects your account and keeps trip data tied to the right person."
            titleColor="#FFFFFF"
            subtitleColor="rgba(255,255,255,0.85)"
          />

          {isEditingEmail ? (
            <View style={styles.emailEditor}>
              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon="email-outline"
                accessibilityLabel="Verification email"
              />
              <View style={styles.emailActions}>
                <Button mode="outlined" onPress={() => setIsEditingEmail(false)} color="#FFFFFF" style={styles.emailActionButton}>
                  Cancel
                </Button>
                <Button onPress={saveEditedEmail} color={theme.colors.secondary} style={styles.emailActionButton}>
                  Use this email
                </Button>
              </View>
            </View>
          ) : (
            <Text style={[styles.email, { color: 'rgba(255,255,255,0.85)' }]}>
              {pendingEmail || 'After signing up, enter the code sent to your email.'}
            </Text>
          )}

          <TextInput
            label="6-digit code"
            value={code}
            onChangeText={updateCode}
            keyboardType="number-pad"
            leftIcon="shield-key-outline"
            placeholder="123456"
            accessibilityLabel="6-digit verification code"
          />

          {isLocalMockSupabase && (
            <Text style={styles.demoNotice}>
              Local demo mode does not send Gmail. Use code 123456, or configure real Supabase email settings.
            </Text>
          )}

          <Button onPress={verifyCode} loading={loading} color={theme.colors.secondary} disabled={code.length !== 6}>
            Verify code
          </Button>
          <Button mode="outlined" onPress={resend} loading={loading} style={styles.btnOutlined} color="#FFFFFF">
            Resend 6-digit code
          </Button>
          <Button mode="text" onPress={() => setIsEditingEmail(true)} style={styles.btnText} color="rgba(255,255,255,0.70)">
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
  emailEditor: {
    marginBottom: 12,
  },
  emailActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
  },
  emailActionButton: {
    minWidth: 132,
  },
  btnOutlined: {
    marginTop: 8,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  btnText: {
    marginTop: 8,
  },
  demoNotice: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
});
