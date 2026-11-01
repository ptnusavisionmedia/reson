import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

async function signOut() {
  'use server';
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export default async function HomePage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth.user
    ? await supabase.from('profiles').select('username, display_name').eq('id', auth.user.id).single()
    : { data: null };

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-4">
      <p className="font-mono text-sm tracking-widest text-accent">RESON</p>
      <h1 className="text-2xl font-semibold">Halo, {profile?.display_name || 'pendengar'}</h1>
      {profile && <p className="text-muted">@{profile.username}</p>}
      <p className="text-muted">Beranda web sedang dibangun. Fitur komunitas menyusul.</p>
      <form action={signOut}>
        <button type="submit" className="min-h-11 rounded-md border border-line-strong px-5">Keluar</button>
      </form>
    </main>
  );
}
