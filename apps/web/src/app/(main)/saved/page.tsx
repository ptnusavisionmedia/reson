import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { EmptyState } from '@/components/empty-state';
import { PostCard } from '@/components/post-card';
import type { PostItem, PostType } from '@/lib/data/posts';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Tersimpan • Reson' };

type Row = {
  posts: {
    id: string; title: string; type: PostType; created_at: string; like_count: number; comment_count: number;
    profiles: { username: string; display_name: string } | null;
  };
};

const LIMIT = 50;

export default async function SavedPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login?returnTo=%2Fsaved');

  // !inner + filter status: post yang hidden/deleted tidak muncul (RLS juga menolaknya).
  const { data, error } = await supabase
    .from('saved_posts')
    .select('created_at, posts!saved_posts_post_id_fkey!inner(id, title, type, created_at, like_count, comment_count, profiles!posts_author_id_fkey(username, display_name))')
    .eq('user_id', auth.user.id)
    .eq('posts.status', 'published')
    .order('created_at', { ascending: false })
    .limit(LIMIT);
  if (error) return <EmptyState title="Gagal memuat" message="Tidak bisa memuat simpanan. Muat ulang halaman untuk mencoba lagi." />;

  const items: PostItem[] = (data as unknown as Row[]).map(({ posts: p }) => ({
    id: p.id,
    title: p.title,
    type: p.type,
    createdAt: p.created_at,
    likeCount: p.like_count,
    commentCount: p.comment_count,
    authorName: p.profiles?.display_name ?? 'Akun dihapus',
    authorUsername: p.profiles?.username ?? '',
  }));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Tersimpan</h1>
      {items.length === 0 ? (
        <EmptyState title="Belum ada simpanan" message="Klik Simpan di halaman post untuk menyimpannya di sini." />
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((p) => (
            <li key={p.id}>
              <PostCard post={p} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
