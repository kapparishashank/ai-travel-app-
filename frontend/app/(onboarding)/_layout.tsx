import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="profile-setup" />
      <Stack.Screen name="travel-preferences" />
      <Stack.Screen name="permissions" />
    </Stack>
  );
}
