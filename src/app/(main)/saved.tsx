import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, View } from 'react-native';

import { EmptyState, ErrorState, Loading } from '@/components/ui';
import { PostCard } from '@/features/posts/PostCard';
import type { PostItem } from '@/features/posts/usePosts';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { spacing } from '@/theme';

type Row = {
  posts: {
    id: string; title: string; type: PostItem['type']; created_at: string; like_count: number; comment_count: number;
    profiles: { username: string; display_name: string } | null;
  };
};

const LIMIT = 50;

export default function Saved() {
  const uid = useAuth().session?.user.id;
  const [state, setState] = useState<{ status: 'ready'; items: PostItem[] } | { status: 'error' } | null>(null);

  const load = useCallback(async () => {
    if (!uid) return;
    // !inner + filter status: post yang hidden/deleted tidak muncul (RLS juga menolaknya).
    const { data, error } = await supabase
      .from('saved_posts')
      .select('created_at, posts!saved_posts_post_id_fkey!inner(id, title, type, created_at, like_count, comment_count, profiles!posts_author_id_fkey(username, display_name))')
      .eq('user_id', uid)
      .eq('posts.status', 'published')
      .order('created_at', { ascending: false })
      .limit(LIMIT);
    if (error) {
      console.warn('[saved]', error.code, error.message);
      return setState((s) => (s?.status === 'ready' ? s : { status: 'error' }));
    }
    setState({
      status: 'ready',
      items: (data as unknown as Row[]).map(({ posts: p }) => ({
        id: p.id,
        title: p.title,
        type: p.type,
        createdAt: p.created_at,
        likeCount: p.like_count,
        commentCount: p.comment_count,
        authorName: p.profiles?.display_name ?? 'Akun dihapus',
        authorUsername: p.profiles?.username ?? '',
      })),
    });
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!state) return <Loading />;
  if (state.status === 'error') return <ErrorState message="Tidak bisa memuat simpanan." onRetry={load} />;
  if (state.items.length === 0) {
    return <EmptyState title="Belum ada simpanan" message="Ketuk Simpan di halaman post untuk menyimpannya di sini." />;
  }
  return (
    <FlatList
      data={state.items}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => <PostCard post={item} />}
      ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      contentContainerStyle={{ padding: spacing.md }}
    />
  );
}
