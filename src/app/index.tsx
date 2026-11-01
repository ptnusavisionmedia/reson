import { Redirect } from 'expo-router';

import { useAuth } from '@/providers/AuthProvider';

export default function Index() {
  const { session, onboardingCompleted, profileCompleted, recovering, introSeen } = useAuth();
  if (!session) return <Redirect href="/login" />;
  if (recovering) return <Redirect href="/update-password" />;
  // Tujuan harus sesuai guard di _layout; tujuan yang diproteksi membuat layar berkedip terus.
  if (!profileCompleted) return <Redirect href="/complete-profile" />;
  if (!onboardingCompleted) return <Redirect href={introSeen ? '/sound-quiz' : '/introduction'} />;
  return <Redirect href="/home" />;
}
