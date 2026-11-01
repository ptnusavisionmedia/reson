import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { Composer } from '@/components/composer/composer';
import { EmptyState } from '@/components/empty-state';
import { fetchDevice } from '@/lib/data/devices';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { POST_TYPES } from '@shared/validation/post';

export const metadata: Metadata = { title: 'Buat post • Reson' };

export default async function NewPostPage({ searchParams }: { searchParams: Promise<{ communityId?: string; type?: string; deviceId?: string }> }) {
  const { communityId, type, deviceId } = await searchParams;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login?returnTo=%2Fposts%2Fnew');

  const [c, m] = await Promise.all([
    supabase.from('communities').select('id, name').order('name'),
    supabase.from('community_members').select('community_id').eq('user_id', auth.user.id),
  ]);
  if (c.error || m.error) {
    return <EmptyState title="Gagal memuat" message="Tidak bisa memuat komunitas. Muat ulang halaman untuk mencoba lagi." />;
  }
  const joinedIds = new Set(m.data.map((r) => r.community_id));
  const joined = c.data.filter((x) => joinedIds.has(x.id));
  if (joined.length === 0) {
    return (
      <EmptyState
        title="Gabung komunitas dulu"
        message="Post selalu masuk ke satu komunitas. Gabung ke salah satunya untuk mulai menulis."
        href="/communities"
        actionLabel="Lihat komunitas"
      />
    );
  }

  // Dari halaman perangkat: perangkat yang di-review sudah terisi.
  const device = deviceId && z.uuid().safeParse(deviceId).success ? await fetchDevice(supabase, deviceId) : null;

  return (
    <Composer
      uid={auth.user.id}
      communities={joined}
      initialCommunityId={communityId}
      initialType={POST_TYPES.find((t) => t === type)}
      initialDevice={device ? { id: device.id, name: device.name } : undefined}
    />
  );
}
