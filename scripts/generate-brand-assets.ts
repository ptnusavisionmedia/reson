// Menghasilkan ikon aplikasi, ikon adaptif Android, dan gambar splash dari tanda logo yang sama
// dengan yang dipakai di dalam aplikasi (src/components/ui/illustrationPaths.ts → LOGO).
//
//   npm run gen:brand
//
// Hasil menimpa berkas di assets/images. Ikon dan splash baru hanya terlihat setelah build ulang.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import sharp from 'sharp';

import { LOGO } from '../src/components/ui/illustrationPaths';

const OUT = join(__dirname, '..', 'assets', 'images');
mkdirSync(OUT, { recursive: true });

const CHARCOAL = '#111214';
const TEXT = '#EEECE8';
const CORAL = '#E77768';

// Kotak pembatas tanda dalam satuan viewBox 120: x 12..108, y ~26..101 (titik coral sampai dasar earcup).
const MARK_CENTER = { x: 60, y: 63.5 };
const MARK_WIDTH_UNITS = 96;

type MarkOpts = { size: number; markWidth: number; stroke: string; dot: string; strokeWidth: number; background?: string };

function svg({ size, markWidth, stroke, dot, strokeWidth, background }: MarkOpts): string {
  const s = markWidth / MARK_WIDTH_UNITS;
  const tx = size / 2 - MARK_CENTER.x * s;
  const ty = size / 2 - MARK_CENTER.y * s;
  const paths = LOGO.paths
    .map((d) => `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
${background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : ''}
<g transform="translate(${tx} ${ty}) scale(${s})">${paths}<circle cx="${LOGO.dot[0]}" cy="${LOGO.dot[1]}" r="5.5" fill="${dot}"/></g>
</svg>`;
}

async function write(name: string, opts: MarkOpts) {
  await sharp(Buffer.from(svg(opts))).png().toFile(join(OUT, name));
  console.log('ditulis', name, `${opts.size}x${opts.size}`);
}

async function main() {
  // Ikon aplikasi (iOS/umum): latar charcoal penuh.
  await write('icon.png', { size: 1024, markWidth: 600, stroke: TEXT, dot: CORAL, strokeWidth: 5.5, background: CHARCOAL });

  // Ikon adaptif Android: lapisan depan transparan. Tanda dijaga di dalam zona aman (~66% tengah kanvas),
  // karena peluncur memotong ikon menjadi lingkaran, kotak bulat, dll.
  await write('android-icon-foreground.png', { size: 1024, markWidth: 500, stroke: TEXT, dot: CORAL, strokeWidth: 5.5 });
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: CHARCOAL } }).png().toFile(join(OUT, 'android-icon-background.png'));
  console.log('ditulis android-icon-background.png 1024x1024');
  // Ikon bertema Android 13+: satu warna (putih) di atas transparan; sistem yang mewarnainya.
  await write('android-icon-monochrome.png', { size: 1024, markWidth: 500, stroke: '#FFFFFF', dot: '#FFFFFF', strokeWidth: 5.5 });

  // Splash: tanda saja di atas transparan; warna latar splash diatur di app.json.
  await write('splash-icon.png', { size: 1024, markWidth: 640, stroke: TEXT, dot: CORAL, strokeWidth: 5.5 });

  await write('favicon.png', { size: 96, markWidth: 58, stroke: TEXT, dot: CORAL, strokeWidth: 6, background: CHARCOAL });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
