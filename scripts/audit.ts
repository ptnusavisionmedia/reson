// Audit statis sederhana (T16.5). Bukan pengganti tinjauan manual; menangkap kelalaian yang mudah terlewat.
//
//   npm run audit:static
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = join(__dirname, '..');
const SKIP = new Set(['node_modules', '.expo', '.git', 'dist', 'supabase/.temp']);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = relative(root, full).split('\\').join('/');
    if (SKIP.has(name) || SKIP.has(rel)) continue;
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const files = walk(root);
const rel = (f: string) => relative(root, f).split('\\').join('/');
const code = files.filter((f) => /\.(ts|tsx)$/.test(f) && rel(f).startsWith('src/'));

type Finding = { check: string; where: string; note: string };
const findings: Finding[] = [];
const add = (check: string, where: string, note: string) => findings.push({ check, where, note });

// 1. Secret: kunci service_role / secret tidak boleh ada di berkas mana pun yang bukan dokumentasi.
const secretPatterns: [RegExp, string][] = [
  [/sb_secret_[A-Za-z0-9_-]{10,}/, 'kunci secret Supabase'],
  [/SUPABASE_SERVICE_ROLE_KEY\s*=\s*\S{10,}/, 'service role key terisi'],
  [/-----BEGIN (RSA |EC )?PRIVATE KEY-----/, 'private key'],
];
for (const f of files) {
  if (!/\.(ts|tsx|js|json|md|html|sql|toml|env|example)$/.test(f) && !f.endsWith('.env')) continue;
  if (rel(f) === 'scripts/audit.ts') continue;
  const text = readFileSync(f, 'utf8');
  for (const [re, name] of secretPatterns) if (re.test(text)) add('secret', rel(f), name);
  // JWT: pastikan peran anon, bukan service_role.
  for (const m of text.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.([A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}/g)) {
    try {
      const role = JSON.parse(Buffer.from(m[1], 'base64url').toString('utf8')).role;
      if (role && role !== 'anon') add('secret', rel(f), `JWT dengan peran "${role}" (harus hanya anon)`);
    } catch {}
  }
}

// 2. .env tidak boleh ikut terlacak: pastikan ada di .gitignore.
const gi = readFileSync(join(root, '.gitignore'), 'utf8');
if (!/^\.env$/m.test(gi) && !/^\.env\*$/m.test(gi) && !/^\.env\.\*$/m.test(gi)) add('secret', '.gitignore', '.env tidak diabaikan git');

// 3. Log sensitif.
for (const f of code) {
  readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
    if (/console\.(log|info|warn|error|debug)\(/.test(line) && /(password|token|secret|access_token|refresh_token|session\b)/i.test(line)) {
      add('log-sensitif', `${rel(f)}:${i + 1}`, line.trim().slice(0, 100));
    }
  });
}

// 4. Aksesibilitas: Pressable interaktif harus punya accessibilityRole.
for (const f of code) {
  const text = readFileSync(f, 'utf8');
  for (const m of text.matchAll(/<Pressable\b/g)) {
    const idx = m.index ?? 0;
    const head = text.slice(idx, idx + 700);
    const end = head.search(/>\s*\n?\s*(<|\{)/);
    const tag = end > 0 ? head.slice(0, end) : head;
    if (!tag.includes('accessibilityRole')) add('aksesibilitas', `${rel(f)}:${text.slice(0, idx).split('\n').length}`, 'Pressable tanpa accessibilityRole');
  }
  // Image bermakna harus berlabel (dekoratif boleh dikecualikan dengan accessible={false}).
  for (const m of text.matchAll(/<Image\b[^>]*>/gs)) {
    if (!m[0].includes('accessibilityLabel') && !m[0].includes('accessible={false}')) {
      add('aksesibilitas', `${rel(f)}:${text.slice(0, m.index ?? 0).split('\n').length}`, 'Image tanpa accessibilityLabel');
    }
  }
}

// 5. Query Supabase tanpa batas: daftar untuk ditinjau manual (bukan selalu salah).
for (const f of code) {
  const text = readFileSync(f, 'utf8');
  for (const m of text.matchAll(/\.from\('(\w+)'\)\s*\.select\(/g)) {
    const idx = m.index ?? 0;
    const stmt = text.slice(idx, idx + 1500); // jendela lebar: batas sering dipasang di pernyataan berikutnya
    const bounded = /\.(limit|range|maybeSingle|single|in)\(|head:\s*true|\.delete\(|\.update\(|\.upsert\(|\.insert\(/.test(stmt);
    const keyed = /\.eq\('(id|user_id|post_id)'/.test(stmt);
    if (!bounded && !keyed) add('query-tak-berbatas', `${rel(f)}:${text.slice(0, idx).split('\n').length}`, `from('${m[1]}') tanpa limit/range`);
  }
}

// 6. Aset contoh/demo yang tertinggal di bundel aplikasi.
for (const f of files) {
  const r = rel(f);
  if (/^assets\/images\/(react-logo|tutorial-web|expo-badge|logo-glow|expo-logo)/.test(r)) add('aset-demo', r, 'aset bawaan template Expo, tidak dipakai');
}

const byCheck = new Map<string, Finding[]>();
for (const f of findings) byCheck.set(f.check, [...(byCheck.get(f.check) ?? []), f]);

const checks = ['secret', 'log-sensitif', 'aksesibilitas', 'query-tak-berbatas', 'aset-demo'];
for (const c of checks) {
  const list = byCheck.get(c) ?? [];
  console.log(`\n[${list.length === 0 ? 'OK ' : '!! '}] ${c}: ${list.length} temuan`);
  for (const f of list) console.log(`     ${f.where}  ${f.note}`);
}

// Hanya secret dan log sensitif yang menggagalkan; sisanya laporan untuk ditinjau.
const hard = (byCheck.get('secret')?.length ?? 0) + (byCheck.get('log-sensitif')?.length ?? 0);
process.exit(hard ? 1 : 0);
