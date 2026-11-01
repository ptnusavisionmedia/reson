import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { EmptyState } from '@/components/empty-state';
import { JoinButton } from '@/components/join-button';
import { PostCard } from '@/components/post-card';
import { PostFeed } from '@/components/post-feed';
import { fetchFeedPage, fetchPostsByIds } from '@/lib/data/posts';
import { createClient } from '@/lib/supabase/server';

export default async function CommunityDetailPage({ params }: { params: Promise<{ communityId: string }> }) {
  const { communityId } = await params;
  if (!z.uuid().safeParse(communityId).success) notFound();

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const { data: community } = await supabase
    .from('communities')
    .select('id, name, description, rules, pinned_post_ids, member_count')
    .eq('id', communityId)
    .maybeSingle();
  if (!community) notFound();

  const [membership, pinned, first] = await Promise.all([
    supabase.from('community_members').select('community_id').eq('community_id', communityId).eq('user_id', auth.user?.id ?? '').maybeSingle(),
    fetchPostsByIds(supabase, community.pinned_post_ids),
    fetchFeedPage(supabase, { kind: 'community', communityId }, null),
  ]);
  const joined = !!membership.data;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">{community.name}</h1>
        <p className="text-muted">{community.description}</p>
        <p className="text-sm text-muted">{community.member_count} anggota</p>
        <div className="flex flex-wrap items-start gap-3">
          <JoinButton communityId={community.id} joined={joined} />
          {joined && (
            <Link href={`/posts/new?communityId=${community.id}`} className="flex min-h-11 items-center rounded-md bg-accent px-5 font-medium text-bg">
              Buat post
            </Link>
          )}
        </div>
        {!joined && <p className="text-sm text-muted">Gabung untuk membuat post di komunitas ini.</p>}
      </header>

      {community.rules.length > 0 && (
        <section aria-labelledby="rules" className="rounded-lg border border-line bg-surface p-4">
          <h2 id="rules" className="mb-2 font-semibold">
            Aturan
          </h2>
          <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm text-muted">
            {community.rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ol>
        </section>
      )}

      {pinned.length > 0 && (
        <section aria-labelledby="pinned" className="flex flex-col gap-3">
          <h2 id="pinned" className="text-lg font-semibold">
            Disematkan
          </h2>
          {pinned.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </section>
      )}

      <section aria-labelledby="latest" className="flex flex-col gap-3">
        <h2 id="latest" className="text-lg font-semibold">
          Terbaru
        </h2>
        {first.error ? (
          <EmptyState title="Gagal memuat" message="Tidak bisa memuat post. Muat ulang halaman untuk mencoba lagi." />
        ) : (
          <PostFeed
            source={{ kind: 'community', communityId }}
            initial={first.items}
            empty={<EmptyState title="Belum ada post" message="Jadilah yang pertama memulai percakapan di komunitas ini." />}
          />
        )}
      </section>
    </div>
  );
}
