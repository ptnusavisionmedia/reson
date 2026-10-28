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

const DELETED_ACTOR = 'Akun yang sudah dihapus';

export function notificationText(n: NotificationItem): string {
  const actor = n.actorName ?? DELETED_ACTOR;
  if (n.type === 'follow') return `${actor} mulai mengikutimu`;
  const where = n.postTitle ? `"${n.postTitle}"` : '(post sudah tidak tersedia)';
  return n.type === 'comment' ? `${actor} mengomentari postmu ${where}` : `${actor} membalas komentarmu di ${where}`;
}

export type NotificationTarget =
  | { kind: 'user'; id: string }
  | { kind: 'post'; id: string }
  | { kind: 'unavailable'; message: string };

/** Ke mana notifikasi membawa pengguna. Target yang sudah tidak ada dijelaskan, bukan dibiarkan error. */
export function notificationTarget(n: NotificationItem): NotificationTarget {
  if (n.type === 'follow') {
    return n.actorId ? { kind: 'user', id: n.actorId } : { kind: 'unavailable', message: 'Akun ini sudah dihapus.' };
  }
  return n.postId && n.postTitle !== null
    ? { kind: 'post', id: n.postId }
    : { kind: 'unavailable', message: 'Post ini sudah dihapus atau disembunyikan.' };
}
