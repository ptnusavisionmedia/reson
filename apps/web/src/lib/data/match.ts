import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@db';
import { CONTEXTS, GENRES, type SoundProfileInput } from '@shared/validation/soundProfile';

export const MATCH_PAGE_SIZE = 20;
export const MATCH_LABELS = ['Sangat dekat', 'Cukup dekat', 'Sebagian selera sama', 'Kecocokan awal'] as const;

export type MatchCard = {
  candidateId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  label: string;
  coverage: number;
  sharedGenres: string[];
  sharedPreferences: string[];
  differences: string[];
  bass: number | null;
  vocals: number | null;
  treble: number | null;
};

export function levelText(v: number | null): string {
  if (v === null) return 'belum diisi';
  if (v <= 2) return 'ringan';
  if (v === 3) return 'seimbang';
  return 'kuat';
}

const DIM_LABEL = { bass: 'Bass', vocals: 'Vokal', treble: 'Treble' } as const;
type Dim = keyof typeof DIM_LABEL;
const isDim = (x: string): x is Dim => x in DIM_LABEL;
const labelOf = (list: readonly { id: string; label: string }[], id: string) => list.find((i) => i.id === id)?.label ?? id;

/**
 * Menyusun alasan dari token server dan nilai kedua profil. Hanya menyebut kesamaan/perbedaan
 * yang benar-benar ada di data; tidak ada alasan yang dikarang dari data kosong.
 */
export function buildExplanation(card: MatchCard, me: SoundProfileInput): { reasons: string[]; differences: string[] } {
  const reasons: string[] = [];
  const differences: string[] = [];

  if (card.sharedGenres.length) reasons.push(`Genre yang sama: ${card.sharedGenres.map((g) => labelOf(GENRES, g)).join(', ')}`);

  for (const token of card.sharedPreferences) {
    if (!isDim(token)) continue;
    const mine = levelText(me[token]);
    const theirs = levelText(card[token]);
    reasons.push(
      mine === theirs
        ? `Sama-sama menyukai ${DIM_LABEL[token].toLowerCase()} yang ${mine}`
        : `${DIM_LABEL[token]} kalian berdekatan (kamu: ${mine}, dia: ${theirs})`,
    );
  }

  const ctx = card.sharedPreferences.filter((t) => t.startsWith('ctx:')).map((t) => labelOf(CONTEXTS, t.slice(4)));
  if (ctx.length) reasons.push(`Sama-sama mendengarkan: ${ctx.join(', ')}`);

  for (const token of card.differences) {
    if (isDim(token)) {
      differences.push(`${DIM_LABEL[token]} berbeda jauh (kamu: ${levelText(me[token])}, dia: ${levelText(card[token])})`);
    } else if (token === 'genre') {
      differences.push('Tidak ada genre favorit yang sama');
    }
  }

  return { reasons, differences };
}

/** Ringkasan bahasa awam. Hanya menggambarkan selera, bukan kemampuan atau kepribadian. */
export function describeProfile(p: SoundProfileInput): string[] {
  return [
    `Genre: ${p.genres.length ? p.genres.map((g) => labelOf(GENRES, g)).join(', ') : 'belum dipilih'}`,
    `Bass: ${levelText(p.bass)}`,
    `Vokal: ${levelText(p.vocals)}`,
    `Treble: ${levelText(p.treble)}`,
    `Biasa mendengarkan: ${p.contexts.length ? p.contexts.map((c) => labelOf(CONTEXTS, c)).join(', ') : 'belum dipilih'}`,
    p.discoverable ? 'Profil ini terlihat untuk pencocokan.' : 'Profil ini disembunyikan dari pencocokan.',
  ];
}

export async function fetchMatchPage(
  supabase: SupabaseClient<Database>,
  label: string | null,
  offset: number,
): Promise<{ items: MatchCard[]; error: boolean }> {
  const { data, error } = await supabase.rpc('get_my_matches', { p_label: label as string, p_limit: MATCH_PAGE_SIZE, p_offset: offset });
  if (error) return { items: [], error: true };
  const avatar = (path: string | null) => (path ? supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl : null);
  return {
    error: false,
    items: data.map((r) => ({
      candidateId: r.candidate_id,
      username: r.username,
      displayName: r.display_name,
      avatarUrl: avatar(r.avatar_path),
      label: r.label,
      coverage: r.coverage,
      sharedGenres: r.shared_genres,
      sharedPreferences: r.shared_preferences,
      differences: r.differences,
      bass: r.bass,
      vocals: r.vocals,
      treble: r.treble,
    })),
  };
}

/**
 * Server memutuskan perlu hitung ulang atau tidak (revision profil, TTL 24 jam, batas laju).
 * 'ok' | 'cooldown' | status galat yang dikenali.
 */
export async function refreshMatches(supabase: SupabaseClient<Database>, force: boolean): Promise<'ok' | 'cooldown' | 'no_profile' | 'disabled' | 'error'> {
  const { data, error } = await supabase.rpc('refresh_matches', { p_force: force });
  if (error) {
    if (error.message.includes('no sound profile')) return 'no_profile';
    if (error.message.includes('match disabled')) return 'disabled';
    return 'error';
  }
  return data === 'cooldown' ? 'cooldown' : 'ok';
}
