// Gerbang sebelum halaman hukum dipublikasikan: gagal bila masih ada bagian [[ISI: ...]] yang kosong.
//
//   npm run check:legal
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(__dirname, '..', 'web');
const pattern = /\[\[ISI:[^\]]*\]\]/g;

let total = 0;
let drafts = 0;
for (const file of readdirSync(dir).filter((f) => f.endsWith('.html'))) {
  const text = readFileSync(join(dir, file), 'utf8');
  const hits = text.match(pattern) ?? [];
  total += hits.length;
  const banner = (text.match(/class="draft"/g) ?? []).length;
  drafts += banner;
  if (banner) console.log(`
${file}: spanduk DRAF masih terpasang (hapus setelah semua bagian terisi dan ditinjau)`);
  if (hits.length) {
    console.log(`\n${file}: ${hits.length} bagian belum diisi`);
    for (const h of new Set(hits)) console.log(`  - ${h}`);
  }
}

if (total > 0 || drafts > 0) {
  console.error(`\nBELUM SIAP: ${total} bagian kosong dan ${drafts} spanduk draf. Isi dengan data yang benar milik pemilik layanan; jangan dikarang.`);
  process.exit(1);
}
console.log('Semua bagian terisi. Tinjau isinya sekali lagi sebelum dipublikasikan.');
