import { z } from 'zod';

export const profileEditSchema = z.object({
  displayName: z.string().trim().min(1, 'Nama wajib diisi.').max(50, 'Nama maksimal 50 karakter.'),
  bio: z.string().trim().max(300, 'Bio maksimal 300 karakter.'),
});

export const NOTIFICATION_KEYS = ['follow', 'comment', 'reply'] as const;
export type NotificationKey = (typeof NOTIFICATION_KEYS)[number];
export type NotificationPreferences = Record<NotificationKey, boolean>;

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Nilai yang tidak ada dianggap aktif. */
export function normalizePreferences(raw: unknown): NotificationPreferences {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return { follow: obj.follow !== false, comment: obj.comment !== false, reply: obj.reply !== false };
}
