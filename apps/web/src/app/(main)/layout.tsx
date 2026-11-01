import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { AppShell } from '@/components/app-shell';
import { createClient } from '@/lib/supabase/server';

// Guard UX; otorisasi data sebenarnya tetap di RLS/RPC Supabase.
export default async function MainLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');

  const [acc, prof] = await Promise.all([
    supabase.from('accounts').select('profile_completed').eq('id', auth.user.id).single(),
    supabase.from('profiles').select('username').eq('id', auth.user.id).single(),
  ]);
  if (acc.data && !acc.data.profile_completed) redirect('/complete-profile');

  return <AppShell username={prof.data?.username ?? null}>{children}</AppShell>;
}
