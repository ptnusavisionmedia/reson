import { describe, expect, it } from 'vitest';

import { computeMatch, type MatchInput } from '../../shared/matching/score';
import { FIXTURES } from './fixtures';

const empty: MatchInput = { genres: [], bass: null, vocals: null, treble: null, contexts: [] };
const byName = (name: string) => FIXTURES.find((f) => f.name === name)!;

describe('computeMatch', () => {
  it('profil identik: skor 1, cakupan penuh, Sangat dekat', () => {
    const f = byName('identik penuh');
    const r = computeMatch(f.a, f.b);
    expect(r.score).toBe(1);
    expect(r.coverage).toBe(1);
    expect(r.label).toBe('Sangat dekat');
    expect(r.sharedGenres).toEqual(['jazz', 'lofi']);
    expect(r.sharedPreferences).toEqual(['bass', 'vocals', 'treble', 'ctx:kerja_belajar', 'ctx:santai']);
    expect(r.differences).toEqual([]);
  });

  it('profil berlawanan: skor 0, tetap cakupan penuh, Sebagian selera sama, semua perbedaan tercatat', () => {
    const f = byName('berlawanan penuh');
    const r = computeMatch(f.a, f.b);
    expect(r.score).toBe(0);
    expect(r.coverage).toBe(1);
    expect(r.label).toBe('Sebagian selera sama');
    expect(r.sharedGenres).toEqual([]);
    expect(r.differences).toEqual(['bass', 'vocals', 'treble', 'genre']);
  });

  it('nilai "belum tahu" tidak dihitung sebagai ketidakcocokan; bobot dinormalisasi pada komponen tersedia', () => {
    const f = byName('sebagian kosong (satu dimensi bersama)');
    const r = computeMatch(f.a, f.b);
    // suara: 1 dimensi sama persis (1.0); genre: 1/2; konteks tidak dinilai (salah satu kosong)
    expect(r.score).toBeCloseTo((0.5 * 1 + 0.3 * 0.5) / 0.8, 6);
    expect(r.coverage).toBeCloseTo(0.5 * (1 / 3) + 0.3, 6);
    expect(r.label).toBe('Kecocokan awal'); // cakupan < 0.6 mengalahkan skor
    expect(r.sharedPreferences).toEqual(['bass']);
  });

  it('semua kosong: tidak mengarang kecocokan atau alasan', () => {
    const r = computeMatch(empty, empty);
    expect(r).toEqual({ score: 0, coverage: 0, label: 'Kecocokan awal', sharedGenres: [], sharedPreferences: [], differences: [] });
  });

  it('hanya genre yang bisa dinilai: skor tinggi tapi tetap Kecocokan awal', () => {
    const f = byName('hanya genre sama, suara belum diisi');
    const r = computeMatch(f.a, f.b);
    expect(r.score).toBe(1);
    expect(r.coverage).toBeCloseTo(0.3, 6);
    expect(r.label).toBe('Kecocokan awal');
  });

  it('satu pihak kosong total: tidak ada komponen yang bisa dinilai', () => {
    const f = byName('satu pihak kosong total');
    const r = computeMatch(f.a, f.b);
    expect(r.coverage).toBe(0);
    expect(r.label).toBe('Kecocokan awal');
    expect(r.differences).toEqual([]); // kekosongan bukan perbedaan
  });

  it('dekat tapi tidak identik: label berdasarkan skor, selisih 1 dihitung sama-sama dekat', () => {
    const f = byName('dekat tapi tidak identik');
    const r = computeMatch(f.a, f.b);
    // suara: (0.75 + 1 + 0.75)/3; genre: 2/4; konteks: 1/3
    const sound = (0.75 + 1 + 0.75) / 3;
    expect(r.score).toBeCloseTo((0.5 * sound + 0.3 * 0.5 + 0.2 * (1 / 3)) / 1, 6);
    expect(r.label).toBe('Cukup dekat');
    expect(r.sharedPreferences).toEqual(['bass', 'vocals', 'treble', 'ctx:santai']);
    expect(r.differences).toEqual([]);
  });

  it('selisih 2 ke atas dilaporkan sebagai perbedaan', () => {
    const f = byName('dua dimensi bersama, tanpa konteks');
    const r = computeMatch(f.a, f.b);
    expect(r.differences).toEqual(['bass']);
    expect(r.sharedPreferences).toEqual(['vocals']);
    expect(r.coverage).toBeCloseTo(0.5 * (2 / 3) + 0.3, 6);
  });

  it('deterministik dan simetris untuk input yang sama', () => {
    for (const f of FIXTURES) {
      const ab = computeMatch(f.a, f.b);
      expect(computeMatch(f.a, f.b)).toEqual(ab);
      const ba = computeMatch(f.b, f.a);
      expect(ba.score).toBe(ab.score);
      expect(ba.coverage).toBe(ab.coverage);
      expect(ba.label).toBe(ab.label);
    }
  });

  it('skor dan cakupan selalu dalam rentang 0..1', () => {
    for (const f of FIXTURES) {
      const r = computeMatch(f.a, f.b);
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
      expect(r.coverage).toBeGreaterThanOrEqual(0);
      expect(r.coverage).toBeLessThanOrEqual(1);
    }
  });

  it('perubahan selera mengubah hasil', () => {
    const f = byName('identik penuh');
    const before = computeMatch(f.a, f.b);
    const after = computeMatch({ ...f.a, bass: 1, vocals: 1 }, f.b);
    expect(after.score).toBeLessThan(before.score);
    expect(after.differences).toContain('bass');
  });
});
