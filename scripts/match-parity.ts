// Membandingkan taste_match_compute (database) dengan implementasi referensi TypeScript memakai
// fixture yang sama. Fungsi di database murni (tanpa akses data), jadi cukup anon key publik.
//
//   npx tsx --env-file=.env scripts/match-parity.ts
import { computeMatch, type MatchInput } from '../shared/matching/score';
import { FIXTURES } from '../tests/matching/fixtures';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY belum diisi di .env');
  process.exit(2);
}

type Db = { score: number; coverage: number; label: string; shared_genres: string[]; shared_prefs: string[]; differences: string[] };

async function dbCompute(a: MatchInput, b: MatchInput): Promise<Db> {
  const res = await fetch(`${url}/rest/v1/rpc/taste_match_compute`, {
    method: 'POST',
    headers: { apikey: key as string, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      a_genres: a.genres, a_bass: a.bass, a_vocals: a.vocals, a_treble: a.treble, a_contexts: a.contexts,
      b_genres: b.genres, b_bass: b.bass, b_vocals: b.vocals, b_treble: b.treble, b_contexts: b.contexts,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as Db;
}

const same = (x: unknown, y: unknown) => JSON.stringify(x) === JSON.stringify(y);

async function main() {
  let failed = 0;
  for (const f of FIXTURES) {
    const ts = computeMatch(f.a, f.b);
    const db = await dbCompute(f.a, f.b);
    const problems: string[] = [];
    if (Math.abs(ts.score - Number(db.score)) > 1e-6) problems.push(`score ts=${ts.score} db=${db.score}`);
    if (Math.abs(ts.coverage - Number(db.coverage)) > 1e-6) problems.push(`coverage ts=${ts.coverage} db=${db.coverage}`);
    if (ts.label !== db.label) problems.push(`label ts=${ts.label} db=${db.label}`);
    if (!same(ts.sharedGenres, db.shared_genres)) problems.push(`sharedGenres ts=${JSON.stringify(ts.sharedGenres)} db=${JSON.stringify(db.shared_genres)}`);
    if (!same(ts.sharedPreferences, db.shared_prefs)) problems.push(`prefs ts=${JSON.stringify(ts.sharedPreferences)} db=${JSON.stringify(db.shared_prefs)}`);
    if (!same(ts.differences, db.differences)) problems.push(`differences ts=${JSON.stringify(ts.differences)} db=${JSON.stringify(db.differences)}`);
    if (problems.length) {
      failed++;
      console.log(`GAGAL  ${f.name}\n       ${problems.join('\n       ')}`);
    } else {
      console.log(`cocok  ${f.name}  (${ts.label}, skor ${ts.score}, cakupan ${ts.coverage})`);
    }
  }
  console.log(failed ? `\n${failed} dari ${FIXTURES.length} fixture berbeda.` : `\nSemua ${FIXTURES.length} fixture identik antara TypeScript dan database.`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
