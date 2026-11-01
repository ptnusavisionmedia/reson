import { redirect } from 'next/navigation';

import { AuthShell } from '@/components/auth-ui';
import { IntroFlow } from '@/components/onboarding-client';
import { loadAccountState } from '@/lib/auth/onboarding';
import { createClient } from '@/lib/supabase/server';

export default async function IntroductionPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');
  const account = await loadAccountState(supabase, auth.user.id);
  if (account && !account.profileCompleted) redirect('/complete-profile');
  if (account?.onboardingCompleted) redirect('/home');

  return (
    <AuthShell title="Selamat datang di Reson">
      <IntroFlow />
    </AuthShell>
  );
}
