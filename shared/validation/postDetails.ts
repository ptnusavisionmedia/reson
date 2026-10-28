import { z } from 'zod';

// Harus sama dengan batas di prepare_post_details (supabase/migrations/*_catalog_reviews.sql).

export const OWNERSHIP = [
  { id: 'owned', label: 'Milik sendiri' },
  { id: 'borrowed', label: 'Pinjaman' },
  { id: 'sponsored', label: 'Sponsor / unit gratis' },
] as const;
export type Ownership = (typeof OWNERSHIP)[number]['id'];

export const REVIEW_LIMITS = { notes: 500, listItems: 5, listItemLength: 100, companions: 5, tracks: 5, trackTitle: 100, trackUrl: 300 } as const;
export const SHOWCASE_LIMITS = { purpose: 200, impressions: 1000, components: 10, label: 80 } as const;

const uuid = z.uuid('Pilih perangkat.');
const httpUrl = z
  .string()
  .trim()
  .max(REVIEW_LIMITS.trackUrl, 'Tautan terlalu panjang.')
  .refine((v) => v === '' || /^https?:\/\//.test(v), 'Tautan harus diawali http:// atau https://');

export const reviewDetailsSchema = z.object({
  deviceId: uuid,
  ownership: z.enum(['owned', 'borrowed', 'sponsored'], 'Pilih status kepemilikan.'),
  bassNotes: z.string().trim().max(REVIEW_LIMITS.notes),
  vocalNotes: z.string().trim().max(REVIEW_LIMITS.notes),
  trebleNotes: z.string().trim().max(REVIEW_LIMITS.notes),
  comfortNotes: z.string().trim().max(REVIEW_LIMITS.notes),
  pros: z.array(z.string().trim().max(REVIEW_LIMITS.listItemLength)).max(REVIEW_LIMITS.listItems),
  cons: z.array(z.string().trim().max(REVIEW_LIMITS.listItemLength)).max(REVIEW_LIMITS.listItems),
  companionDeviceIds: z.array(uuid).max(REVIEW_LIMITS.companions),
  referenceTracks: z
    .array(z.object({ title: z.string().trim().max(REVIEW_LIMITS.trackTitle), url: httpUrl }))
    .max(REVIEW_LIMITS.tracks),
});
export type ReviewDetails = z.infer<typeof reviewDetailsSchema>;

export const showcaseDetailsSchema = z.object({
  purpose: z.string().trim().max(SHOWCASE_LIMITS.purpose),
  impressions: z.string().trim().max(SHOWCASE_LIMITS.impressions),
  components: z
    .array(
      z.object({
        deviceId: z.uuid().nullable(),
        label: z.string().trim().min(1, 'Nama komponen wajib diisi.').max(SHOWCASE_LIMITS.label),
      }),
    )
    .min(1, 'Tambahkan minimal satu komponen.')
    .max(SHOWCASE_LIMITS.components),
});
export type ShowcaseDetails = z.infer<typeof showcaseDetailsSchema>;

/** Detail dari server (jsonb) dibaca defensif: bentuk yang tidak dikenal dianggap tidak ada. */
export type StoredReview = {
  deviceId: string;
  ownership: Ownership;
  bassNotes: string | null;
  vocalNotes: string | null;
  trebleNotes: string | null;
  comfortNotes: string | null;
  pros: string[];
  cons: string[];
  companionDeviceIds: string[];
  referenceTracks: { title: string; url: string | null }[];
};
export type StoredShowcase = {
  purpose: string | null;
  impressions: string | null;
  components: { deviceId: string | null; label: string; position: number }[];
};

const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const str = (v: unknown) => (typeof v === 'string' ? v : null);
const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

export function parseStoredReview(raw: unknown): StoredReview | null {
  const o = obj(raw);
  const deviceId = str(o?.deviceId);
  const ownership = str(o?.ownership);
  if (!o || !deviceId || (ownership !== 'owned' && ownership !== 'borrowed' && ownership !== 'sponsored')) return null;
  return {
    deviceId,
    ownership,
    bassNotes: str(o.bassNotes),
    vocalNotes: str(o.vocalNotes),
    trebleNotes: str(o.trebleNotes),
    comfortNotes: str(o.comfortNotes),
    pros: strs(o.pros),
    cons: strs(o.cons),
    companionDeviceIds: strs(o.companionDeviceIds),
    referenceTracks: (Array.isArray(o.referenceTracks) ? o.referenceTracks : [])
      .map((t) => obj(t))
      .filter((t): t is Record<string, unknown> => !!t && typeof t.title === 'string')
      .map((t) => ({ title: t.title as string, url: str(t.url) })),
  };
}

export function parseStoredShowcase(raw: unknown): StoredShowcase | null {
  const o = obj(raw);
  if (!o || !Array.isArray(o.components)) return null;
  return {
    purpose: str(o.purpose),
    impressions: str(o.impressions),
    components: o.components
      .map((c) => obj(c))
      .filter((c): c is Record<string, unknown> => !!c && typeof c.label === 'string')
      .map((c, i) => ({ deviceId: str(c.deviceId), label: c.label as string, position: typeof c.position === 'number' ? c.position : i }))
      .sort((a, b) => a.position - b.position),
  };
}
