import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { EmptyState } from '@/components/empty-state';
import { UnblockButton } from '@/components/settings-client';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Diblokir • Reson' };

type Row = { blocked_id: string; profiles: { username: string; display_name: string; avatar_path: string | null } | null };

export default async function BlockedPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login?returnTo=%2Fsettings%2Fblocked');

  const { data, error } = await supabase
    .from('blocks')
    .select('blocked_id, profiles!blocks_blocked_id_fkey(username, display_name, avatar_path)')
    .eq('blocker_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return <EmptyState title="Gagal memuat" message="Tidak bisa memuat daftar blokir. Muat ulang halaman untuk mencoba lagi." />;

  const rows = data as unknown as Row[];
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Pengguna yang diblokir</h1>
      {rows.length === 0 ? (
        <EmptyState title="Tidak ada pengguna yang diblokir" />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.blocked_id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface p-4">
              <div className="min-w-0">
                <p className="truncate font-semibold">{r.profiles?.display_name ?? 'Akun tidak tersedia'}</p>
                {r.profiles?.username && <p className="truncate text-sm text-muted">@{r.profiles.username}</p>}
              </div>
              <UnblockButton userId={r.blocked_id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
