import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

// Profil sendiri memakai halaman profil yang sama dengan pengguna lain.
export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login?returnTo=%2Fprofile');
  redirect(`/users/${auth.user.id}`);
}
