import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { EmptyState } from '@/components/empty-state';
import { NotificationPrefs } from '@/components/settings-client';
import { createClient } from '@/lib/supabase/server';
import { normalizePreferences } from '@shared/validation/profile';

export const metadata: Metadata = { title: 'Pengaturan • Reson' };

const LINKS = [
  { href: '/settings/profile', label: 'Ubah profil' },
  { href: '/settings/sound-profile', label: 'Ubah Sound Profile' },
  { href: '/saved', label: 'Post tersimpan' },
  { href: '/settings/blocked', label: 'Pengguna yang diblokir' },
];

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login?returnTo=%2Fsettings');

  const { data, error } = await supabase.from('accounts').select('notification_preferences').eq('id', auth.user.id).single();
  if (error) return <EmptyState title="Gagal memuat" message="Tidak bisa memuat pengaturan. Muat ulang halaman untuk mencoba lagi." />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Pengaturan</h1>
      <NotificationPrefs initial={normalizePreferences(data.notification_preferences)} />
      <nav aria-label="Akun" className="flex flex-col gap-2">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="flex min-h-11 items-center rounded-md border border-line-strong bg-surface px-4">
            {l.label}
          </Link>
        ))}
        <Link href="/settings/delete-account" className="flex min-h-11 items-center rounded-md border border-line-strong bg-surface px-4">
          Hapus akun
        </Link>
      </nav>
      <p className="text-xs text-muted">Reson web • versi 0.1</p>
    </div>
  );
}
