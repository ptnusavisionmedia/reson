import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { createClient } from '@/lib/supabase/server';

// Guard UX; otorisasi data sebenarnya tetap di RLS/RPC Supabase.
export default async function MainLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');

  const { data: acc } = await supabase.from('accounts').select('profile_completed').eq('id', auth.user.id).single();
  if (acc && !acc.profile_completed) redirect('/complete-profile');

  return <>{children}</>;
}
