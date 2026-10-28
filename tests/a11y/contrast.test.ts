import { describe, expect, it } from 'vitest';

import { colors } from '../../src/theme';

// Rasio kontras WCAG 2.x (luminansi relatif sRGB).
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('kontras teks (WCAG 1.4.3, minimal 4,5:1)', () => {
  const textPairs: [string, string, string][] = [
    ['text', colors.text, colors.background],
    ['text di kartu', colors.text, colors.surface],
    ['textSecondary', colors.textSecondary, colors.background],
    ['textSecondary di kartu', colors.textSecondary, colors.surface],
    ['accent sebagai teks (tautan, galat, label Baru)', colors.accent, colors.background],
    ['accent sebagai teks di kartu', colors.accent, colors.surface],
    ['teks tombol utama (background di atas accent)', colors.background, colors.accent],
  ];
  it.each(textPairs)('%s', (_name, fg, bg) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('kontras batas komponen interaktif (WCAG 1.4.11, minimal 3:1)', () => {
  it('borderStrong terlihat di atas latar maupun kartu', () => {
    expect(ratio(colors.borderStrong, colors.background)).toBeGreaterThanOrEqual(3);
    expect(ratio(colors.borderStrong, colors.surface)).toBeGreaterThanOrEqual(3);
  });
  it('accent (kontrol terpilih) terlihat di atas latar maupun kartu', () => {
    expect(ratio(colors.accent, colors.background)).toBeGreaterThanOrEqual(3);
    expect(ratio(colors.accent, colors.surface)).toBeGreaterThanOrEqual(3);
  });
  it('border halus memang BUKAN untuk kontrol interaktif (hanya kartu dan pemisah)', () => {
    // Pengingat: jika ini berubah menjadi >= 3, borderStrong tidak lagi diperlukan.
    expect(ratio(colors.border, colors.background)).toBeLessThan(3);
  });
});
