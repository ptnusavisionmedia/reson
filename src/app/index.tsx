import { Redirect } from 'expo-router';

import { useAuth } from '@/providers/AuthProvider';

export default function Index() {
  const { session, onboardingCompleted, introSeen } = useAuth();
  if (!session) return <Redirect href="/login" />;
  if (!onboardingCompleted) return <Redirect href={introSeen ? '/sound-quiz' : '/introduction'} />;
  return <Redirect href="/home" />;
}
