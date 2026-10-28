// Uji akses antar-akun terhadap project Supabase yang sebenarnya (T16.1).
//
// Dua akun yang SUDAH ada (bukan akun utama bila ragu) login lewat password, lalu skrip memeriksa:
//   - akun A tidak bisa MEMBACA data privat akun B (dan sebaliknya),
//   - klien tidak bisa MENULIS langsung ke tabel yang seharusnya hanya lewat RPC,
//   - akun biasa ditolak di fungsi moderator/admin/internal.
// Skrip TIDAK membuat atau mengubah data: semua percobaan tulis memakai ID nol dan harus ditolak.
//
//   1) salin .env.test.example menjadi .env.test dan isi dua akun
//   2) npx tsx --env-file=.env --env-file=.env.test scripts/access-check.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../src/types/database';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const creds = {
  A: { email: process.env.TEST_A_EMAIL, password: process.env.TEST_A_PASSWORD },
  B: { email: process.env.TEST_B_EMAIL, password: process.env.TEST_B_PASSWORD },
};
if (!url || !anon || !creds.A.email || !creds.A.password || !creds.B.email || !creds.B.password) {
  console.error('Isi EXPO_PUBLIC_SUPABASE_* di .env dan TEST_A_*/TEST_B_* di .env.test (lihat .env.test.example).');
  process.exit(2);
}

const ZERO = '00000000-0000-0000-0000-000000000000';
type Client = SupabaseClient<Database>;
const newClient = (): Client => createClient<Database>(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });

