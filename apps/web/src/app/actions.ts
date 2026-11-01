'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { serverErrorMessage } from '@utils/errors';

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

/** Gabung/keluar komunitas. Otorisasi sebenarnya ada di RPC; di sini sesi dan input divalidasi ulang. */
export async function setMembership(communityId: string, join: boolean): Promise<{ error?: string }> {
  if (!z.uuid().safeParse(communityId).success) return { error: 'Komunitas tidak ditemukan.' };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: 'Sesi berakhir. Silakan masuk lagi.' };

  const { error } = join
    ? await supabase.rpc('join_community', { p_community_id: communityId })
    : await supabase.rpc('leave_community', { p_community_id: communityId });
  if (error) return { error: serverErrorMessage(error) };

  revalidatePath('/communities');
  revalidatePath(`/communities/${communityId}`);
  revalidatePath('/home');
  return {};
}
