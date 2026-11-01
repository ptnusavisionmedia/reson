import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { EditSoundProfile } from '@/components/onboarding-client';
import { loadSoundProfile } from '@/lib/auth/onboarding';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Ubah Sound Profile • Reson' };

export default async function SoundProfileSettingsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login?returnTo=%2Fsettings%2Fsound-profile');
  const initial = await loadSoundProfile(supabase, auth.user.id);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Ubah Sound Profile</h1>
      <EditSoundProfile initial={initial} />
    </div>
  );
}
