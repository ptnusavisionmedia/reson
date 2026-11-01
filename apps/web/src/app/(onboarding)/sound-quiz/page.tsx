import { redirect } from 'next/navigation';

import { AuthShell } from '@/components/auth-ui';
import { OnboardingQuiz } from '@/components/onboarding-client';
import { loadAccountState, loadSoundProfile } from '@/lib/auth/onboarding';
import { createClient } from '@/lib/supabase/server';

export default async function SoundQuizPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');
  const account = await loadAccountState(supabase, auth.user.id);
  if (account && !account.profileCompleted) redirect('/complete-profile');
  if (account?.onboardingCompleted) redirect('/settings/sound-profile');

  const initial = await loadSoundProfile(supabase, auth.user.id);
  return (
    <AuthShell title="Sound Profile">
      <OnboardingQuiz initial={initial} />
    </AuthShell>
  );
}
