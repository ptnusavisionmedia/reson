import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { DeleteAccount } from '@/components/delete-account';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Hapus akun • Reson', robots: { index: false } };

export default async function DeleteAccountPage({ searchParams }: { searchParams: Promise<{ reauth?: string }> }) {
  const { reauth } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login');

  const providers = (data.user.app_metadata?.providers as string[] | undefined) ?? [];
  return (
    <DeleteAccount
      uid={data.user.id}
      email={data.user.email ?? null}
      hasPassword={providers.includes('email')}
      returnedFromGoogle={reauth === 'google'}
    />
  );
}
