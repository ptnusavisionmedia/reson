import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { EmptyState } from '@/components/empty-state';
import { NotificationList } from '@/components/notification-list';
import { fetchNotificationsPage } from '@/lib/data/notifications';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Notifikasi • Reson' };

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login?returnTo=%2Fnotifications');

  const first = await fetchNotificationsPage(supabase, auth.user.id, 0);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Notifikasi</h1>
      {first.error ? (
        <EmptyState title="Gagal memuat" message="Tidak bisa memuat notifikasi. Muat ulang halaman untuk mencoba lagi." />
      ) : (
        <NotificationList userId={auth.user.id} initial={first.items} />
      )}
    </div>
  );
}
