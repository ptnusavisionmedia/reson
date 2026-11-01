import { Redirect } from 'expo-router';

import { useAuth } from '@/providers/AuthProvider';

export default function Index() {
  const { session, onboardingCompleted, profileCompleted, introSeen } = useAuth();
  if (!session) return <Redirect href="/login" />;
  // Tujuan harus sesuai guard di _layout; tujuan yang diproteksi membuat layar berkedip terus.
  if (!profileCompleted) return <Redirect href="/complete-profile" />;
  if (!onboardingCompleted) return <Redirect href={introSeen ? '/sound-quiz' : '/introduction'} />;
  return <Redirect href="/home" />;
}
