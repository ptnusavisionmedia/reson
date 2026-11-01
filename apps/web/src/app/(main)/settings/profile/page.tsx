import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { EditProfileForm } from '@/components/edit-profile-form';
import { EmptyState } from '@/components/empty-state';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Ubah profil • Reson' };

export default async function EditProfilePage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login?returnTo=%2Fsettings%2Fprofile');

  const { data, error } = await supabase.from('profiles').select('display_name, bio, avatar_path').eq('id', auth.user.id).single();
  if (error) return <EmptyState title="Gagal memuat" message="Tidak bisa memuat profil. Muat ulang halaman untuk mencoba lagi." />;

  return (
    <EditProfileForm
      uid={auth.user.id}
      initial={{
        displayName: data.display_name,
        bio: data.bio,
        avatarPath: data.avatar_path,
        avatarUrl: data.avatar_path ? supabase.storage.from('avatars').getPublicUrl(data.avatar_path).data.publicUrl : null,
      }}
    />
  );
}
