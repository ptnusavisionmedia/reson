import { levelText } from '@/features/onboarding/describe';
import { CONTEXTS, GENRES, type SoundProfileInput } from '@shared/validation/soundProfile';

export type MatchCard = {
  candidateId: string;
  username: string;
  displayName: string;
  avatarPath: string | null;
  label: string;
  coverage: number;
  sharedGenres: string[];
  sharedPreferences: string[];
  differences: string[];
  bass: number | null;
  vocals: number | null;
  treble: number | null;
};

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
