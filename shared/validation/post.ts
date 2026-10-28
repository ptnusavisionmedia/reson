import { z } from 'zod';

export const POST_TYPES = ['discussion', 'question', 'review', 'showcase'] as const;
export type PostType = (typeof POST_TYPES)[number];
/** Jenis yang wajib punya isi teks; review/showcase boleh hanya berisi detail terstruktur. */
export const TEXT_REQUIRED_TYPES: readonly PostType[] = ['discussion', 'question'];
export const POST_LIMITS = { title: 120, body: 5000, images: 4 } as const;

export const postInputSchema = z.object({
  type: z.enum(POST_TYPES),
  communityId: z.uuid('Pilih komunitas.'),
  title: z.string().trim().min(1, 'Judul wajib diisi.').max(POST_LIMITS.title, 'Judul maksimal 120 karakter.'),
  body: z.string().trim().max(POST_LIMITS.body, 'Isi maksimal 5.000 karakter.'),
});

/** Isi wajib hanya untuk diskusi/pertanyaan. */
export const bodyRequiredError = 'Isi wajib diisi.';

export const postEditSchema = postInputSchema.pick({ title: true, body: true });
