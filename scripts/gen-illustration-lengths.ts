// Menghitung panjang tiap jalur ilustrasi agar animasi menggambar memakai panjang yang SEBENARNYA
// (bukan angka tebakan). Jalankan ulang setiap kali illustrationPaths.ts diubah:
//
//   npm run gen:lengths
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { svgPathProperties } from 'svg-path-properties';

import { ART } from '../src/components/ui/illustrationPaths';

const round = (n: number) => Math.round(n * 100) / 100;
const lengths = Object.fromEntries(Object.entries(ART).map(([name, art]) => [name, art.paths.map((d) => round(new svgPathProperties(d).getTotalLength()))]));

const body = `// DIHASILKAN oleh scripts/gen-illustration-lengths.ts dari illustrationPaths.ts. Jangan diubah manual.
import type { IllustrationName } from './illustrationPaths';

export const LENGTHS: Record<IllustrationName, number[]> = ${JSON.stringify(lengths, null, 2)};
`;

writeFileSync(join(__dirname, '..', 'src', 'components', 'ui', 'illustrationLengths.ts'), body);
for (const [name, ls] of Object.entries(lengths)) console.log(name.padEnd(13), ls.join(', '));
