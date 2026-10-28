import { CONTEXTS, GENRES, type SoundProfileInput } from '@shared/validation/soundProfile';

export function levelText(v: number | null): string {
  if (v === null) return 'belum diisi';
  if (v <= 2) return 'ringan';
  if (v === 3) return 'seimbang';
  return 'kuat';
}

const label = (list: readonly { id: string; label: string }[], id: string) => list.find((x) => x.id === id)?.label ?? id;

/** Ringkasan bahasa awam. Hanya menggambarkan selera, bukan kemampuan atau kepribadian. */
export function describeProfile(p: SoundProfileInput): string[] {
  return [
    `Genre: ${p.genres.length ? p.genres.map((g) => label(GENRES, g)).join(', ') : 'belum dipilih'}`,
    `Bass: ${levelText(p.bass)}`,
    `Vokal: ${levelText(p.vocals)}`,
    `Treble: ${levelText(p.treble)}`,
    `Biasa mendengarkan: ${p.contexts.length ? p.contexts.map((c) => label(CONTEXTS, c)).join(', ') : 'belum dipilih'}`,
    p.discoverable ? 'Profil ini terlihat untuk pencocokan.' : 'Profil ini disembunyikan dari pencocokan.',
  ];
}
