import { describe, expect, it } from 'vitest';
import { svgPathProperties } from 'svg-path-properties';

import { LENGTHS } from '../../src/components/ui/illustrationLengths';
import { ART, LOGO, type IllustrationName } from '../../src/components/ui/illustrationPaths';

const names = Object.keys(ART) as IllustrationName[];

describe('ilustrasi garis', () => {
  it.each(names)('%s: setiap jalur satu subjalur (pola dash dimulai ulang di tiap "M")', (name) => {
    for (const d of ART[name].paths) {
      expect(d.match(/M/g)?.length).toBe(1);
    }
  });

  it.each(names)('%s: panjang tersimpan sama dengan panjang sebenarnya (jalankan npm run gen:lengths bila gagal)', (name) => {
    const stored = LENGTHS[name];
    expect(stored).toHaveLength(ART[name].paths.length);
    ART[name].paths.forEach((d, i) => {
      expect(stored[i]).toBeCloseTo(new svgPathProperties(d).getTotalLength(), 1);
    });
  });

  it.each(names)('%s: panjang masuk akal (animasi memakai panjang ini sebagai dash)', (name) => {
    for (const len of LENGTHS[name]) {
      expect(len).toBeGreaterThan(5);
      expect(len).toBeLessThan(600); // jauh di bawah "anggaran 800" lama yang membuat animasi selesai di awal
    }
  });

  it('logo memakai ilustrasi headphone yang sama (tanda aplikasi konsisten dengan animasi)', () => {
    expect(LOGO).toBe(ART.headphone);
  });

  it('titik coral berada di dalam kanvas 120x120', () => {
    for (const name of names) {
      const [x, y] = ART[name].dot;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(120);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(120);
    }
  });
});
