import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

import { CompleteProfileForm } from './complete-profile-form';

export default async function CompleteProfilePage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');

  const [acc, prof] = await Promise.all([
    supabase.from('accounts').select('profile_completed').eq('id', auth.user.id).single(),
    supabase.from('profiles').select('display_name').eq('id', auth.user.id).single(),
  ]);
  if (acc.data?.profile_completed) redirect('/home');

  return <CompleteProfileForm initialDisplayName={prof.data?.display_name ?? ''} />;
}
