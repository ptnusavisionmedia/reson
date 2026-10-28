import { z } from 'zod';

// Harus sama dengan daftar di supabase/migrations/*_sound_profile.sql (save_sound_profile).
export const GENRES = [
  { id: 'pop', label: 'Pop' },
  { id: 'rock', label: 'Rock' },
  { id: 'jazz', label: 'Jazz' },
  { id: 'hiphop', label: 'Hip-hop' },
  { id: 'elektronik', label: 'Elektronik' },
  { id: 'klasik', label: 'Klasik' },
  { id: 'rnb', label: 'R&B' },
  { id: 'metal', label: 'Metal' },
  { id: 'indie', label: 'Indie' },
  { id: 'kpop', label: 'K-pop' },
  { id: 'lofi', label: 'Lo-fi' },
  { id: 'akustik', label: 'Akustik' },
  { id: 'soundtrack', label: 'Soundtrack' },
  { id: 'dangdut', label: 'Dangdut' },
] as const;

export const CONTEXTS = [
  { id: 'perjalanan', label: 'Saat bepergian' },
  { id: 'kerja_belajar', label: 'Kerja atau belajar' },
  { id: 'gaming', label: 'Bermain game' },
  { id: 'olahraga', label: 'Olahraga' },
  { id: 'santai', label: 'Santai di rumah' },
  { id: 'menonton', label: 'Menonton film' },
] as const;

export const MAX_GENRES = 5;

const genreIds = GENRES.map((g) => g.id) as [string, ...string[]];
const contextIds = CONTEXTS.map((c) => c.id) as [string, ...string[]];
const level = z.number().int().min(1).max(5).nullable(); // null = belum tahu

export const soundProfileSchema = z.object({
  genres: z.array(z.enum(genreIds)).max(MAX_GENRES).refine((a) => new Set(a).size === a.length, 'Genre ganda'),
  bass: level,
  vocals: level,
  treble: level,
  contexts: z.array(z.enum(contextIds)).refine((a) => new Set(a).size === a.length, 'Konteks ganda'),
  discoverable: z.boolean(),
});

export type SoundProfileInput = z.infer<typeof soundProfileSchema>;

export const emptySoundProfile: SoundProfileInput = {
  genres: [],
  bass: null,
  vocals: null,
  treble: null,
  contexts: [],
  discoverable: true,
};

/** Profil dianggap awal bila data terlalu sedikit untuk pencocokan yang berarti (PRD F02). */
export function isInitialProfile(p: SoundProfileInput): boolean {
  const answered = [p.bass, p.vocals, p.treble].filter((v) => v !== null).length;
  return answered < 2 || p.genres.length === 0;
}
