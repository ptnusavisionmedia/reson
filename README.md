# Reson

Aplikasi komunitas audio (lihat `PRD.md`): temukan orang yang mendengar seperti kamu.
Stack: Expo + TypeScript + Expo Router + Supabase (cloud, tanpa Docker).

> PRD aslinya memakai Firebase; backend diganti ke Supabase atas keputusan pemilik.
> Status pengerjaan per tugas: lihat `docs/qa-report.md`.

## Setup
1. `npm install`
2. Buat project di supabase.com, salin `.env.example` menjadi `.env`, isi URL dan anon key (Project Settings → API).
3. `npx supabase login`, lalu `npx supabase link --project-ref <ref>`
4. `npm run db:push` (kirim migrasi), lalu `npm run db:types` (perbarui tipe)
5. `npm start`, buka di Expo Go (Android)

**Jangan** isi `service_role` key di `.env` atau repo. Hanya anon/publishable key yang boleh ada di aplikasi.

## Skrip
| Perintah | Fungsi |
|---|---|
| `npm start` | Jalankan Metro |
| `npm run typecheck` | Cek tipe |
| `npm run lint` | Lint |
| `npm test` | Unit test (Taste Match, notifikasi, alur hapus akun, kontras warna) |
| `npm run check:parity` | Bandingkan algoritma Match di database dengan referensi TypeScript |
| `npm run check:access` | Uji akses antar-akun dengan dua akun uji (lihat `.env.test.example`) |
| `npm run audit:static` | Audit statis: secret, log sensitif, aksesibilitas, query tak berbatas, aset demo |
| `npm run check:legal` | Gagal selama halaman kebijakan masih draf atau punya bagian `[[ISI: …]]` |
| `npm run db:push` / `db:types` | Migrasi dan tipe database |

## Struktur
- `src/app`: rute (Expo Router). `src/features/*`: logika per fitur. `src/components`: UI bersama. `src/theme`: token.
- `shared/`: validasi dan algoritma yang dipakai klien dan tes (`shared/matching/score.ts` adalah referensi Taste Match).
- `supabase/migrations`: skema, RLS, dan semua fungsi server (RPC). Aksi sosial hanya lewat RPC `SECURITY DEFINER`.
- `web/`: halaman kebijakan privasi dan penghapusan akun (draf, belum dipublikasikan).
- `docs/`: `qa-report.md`, `qa-checklist.md`, `account-deletion.md`.
- `tests/`, `scripts/`.

## Aturan yang perlu diingat
- Setiap fungsi database baru harus `revoke execute ... from public, anon` (Supabase memberi `EXECUTE` ke `anon` secara eksplisit).
- Perubahan skema = berkas baru di `supabase/migrations/`, lalu `db:push` dan `db:types`.
- "Confirm email" Supabase sengaja mati saat development; nyalakan kembali (dan pasang SMTP) sebelum pilot.
