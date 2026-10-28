import type { MatchInput } from '../../shared/matching/score';

const empty: MatchInput = { genres: [], bass: null, vocals: null, treble: null, contexts: [] };

export type Fixture = { name: string; a: MatchInput; b: MatchInput };

// Fixture dipakai bersama oleh unit test (TS) dan skrip paritas terhadap database.
// Hindari nilai yang jatuh persis di ambang label agar tidak bergantung pada pembulatan.
export const FIXTURES: Fixture[] = [
  {
    name: 'identik penuh',
    a: { genres: ['jazz', 'lofi'], bass: 3, vocals: 4, treble: 2, contexts: ['santai', 'kerja_belajar'] },
    b: { genres: ['jazz', 'lofi'], bass: 3, vocals: 4, treble: 2, contexts: ['santai', 'kerja_belajar'] },
  },
  {
    name: 'berlawanan penuh',
    a: { genres: ['metal'], bass: 1, vocals: 1, treble: 1, contexts: ['olahraga'] },
    b: { genres: ['klasik'], bass: 5, vocals: 5, treble: 5, contexts: ['santai'] },
  },
  {
    name: 'sebagian kosong (satu dimensi bersama)',
    a: { genres: ['pop'], bass: 4, vocals: null, treble: null, contexts: [] },
    b: { genres: ['pop', 'jazz'], bass: 4, vocals: 3, treble: null, contexts: ['gaming'] },
  },
  { name: 'semua kosong', a: empty, b: empty },
  {
    name: 'hanya genre sama, suara belum diisi',
    a: { ...empty, genres: ['rock'] },
    b: { ...empty, genres: ['rock'] },
  },
  {
    name: 'satu pihak kosong total',
    a: { genres: ['pop', 'indie'], bass: 3, vocals: 3, treble: 3, contexts: ['santai'] },
    b: empty,
  },
  {
    name: 'dekat tapi tidak identik',
    a: { genres: ['pop', 'indie', 'lofi'], bass: 3, vocals: 4, treble: 3, contexts: ['santai', 'perjalanan'] },
    b: { genres: ['pop', 'indie', 'rnb'], bass: 4, vocals: 4, treble: 2, contexts: ['santai', 'gaming'] },
  },
  {
    name: 'cukup dekat (genre beda, suara mirip)',
    a: { genres: ['jazz'], bass: 3, vocals: 4, treble: 3, contexts: ['santai'] },
    b: { genres: ['metal'], bass: 3, vocals: 4, treble: 4, contexts: ['santai'] },
  },
  {
    name: 'dua dimensi bersama, tanpa konteks',
    a: { genres: ['kpop', 'pop'], bass: 5, vocals: 2, treble: null, contexts: [] },
    b: { genres: ['pop'], bass: 3, vocals: 2, treble: null, contexts: [] },
  },
];
