import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@db';

export type NotificationType = 'follow' | 'comment' | 'reply';

export type NotificationItem = {
  id: string;
  type: NotificationType;
  actorId: string | null; // null = akun pelaku sudah dihapus
  actorName: string | null;
  postId: string | null;
  postTitle: string | null; // null walau postId ada = post sudah dihapus/disembunyikan (RLS menyaringnya)
  readAt: string | null;
  createdAt: string;
};

export const NOTIFICATION_PAGE = 20;
const DELETED_ACTOR = 'Akun yang sudah dihapus';

export function notificationText(n: NotificationItem): string {
  const actor = n.actorName ?? DELETED_ACTOR;
  if (n.type === 'follow') return `${actor} mulai mengikutimu`;
  const where = n.postTitle ? `"${n.postTitle}"` : '(post sudah tidak tersedia)';
  return n.type === 'comment' ? `${actor} mengomentari postmu ${where}` : `${actor} membalas komentarmu di ${where}`;
}

export type NotificationTarget = { kind: 'link'; href: string } | { kind: 'unavailable'; message: string };

/** Ke mana notifikasi membawa pengguna. Target yang sudah tidak ada dijelaskan, bukan dibiarkan error. */
export function notificationTarget(n: NotificationItem): NotificationTarget {
  if (n.type === 'follow') {
    return n.actorId ? { kind: 'link', href: `/users/${n.actorId}` } : { kind: 'unavailable', message: 'Akun ini sudah dihapus.' };
  }
  return n.postId && n.postTitle !== null
    ? { kind: 'link', href: `/posts/${n.postId}` }
    : { kind: 'unavailable', message: 'Post ini sudah dihapus atau disembunyikan.' };
}

type Row = {
  id: string;
  type: NotificationType;
  actor_id: string | null;
  post_id: string | null;
  read_at: string | null;
  created_at: string;
  profiles: { display_name: string } | null;
  posts: { title: string } | null;
};

export async function fetchNotificationsPage(
  supabase: SupabaseClient<Database>,
  userId: string,
  offset: number,
): Promise<{ items: NotificationItem[]; error: boolean }> {
  // posts/profiles yang tersaring RLS (dihapus, disembunyikan, akun dihapus) kembali null,
  // sehingga teks dan tujuan notifikasi menyesuaikan.
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, actor_id, post_id, read_at, created_at, profiles!notifications_actor_id_fkey(display_name), posts!notifications_post_id_fkey(title)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + NOTIFICATION_PAGE - 1);
  if (error) return { items: [], error: true };
  return {
    error: false,
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
}

/** Jumlah belum dibaca. RLS ikut berlaku: notifikasi dari akun yang diblokir tidak dihitung. */
export async function fetchUnreadCount(supabase: SupabaseClient<Database>, userId: string): Promise<number | null> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);
  return error ? null : (count ?? 0);
}

export const NOTIFICATIONS_CHANGED = 'reson:notifications-changed';
