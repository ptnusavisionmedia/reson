import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { Button, Card, EmptyState } from '@/components/ui';
import { notificationTarget, notificationText, type NotificationItem } from '@/features/notifications/text';
import { PagedList } from '@/features/search/PagedList';
import { usePagedQuery } from '@/features/search/usePagedQuery';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { colors, spacing } from '@/theme';
import { timeAgo } from '@/utils/time';

const PAGE = 20;

type Row = {
  id: string;
  type: NotificationItem['type'];
  actor_id: string | null;
  post_id: string | null;
  read_at: string | null;
  created_at: string;
  profiles: { display_name: string } | null;
  posts: { title: string } | null;
};

export default function Notifications() {
  const router = useRouter();
  const uid = useAuth().session?.user.id;
  const [stamp, setStamp] = useState(0); // naik tiap layar kembali fokus agar status baca selalu terbaru
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setStamp((n) => n + 1);
    }, []),
  );

  const list = usePagedQuery<NotificationItem>(
    `notif:${stamp}`,
    async (offset) => {
      // posts/profiles yang tersaring RLS (dihapus, disembunyikan, akun dihapus) kembali null,
      // sehingga teks dan tujuan notifikasi menyesuaikan.
      const { data, error: err } = await supabase
        .from('notifications')
        .select('id, type, actor_id, post_id, read_at, created_at, profiles!notifications_actor_id_fkey(display_name), posts!notifications_post_id_fkey(title)')
        .eq('user_id', uid as string)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(offset, offset + PAGE - 1);
      if (err) {
        console.warn('[notifications]', err.code, err.message);
        return { error: 'Tidak bisa memuat notifikasi.' };
      }
      return {
        items: (data as unknown as Row[]).map((r) => ({
          id: r.id,
          type: r.type,
          actorId: r.actor_id,
          actorName: r.profiles?.display_name ?? null,
          postId: r.post_id,
          postTitle: r.posts?.title ?? null,
          readAt: r.read_at,
          createdAt: r.created_at,
        })),
      };
    },
    PAGE,
    !!uid,
  );

  async function open(n: NotificationItem) {
    setError(null);
    if (!n.readAt) {
      // RLS dan hak kolom: hanya penerima yang bisa mengubah read_at miliknya.
      const { error: err } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', n.id);
      if (err) setError('Gagal menandai dibaca. Coba lagi.');
    }
    const target = notificationTarget(n);
    if (target.kind === 'user') router.push({ pathname: '/users/[userId]', params: { userId: target.id } });
    else if (target.kind === 'post') router.push({ pathname: '/posts/[postId]', params: { postId: target.id } });
    else Alert.alert('Tidak tersedia', target.message);
  }

  async function markAllRead() {
    if (!uid) return;
    setError(null);
    const { error: err } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', uid).is('read_at', null);
    if (err) return setError('Gagal menandai semua dibaca. Coba lagi.');
    setStamp((s) => s + 1);
  }

  const hasUnread = list.items.some((n) => !n.readAt);

  return (
    <PagedList
      {...list}
      header={
        <View style={{ gap: spacing.sm }}>
          {hasUnread && <Button title="Tandai semua dibaca" variant="secondary" onPress={markAllRead} />}
          {!!error && <Text style={{ color: colors.accent }} accessibilityRole="alert">{error}</Text>}
        </View>
      }
      keyExtractor={(n) => n.id}
      renderItem={(n) => (
        <Pressable accessibilityRole="button" accessibilityLabel={notificationText(n)} onPress={() => open(n)}>
          <Card style={n.readAt ? undefined : { borderColor: colors.accent, borderWidth: 2 }}>
            {!n.readAt && <Text style={{ color: colors.accent, fontWeight: '700' }}>Baru</Text>}
            <Text style={{ color: colors.text }}>{notificationText(n)}</Text>
            <Text style={{ color: colors.textSecondary }}>{timeAgo(n.createdAt)}</Text>
          </Card>
        </Pressable>
      )}
      empty={<EmptyState title="Belum ada notifikasi" message="Kamu akan diberi tahu saat ada yang mengikuti, mengomentari, atau membalas komentarmu." />}
    />
  );
}
