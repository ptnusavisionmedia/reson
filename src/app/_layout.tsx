import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { ErrorState } from '@/components/ui';
import { Logo } from '@/components/ui/Logo';
import { UpdateBanner } from '@/features/updates/UpdateBanner';
import { DeletionResume } from '@/features/account/DeletionResume';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { loading, bootstrapError, retry, session, onboardingCompleted, profileCompleted, accountStatus } = useAuth();

  useEffect(() => {
    if (!loading || bootstrapError) SplashScreen.hideAsync();
  }, [loading, bootstrapError]);

  if (bootstrapError) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ErrorState message="Tidak bisa memuat akun. Periksa koneksi Anda." onRetry={retry} />
      </View>
    );
  }
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 24 }}>
        <Logo size={96} />
        <ActivityIndicator color={colors.accent} accessibilityLabel="Memuat" />
      </View>
    );
  }

  // Akun yang penghapusannya terputus hanya boleh menyelesaikan penghapusan atau keluar.
  if (session && accountStatus === 'deleting') return <DeletionResume />;

  // Guard hanya untuk UX; otorisasi sebenarnya ada di RLS/RPC Supabase.
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && !profileCompleted}>
        <Stack.Screen name="complete-profile" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && profileCompleted && !onboardingCompleted}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && profileCompleted && onboardingCompleted}>
        <Stack.Screen name="(main)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <RootNavigator />
      <UpdateBanner />
    </AuthProvider>
  );
}
