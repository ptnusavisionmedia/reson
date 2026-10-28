// Implementasi REFERENSI Taste Match (PRD F09). Fungsi murni: input yang sama selalu menghasilkan
// hasil yang sama. Versi produksi berjalan di database (taste_match_compute); skrip
// scripts/match-parity.ts membandingkan keduanya dengan fixture yang sama.

export const ALGORITHM_VERSION = 1;

export type MatchInput = {
  genres: string[];
  bass: number | null; // 1..5, null = belum tahu (tidak dinilai, bukan "tidak cocok")
  vocals: number | null;
  treble: number | null;
  contexts: string[];
};

export type MatchLabel = 'Kecocokan awal' | 'Sangat dekat' | 'Cukup dekat' | 'Sebagian selera sama';

export type MatchResult = {
  score: number; // internal; UI menampilkan label dan alasan, bukan persentase
  coverage: number;
  label: MatchLabel;
  sharedGenres: string[];
  /** 'bass' | 'vocals' | 'treble' (selisih <= 1) dan 'ctx:<id>' (konteks yang sama) */
  sharedPreferences: string[];
  /** 'bass' | 'vocals' | 'treble' (selisih >= 2) dan 'genre' (tidak ada genre yang sama) */
  differences: string[];
};

export const WEIGHTS = { sound: 0.5, genre: 0.3, context: 0.2 } as const;
export const COVERAGE_THRESHOLD = 0.6;

const round6 = (x: number) => Math.round(x * 1e6) / 1e6;
const DIMENSIONS = ['bass', 'vocals', 'treble'] as const;

function jaccard(a: string[], b: string[]): { sim: number; shared: string[] } | null {
  if (a.length === 0 || b.length === 0) return null; // salah satu belum memberi data: tidak dinilai
  const setB = new Set(b);
  const shared = [...new Set(a)].filter((x) => setB.has(x)).sort();
  const union = new Set([...a, ...b]).size;
  return { sim: shared.length / union, shared };
}

export function computeMatch(a: MatchInput, b: MatchInput): MatchResult {
  const prefs: string[] = [];
  const diffs: string[] = [];
  const dimSims: number[] = [];

  for (const d of DIMENSIONS) {
    const x = a[d];
    const y = b[d];
    if (x === null || y === null) continue;
    const delta = Math.abs(x - y);
    dimSims.push(1 - delta / 4);
    if (delta <= 1) prefs.push(d);
    else diffs.push(d);
  }

  let weight = 0;
  let acc = 0;

  const sound = dimSims.length ? dimSims.reduce((s, v) => s + v, 0) / dimSims.length : null;
  if (sound !== null) {
    acc += WEIGHTS.sound * sound;
    weight += WEIGHTS.sound;
  }

  const genre = jaccard(a.genres, b.genres);
  if (genre) {
    acc += WEIGHTS.genre * genre.sim;
    weight += WEIGHTS.genre;
    if (genre.shared.length === 0) diffs.push('genre');
  }

  const context = jaccard(a.contexts, b.contexts);
  if (context) {
    acc += WEIGHTS.context * context.sim;
    weight += WEIGHTS.context;
    context.shared.forEach((c) => prefs.push(`ctx:${c}`));
  }

  const coverage = round6(WEIGHTS.sound * (dimSims.length / 3) + (genre ? WEIGHTS.genre : 0) + (context ? WEIGHTS.context : 0));
  const score = round6(weight > 0 ? acc / weight : 0);

  let label: MatchLabel;
  if (coverage < COVERAGE_THRESHOLD) label = 'Kecocokan awal';
  else if (score >= 0.8) label = 'Sangat dekat';
  else if (score >= 0.6) label = 'Cukup dekat';
  else label = 'Sebagian selera sama';

  return { score, coverage, label, sharedGenres: genre?.shared ?? [], sharedPreferences: prefs, differences: diffs };
}
