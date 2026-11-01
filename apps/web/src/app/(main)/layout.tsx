import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { AppShell } from '@/components/app-shell';
import { DeletionResume } from '@/components/delete-account';
import { loadAccountState } from '@/lib/auth/onboarding';
import { createClient } from '@/lib/supabase/server';

// Guard UX; otorisasi data sebenarnya tetap di RLS/RPC Supabase.
export default async function MainLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');

  const [account, prof] = await Promise.all([
    loadAccountState(supabase, auth.user.id),
    supabase.from('profiles').select('username, status').eq('id', auth.user.id).single(),
  ]);

  // Akun yang penghapusannya terputus hanya boleh menyelesaikan penghapusan atau keluar.
  if (prof.data?.status === 'deleting') return <DeletionResume uid={auth.user.id} />;

  if (account && !account.profileCompleted) redirect('/complete-profile');
  if (account && !account.onboardingCompleted) redirect(account.introSeen ? '/sound-quiz' : '/introduction');

  return (
    <AppShell userId={auth.user.id} username={prof.data?.username ?? null}>
      {children}
    </AppShell>
  );
}
