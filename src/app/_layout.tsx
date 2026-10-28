import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

import { ErrorState, Loading } from '@/components/ui';
import { DeletionResume } from '@/features/account/DeletionResume';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { loading, bootstrapError, retry, session, onboardingCompleted, accountStatus } = useAuth();

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
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Loading />
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
      <Stack.Protected guard={!!session && !onboardingCompleted}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && onboardingCompleted}>
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
    </AuthProvider>
  );
}
