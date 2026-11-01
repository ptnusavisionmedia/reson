import Link from 'next/link';

import { EmptyState } from '@/components/empty-state';
import { JoinButton } from '@/components/join-button';
import { createClient } from '@/lib/supabase/server';

export default async function CommunitiesPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const [c, m] = await Promise.all([
    supabase.from('communities').select('id, name, description, member_count').order('name'),
    supabase.from('community_members').select('community_id').eq('user_id', auth.user?.id ?? ''),
  ]);
  if (c.error || m.error) {
    return <EmptyState title="Gagal memuat" message="Tidak bisa memuat komunitas. Muat ulang halaman untuk mencoba lagi." />;
  }

  const joinedIds = new Set(m.data.map((r) => r.community_id));
  const mine = c.data.filter((x) => joinedIds.has(x.id));
  const others = c.data.filter((x) => !joinedIds.has(x.id));

  const Section = ({ title, items, joined }: { title: string; items: typeof c.data; joined: boolean }) =>
    items.length === 0 ? null : (
      <section aria-labelledby={`h-${title}`} className="flex flex-col gap-3">
        <h2 id={`h-${title}`} className="text-lg font-semibold">
          {title}
        </h2>
        <ul className="flex flex-col gap-3">
          {items.map((x) => (
            <li key={x.id} className="flex items-start justify-between gap-4 rounded-lg border border-line bg-surface p-4">
              <Link href={`/communities/${x.id}`} className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="font-semibold">{x.name}</span>
                <span className="text-sm text-muted">{x.description}</span>
                <span className="text-xs text-muted">{x.member_count} anggota</span>
              </Link>
              <JoinButton communityId={x.id} joined={joined} />
            </li>
          ))}
        </ul>
      </section>
    );

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Community</h1>
      <Section title="Komunitasmu" items={mine} joined />
      <Section title="Temukan komunitas" items={others} joined={false} />
    </div>
  );
}
