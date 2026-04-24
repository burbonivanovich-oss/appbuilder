import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="how-it-works" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="create-child" />
    </Stack>
  );
}