type Result = { name: string; pass: boolean; detail: string };
const results: Result[] = [];
const record = (name: string, pass: boolean, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'LULUS' : 'GAGAL'}  ${name}${detail ? `  -> ${detail}` : ''}`);
};

const denied = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === '42501' || /permission denied|not authorized|row-level security/i.test(e.message ?? ''));

async function login(label: 'A' | 'B') {
  const c = newClient();
  const { data, error } = await c.auth.signInWithPassword({ email: creds[label].email as string, password: creds[label].password as string });
  if (error || !data.user) throw new Error(`Login akun ${label} gagal: ${error?.message}`);
  return { client: c, id: data.user.id };
}

/** Membaca baris milik `ownerId` lewat klien `viewer`. Hasil yang benar: tidak ada baris. */
async function expectNoRows(viewer: Client, table: keyof Database['public']['Tables'], column: string, ownerId: string, name: string) {
  const { data, error } = await viewer.from(table).select('*').eq(column as never, ownerId as never).limit(5);
  if (error) return record(name, true, `ditolak (${error.code})`); // ditolak sepenuhnya juga benar
  record(name, (data ?? []).length === 0, `${(data ?? []).length} baris terbaca`);
}

async function expectWriteDenied(c: Client, name: string, run: (c: Client) => PromiseLike<{ error: { code?: string; message?: string } | null }>) {
  const { error } = await run(c);
  if (denied(error)) return record(name, true, 'ditolak izin');
  record(name, false, error ? `ditolak oleh hal lain (${error.code}) — izin tulis mungkin terbuka` : 'DITERIMA');
}

async function expectRpcDenied(c: Client, name: string, fn: string, args: Record<string, unknown>) {
  const { error } = await (c as unknown as { rpc: (f: string, a: unknown) => PromiseLike<{ error: { code?: string; message?: string } | null }> }).rpc(fn, args);
  if (denied(error)) return record(name, true, 'ditolak');
  record(name, false, error ? `error lain: ${error.message}` : 'DITERIMA');
}

/** Daftar semua berkas (rekursif) di bawah prefix yang terlihat oleh `client`. */
async function listAllFiles(client: Client, bucket: string, prefix: string, depth = 0): Promise<string[]> {
  const { data, error } = await client.storage.from(bucket).list(prefix, { limit: 100 });
  if (error || !data) return [];
  const out: string[] = [];
  for (const item of data) {
    const path = `${prefix}/${item.name}`;
    if (item.id === null) {
      if (depth < 3) out.push(...(await listAllFiles(client, bucket, path, depth + 1)));
    } else {
      out.push(path);
    }
  }
  return out;
}

async function main() {
  const A = await login('A');
  const B = await login('B');
  if (A.id === B.id) throw new Error('Akun A dan B harus berbeda.');
  console.log(`\nAkun A ${A.id}\nAkun B ${B.id}\n`);

  const { data: roleRow } = await A.client.from('accounts').select('role').eq('id', A.id).single();
  const aIsStaff = roleRow?.role === 'moderator' || roleRow?.role === 'admin';
  if (aIsStaff) console.log('Catatan: akun A adalah staf; pemeriksaan laporan/moderator dilewati untuk A.\n');

  console.log('--- kontrol positif (harus terbaca, agar uji bermakna) ---');
  {
    const { data } = await A.client.from('profiles').select('id').eq('id', B.id);
    record('A membaca profil publik B', (data ?? []).length === 1, `${(data ?? []).length} baris`);
  }

  console.log('\n--- A tidak boleh MEMBACA data privat B ---');
  for (const [table, col] of [
    ['accounts', 'id'],
    ['device_lists', 'user_id'],
    ['saved_posts', 'user_id'],
    ['blocks', 'blocker_id'],
    ['notifications', 'user_id'],
    ['match_results', 'user_id'],
    ['device_suggestions', 'submitted_by'],
  ] as const) {
    await expectNoRows(A.client, table, col, B.id, `A tidak bisa membaca ${table} milik B`);
  }
  if (!aIsStaff) await expectNoRows(A.client, 'reports', 'reporter_id', B.id, 'A (non-staf) tidak bisa membaca laporan milik B');

  console.log('\n--- B tidak boleh MEMBACA data privat A (arah sebaliknya) ---');
  for (const [table, col] of [
    ['accounts', 'id'],
    ['device_lists', 'user_id'],
    ['saved_posts', 'user_id'],
    ['notifications', 'user_id'],
    ['match_results', 'user_id'],
  ] as const) {
    await expectNoRows(B.client, table, col, A.id, `B tidak bisa membaca ${table} milik A`);
  }

  console.log('\n--- penulisan langsung harus DITOLAK (hanya lewat RPC) ---');
  const c = A.client;
  await expectWriteDenied(c, 'ubah profil (display_name) langsung', (x) => x.from('profiles').update({ display_name: 'x' }).eq('id', ZERO));
  await expectWriteDenied(c, 'ubah status profil langsung', (x) => x.from('profiles').update({ status: 'active' }).eq('id', ZERO));
  await expectWriteDenied(c, 'ubah follower_count langsung', (x) => x.from('profiles').update({ follower_count: 1 }).eq('id', ZERO));
  await expectWriteDenied(c, 'ubah role akun langsung', (x) => x.from('accounts').update({ role: 'admin' }).eq('id', ZERO));
  await expectWriteDenied(c, 'ubah status post langsung', (x) => x.from('posts').update({ status: 'published' }).eq('id', ZERO));
  await expectWriteDenied(c, 'ubah like_count langsung', (x) => x.from('posts').update({ like_count: 1 }).eq('id', ZERO));
  await expectWriteDenied(c, 'sisipkan post langsung', (x) => x.from('posts').insert({ id: ZERO, author_id: A.id, community_id: ZERO, type: 'discussion', title: 'x' }));
  await expectWriteDenied(c, 'sisipkan komentar langsung', (x) => x.from('comments').insert({ id: ZERO, post_id: ZERO, author_id: A.id, body: 'x' }));
  await expectWriteDenied(c, 'sisipkan follow langsung', (x) => x.from('follows').insert({ follower_id: A.id, following_id: B.id }));
  await expectWriteDenied(c, 'sisipkan like langsung', (x) => x.from('post_likes').insert({ post_id: ZERO, user_id: A.id }));
  await expectWriteDenied(c, 'sisipkan keanggotaan komunitas langsung', (x) => x.from('community_members').insert({ community_id: ZERO, user_id: A.id }));
  await expectWriteDenied(c, 'sisipkan notifikasi langsung', (x) => x.from('notifications').insert({ event_key: 'access-check', user_id: B.id, type: 'follow' }));
  await expectWriteDenied(c, 'sisipkan laporan langsung', (x) => x.from('reports').insert({ reporter_id: A.id, target_type: 'post', target_id: ZERO, reason: 'x' }));
  await expectWriteDenied(c, 'sisipkan blokir langsung', (x) => x.from('blocks').insert({ blocker_id: A.id, blocked_id: B.id }));
  await expectWriteDenied(c, 'sisipkan hasil Match langsung', (x) => x.from('match_results').insert({ user_id: A.id, candidate_id: B.id, score: 1, coverage: 1, label: 'x', algorithm_version: 1, viewer_revision: 1, candidate_revision: 1, expires_at: '2099-01-01' }));
  await expectWriteDenied(c, 'tulis katalog perangkat langsung', (x) => x.from('devices').insert({ name: 'x', brand: 'y', category: 'iem' }));
  await expectWriteDenied(c, 'tulis deletion_jobs langsung', (x) => x.from('deletion_jobs' as never).insert({ user_id: A.id } as never));
  await expectWriteDenied(c, 'ubah notifikasi milik B', (x) => x.from('notifications').update({ user_id: A.id }).eq('id', ZERO));

  console.log('\n--- akun biasa ditolak di fungsi moderator/admin/internal ---');
  if (!aIsStaff) {
    await expectRpcDenied(c, 'moderation_target oleh non-staf', 'moderation_target', { p_report_id: ZERO });
    await expectRpcDenied(c, 'moderate_report oleh non-staf', 'moderate_report', { p_report_id: ZERO, p_action: 'hide', p_reason: 'access-check' });
  }
  await expectRpcDenied(c, 'admin_delete_account dari klien', 'admin_delete_account', { p_uid: ZERO });
  await expectRpcDenied(c, 'deletion_step dari klien', 'deletion_step', { p_uid: ZERO });
  await expectRpcDenied(c, 'create_notification dari klien', 'create_notification', { p_user: B.id, p_type: 'follow', p_actor: A.id, p_post: null, p_comment: null, p_key: 'access-check' });
  await expectRpcDenied(c, 'refresh_post_comment_stats dari klien', 'refresh_post_comment_stats', { p_post_id: ZERO });
  await expectRpcDenied(c, 'prepare_post_details dari klien', 'prepare_post_details', { p_type: 'review', p_details: {} });
  await expectRpcDenied(c, 'process_account_deletion pada akun aktif', 'process_account_deletion', {});
  await expectRpcDenied(c, 'finalize_account_deletion pada akun aktif', 'finalize_account_deletion', {});

  console.log('\n--- Storage: berkas milik pihak lain ---');
  // avatars: hanya folder sendiri yang boleh didaftar (URL publik tetap bisa dibuka bila diketahui, keputusan v1).
  for (const [viewer, owner, label] of [[A, B, 'A'], [B, A, 'B']] as const) {
    const { data, error } = await viewer.client.storage.from('avatars').list(owner.id, { limit: 5 });
    record(`${label} tidak bisa mendaftar avatars milik pihak lain`, !!error || (data ?? []).length === 0, error ? `ditolak (${error.message})` : `${(data ?? []).length} berkas terlihat`);
  }
  // post-images: foto post yang TAMPIL memang boleh dibaca semua pengguna yang masuk (itu cara foto tampil).
  // Yang tidak boleh terbaca: foto yang TIDAK dipakai post tampil milik pihak lain (unggahan belum terbit,
  // post disembunyikan atau dihapus). Jadi setiap berkas yang terlihat harus tercantum di post tampil itu.
  for (const [viewer, owner, label] of [[A, B, 'A'], [B, A, 'B']] as const) {
    const visible = await listAllFiles(viewer.client, 'post-images', owner.id);
    const { data: posts, error } = await viewer.client.from('posts').select('image_paths').eq('author_id', owner.id);
    if (error) {
      record(`${label}: foto post-images pihak lain hanya milik post yang tampil`, false, `gagal membaca daftar post (${error.code})`);
      continue;
    }
    const allowed = new Set((posts ?? []).flatMap((p) => p.image_paths));
    const leaked = visible.filter((p) => !allowed.has(p));
    record(
      `${label}: foto post-images pihak lain hanya milik post yang tampil`,
      leaked.length === 0,
      leaked.length ? `${leaked.length} berkas TIDAK terkait post tampil: ${leaked.slice(0, 3).join(', ')}` : `${visible.length} berkas terlihat, semuanya milik post yang tampil`,
    );
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length} lulus, ${failed.length} gagal dari ${results.length} pemeriksaan.`);
  if (failed.length) {
    console.log('\nYang GAGAL:');
    for (const f of failed) console.log(` - ${f.name}: ${f.detail}`);
  }
  await Promise.all([A.client.auth.signOut(), B.client.auth.signOut()]);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(2);
});
